import {
  pgTable,
  serial,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  varchar,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['admin', 'member']);
export const sourceTypeEnum = pgEnum('source_type', ['file', 'teamwork']);
export const sourceStatusEnum = pgEnum('source_status', ['pending', 'syncing', 'ready', 'error']);
export const runStatusEnum = pgEnum('run_status', ['pending', 'running', 'completed', 'failed', 'cancelled']);

// Helper for audit columns
const auditColumns = {
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
};

// ============= ORGANIZATIONS =============
export const organizations = pgTable('organizations', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  ...auditColumns,
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  users: many(users),
  invitations: many(invitations),
  projects: many(projects),
  auditLogs: many(auditLogs),
}));

// ============= USERS =============
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('member'),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  ...auditColumns,
}, (table) => ({
  emailIdx: uniqueIndex('users_email_idx').on(table.email),
  orgIdx: index('users_org_idx').on(table.organizationId),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [users.organizationId],
    references: [organizations.id],
  }),
  refreshTokens: many(refreshTokens),
  passwordResets: many(passwordResets),
  projects: many(projects),
  auditLogs: many(auditLogs),
}));

// ============= REFRESH TOKENS =============
export const refreshTokens = pgTable('refresh_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  ...auditColumns,
}, (table) => ({
  userIdx: index('refresh_tokens_user_idx').on(table.userId),
  tokenIdx: index('refresh_tokens_token_idx').on(table.tokenHash),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));

// ============= INVITATIONS =============
export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  role: userRoleEnum('role').notNull().default('member'),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  invitedById: integer('invited_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  ...auditColumns,
}, (table) => ({
  tokenIdx: uniqueIndex('invitations_token_idx').on(table.token),
  emailIdx: index('invitations_email_idx').on(table.email),
  orgIdx: index('invitations_org_idx').on(table.organizationId),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedById],
    references: [users.id],
  }),
}));

// ============= PASSWORD RESETS =============
export const passwordResets = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  ...auditColumns,
}, (table) => ({
  userIdx: index('password_resets_user_idx').on(table.userId),
  tokenIdx: index('password_resets_token_idx').on(table.tokenHash),
}));

export const passwordResetsRelations = relations(passwordResets, ({ one }) => ({
  user: one(users, {
    fields: [passwordResets.userId],
    references: [users.id],
  }),
}));

// ============= PROJECTS =============
export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdById: integer('created_by_id').notNull().references(() => users.id, { onDelete: 'set null' }),
  deletedAt: timestamp('deleted_at'),
  ...auditColumns,
}, (table) => ({
  orgIdx: index('projects_org_idx').on(table.organizationId),
  nameOrgIdx: uniqueIndex('projects_name_org_idx').on(table.name, table.organizationId).where(table.deletedAt),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  createdBy: one(users, {
    fields: [projects.createdById],
    references: [users.id],
  }),
  sources: many(sources),
  processingConfig: one(processingConfigs),
  processingRuns: many(processingRuns),
}));

// ============= SOURCES =============
export const sources = pgTable('sources', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: sourceTypeEnum('type').notNull(),
  status: sourceStatusEnum('status').notNull().default('pending'),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  // File source fields
  fileName: varchar('file_name', { length: 255 }),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  fileType: varchar('file_type', { length: 50 }),
  // Teamwork source fields
  teamworkApiKey: text('teamwork_api_key'), // Encrypted
  teamworkDomain: varchar('teamwork_domain', { length: 255 }),
  teamworkDataTypes: jsonb('teamwork_data_types').$type<string[]>(),
  lastSyncAt: timestamp('last_sync_at'),
  syncError: text('sync_error'),
  // Cached data
  cachedData: jsonb('cached_data'),
  recordCount: integer('record_count'),
  ...auditColumns,
}, (table) => ({
  projectIdx: index('sources_project_idx').on(table.projectId),
  statusIdx: index('sources_status_idx').on(table.status),
}));

export const sourcesRelations = relations(sources, ({ one }) => ({
  project: one(projects, {
    fields: [sources.projectId],
    references: [projects.id],
  }),
  schemaMapping: one(schemaMappings),
  deidentificationConfig: one(deidentificationConfigs),
}));

// ============= SCHEMA MAPPINGS =============
export const schemaMappings = pgTable('schema_mappings', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').notNull().unique().references(() => sources.id, { onDelete: 'cascade' }),
  mapping: jsonb('mapping').notNull().$type<Record<string, string>>(),
  detectedSchema: jsonb('detected_schema').$type<Record<string, string>>(),
  ...auditColumns,
}, (table) => ({
  sourceIdx: uniqueIndex('schema_mappings_source_idx').on(table.sourceId),
}));

