import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, aiAgentsTable, chatMessagesTable } from '../db/schema';
import { getChatHistory } from '../handlers/get_chat_history';
import { eq } from 'drizzle-orm';

describe('getChatHistory', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return chat history between user and agent', async () => {
    // Create test user
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });

    // Create test AI agent
    await db.insert(aiAgentsTable).values({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test AI agent',
      specialization: 'General'
    });

    // Create test chat messages
    const baseTime = new Date();
    const messages = [
      {
        id: 'msg-1',
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: 'Hello agent',
        response: null,
        is_user_message: true,
        created_at: new Date(baseTime.getTime() - 3000) // 3 seconds ago
      },
      {
        id: 'msg-2',
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: 'Hello agent',
        response: 'Hello! How can I help you?',
        is_user_message: false,
        created_at: new Date(baseTime.getTime() - 2000) // 2 seconds ago
      },
      {
        id: 'msg-3',
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: 'What can you do?',
        response: null,
        is_user_message: true,
        created_at: new Date(baseTime.getTime() - 1000) // 1 second ago
      }
    ];

    await db.insert(chatMessagesTable).values(messages);

    const result = await getChatHistory('user-1', 'agent-1');

    // Should return 3 messages ordered by created_at desc (newest first)
    expect(result).toHaveLength(3);
    expect(result[0].id).toBe('msg-3'); // Most recent
    expect(result[1].id).toBe('msg-2');
    expect(result[2].id).toBe('msg-1'); // Oldest

    // Verify message content
    expect(result[0].message).toBe('What can you do?');
    expect(result[0].is_user_message).toBe(true);
    expect(result[1].response).toBe('Hello! How can I help you?');
    expect(result[1].is_user_message).toBe(false);
  });

  it('should respect the limit parameter', async () => {
    // Create test user and agent
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });

    await db.insert(aiAgentsTable).values({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test AI agent',
      specialization: 'General'
    });

    // Create 5 test messages
    const messages = [];
    for (let i = 0; i < 5; i++) {
      messages.push({
        id: `msg-${i}`,
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: `Message ${i}`,
        response: null,
        is_user_message: true,
        created_at: new Date(Date.now() - (5000 - i * 1000)) // Spread over 5 seconds
      });
    }

    await db.insert(chatMessagesTable).values(messages);

    // Test with limit of 2
    const result = await getChatHistory('user-1', 'agent-1', 2);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('msg-4'); // Most recent
    expect(result[1].id).toBe('msg-3');
  });

  it('should return empty array when no messages exist', async () => {
    // Create test user and agent but no messages
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });

    await db.insert(aiAgentsTable).values({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test AI agent',
      specialization: 'General'
    });

    const result = await getChatHistory('user-1', 'agent-1');

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should only return messages between specific user and agent', async () => {
    // Create test users and agents
    await db.insert(usersTable).values([
      {
        id: 'user-1',
        email: 'user1@example.com',
        first_name: 'User',
        last_name: 'One'
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        first_name: 'User',
        last_name: 'Two'
      }
    ]);

    await db.insert(aiAgentsTable).values([
      {
        id: 'agent-1',
        name: 'Agent One',
        description: 'First test agent',
        specialization: 'General'
      },
      {
        id: 'agent-2',
        name: 'Agent Two',
        description: 'Second test agent',
        specialization: 'Specific'
      }
    ]);

    // Create messages for different user-agent combinations with explicit timestamps
    const baseTime = new Date();
    await db.insert(chatMessagesTable).values([
      {
        id: 'msg-1',
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: 'User 1 to Agent 1',
        response: null,
        is_user_message: true,
        created_at: new Date(baseTime.getTime() - 4000) // 4 seconds ago
      },
      {
        id: 'msg-2',
        user_id: 'user-1',
        agent_id: 'agent-2',
        message: 'User 1 to Agent 2',
        response: null,
        is_user_message: true,
        created_at: new Date(baseTime.getTime() - 3000) // 3 seconds ago
      },
      {
        id: 'msg-3',
        user_id: 'user-2',
        agent_id: 'agent-1',
        message: 'User 2 to Agent 1',
        response: null,
        is_user_message: true,
        created_at: new Date(baseTime.getTime() - 2000) // 2 seconds ago
      },
      {
        id: 'msg-4',
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: 'Another User 1 to Agent 1',
        response: null,
        is_user_message: true,
        created_at: new Date(baseTime.getTime() - 1000) // 1 second ago (most recent)
      }
    ]);

    // Get chat history for user-1 and agent-1
    const result = await getChatHistory('user-1', 'agent-1');

    // Should only return messages between user-1 and agent-1
    expect(result).toHaveLength(2);
    expect(result[0].message).toBe('Another User 1 to Agent 1'); // Most recent
    expect(result[1].message).toBe('User 1 to Agent 1'); // Older

    // Verify all messages belong to correct user and agent
    result.forEach(message => {
      expect(message.user_id).toBe('user-1');
      expect(message.agent_id).toBe('agent-1');
    });
  });

  it('should handle messages with null responses correctly', async () => {
    // Create test user and agent
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });

    await db.insert(aiAgentsTable).values({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test AI agent',
      specialization: 'General'
    });

    // Create message with null response (pending AI response)
    await db.insert(chatMessagesTable).values({
      id: 'msg-1',
      user_id: 'user-1',
      agent_id: 'agent-1',
      message: 'Pending message',
      response: null,
      is_user_message: true
    });

    const result = await getChatHistory('user-1', 'agent-1');

    expect(result).toHaveLength(1);
    expect(result[0].message).toBe('Pending message');
    expect(result[0].response).toBeNull();
    expect(result[0].is_user_message).toBe(true);
  });

  it('should use default limit of 50 when not specified', async () => {
    // Create test user and agent
    await db.insert(usersTable).values({
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User'
    });

    await db.insert(aiAgentsTable).values({
      id: 'agent-1',
      name: 'Test Agent',
      description: 'A test AI agent',
      specialization: 'General'
    });

    // Create just a few messages to verify default behavior works
    const messages = [];
    for (let i = 0; i < 3; i++) {
      messages.push({
        id: `msg-${i}`,
        user_id: 'user-1',
        agent_id: 'agent-1',
        message: `Message ${i}`,
        response: null,
        is_user_message: true
      });
    }

    await db.insert(chatMessagesTable).values(messages);

    // Call without limit parameter (should use default of 50)
    const result = await getChatHistory('user-1', 'agent-1');

    // Should return all 3 messages since 3 < 50
    expect(result).toHaveLength(3);
  });
});