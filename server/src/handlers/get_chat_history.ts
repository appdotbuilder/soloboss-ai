import { type ChatMessage } from '../schema';

export async function getChatHistory(userId: string, agentId: string, limit: number = 50): Promise<ChatMessage[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching chat history between a user and specific AI agent.
    // Should return messages ordered by created_at desc with optional pagination limit.
    return Promise.resolve([] as ChatMessage[]);
}