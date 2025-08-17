import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  first_name: z.string(),
  last_name: z.string(),
  profile_picture_url: z.string().url().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Dashboard/BossRoom schema
export const dashboardStatsSchema = z.object({
  total_tasks: z.number().int().nonnegative(),
  completed_tasks: z.number().int().nonnegative(),
  pending_tasks: z.number().int().nonnegative(),
  total_documents: z.number().int().nonnegative(),
  recent_activity_count: z.number().int().nonnegative()
});

export type DashboardStats = z.infer<typeof dashboardStatsSchema>;

// SlayList (Tasks) schema
export const taskSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(['pending', 'in_progress', 'completed']),
  priority: z.enum(['low', 'medium', 'high']),
  due_date: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Task = z.infer<typeof taskSchema>;

// Task input schemas
export const createTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().nullable(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  due_date: z.coerce.date().nullable()
});

export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  status: z.enum(['pending', 'in_progress', 'completed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  due_date: z.coerce.date().nullable().optional()
});

export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

// Briefcase (Documents) schema
export const documentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  file_url: z.string().url(),
  file_type: z.string(),
  file_size: z.number().int().positive(),
  folder_path: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Document = z.infer<typeof documentSchema>;

// Document input schemas
export const createDocumentInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullable(),
  file_url: z.string().url(),
  file_type: z.string(),
  file_size: z.number().int().positive(),
  folder_path: z.string().nullable()
});

export type CreateDocumentInput = z.infer<typeof createDocumentInputSchema>;

export const updateDocumentInputSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  folder_path: z.string().nullable().optional()
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentInputSchema>;

// AI Agent schema
export const aiAgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  avatar_url: z.string().url().nullable(),
  specialization: z.string(),
  is_active: z.boolean(),
  created_at: z.coerce.date()
});

export type AIAgent = z.infer<typeof aiAgentSchema>;

// AI Chat/Interaction schema
export const chatMessageSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  agent_id: z.string(),
  message: z.string(),
  response: z.string().nullable(),
  is_user_message: z.boolean(),
  created_at: z.coerce.date()
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

export const sendMessageInputSchema = z.object({
  agent_id: z.string(),
  message: z.string().min(1)
});

export type SendMessageInput = z.infer<typeof sendMessageInputSchema>;

// User profile input schemas
export const updateUserProfileInputSchema = z.object({
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  profile_picture_url: z.string().url().nullable().optional()
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileInputSchema>;

// Activity log schema
export const activityLogSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  action: z.string(),
  description: z.string(),
  entity_type: z.enum(['task', 'document', 'chat', 'profile']).nullable(),
  entity_id: z.string().nullable(),
  created_at: z.coerce.date()
});

export type ActivityLog = z.infer<typeof activityLogSchema>;