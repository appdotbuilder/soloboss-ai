import { db } from '../db';
import { tasksTable, documentsTable, activityLogTable } from '../db/schema';
import { type DashboardStats } from '../schema';
import { eq, count, and, gte } from 'drizzle-orm';

export async function getDashboardStats(userId: string): Promise<DashboardStats> {
  try {
    // Count total tasks for user
    const totalTasksResult = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(eq(tasksTable.user_id, userId))
      .execute();

    // Count completed tasks for user
    const completedTasksResult = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(and(
        eq(tasksTable.user_id, userId),
        eq(tasksTable.status, 'completed')
      ))
      .execute();

    // Count pending tasks for user
    const pendingTasksResult = await db
      .select({ count: count() })
      .from(tasksTable)
      .where(and(
        eq(tasksTable.user_id, userId),
        eq(tasksTable.status, 'pending')
      ))
      .execute();

    // Count total documents for user
    const totalDocumentsResult = await db
      .select({ count: count() })
      .from(documentsTable)
      .where(eq(documentsTable.user_id, userId))
      .execute();

    // Count recent activity (last 7 days) for user
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivityResult = await db
      .select({ count: count() })
      .from(activityLogTable)
      .where(and(
        eq(activityLogTable.user_id, userId),
        gte(activityLogTable.created_at, sevenDaysAgo)
      ))
      .execute();

    return {
      total_tasks: totalTasksResult[0]?.count || 0,
      completed_tasks: completedTasksResult[0]?.count || 0,
      pending_tasks: pendingTasksResult[0]?.count || 0,
      total_documents: totalDocumentsResult[0]?.count || 0,
      recent_activity_count: recentActivityResult[0]?.count || 0
    };
  } catch (error) {
    console.error('Dashboard stats retrieval failed:', error);
    throw error;
  }
}