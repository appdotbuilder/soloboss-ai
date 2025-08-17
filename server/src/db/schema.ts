import { text, pgTable, timestamp, boolean, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high']);
export const activityEntityTypeEnum = pgEnum('activity_entity_type', ['task', 'document', 'chat', 'profile']);

// Users table
export const usersTable = pgTable('users', {
  id: text('id').primaryKey(), // UUID from Supabase auth
  email: text('email').notNull().unique(),
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  profile_picture_url: text('profile_picture_url'), // Nullable for optional profile picture
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Tasks table (SlayList)
export const tasksTable = pgTable('tasks', {
  id: text('id').primaryKey(), // UUID
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'), // Nullable for optional description
  status: taskStatusEnum('status').notNull().default('pending'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  due_date: timestamp('due_date'), // Nullable for optional due date
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// Documents table (Briefcase)
export const documentsTable = pgTable('documents', {
  id: text('id').primaryKey(), // UUID
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'), // Nullable for optional description
  file_url: text('file_url').notNull(), // URL from Supabase Storage
  file_type: text('file_type').notNull(),
  file_size: integer('file_size').notNull(), // File size in bytes
  folder_path: text('folder_path'), // Nullable for optional folder organization
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// AI Agents table
export const aiAgentsTable = pgTable('ai_agents', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  description: text('description').notNull(),
  avatar_url: text('avatar_url'), // Nullable for optional avatar
  specialization: text('specialization').notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Chat Messages table
export const chatMessagesTable = pgTable('chat_messages', {
  id: text('id').primaryKey(), // UUID
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  agent_id: text('agent_id').notNull().references(() => aiAgentsTable.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  response: text('response'), // Nullable until AI responds
  is_user_message: boolean('is_user_message').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Activity Log table
export const activityLogTable = pgTable('activity_log', {
  id: text('id').primaryKey(), // UUID
  user_id: text('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  description: text('description').notNull(),
  entity_type: activityEntityTypeEnum('entity_type'), // Nullable for general actions
  entity_id: text('entity_id'), // Nullable for general actions
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  tasks: many(tasksTable),
  documents: many(documentsTable),
  chatMessages: many(chatMessagesTable),
  activityLogs: many(activityLogTable),
}));

export const tasksRelations = relations(tasksTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [tasksTable.user_id],
    references: [usersTable.id],
  }),
}));

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [documentsTable.user_id],
    references: [usersTable.id],
  }),
}));

export const aiAgentsRelations = relations(aiAgentsTable, ({ many }) => ({
  chatMessages: many(chatMessagesTable),
}));

export const chatMessagesRelations = relations(chatMessagesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [chatMessagesTable.user_id],
    references: [usersTable.id],
  }),
  agent: one(aiAgentsTable, {
    fields: [chatMessagesTable.agent_id],
    references: [aiAgentsTable.id],
  }),
}));

export const activityLogRelations = relations(activityLogTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [activityLogTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type Task = typeof tasksTable.$inferSelect;
export type NewTask = typeof tasksTable.$inferInsert;

export type Document = typeof documentsTable.$inferSelect;
export type NewDocument = typeof documentsTable.$inferInsert;

export type AIAgent = typeof aiAgentsTable.$inferSelect;
export type NewAIAgent = typeof aiAgentsTable.$inferInsert;

export type ChatMessage = typeof chatMessagesTable.$inferSelect;
export type NewChatMessage = typeof chatMessagesTable.$inferInsert;

export type ActivityLog = typeof activityLogTable.$inferSelect;
export type NewActivityLog = typeof activityLogTable.$inferInsert;

// Export all tables for relation queries
export const tables = {
  users: usersTable,
  tasks: tasksTable,
  documents: documentsTable,
  aiAgents: aiAgentsTable,
  chatMessages: chatMessagesTable,
  activityLog: activityLogTable,
};