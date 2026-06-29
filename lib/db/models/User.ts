import mongoose, { Schema, model, models } from 'mongoose';

export interface IUser {
  _id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  provider: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id:       { type: String, default: () => crypto.randomUUID() },
    email:     { type: String, required: true, unique: true, index: true },
    name:      { type: String, required: true },
    avatarUrl: String,
    provider:  { type: String, default: 'credentials' },
  },
  { timestamps: true },
);

export const User = models.User ?? model<IUser>('User', userSchema);
