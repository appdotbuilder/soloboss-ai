import { db } from '../db';
import { aiAgentsTable } from '../db/schema';
import { type AIAgent } from '../schema';
import { eq } from 'drizzle-orm';

export const getAIAgents = async (): Promise<AIAgent[]> => {
  try {
    // Fetch all active AI agents
    const results = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.is_active, true))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch AI agents:', error);
    throw error;
  }
};