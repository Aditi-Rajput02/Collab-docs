export type { IUser } from '@/lib/db/models/User';
export type { IDocument } from '@/lib/db/models/Document';
export type { IDocumentCollaborator } from '@/lib/db/models/DocumentCollaborator';
export type { IDocumentVersion } from '@/lib/db/models/DocumentVersion';

// Backwards-compat aliases
export type { IUser as User } from '@/lib/db/models/User';
export type { IDocument as Document } from '@/lib/db/models/Document';
export type { IDocumentCollaborator as DocumentCollaborator } from '@/lib/db/models/DocumentCollaborator';
export type { IDocumentVersion as DocumentVersion } from '@/lib/db/models/DocumentVersion';
export type SyncOperation = { id: string; documentId: string; userId: string; clock: number; createdAt: Date };

export type Role = 'owner' | 'editor' | 'viewer';
export type SyncState = 'idle' | 'editing' | 'syncing' | 'offline' | 'reconnecting' | 'error';

export type DocumentWithRole = {
  id: string;
  title: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  role: Role;
  collaboratorCount: number;
};

export type AISuggestionType = 'summary' | 'grammar' | 'autocomplete' | 'rewrite' | 'explain';

export type GrammarSuggestion = {
  original: string;
  suggestion: string;
  explanation: string;
  offset: number;
  length: number;
};
