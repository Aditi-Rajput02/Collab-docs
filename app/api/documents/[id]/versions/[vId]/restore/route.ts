import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { DocumentVersion, IDocumentVersion } from '@/lib/db/models/DocumentVersion';
import { Document } from '@/lib/db/models/Document';
import { getDocumentRole, canWrite } from '@/lib/auth/rbac';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; vId: string }> },
) {
  try {
    const { id, vId } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!canWrite(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const version = await DocumentVersion
      .findById(vId)
      .lean<IDocumentVersion | null>();

    if (!version || version.documentId !== id) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    await Document.findByIdAndUpdate(id, {
      $set: { contentJson: version.snapshot },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[restore version]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
