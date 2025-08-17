import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type CreateTaskInput } from '../schema';
import { createTask } from '../handlers/create_task';
import { eq } from 'drizzle-orm';

// Test user data
const testUserId = 'test-user-123';
const testUser = {
  id: testUserId,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
};

// Simple test input
const testInput: CreateTaskInput = {
  title: 'Complete project',
  description: 'Finish the important project by deadline',
  priority: 'high',
  due_date: new Date('2024-12-31')
};

describe('createTask', () => {
  beforeEach(async () => {
    await createDB();
    // Create test user first (required for foreign key constraint)
    await db.insert(usersTable).values(testUser).execute();
  });

  afterEach(resetDB);

  it('should create a task with all fields', async () => {
    const result = await createTask(testUserId, testInput);

    // Basic field validation
    expect(result.title).toEqual('Complete project');
    expect(result.description).toEqual('Finish the important project by deadline');
    expect(result.priority).toEqual('high');
    expect(result.status).toEqual('pending'); // Always starts as pending
    expect(result.user_id).toEqual(testUserId);
    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.due_date?.getTime()).toEqual(new Date('2024-12-31').getTime());
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a task with minimal fields', async () => {
    const minimalInput: CreateTaskInput = {
      title: 'Simple task',
      description: null,
      priority: 'medium', // Using default
      due_date: null
    };

    const result = await createTask(testUserId, minimalInput);

    expect(result.title).toEqual('Simple task');
    expect(result.description).toBeNull();
    expect(result.priority).toEqual('medium');
    expect(result.status).toEqual('pending');
    expect(result.due_date).toBeNull();
    expect(result.user_id).toEqual(testUserId);
  });

  it('should save task to database', async () => {
    const result = await createTask(testUserId, testInput);

    // Query using proper drizzle syntax
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, result.id))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Complete project');
    expect(tasks[0].description).toEqual(testInput.description);
    expect(tasks[0].priority).toEqual('high');
    expect(tasks[0].status).toEqual('pending');
    expect(tasks[0].user_id).toEqual(testUserId);
    expect(tasks[0].created_at).toBeInstanceOf(Date);
  });

  it('should generate unique IDs for multiple tasks', async () => {
    const task1 = await createTask(testUserId, testInput);
    const task2 = await createTask(testUserId, { ...testInput, title: 'Another task' });

    expect(task1.id).toBeDefined();
    expect(task2.id).toBeDefined();
    expect(task1.id).not.toEqual(task2.id);
  });

  it('should handle tasks with future due dates', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    const taskInput: CreateTaskInput = {
      title: 'Future task',
      description: 'Task with future due date',
      priority: 'low',
      due_date: futureDate
    };

    const result = await createTask(testUserId, taskInput);

    expect(result.due_date).toBeInstanceOf(Date);
    expect(result.due_date?.getTime()).toEqual(futureDate.getTime());
  });

  it('should fail when user does not exist', async () => {
    const nonExistentUserId = 'non-existent-user';

    await expect(createTask(nonExistentUserId, testInput)).rejects.toThrow(/violates foreign key constraint/i);
  });
});