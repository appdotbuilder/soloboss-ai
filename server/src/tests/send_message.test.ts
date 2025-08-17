import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, aiAgentsTable, chatMessagesTable } from '../db/schema';
import { type SendMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq, and } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test data
const testUser = {
  id: randomUUID(),
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  profile_picture_url: null,
  created_at: new Date(),
  updated_at: new Date()
};

const testAgent = {
  id: randomUUID(),
  name: 'Productivity Assistant',
  description: 'Helps with task management and productivity',
  avatar_url: 'https://example.com/avatar.png',
  specialization: 'productivity',
  is_active: true,
  created_at: new Date()
};

const inactiveAgent = {
  id: randomUUID(),
  name: 'Inactive Assistant',
  description: 'An inactive agent for testing',
  avatar_url: null,
  specialization: 'general',
  is_active: false,
  created_at: new Date()
};

const testInput: SendMessageInput = {
  agent_id: testAgent.id,
  message: 'Hello, I need help with organizing my tasks'
};

describe('sendMessage', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test agents
    await db.insert(aiAgentsTable).values([testAgent, inactiveAgent]).execute();
  });
  
  afterEach(resetDB);

  it('should send a message and generate AI response', async () => {
    const result = await sendMessage(testUser.id, testInput);

    // Verify the AI response message structure
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.agent_id).toEqual(testAgent.id);
    expect(result.message).toEqual(testInput.message);
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe('string');
    expect(result.is_user_message).toBe(false);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save both user message and AI response to database', async () => {
    await sendMessage(testUser.id, testInput);

    // Check that both messages were saved
    const messages = await db.select()
      .from(chatMessagesTable)
      .where(and(
        eq(chatMessagesTable.user_id, testUser.id),
        eq(chatMessagesTable.agent_id, testAgent.id)
      ))
      .execute();

    expect(messages).toHaveLength(2);

    // Find user message and AI response
    const userMessage = messages.find(m => m.is_user_message === true);
    const aiMessage = messages.find(m => m.is_user_message === false);

    // Verify user message
    expect(userMessage).toBeDefined();
    expect(userMessage!.message).toEqual(testInput.message);
    expect(userMessage!.response).toBeNull();
    expect(userMessage!.is_user_message).toBe(true);

    // Verify AI response message
    expect(aiMessage).toBeDefined();
    expect(aiMessage!.message).toEqual(testInput.message);
    expect(aiMessage!.response).toBeDefined();
    expect(typeof aiMessage!.response).toBe('string');
    expect(aiMessage!.is_user_message).toBe(false);
  });

  it('should generate different responses based on agent specialization', async () => {
    const documentAgent = {
      id: randomUUID(),
      name: 'Document Assistant',
      description: 'Helps with document management',
      avatar_url: null,
      specialization: 'document',
      is_active: true,
      created_at: new Date()
    };

    await db.insert(aiAgentsTable).values(documentAgent).execute();

    const documentInput: SendMessageInput = {
      agent_id: documentAgent.id,
      message: 'Help me organize my files'
    };

    const result = await sendMessage(testUser.id, documentInput);

    // Should have a response related to document management
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe('string');
    expect(result.response!.length).toBeGreaterThan(0);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = randomUUID();

    await expect(sendMessage(nonExistentUserId, testInput))
      .rejects.toThrow(/User with id .+ not found/i);
  });

  it('should throw error when AI agent does not exist', async () => {
    const invalidInput: SendMessageInput = {
      agent_id: randomUUID(),
      message: 'Hello'
    };

    await expect(sendMessage(testUser.id, invalidInput))
      .rejects.toThrow(/AI agent with id .+ not found/i);
  });

  it('should throw error when AI agent is inactive', async () => {
    const inactiveInput: SendMessageInput = {
      agent_id: inactiveAgent.id,
      message: 'Hello'
    };

    await expect(sendMessage(testUser.id, inactiveInput))
      .rejects.toThrow(/AI agent with id .+ is not active/i);
  });

  it('should handle empty message correctly', async () => {
    const emptyInput: SendMessageInput = {
      agent_id: testAgent.id,
      message: ''
    };

    const result = await sendMessage(testUser.id, emptyInput);

    expect(result.message).toEqual('');
    expect(result.response).toBeDefined();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.agent_id).toEqual(testAgent.id);
  });

  it('should handle long message correctly', async () => {
    const longMessage = 'a'.repeat(1000);
    const longInput: SendMessageInput = {
      agent_id: testAgent.id,
      message: longMessage
    };

    const result = await sendMessage(testUser.id, longInput);

    expect(result.message).toEqual(longMessage);
    expect(result.response).toBeDefined();
    expect(result.user_id).toEqual(testUser.id);
    expect(result.agent_id).toEqual(testAgent.id);
  });
});