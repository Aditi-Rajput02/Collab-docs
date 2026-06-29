import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';
import { connectDB } from '@/lib/db/client';
import { DocumentCollaborator } from '@/lib/db/models/DocumentCollaborator';
import { getDocumentRole, canManage } from '@/lib/auth/rbac';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; uid: string }> },
) {
  try {
    const { id, uid } = await params;
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();

    const role = await getDocumentRole(id, session.user.id);
    if (!canManage(role)) return NextResponse.json({ error: 'Only owner can remove collaborators' }, { status: 403 });

    await DocumentCollaborator.deleteOne({ documentId: id, userId: uid });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[DELETE collaborator]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
