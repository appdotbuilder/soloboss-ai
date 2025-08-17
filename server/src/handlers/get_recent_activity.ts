import { db } from '../db';
import { activityLogTable } from '../db/schema';
import { type ActivityLog } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getRecentActivity(userId: string, limit: number = 20): Promise<ActivityLog[]> {
  try {
    // Query recent activity logs for the user, ordered by created_at desc
    const results = await db.select()
      .from(activityLogTable)
      .where(eq(activityLogTable.user_id, userId))
      .orderBy(desc(activityLogTable.created_at))
      .limit(limit)
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch recent activity:', error);
    throw error;
  }
}