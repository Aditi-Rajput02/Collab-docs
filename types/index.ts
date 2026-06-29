export type { User, Document, DocumentCollaborator, DocumentVersion, SyncOperation } from '@/lib/db/schema';

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
