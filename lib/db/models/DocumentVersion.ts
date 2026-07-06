import { Schema, model, models } from 'mongoose';

export interface IDocumentVersion {
  _id: string;
  documentId: string;
  createdBy: string;
  label?: string;
  description?: string;
  snapshot: unknown;
  yjsSv?: string;       // base64-encoded Yjs state vector (for diff calculations)
  yjsSnapshot?: string; // base64-encoded full Yjs state (required for restore)
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<IDocumentVersion>(
  {
    _id:         { type: String, default: () => crypto.randomUUID() },
    documentId:  { type: String, required: true, ref: 'Document', index: true },
    createdBy:   { type: String, required: true, ref: 'User' },
    label:       String,
    description: String,
    snapshot:    { type: Schema.Types.Mixed, required: true },
    yjsSv:       String,
    yjsSnapshot: String,
  },
  { timestamps: true },
);

export const DocumentVersion =
  models.DocumentVersion ?? model<IDocumentVersion>('DocumentVersion', schema);
