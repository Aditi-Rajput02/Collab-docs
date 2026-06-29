import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { DocumentVersion, IDocumentVersion } from '@/lib/db/models/DocumentVersion';
import { getDocumentRole, canWrite } from '@/lib/auth/rbac';

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

    const body = await req.json();
    const version = await DocumentVersion.create({
      documentId:  id,
      createdBy:   session.user.id,
      label:       body.label ?? null,
      description: body.description ?? null,
      snapshot:    body.snapshot ?? {},
      yjsSv:       body.yjsSv ?? null,
    });

    return NextResponse.json({ version: { id: version._id, ...version.toObject() } }, { status: 201 });
  } catch (err) {
    console.error('[POST version]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
