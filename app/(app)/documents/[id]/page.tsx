import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { documents, documentCollaborators } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import Editor from '@/components/editor/Editor';

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  // Fetch doc and verify access
  const [doc] = await db
    .select()
    .from(documents)
    .where(eq(documents.id, params.id));

  if (!doc) redirect('/dashboard');

  const isOwner = doc.ownerId === session.user.id;

  if (!isOwner) {
    const [collab] = await db
      .select()
      .from(documentCollaborators)
      .where(
        and(
          eq(documentCollaborators.documentId, params.id),
          eq(documentCollaborators.userId, session.user.id),
        ),
      );
    if (!collab) redirect('/dashboard');
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <Editor
        documentId={doc.id}
        title={doc.title}
        userName={session.user?.name ?? session.user?.email ?? 'You'}
      />
    </div>
  );
}
