import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { getDocumentRole, canWrite } from '@/lib/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const MAX_YJS_B64 = 2 * 1024 * 1024; // 2 MB base64 limit

const syncSchema = z.object({
  yjsState: z.string().max(MAX_YJS_B64).nullable().optional(),
  title:    z.string().max(500).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = await getDocumentRole(params.id, session.user.id);
    if (!canWrite(role)) {
      return NextResponse.json({ error: 'Read-only access' }, { status: 403 });
    }

    const body = await req.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    if (parsed.data.yjsState !== undefined) updates.yjsState = parsed.data.yjsState;
    if (parsed.data.title)                  updates.title    = parsed.data.title;

    if (Object.keys(updates).length > 0) {
      await db.update(documents).set(updates).where(eq(documents.id, params.id));
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[sync]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
