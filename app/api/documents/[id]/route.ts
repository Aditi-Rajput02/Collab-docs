import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { db } from '@/lib/db/client';
import { documents } from '@/lib/db/schema';
import { getDocumentRole, canWrite, canManage } from '@/lib/auth/rbac';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const patchSchema = z.object({
  title:    z.string().min(1).max(500).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getDocumentRole(params.id, session.user.id);
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const [doc] = await db.select().from(documents).where(eq(documents.id, params.id));
    return NextResponse.json({ document: doc, role });
  } catch (err) {
    console.error('[GET doc]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getDocumentRole(params.id, session.user.id);
    if (!canWrite(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.isPublic !== undefined && !canManage(role)) {
      return NextResponse.json({ error: 'Only owner can change visibility' }, { status: 403 });
    }

    await db.update(documents).set(parsed.data).where(eq(documents.id, params.id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH doc]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = await getDocumentRole(params.id, session.user.id);
    if (!canManage(role)) return NextResponse.json({ error: 'Only owner can delete' }, { status: 403 });

    await db.update(documents)
      .set({ deletedAt: new Date() })
      .where(eq(documents.id, params.id));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE doc]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
