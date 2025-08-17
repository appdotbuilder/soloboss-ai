import { db } from '../db';
import { tasksTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  try {
    // Delete task only if it belongs to the specified user
    const result = await db.delete(tasksTable)
      .where(and(
        eq(tasksTable.id, taskId),
        eq(tasksTable.user_id, userId)
      ))
      .execute();

    // Return true if a task was deleted, false if no task was found/deleted
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Task deletion failed:', error);
    throw error;
  }
}