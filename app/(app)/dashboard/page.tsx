import { auth } from '@/lib/auth/config';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/client';
import { documents, documentCollaborators } from '@/lib/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/auth/login');

  const userId = session.user.id;

  // Docs owned by this user (not soft-deleted)
  const owned = await db
    .select({
      id:        documents.id,
      title:     documents.title,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
    })
    .from(documents)
    .where(and(eq(documents.ownerId, userId), isNull(documents.deletedAt)));

  // Docs shared with this user
  const shared = await db
    .select({
      id:        documents.id,
      title:     documents.title,
      updatedAt: documents.updatedAt,
      createdAt: documents.createdAt,
      role:      documentCollaborators.role,
    })
    .from(documents)
    .innerJoin(
      documentCollaborators,
      eq(documentCollaborators.documentId, documents.id),
    )
    .where(and(eq(documentCollaborators.userId, userId), isNull(documents.deletedAt)));

  const ownedDocs  = owned.map(d  => ({ ...d, role: 'owner'  as const }));
  const sharedDocs = shared.map(d => ({ ...d, role: d.role   as 'editor' | 'viewer' }));

  const allDocs = [...ownedDocs, ...sharedDocs].sort(
    (a, b) =>
      new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() -
      new Date(a.updatedAt ?? a.createdAt ?? 0).getTime(),
  );

  const roleColor: Record<string, string> = {
    owner:  'bg-blue-100 text-blue-700',
    editor: 'bg-green-100 text-green-700',
    viewer: 'bg-gray-100 text-gray-600',
  };

  return (
    // flex-1 fills the (app)/layout's h-screen flex container; overflow-y-auto lets content scroll
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* Sticky nav */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <span className="text-xl font-bold text-gray-900">CollabDoc</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {session.user?.name ?? session.user?.email}
          </span>
          <Link
            href="/auth/login"
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            Sign out
          </Link>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <main className="max-w-5xl mx-auto px-6 py-10">
          {/* Title row */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
              <p className="text-sm text-gray-500 mt-1">
                {allDocs.length} document{allDocs.length !== 1 ? 's' : ''}
              </p>
            </div>
            <Link
              href="/documents/new"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New Document
            </Link>
          </div>

          {/* Empty state */}
          {allDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4">📄</div>
              <h2 className="text-lg font-semibold text-gray-700 mb-2">No documents yet</h2>
              <p className="text-sm text-gray-400 mb-6">
                Create your first document to get started.
              </p>
              <Link
                href="/documents/new"
                className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Create Document
              </Link>
            </div>
          ) : (
            /* Document grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {allDocs.map(doc => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-400 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl mt-0.5">📝</div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {doc.updatedAt
                          ? `Updated ${formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}`
                          : 'Just created'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleColor[doc.role]}`}
                    >
                      {doc.role}
                    </span>
                    <span className="text-xs text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
