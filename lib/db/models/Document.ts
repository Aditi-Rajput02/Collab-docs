import { Schema, model, models } from 'mongoose';

export interface IDocument {
  _id: string;
  ownerId: string;
  title: string;
  yjsState?: string;       // base64-encoded Yjs state
  contentJson?: unknown;
  sizeBytes: number;
  isPublic: boolean;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const documentSchema = new Schema<IDocument>(
  {
    _id:         { type: String, default: () => crypto.randomUUID() },
    ownerId:     { type: String, required: true, index: true, ref: 'User' },
    title:       { type: String, required: true, default: 'Untitled Document' },
    yjsState:    String,
    contentJson: Schema.Types.Mixed,
    sizeBytes:   { type: Number, default: 0 },
    isPublic:    { type: Boolean, default: false },
    deletedAt:   { type: Date, default: null },
  },
  { timestamps: true },
);

documentSchema.index({ ownerId: 1, deletedAt: 1 });

export const Document = models.Document ?? model<IDocument>('Document', documentSchema);
