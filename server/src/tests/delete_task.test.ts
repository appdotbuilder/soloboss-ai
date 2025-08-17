import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable } from '../db/schema';
import { deleteTask } from '../handlers/delete_task';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
};

const anotherUser = {
  id: 'user-456', 
  email: 'other@example.com',
  first_name: 'Other',
  last_name: 'User'
};

const testTask = {
  id: 'task-123',
  user_id: 'user-123',
  title: 'Test Task',
  description: 'A task for testing',
  status: 'pending' as const,
  priority: 'medium' as const,
  due_date: new Date('2024-12-31')
};

const anotherTask = {
  id: 'task-456',
  user_id: 'user-456', 
  title: 'Other User Task',
  description: 'A task belonging to another user',
  status: 'pending' as const,
  priority: 'high' as const,
  due_date: null
};

describe('deleteTask', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing task that belongs to the user', async () => {
    // Create test user and task
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values(testTask).execute();

    // Verify task exists
    const tasksBefore = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTask.id))
      .execute();
    expect(tasksBefore).toHaveLength(1);

    // Delete the task
    const result = await deleteTask(testUser.id, testTask.id);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify task is gone from database
    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, testTask.id))
      .execute();
    expect(tasksAfter).toHaveLength(0);
  });

  it('should return false when trying to delete a non-existent task', async () => {
    // Create test user but no tasks
    await db.insert(usersTable).values(testUser).execute();

    const result = await deleteTask(testUser.id, 'non-existent-task');

    expect(result).toBe(false);
  });

  it('should return false when trying to delete another user\'s task', async () => {
    // Create both users and a task for the second user
    await db.insert(usersTable).values([testUser, anotherUser]).execute();
    await db.insert(tasksTable).values(anotherTask).execute();

    // Verify task exists
    const tasksBefore = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, anotherTask.id))
      .execute();
    expect(tasksBefore).toHaveLength(1);

    // Try to delete another user's task
    const result = await deleteTask(testUser.id, anotherTask.id);

    // Should return false and task should still exist
    expect(result).toBe(false);

    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.id, anotherTask.id))
      .execute();
    expect(tasksAfter).toHaveLength(1);
  });

  it('should only delete the specified task when user has multiple tasks', async () => {
    const secondTask = {
      id: 'task-789',
      user_id: testUser.id,
      title: 'Second Task',
      description: 'Another task for the same user',
      status: 'completed' as const,
      priority: 'low' as const,
      due_date: null
    };

    // Create user and multiple tasks
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values([testTask, secondTask]).execute();

    // Verify both tasks exist
    const tasksBefore = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, testUser.id))
      .execute();
    expect(tasksBefore).toHaveLength(2);

    // Delete only the first task
    const result = await deleteTask(testUser.id, testTask.id);

    expect(result).toBe(true);

    // Verify only the first task was deleted
    const tasksAfter = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, testUser.id))
      .execute();
    expect(tasksAfter).toHaveLength(1);
    expect(tasksAfter[0].id).toEqual(secondTask.id);
  });

  it('should handle database constraints correctly', async () => {
    // Create user and task
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values(testTask).execute();

    // Delete the task successfully
    const result = await deleteTask(testUser.id, testTask.id);
    expect(result).toBe(true);

    // Try to delete the same task again
    const secondResult = await deleteTask(testUser.id, testTask.id);
    expect(secondResult).toBe(false);
  });

  it('should verify proper user-task ownership filtering', async () => {
    // Create both users and tasks for both
    await db.insert(usersTable).values([testUser, anotherUser]).execute();
    await db.insert(tasksTable).values([testTask, anotherTask]).execute();

    // Verify both tasks exist initially
    const allTasks = await db.select().from(tasksTable).execute();
    expect(allTasks).toHaveLength(2);

    // User 1 deletes their own task
    const result1 = await deleteTask(testUser.id, testTask.id);
    expect(result1).toBe(true);

    // User 2's task should still exist
    const remainingTasks = await db.select()
      .from(tasksTable)
      .where(eq(tasksTable.user_id, anotherUser.id))
      .execute();
    expect(remainingTasks).toHaveLength(1);
    expect(remainingTasks[0].id).toEqual(anotherTask.id);

    // User 2 deletes their own task
    const result2 = await deleteTask(anotherUser.id, anotherTask.id);
    expect(result2).toBe(true);

    // No tasks should remain
    const finalTasks = await db.select().from(tasksTable).execute();
    expect(finalTasks).toHaveLength(0);
  });
});