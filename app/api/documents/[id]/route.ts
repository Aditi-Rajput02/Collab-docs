import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { Document, IDocument } from '@/lib/db/models/Document';
import { getDocumentRole, canWrite, canManage } from '@/lib/auth/rbac';
import { z } from 'zod';

const patchSchema = z.object({
  title:    z.string().min(1).max(500).optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!role) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const doc = await Document.findById(id).lean<IDocument | null>();
    return NextResponse.json({ document: doc ? { ...doc, id: doc._id } : null, role });
  } catch (err) {
    console.error('[GET doc]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!canWrite(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    if (parsed.data.isPublic !== undefined && !canManage(role)) {
      return NextResponse.json({ error: 'Only owner can change visibility' }, { status: 403 });
    }

    await Document.findByIdAndUpdate(id, { $set: parsed.data });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[PATCH doc]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!canManage(role)) return NextResponse.json({ error: 'Only owner can delete' }, { status: 403 });

    await Document.findByIdAndUpdate(id, { $set: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE doc]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
