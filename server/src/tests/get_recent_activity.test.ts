import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, activityLogTable } from '../db/schema';
import { getRecentActivity } from '../handlers/get_recent_activity';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe'
};

const otherUser = {
  id: 'other-user',
  email: 'other@example.com',
  first_name: 'Jane',
  last_name: 'Smith'
};

const testActivities = [
  {
    id: 'activity-1',
    user_id: 'user-123',
    action: 'task_created',
    description: 'Created task: Complete project',
    entity_type: 'task' as const,
    entity_id: 'task-1'
  },
  {
    id: 'activity-2',
    user_id: 'user-123',
    action: 'document_uploaded',
    description: 'Uploaded document: Project specs',
    entity_type: 'document' as const,
    entity_id: 'doc-1'
  },
  {
    id: 'activity-3',
    user_id: 'user-123',
    action: 'task_completed',
    description: 'Completed task: Review code',
    entity_type: 'task' as const,
    entity_id: 'task-2'
  },
  {
    id: 'activity-4',
    user_id: 'other-user',
    action: 'task_created',
    description: 'Created task: Other user task',
    entity_type: 'task' as const,
    entity_id: 'task-3'
  }
];

describe('getRecentActivity', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should fetch recent activities for a user', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([testUser, otherUser])
      .execute();

    // Create test activities with slight delays to ensure different timestamps
    for (let i = 0; i < testActivities.length; i++) {
      await db.insert(activityLogTable)
        .values(testActivities[i])
        .execute();
      
      // Small delay to ensure different timestamps
      if (i < testActivities.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    const result = await getRecentActivity('user-123');

    // Should return activities for the specific user only
    expect(result).toHaveLength(3);
    
    // Verify all activities belong to the correct user
    result.forEach(activity => {
      expect(activity.user_id).toEqual('user-123');
    });

    // Verify basic activity structure
    expect(result[0].id).toBeDefined();
    expect(result[0].action).toBeDefined();
    expect(result[0].description).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return activities ordered by created_at descending', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create activities with explicit timestamps to test ordering
    const now = new Date();
    const activities = [
      {
        id: 'activity-old',
        user_id: 'user-123',
        action: 'old_action',
        description: 'Old activity',
        entity_type: 'task' as const,
        entity_id: 'task-old',
        created_at: new Date(now.getTime() - 3000) // 3 seconds ago
      },
      {
        id: 'activity-new',
        user_id: 'user-123',
        action: 'new_action',
        description: 'New activity',
        entity_type: 'task' as const,
        entity_id: 'task-new',
        created_at: new Date(now.getTime() - 1000) // 1 second ago
      },
      {
        id: 'activity-newest',
        user_id: 'user-123',
        action: 'newest_action',
        description: 'Newest activity',
        entity_type: 'task' as const,
        entity_id: 'task-newest',
        created_at: now // now
      }
    ];

    // Insert activities in random order
    await db.insert(activityLogTable)
      .values([activities[1], activities[0], activities[2]])
      .execute();

    const result = await getRecentActivity('user-123');

    expect(result).toHaveLength(3);
    
    // Should be ordered by created_at desc (newest first)
    expect(result[0].id).toEqual('activity-newest');
    expect(result[1].id).toEqual('activity-new');
    expect(result[2].id).toEqual('activity-old');

    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
    expect(result[1].created_at >= result[2].created_at).toBe(true);
  });

  it('should respect the limit parameter', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create 5 activities
    const activities = Array.from({ length: 5 }, (_, i) => ({
      id: `activity-${i}`,
      user_id: 'user-123',
      action: `action_${i}`,
      description: `Activity ${i}`,
      entity_type: 'task' as const,
      entity_id: `task-${i}`
    }));

    await db.insert(activityLogTable)
      .values(activities)
      .execute();

    // Test with limit of 3
    const result = await getRecentActivity('user-123', 3);

    expect(result).toHaveLength(3);
    
    // Verify all belong to correct user
    result.forEach(activity => {
      expect(activity.user_id).toEqual('user-123');
    });
  });

  it('should use default limit of 20 when not specified', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create 25 activities
    const activities = Array.from({ length: 25 }, (_, i) => ({
      id: `activity-${i}`,
      user_id: 'user-123',
      action: `action_${i}`,
      description: `Activity ${i}`,
      entity_type: 'task' as const,
      entity_id: `task-${i}`
    }));

    await db.insert(activityLogTable)
      .values(activities)
      .execute();

    const result = await getRecentActivity('user-123');

    // Should return only 20 activities (default limit)
    expect(result).toHaveLength(20);
  });

  it('should return empty array for user with no activities', async () => {
    // Create test user but no activities
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await getRecentActivity('user-123');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getRecentActivity('non-existent-user');

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle activities with nullable entity fields', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create activity with nullable entity fields
    await db.insert(activityLogTable)
      .values({
        id: 'activity-null',
        user_id: 'user-123',
        action: 'general_action',
        description: 'General activity without specific entity',
        entity_type: null,
        entity_id: null
      })
      .execute();

    const result = await getRecentActivity('user-123');

    expect(result).toHaveLength(1);
    expect(result[0].entity_type).toBeNull();
    expect(result[0].entity_id).toBeNull();
    expect(result[0].action).toEqual('general_action');
    expect(result[0].description).toEqual('General activity without specific entity');
  });

  it('should save activity to database correctly', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create test activity
    await db.insert(activityLogTable)
      .values(testActivities[0])
      .execute();

    // Verify it was saved correctly by querying directly
    const savedActivity = await db.select()
      .from(activityLogTable)
      .where(eq(activityLogTable.id, 'activity-1'))
      .execute();

    expect(savedActivity).toHaveLength(1);
    expect(savedActivity[0].user_id).toEqual('user-123');
    expect(savedActivity[0].action).toEqual('task_created');
    expect(savedActivity[0].description).toEqual('Created task: Complete project');
    expect(savedActivity[0].entity_type).toEqual('task');
    expect(savedActivity[0].entity_id).toEqual('task-1');
    expect(savedActivity[0].created_at).toBeInstanceOf(Date);

    // Test the handler returns the same data
    const result = await getRecentActivity('user-123');
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual('activity-1');
  });
});