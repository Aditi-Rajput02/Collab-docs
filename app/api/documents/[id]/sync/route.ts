import { NextRequest, NextResponse } from 'next/server';
import * as Y from 'yjs';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { Document, IDocument } from '@/lib/db/models/Document';
import { getDocumentRole, canWrite } from '@/lib/auth/rbac';
import { checkSyncLimit } from '@/lib/security/rateLimiter';
import { z } from 'zod';

const MAX_B64 = 2 * 1024 * 1024; // 2 MB base64

const EMPTY_YJS_UPDATE_SIZE = 2;

const syncSchema = z.object({
  yjsUpdate:   z.string().max(MAX_B64),
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimit = checkSyncLimit(session.user.id);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many sync requests' }, { status: 429 });
    }
    const { id } = await params;
    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!canWrite(role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 });
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

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
      if (diff.length > EMPTY_YJS_UPDATE_SIZE) {
        serverDiff = bytesToB64(diff);
      }
    }

    serverDoc.destroy();
    // ── End CRDT Merge ───────────────────────────────────────────────────────

    const dbUpdate: Record<string, unknown> = {
      yjsState:  bytesToB64(mergedState),
      sizeBytes: mergedState.byteLength,
    };
    if (title) dbUpdate.title = title;

    await Document.findByIdAndUpdate(id, { $set: dbUpdate });

    return NextResponse.json({ ok: true, serverDiff });
  } catch (err) {
    console.error('[sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
