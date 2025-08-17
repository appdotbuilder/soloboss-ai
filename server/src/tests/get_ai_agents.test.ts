import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { aiAgentsTable } from '../db/schema';
import { getAIAgents } from '../handlers/get_ai_agents';
import { eq } from 'drizzle-orm';

// Test data for AI agents
const testAgent1 = {
  id: 'agent-1',
  name: 'Task Manager AI',
  description: 'An AI agent specialized in managing tasks and productivity',
  avatar_url: 'https://example.com/avatar1.png',
  specialization: 'Task Management',
  is_active: true
};

const testAgent2 = {
  id: 'agent-2',
  name: 'Document Analyzer',
  description: 'An AI agent for analyzing and organizing documents',
  avatar_url: null,
  specialization: 'Document Analysis',
  is_active: true
};

const inactiveAgent = {
  id: 'agent-inactive',
  name: 'Inactive Agent',
  description: 'This agent is inactive',
  avatar_url: null,
  specialization: 'General',
  is_active: false
};

describe('getAIAgents', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all active AI agents', async () => {
    // Create test data
    await db.insert(aiAgentsTable)
      .values([testAgent1, testAgent2, inactiveAgent])
      .execute();

    const result = await getAIAgents();

    // Should return only active agents
    expect(result).toHaveLength(2);
    
    // Check that both active agents are returned
    const agentIds = result.map(agent => agent.id);
    expect(agentIds).toContain('agent-1');
    expect(agentIds).toContain('agent-2');
    expect(agentIds).not.toContain('agent-inactive');

    // Verify specific agent details
    const taskManagerAgent = result.find(agent => agent.id === 'agent-1');
    expect(taskManagerAgent).toBeDefined();
    expect(taskManagerAgent!.name).toEqual('Task Manager AI');
    expect(taskManagerAgent!.description).toEqual('An AI agent specialized in managing tasks and productivity');
    expect(taskManagerAgent!.specialization).toEqual('Task Management');
    expect(taskManagerAgent!.is_active).toBe(true);
    expect(taskManagerAgent!.avatar_url).toEqual('https://example.com/avatar1.png');
    expect(taskManagerAgent!.created_at).toBeInstanceOf(Date);
  });

  it('should return empty array when no active agents exist', async () => {
    // Create only inactive agent
    await db.insert(aiAgentsTable)
      .values([inactiveAgent])
      .execute();

    const result = await getAIAgents();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array when no agents exist', async () => {
    const result = await getAIAgents();

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle agents with null avatar_url correctly', async () => {
    // Create agent with null avatar
    await db.insert(aiAgentsTable)
      .values([testAgent2])
      .execute();

    const result = await getAIAgents();

    expect(result).toHaveLength(1);
    expect(result[0].avatar_url).toBeNull();
    expect(result[0].name).toEqual('Document Analyzer');
    expect(result[0].is_active).toBe(true);
  });

  it('should verify data is correctly stored and retrieved', async () => {
    // Create test agent
    await db.insert(aiAgentsTable)
      .values([testAgent1])
      .execute();

    // Verify it exists in database
    const dbAgents = await db.select()
      .from(aiAgentsTable)
      .where(eq(aiAgentsTable.id, 'agent-1'))
      .execute();

    expect(dbAgents).toHaveLength(1);
    expect(dbAgents[0].name).toEqual('Task Manager AI');
    expect(dbAgents[0].is_active).toBe(true);

    // Verify handler returns the same data
    const result = await getAIAgents();
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual('agent-1');
    expect(result[0].name).toEqual('Task Manager AI');
  });

  it('should handle multiple active agents with various configurations', async () => {
    // Create agents with different configurations
    const agentWithAvatar = {
      id: 'agent-with-avatar',
      name: 'Agent With Avatar',
      description: 'Agent with avatar URL',
      avatar_url: 'https://example.com/avatar.jpg',
      specialization: 'General',
      is_active: true
    };

    const agentWithoutAvatar = {
      id: 'agent-no-avatar',
      name: 'Agent Without Avatar',
      description: 'Agent without avatar URL',
      avatar_url: null,
      specialization: 'Support',
      is_active: true
    };

    await db.insert(aiAgentsTable)
      .values([agentWithAvatar, agentWithoutAvatar])
      .execute();

    const result = await getAIAgents();

    expect(result).toHaveLength(2);
    
    // Check both configurations are handled correctly
    const withAvatar = result.find(agent => agent.id === 'agent-with-avatar');
    const withoutAvatar = result.find(agent => agent.id === 'agent-no-avatar');

    expect(withAvatar).toBeDefined();
    expect(withAvatar!.avatar_url).toEqual('https://example.com/avatar.jpg');

    expect(withoutAvatar).toBeDefined();
    expect(withoutAvatar!.avatar_url).toBeNull();

    // Verify all are active
    result.forEach(agent => {
      expect(agent.is_active).toBe(true);
      expect(agent.created_at).toBeInstanceOf(Date);
    });
  });
});