import { connectDB } from '@/lib/db/client';
import { Document, IDocument } from '@/lib/db/models/Document';
import { DocumentCollaborator, IDocumentCollaborator } from '@/lib/db/models/DocumentCollaborator';

export type Role = 'owner' | 'editor' | 'viewer' | null;

export async function getDocumentRole(documentId: string, userId: string): Promise<Role> {
  await connectDB();

  const doc = await Document
    .findById(documentId)
    .select('ownerId deletedAt')
    .lean<Pick<IDocument, '_id' | 'ownerId' | 'deletedAt'> | null>();

  if (!doc || doc.deletedAt) return null;
  if (doc.ownerId === userId) return 'owner';

  const collab = await DocumentCollaborator
    .findOne({ documentId, userId })
    .select('role')
    .lean<Pick<IDocumentCollaborator, 'role'> | null>();

  return (collab?.role as Role) ?? null;
}

export function canWrite(role: Role): boolean {
  return role === 'owner' || role === 'editor';
}

export function canManage(role: Role): boolean {
  return role === 'owner';
}
