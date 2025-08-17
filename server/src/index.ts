import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  createTaskInputSchema,
  updateTaskInputSchema,
  createDocumentInputSchema,
  updateDocumentInputSchema,
  sendMessageInputSchema,
  updateUserProfileInputSchema
} from './schema';

// Import handlers
import { getDashboardStats } from './handlers/get_dashboard_stats';
import { createTask } from './handlers/create_task';
import { getTasks } from './handlers/get_tasks';
import { updateTask } from './handlers/update_task';
import { deleteTask } from './handlers/delete_task';
import { createDocument } from './handlers/create_document';
import { getDocuments } from './handlers/get_documents';
import { updateDocument } from './handlers/update_document';
import { deleteDocument } from './handlers/delete_document';
import { getAIAgents } from './handlers/get_ai_agents';
import { sendMessage } from './handlers/send_message';
import { getChatHistory } from './handlers/get_chat_history';
import { getUserProfile } from './handlers/get_user_profile';
import { updateUserProfile } from './handlers/update_user_profile';
import { getRecentActivity } from './handlers/get_recent_activity';
import { logActivity } from './handlers/log_activity';

// Define context type
type Context = {
  userId: string;
};

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

// For now, we'll use a simple context. In production, this should include authentication.
const createContext = (): Context => {
  return {
    // TODO: Add authenticated user context from Supabase JWT
    userId: 'placeholder-user-id' // This should come from authenticated session
  };
};

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Dashboard/BossRoom routes
  getDashboardStats: publicProcedure
    .query(({ ctx }) => getDashboardStats(ctx.userId)),

  // SlayList (Tasks) routes
  createTask: publicProcedure
    .input(createTaskInputSchema)
    .mutation(({ input, ctx }) => createTask(ctx.userId, input)),

  getTasks: publicProcedure
    .query(({ ctx }) => getTasks(ctx.userId)),

  updateTask: publicProcedure
    .input(updateTaskInputSchema)
    .mutation(({ input, ctx }) => updateTask(ctx.userId, input)),

  deleteTask: publicProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(({ input, ctx }) => deleteTask(ctx.userId, input.taskId)),

  // Briefcase (Documents) routes
  createDocument: publicProcedure
    .input(createDocumentInputSchema)
    .mutation(({ input, ctx }) => createDocument(ctx.userId, input)),

  getDocuments: publicProcedure
    .input(z.object({ folderPath: z.string().optional() }))
    .query(({ input, ctx }) => getDocuments(ctx.userId, input.folderPath)),

  updateDocument: publicProcedure
    .input(updateDocumentInputSchema)
    .mutation(({ input, ctx }) => updateDocument(ctx.userId, input)),

  deleteDocument: publicProcedure
    .input(z.object({ documentId: z.string() }))
    .mutation(({ input, ctx }) => deleteDocument(ctx.userId, input.documentId)),

  // AI Agents routes
  getAIAgents: publicProcedure
    .query(() => getAIAgents()),

  sendMessage: publicProcedure
    .input(sendMessageInputSchema)
    .mutation(({ input, ctx }) => sendMessage(ctx.userId, input)),

  getChatHistory: publicProcedure
    .input(z.object({ 
      agentId: z.string(),
      limit: z.number().int().positive().default(50)
    }))
    .query(({ input, ctx }) => getChatHistory(ctx.userId, input.agentId, input.limit)),

  // User Profile routes
  getUserProfile: publicProcedure
    .query(({ ctx }) => getUserProfile(ctx.userId)),

  updateUserProfile: publicProcedure
    .input(updateUserProfileInputSchema)
    .mutation(({ input, ctx }) => updateUserProfile(ctx.userId, input)),

  // Activity routes
  getRecentActivity: publicProcedure
    .input(z.object({ limit: z.number().int().positive().default(20) }))
    .query(({ input, ctx }) => getRecentActivity(ctx.userId, input.limit)),

  logActivity: publicProcedure
    .input(z.object({
      action: z.string(),
      description: z.string(),
      entityType: z.enum(['task', 'document', 'chat', 'profile']).optional(),
      entityId: z.string().optional()
    }))
    .mutation(({ input, ctx }) => logActivity(
      ctx.userId, 
      input.action, 
      input.description, 
      input.entityType, 
      input.entityId
    )),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext,
  });
  server.listen(port);
  console.log(`SoloBoss AI TRPC server listening at port: ${port}`);
}

start();