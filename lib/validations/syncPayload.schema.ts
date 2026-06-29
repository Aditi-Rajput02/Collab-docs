import { z } from 'zod';

export const inviteCollaboratorSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['editor', 'viewer']),
});

export const updateRoleSchema = z.object({
  role: z.enum(['editor', 'viewer']),
});

export const createVersionSchema = z.object({
  label: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
});

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).trim().optional(),
  isPublic: z.boolean().optional(),
});

export type InviteCollaboratorInput = z.infer<typeof inviteCollaboratorSchema>;
export type CreateVersionInput = z.infer<typeof createVersionSchema>;
export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
