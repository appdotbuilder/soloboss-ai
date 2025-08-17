import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { activityLogTable, usersTable } from '../db/schema';
import { logActivity } from '../handlers/log_activity';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test user data
const testUserId = randomUUID();
const testUser = {
  id: testUserId,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
};

describe('logActivity', () => {
  beforeEach(async () => {
    await createDB();
    // Create test user
    await db.insert(usersTable).values(testUser).execute();
  });
  
  afterEach(resetDB);

  it('should create an activity log entry with minimal data', async () => {
    const result = await logActivity(
      testUserId,
      'login',
      'User logged into the application'
    );

    // Basic field validation
    expect(result.user_id).toEqual(testUserId);
    expect(result.action).toEqual('login');
    expect(result.description).toEqual('User logged into the application');
    expect(result.entity_type).toBeNull();
    expect(result.entity_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create an activity log entry with entity details', async () => {
    const entityId = randomUUID();
    
    const result = await logActivity(
      testUserId,
      'task_created',
      'User created a new task',
      'task',
      entityId
    );

    // Validate all fields including entity data
    expect(result.user_id).toEqual(testUserId);
    expect(result.action).toEqual('task_created');
    expect(result.description).toEqual('User created a new task');
    expect(result.entity_type).toEqual('task');
    expect(result.entity_id).toEqual(entityId);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save activity log to database', async () => {
    const result = await logActivity(
      testUserId,
      'document_uploaded',
      'User uploaded a new document',
      'document',
      'doc-123'
    );

    // Query database to verify record was saved
    const activities = await db.select()
      .from(activityLogTable)
      .where(eq(activityLogTable.id, result.id))
      .execute();

    expect(activities).toHaveLength(1);
    expect(activities[0].user_id).toEqual(testUserId);
    expect(activities[0].action).toEqual('document_uploaded');
    expect(activities[0].description).toEqual('User uploaded a new document');
    expect(activities[0].entity_type).toEqual('document');
    expect(activities[0].entity_id).toEqual('doc-123');
    expect(activities[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle all entity types correctly', async () => {
    const entityTypes: Array<'task' | 'document' | 'chat' | 'profile'> = [
      'task', 'document', 'chat', 'profile'
    ];

    for (const entityType of entityTypes) {
      const result = await logActivity(
        testUserId,
        `${entityType}_action`,
        `User performed action on ${entityType}`,
        entityType,
        `${entityType}-id-123`
      );

      expect(result.entity_type).toEqual(entityType);
      expect(result.entity_id).toEqual(`${entityType}-id-123`);
    }

    // Verify all records were created
    const allActivities = await db.select()
      .from(activityLogTable)
      .where(eq(activityLogTable.user_id, testUserId))
      .execute();

    expect(allActivities).toHaveLength(entityTypes.length);
  });

  it('should generate unique IDs for multiple activities', async () => {
    const activities = await Promise.all([
      logActivity(testUserId, 'action1', 'First action'),
      logActivity(testUserId, 'action2', 'Second action'),
      logActivity(testUserId, 'action3', 'Third action')
    ]);

    // Verify all IDs are unique
    const ids = activities.map(a => a.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toEqual(3);

    // Verify all records have different timestamps or at least valid dates
    activities.forEach(activity => {
      expect(activity.created_at).toBeInstanceOf(Date);
      expect(activity.user_id).toEqual(testUserId);
    });
  });

  it('should handle optional parameters correctly', async () => {
    // Test with entityType but no entityId
    const result1 = await logActivity(
      testUserId,
      'profile_updated',
      'User updated their profile',
      'profile'
    );

    expect(result1.entity_type).toEqual('profile');
    expect(result1.entity_id).toBeNull();

    // Test with entityId but no entityType (though this is unusual)
    const result2 = await logActivity(
      testUserId,
      'general_action',
      'User performed a general action',
      undefined,
      'some-id'
    );

    expect(result2.entity_type).toBeNull();
    expect(result2.entity_id).toEqual('some-id');
  });
});