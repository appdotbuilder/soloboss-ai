import { db } from '../db';
import { activityLogTable } from '../db/schema';
import { type ActivityLog } from '../schema';
import { randomUUID } from 'crypto';

export async function logActivity(
    userId: string,
    action: string,
    description: string,
    entityType?: 'task' | 'document' | 'chat' | 'profile',
    entityId?: string
): Promise<ActivityLog> {
    try {
        // Insert activity log record
        const result = await db.insert(activityLogTable)
            .values({
                id: randomUUID(),
                user_id: userId,
                action,
                description,
                entity_type: entityType || null,
                entity_id: entityId || null
            })
            .returning()
            .execute();

        return result[0];
    } catch (error) {
        console.error('Activity logging failed:', error);
        throw error;
    }
}