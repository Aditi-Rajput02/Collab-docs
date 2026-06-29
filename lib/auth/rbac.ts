import { db } from '@/lib/db/client';
import { documentCollaborators, documents } from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';

export type Role = 'owner' | 'editor' | 'viewer' | null;

export async function getDocumentRole(documentId: string, userId: string): Promise<Role> {
  const [doc] = await db
    .select({ ownerId: documents.ownerId })
    .from(documents)
    .where(eq(documents.id, documentId));

  if (!doc) return null;
  if (doc.ownerId === userId) return 'owner';

  const [collab] = await db
    .select({ role: documentCollaborators.role })
    .from(documentCollaborators)
    .where(
      and(
        eq(documentCollaborators.documentId, documentId),
        eq(documentCollaborators.userId, userId),
      ),
    );

  return collab?.role ?? null;
}

export function canWrite(role: Role): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManage(role: Role): boolean {
  return role === 'owner';
}
