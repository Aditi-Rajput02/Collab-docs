import { NextRequest, NextResponse } from 'next/server';
import * as Y from 'yjs';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { Document, IDocument } from '@/lib/db/models/Document';
import { getDocumentRole, canWrite } from '@/lib/auth/rbac';
import { checkSyncLimit } from '@/lib/security/rateLimiter';
import { z } from 'zod';

const MAX_B64 = 2 * 1024 * 1024; // 2 MB base64

const syncSchema = z.object({
  // Full Yjs state encoded as base64 (Y.encodeStateAsUpdate)
  yjsUpdate:   z.string().max(MAX_B64),
  // Client's state vector so server can return only what client is missing
  stateVector: z.string().max(200_000).optional(),
  title:       z.string().max(500).optional(),
});

function b64ToBytes(b64: string): Uint8Array {
  return Buffer.from(b64, 'base64');
}

function bytesToB64(arr: Uint8Array): string {
  return Buffer.from(arr).toString('base64');
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const rateLimit = checkSyncLimit(session.user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many sync requests' }, { status: 429 });
    }

    const role = await getDocumentRole(id, session.user.id);
    if (!canWrite(role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const { yjsUpdate, stateVector, title } = parsed.data;

    // ── CRDT Merge ──────────────────────────────────────────────────────────
    // 1. Load the server's current document state into a Y.Doc
    const serverDoc = new Y.Doc();
    const existing = await Document
      .findById(id)
      .select('yjsState')
      .lean<Pick<IDocument, 'yjsState'> | null>();

    if (existing?.yjsState) {
      Y.applyUpdate(serverDoc, b64ToBytes(existing.yjsState));
    }

    // 2. Apply the client's update — Yjs CRDT ensures deterministic merge
    Y.applyUpdate(serverDoc, b64ToBytes(yjsUpdate));

    // 3. Encode merged state to persist
    const mergedState = Y.encodeStateAsUpdate(serverDoc);

    // 4. Calculate what the client is missing (server has but client doesn't)
    let serverDiff: string | null = null;
    if (stateVector) {
      const clientSV = b64ToBytes(stateVector);
      const diff = Y.encodeStateAsUpdate(serverDoc, clientSV);
      // diff.length > 2 means there is actual content beyond the empty update header
      if (diff.length > 2) {
        serverDiff = bytesToB64(diff);
      }
    }

    serverDoc.destroy();
    // ── End CRDT Merge ───────────────────────────────────────────────────────

    // Persist merged state (and optional title update)
    const dbUpdate: Record<string, unknown> = { yjsState: bytesToB64(mergedState) };
    if (title) dbUpdate.title = title;

    await Document.findByIdAndUpdate(id, { $set: dbUpdate });

    // Return the server diff so the client can apply changes it was missing
    return NextResponse.json({ ok: true, serverDiff });
  } catch (err) {
    console.error('[sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
