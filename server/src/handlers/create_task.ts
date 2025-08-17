import { db } from '../db';
import { tasksTable } from '../db/schema';
import { type CreateTaskInput, type Task } from '../schema';
import { randomUUID } from 'crypto';

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  try {
    // Insert task record
    const result = await db.insert(tasksTable)
      .values({
        id: randomUUID(),
        user_id: userId,
        title: input.title,
        description: input.description,
        status: 'pending', // Always starts as pending
        priority: input.priority, // Uses Zod default of 'medium' if not provided
        due_date: input.due_date
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Task creation failed:', error);
    throw error;
  }
}