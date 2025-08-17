import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { type UpdateTaskInput } from '../schema';
import { updateTask } from '../handlers/update_task';
import { eq } from 'drizzle-orm';

const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
};

const testTask = {
  id: 'test-task-1',
  user_id: 'test-user-1',
  title: 'Original Task',
  description: 'Original description',
  status: 'pending' as const,
  priority: 'medium' as const,
  due_date: new Date('2024-12-31')
};

describe('updateTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Create test user first
    await db.insert(usersTable).values(testUser).execute();
    
    // Create test task
    await db.insert(tasksTable).values(testTask).execute();
  });

  it('should update a task with all fields', async () => {
    const input: UpdateTaskInput = {
      id: 'test-task-1',
      title: 'Updated Task',
      description: 'Updated description',
      status: 'completed',
      priority: 'high',
      due_date: new Date('2025-01-15')
    };

    const result = await updateTask('test-user-1', input);

    expect(result.id).toEqual('test-task-1');
    expect(result.user_id).toEqual('test-user-1');
    expect(result.title).toEqual('Updated Task');
    expect(result.description).toEqual('Updated description');
    expect(result.status).toEqual('completed');
    expect(result.priority).toEqual('high');
    expect(result.due_date).toEqual(new Date('2025-01-15'));
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > result.created_at).toBe(true);
  });

  it('should update only specified fields', async () => {
    const input: UpdateTaskInput = {
      id: 'test-task-1',
      status: 'in_progress'
    };

    const result = await updateTask('test-user-1', input);

    // Updated field
    expect(result.status).toEqual('in_progress');
    
    // Unchanged fields should retain original values
    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Original description');
    expect(result.priority).toEqual('medium');
    expect(result.due_date).toEqual(new Date('2024-12-31'));
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update task with nullable fields', async () => {
    const input: UpdateTaskInput = {
      id: 'test-task-1',
      description: null,
      due_date: null
    };

    const result = await updateTask('test-user-1', input);

    expect(result.description).toBeNull();
    expect(result.due_date).toBeNull();
    expect(result.title).toEqual('Original Task'); // Unchanged
    expect(result.status).toEqual('pending'); // Unchanged
  });

  it('should persist changes to database', async () => {
    const input: UpdateTaskInput = {
      id: 'test-task-1',
      title: 'Persisted Update',
      status: 'completed'
    };

    await updateTask('test-user-1', input);

    // Query database directly to verify persistence
    const tasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, 'test-task-1'))
      .execute();

    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toEqual('Persisted Update');
    expect(tasks[0].status).toEqual('completed');
    expect(tasks[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error if task does not exist', async () => {
    const input: UpdateTaskInput = {
      id: 'non-existent-task',
      title: 'Should fail'
    };

    await expect(updateTask('test-user-1', input))
      .rejects.toThrow(/not found or access denied/i);
  });

  it('should throw error if user does not own the task', async () => {
    // Create another user
    await db.insert(usersTable).values({
      id: 'different-user',
      email: 'different@example.com',
      first_name: 'Different',
      last_name: 'User'
    }).execute();

    const input: UpdateTaskInput = {
      id: 'test-task-1',
      title: 'Unauthorized update'
    };

    // Try to update task belonging to test-user-1 as different-user
    await expect(updateTask('different-user', input))
      .rejects.toThrow(/not found or access denied/i);
  });

  it('should update task priority correctly', async () => {
    const input: UpdateTaskInput = {
      id: 'test-task-1',
      priority: 'low'
    };

    const result = await updateTask('test-user-1', input);

    expect(result.priority).toEqual('low');
    expect(result.title).toEqual('Original Task'); // Unchanged
  });

  it('should handle empty update gracefully', async () => {
    const input: UpdateTaskInput = {
      id: 'test-task-1'
    };

    const result = await updateTask('test-user-1', input);

    // Should return task with updated timestamp but no other changes
    expect(result.title).toEqual('Original Task');
    expect(result.description).toEqual('Original description');
    expect(result.status).toEqual('pending');
    expect(result.priority).toEqual('medium');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > new Date(testTask.due_date)).toBe(true);
  });
});