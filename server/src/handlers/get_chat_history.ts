import { db } from '../db';
import { chatMessagesTable } from '../db/schema';
import { type ChatMessage } from '../schema';
import { eq, and, desc } from 'drizzle-orm';

export const getChatHistory = async (userId: string, agentId: string, limit: number = 50): Promise<ChatMessage[]> => {
  try {
    // Build query to get chat messages between user and agent
    const results = await db.select()
      .from(chatMessagesTable)
      .where(
        and(
          eq(chatMessagesTable.user_id, userId),
          eq(chatMessagesTable.agent_id, agentId)
        )
      )
      .orderBy(desc(chatMessagesTable.created_at))
      .limit(limit)
      .execute();

    // Return results directly as no numeric conversions needed
    return results;
  } catch (error) {
    console.error('Get chat history failed:', error);
    throw error;
  }
};