import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { DocumentVersion, IDocumentVersion } from '@/lib/db/models/DocumentVersion';
import { getDocumentRole, canWrite } from '@/lib/auth/rbac';
import { z } from 'zod';

const MAX_YJS_B64 = 2 * 1024 * 1024; // 2 MB

const createVersionSchema = z.object({
  label:       z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  snapshot:    z.record(z.unknown()).optional().default({}),
  yjsSv:       z.string().max(MAX_YJS_B64).optional(),
  yjsSnapshot: z.string().max(MAX_YJS_B64).optional(), // full Yjs state for restore
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

    const versions = await DocumentVersion
      .find({ documentId: id })
      .select('_id documentId createdBy label description createdAt')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean<Pick<IDocumentVersion, '_id' | 'documentId' | 'createdBy' | 'label' | 'description' | 'createdAt'>[]>();

    return NextResponse.json({ versions });
  } catch (err) {
    console.error('[GET versions]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
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

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const version = await DocumentVersion.create({
      documentId:  id,
      createdBy:   session.user.id,
      label:       parsed.data.label ?? null,
      description: parsed.data.description ?? null,
      snapshot:    parsed.data.snapshot,
      yjsSv:       parsed.data.yjsSv ?? null,
      yjsSnapshot: parsed.data.yjsSnapshot ?? null,
    });

    return NextResponse.json({ version: { id: version._id, ...version.toObject() } }, { status: 201 });
  } catch (err) {
    console.error('[POST version]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
