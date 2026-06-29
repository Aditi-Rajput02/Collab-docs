import {
  mysqlTable, mysqlEnum, varchar, text, boolean,
  timestamp, json, bigint, index, unique,
} from 'drizzle-orm/mysql-core';

const newId = () => crypto.randomUUID();

// Yjs binary data (state vectors, updates) stored as base64 text.
// drizzle-orm 0.30.x has no blob type for MySQL — use longtext instead.
const longtext = (name: string) => text(name);

export const users = mysqlTable('users', {
  id:        varchar('id', { length: 36 }).primaryKey().$defaultFn(newId),
  email:     varchar('email', { length: 255 }).notNull().unique(),
  name:      varchar('name', { length: 255 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  provider:  varchar('provider', { length: 50 }).default('credentials'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
}, t => ({
  emailIdx: index('users_email_idx').on(t.email),
}));

export const documents = mysqlTable('documents', {
  id:          varchar('id', { length: 36 }).primaryKey().$defaultFn(newId),
  ownerId:     varchar('owner_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:       varchar('title', { length: 500 }).notNull().default('Untitled Document'),
  yjsState:    longtext('yjs_state'),   // base64-encoded Yjs document state
  contentJson: json('content_json'),
  sizeBytes:   bigint('size_bytes', { mode: 'number' }).default(0),
  isPublic:    boolean('is_public').default(false),
  deletedAt:   timestamp('deleted_at'),
  createdAt:   timestamp('created_at').defaultNow(),
  updatedAt:   timestamp('updated_at').defaultNow().onUpdateNow(),
}, t => ({
  ownerIdx:   index('docs_owner_idx').on(t.ownerId),
  deletedIdx: index('docs_deleted_idx').on(t.deletedAt),
}));

export const documentCollaborators = mysqlTable('document_collaborators', {
  id:         varchar('id', { length: 36 }).primaryKey().$defaultFn(newId),
  documentId: varchar('document_id', { length: 36 }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  userId:     varchar('user_id', { length: 36 }).notNull().references(() => users.id, { onDelete: 'cascade' }),
  role:       mysqlEnum('role', ['owner', 'editor', 'viewer']).notNull().default('viewer'),
  invitedBy:  varchar('invited_by', { length: 36 }).references(() => users.id),
  acceptedAt: timestamp('accepted_at'),
  createdAt:  timestamp('created_at').defaultNow(),
}, t => ({
  uniq: unique('collab_unique').on(t.documentId, t.userId),
}));

export const documentVersions = mysqlTable('document_versions', {
  id:          varchar('id', { length: 36 }).primaryKey().$defaultFn(newId),
  documentId:  varchar('document_id', { length: 36 }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  createdBy:   varchar('created_by', { length: 36 }).notNull().references(() => users.id),
  label:       varchar('label', { length: 200 }),
  description: text('description'),
  snapshot:    json('snapshot').notNull(),
  yjsSv:       longtext('yjs_sv'),      // base64-encoded Yjs state vector
  createdAt:   timestamp('created_at').defaultNow(),
}, t => ({
  docIdx:  index('versions_doc_idx').on(t.documentId),
  dateIdx: index('versions_date_idx').on(t.createdAt),
}));

export const syncOperations = mysqlTable('sync_operations', {
  id:         varchar('id', { length: 36 }).primaryKey().$defaultFn(newId),
  documentId: varchar('document_id', { length: 36 }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  userId:     varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  yjsUpdate:  longtext('yjs_update').notNull(), // base64-encoded Yjs update
  clientId:   varchar('client_id', { length: 100 }).notNull(),
  clock:      bigint('clock', { mode: 'number' }).notNull(),
  syncedAt:   timestamp('synced_at'),
  createdAt:  timestamp('created_at').defaultNow(),
}, t => ({
  docClockIdx: index('sync_ops_doc_clock_idx').on(t.documentId, t.clock),
}));

export const aiSuggestions = mysqlTable('ai_suggestions', {
  id:         varchar('id', { length: 36 }).primaryKey().$defaultFn(newId),
  documentId: varchar('document_id', { length: 36 }).notNull().references(() => documents.id, { onDelete: 'cascade' }),
  userId:     varchar('user_id', { length: 36 }).notNull().references(() => users.id),
  type:       mysqlEnum('type', ['summary', 'grammar', 'autocomplete', 'rewrite', 'explain']).notNull(),
  prompt:     text('prompt'),
  response:   text('response'),
  createdAt:  timestamp('created_at').defaultNow(),
});

export type User                 = typeof users.$inferSelect;
export type Document             = typeof documents.$inferSelect;
export type DocumentCollaborator = typeof documentCollaborators.$inferSelect;
export type DocumentVersion      = typeof documentVersions.$inferSelect;
export type SyncOperation        = typeof syncOperations.$inferSelect;

// Helpers to convert Yjs Uint8Array ↔ base64 string for DB storage
export const yjsToBase64 = (data: Uint8Array): string =>
  Buffer.from(data).toString('base64');

export const base64ToYjs = (data: string): Uint8Array =>
  new Uint8Array(Buffer.from(data, 'base64'));
