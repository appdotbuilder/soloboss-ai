import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { getTasks } from '../handlers/get_tasks';

describe('getTasks', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  const testUser = {
    id: 'user-123',
    email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe'
  };

  const otherUser = {
    id: 'user-456',
    email: 'other@example.com',
    first_name: 'Jane',
    last_name: 'Smith'
  };

  const testTask1 = {
    id: 'task-1',
    user_id: 'user-123',
    title: 'First Task',
    description: 'Description for first task',
    status: 'pending' as const,
    priority: 'high' as const,
    due_date: new Date('2024-01-15')
  };

  const testTask2 = {
    id: 'task-2',
    user_id: 'user-123',
    title: 'Second Task',
    description: null,
    status: 'completed' as const,
    priority: 'medium' as const,
    due_date: null
  };

  const otherUserTask = {
    id: 'task-3',
    user_id: 'user-456',
    title: 'Other User Task',
    description: 'Task belonging to different user',
    status: 'in_progress' as const,
    priority: 'low' as const,
    due_date: new Date('2024-01-20')
  };

  it('should return all tasks for a specific user', async () => {
    // Create prerequisite users
    await db.insert(usersTable).values([testUser, otherUser]).execute();

    // Create tasks for both users
    await db.insert(tasksTable).values([testTask1, testTask2, otherUserTask]).execute();

    const result = await getTasks('user-123');

    expect(result).toHaveLength(2);
    expect(result.map(task => task.id)).toEqual(expect.arrayContaining(['task-1', 'task-2']));
    expect(result.every(task => task.user_id === 'user-123')).toBe(true);
  });

  it('should return tasks ordered by created_at desc', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Insert tasks with a small delay to ensure different timestamps
    await db.insert(tasksTable).values(testTask1).execute();
    
    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));
    
    await db.insert(tasksTable).values(testTask2).execute();

    const result = await getTasks('user-123');

    expect(result).toHaveLength(2);
    // Most recent task should be first
    expect(result[0].created_at.getTime()).toBeGreaterThan(result[1].created_at.getTime());
  });

  it('should return empty array for user with no tasks', async () => {
    // Create user but no tasks
    await db.insert(usersTable).values(testUser).execute();

    const result = await getTasks('user-123');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    // Don't create any users or tasks
    const result = await getTasks('non-existent-user');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return tasks with correct data types and structure', async () => {
    // Create user and task
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values(testTask1).execute();

    const result = await getTasks('user-123');

    expect(result).toHaveLength(1);
    const task = result[0];

    // Verify all required fields are present
    expect(task.id).toBe('task-1');
    expect(task.user_id).toBe('user-123');
    expect(task.title).toBe('First Task');
    expect(task.description).toBe('Description for first task');
    expect(task.status).toBe('pending');
    expect(task.priority).toBe('high');
    expect(task.due_date).toBeInstanceOf(Date);
    expect(task.created_at).toBeInstanceOf(Date);
    expect(task.updated_at).toBeInstanceOf(Date);
  });

  it('should handle tasks with nullable fields correctly', async () => {
    // Create user and task with null description and due_date
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values(testTask2).execute();

    const result = await getTasks('user-123');

    expect(result).toHaveLength(1);
    const task = result[0];

    expect(task.id).toBe('task-2');
    expect(task.description).toBeNull();
    expect(task.due_date).toBeNull();
    expect(task.title).toBe('Second Task');
    expect(task.status).toBe('completed');
  });

  it('should handle different task statuses and priorities', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create tasks with different statuses and priorities
    const taskWithDifferentValues = {
      id: 'task-varied',
      user_id: 'user-123',
      title: 'Varied Task',
      description: 'Task with different enum values',
      status: 'in_progress' as const,
      priority: 'low' as const,
      due_date: new Date('2024-02-01')
    };

    await db.insert(tasksTable).values([testTask1, testTask2, taskWithDifferentValues]).execute();

    const result = await getTasks('user-123');

    expect(result).toHaveLength(3);
    
    // Verify all enum values are handled correctly
    const statuses = result.map(task => task.status);
    const priorities = result.map(task => task.priority);

    expect(statuses).toEqual(expect.arrayContaining(['pending', 'completed', 'in_progress']));
    expect(priorities).toEqual(expect.arrayContaining(['high', 'medium', 'low']));
  });
});