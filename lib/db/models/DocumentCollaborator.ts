import { Schema, model, models } from 'mongoose';

export type CollabRole = 'owner' | 'editor' | 'viewer';

export interface IDocumentCollaborator {
  _id: string;
  documentId: string;
  userId: string;
  role: CollabRole;
  invitedBy?: string;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDocumentCollaborator>(
  {
    _id:        { type: String, default: () => crypto.randomUUID() },
    documentId: { type: String, required: true, ref: 'Document', index: true },
    userId:     { type: String, required: true, ref: 'User' },
    role:       { type: String, enum: ['owner', 'editor', 'viewer'], default: 'viewer' },
    invitedBy:  { type: String, ref: 'User' },
    acceptedAt: Date,
  },
  { timestamps: true },
);

// Each user can only appear once per document
schema.index({ documentId: 1, userId: 1 }, { unique: true });

export const DocumentCollaborator =
  models.DocumentCollaborator ??
  model<IDocumentCollaborator>('DocumentCollaborator', schema);
