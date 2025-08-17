import { db } from '../db';
import { chatMessagesTable, usersTable, aiAgentsTable } from '../db/schema';
import { type SendMessageInput, type ChatMessage } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const sendMessage = async (userId: string, input: SendMessageInput): Promise<ChatMessage> => {
  try {
    // Validate that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    // Validate that the AI agent exists and is active
    const agent = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.id, input.agent_id))
      .execute();

    if (agent.length === 0) {
      throw new Error(`AI agent with id ${input.agent_id} not found`);
    }

    if (!agent[0].is_active) {
      throw new Error(`AI agent with id ${input.agent_id} is not active`);
    }

    // Save the user message first
    const userMessageId = randomUUID();
    await db.insert(chatMessagesTable)
      .values({
        id: userMessageId,
        user_id: userId,
        agent_id: input.agent_id,
        message: input.message,
        response: null, // User messages don't have responses
        is_user_message: true
      })
      .execute();

    // Generate AI response (simplified for this implementation)
    // In a real implementation, this would call an external AI API
    const aiResponse = generateAIResponse(input.message, agent[0].specialization);

    // Save the AI response message
    const aiMessageId = randomUUID();
    const result = await db.insert(chatMessagesTable)
      .values({
        id: aiMessageId,
        user_id: userId,
        agent_id: input.agent_id,
        message: input.message, // Keep original user message for context
        response: aiResponse,
        is_user_message: false
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Send message failed:', error);
    throw error;
  }
};

// Simple AI response generator for demo purposes
// In a real implementation, this would integrate with OpenAI, Claude, etc.
function generateAIResponse(userMessage: string, specialization: string): string {
  const responses = {
    'productivity': [
      'I can help you organize your tasks and improve your workflow.',
      'Let me suggest some productivity techniques that might work for you.',
      'Have you considered breaking this down into smaller, manageable steps?'
    ],
    'document': [
      'I can help you organize and manage your documents effectively.',
      'Would you like me to suggest a better filing system for your documents?',
      'I can assist with document formatting and organization.'
    ],
    'general': [
      'I\'m here to help you with whatever you need.',
      'Let me think about the best way to assist you with that.',
      'That\'s an interesting question. Let me provide some guidance.'
    ]
  };

  const responsePool = responses[specialization as keyof typeof responses] || responses.general;
  const randomIndex = Math.floor(Math.random() * responsePool.length);
  return responsePool[randomIndex];
}