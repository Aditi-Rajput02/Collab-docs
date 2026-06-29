import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/client';
import { Document, IDocument } from '@/lib/db/models/Document';
import { DocumentCollaborator } from '@/lib/db/models/DocumentCollaborator';
import Editor from '@/components/editor/Editor';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  await connectDB();

  const doc = await Document.findById(id).lean<IDocument | null>();
  if (!doc || doc.deletedAt) redirect('/dashboard');

  const isOwner = doc.ownerId === session.user.id;

  if (!isOwner) {
    const collab = await DocumentCollaborator
      .findOne({ documentId: id, userId: session.user.id })
      .lean();
    if (!collab) redirect('/dashboard');
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Editor
        documentId={doc._id as string}
        title={doc.title}
        userName={session.user?.name ?? session.user?.email ?? 'You'}
      />
    </div>
  );
}