export const schemaMappingsRelations = relations(schemaMappings, ({ one }) => ({
  source: one(sources, {
    fields: [schemaMappings.sourceId],
    references: [sources.id],
  }),
}));

// ============= DEIDENTIFICATION CONFIGS =============
export const deidentificationConfigs = pgTable('deidentification_configs', {
  id: serial('id').primaryKey(),
  sourceId: integer('source_id').notNull().unique().references(() => sources.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull().$type<{
    enabled: boolean;
    fields: { field: string; strategy: string }[];
    customPatterns: { name: string; pattern: string }[];
  }>(),
  detectedPii: jsonb('detected_pii').$type<{ field: string; type: string; confidence: number }[]>(),
  ...auditColumns,
}, (table) => ({
  sourceIdx: uniqueIndex('deidentification_configs_source_idx').on(table.sourceId),
}));

export const deidentificationConfigsRelations = relations(deidentificationConfigs, ({ one }) => ({
  source: one(sources, {
    fields: [deidentificationConfigs.sourceId],
    references: [sources.id],
  }),
}));

// ============= PROCESSING CONFIGS =============
export const processingConfigs = pgTable('processing_configs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().unique().references(() => projects.id, { onDelete: 'cascade' }),
  config: jsonb('config').notNull().$type<{
    outputFormat: 'conversational' | 'qa' | 'json';
    includeMetadata: boolean;
    chunkSize: number;
    qualityFilters: { minLength: number; maxLength: number };
  }>(),
  ...auditColumns,
}, (table) => ({
  projectIdx: uniqueIndex('processing_configs_project_idx').on(table.projectId),
}));

export const processingConfigsRelations = relations(processingConfigs, ({ one }) => ({
  project: one(projects, {
    fields: [processingConfigs.projectId],
    references: [projects.id],
  }),
}));

// ============= PROCESSING RUNS =============
export const processingRuns = pgTable('processing_runs', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  status: runStatusEnum('status').notNull().default('pending'),
  progress: integer('progress').notNull().default(0),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  error: text('error'),
  errorDetails: jsonb('error_details'),
  config: jsonb('config').$type<Record<string, any>>(),
  stats: jsonb('stats').$type<{
    totalRecords: number;
    processedRecords: number;
    piiDetected: number;
    piiMasked: number;
  }>(),
  ...auditColumns,
}, (table) => ({
  projectIdx: index('processing_runs_project_idx').on(table.projectId),
  statusIdx: index('processing_runs_status_idx').on(table.status),
}));

export const processingRunsRelations = relations(processingRuns, ({ one }) => ({
  project: one(projects, {
    fields: [processingRuns.projectId],
    references: [projects.id],
  }),
  dataset: one(datasets),
}));

// ============= DATASETS =============
export const datasets = pgTable('datasets', {
  id: serial('id').primaryKey(),
  runId: integer('run_id').notNull().unique().references(() => processingRuns.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  format: varchar('format', { length: 50 }).notNull(),
  filePath: text('file_path'),
  fileSize: integer('file_size'),
  recordCount: integer('record_count'),
  stats: jsonb('stats').$type<{
    totalConversations: number;
    avgConversationLength: number;
    uniqueSpeakers: number;
  }>(),
  ...auditColumns,
}, (table) => ({
  runIdx: uniqueIndex('datasets_run_idx').on(table.runId),
}));

export const datasetsRelations = relations(datasets, ({ one }) => ({
  run: one(processingRuns, {
    fields: [datasets.runId],
    references: [processingRuns.id],
  }),
}));

// ============= AUDIT LOGS =============
export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  organizationId: integer('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: integer('user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }).notNull(),
  resourceId: integer('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  ...auditColumns,
}, (table) => ({
  orgIdx: index('audit_logs_org_idx').on(table.organizationId),
  userIdx: index('audit_logs_user_idx').on(table.userId),
  actionIdx: index('audit_logs_action_idx').on(table.action),
  createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;

export type PasswordReset = typeof passwordResets.$inferSelect;
export type NewPasswordReset = typeof passwordResets.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;

export type SchemaMapping = typeof schemaMappings.$inferSelect;
export type NewSchemaMapping = typeof schemaMappings.$inferInsert;

export type DeidentificationConfig = typeof deidentificationConfigs.$inferSelect;
export type NewDeidentificationConfig = typeof deidentificationConfigs.$inferInsert;

export type ProcessingConfig = typeof processingConfigs.$inferSelect;
export type NewProcessingConfig = typeof processingConfigs.$inferInsert;

export type ProcessingRun = typeof processingRuns.$inferSelect;
export type NewProcessingRun = typeof processingRuns.$inferInsert;

export type Dataset = typeof datasets.$inferSelect;
export type NewDataset = typeof datasets.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
