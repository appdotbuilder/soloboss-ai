import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, tasksTable, documentsTable, activityLogTable } from '../db/schema';
import { getDashboardStats } from '../handlers/get_dashboard_stats';

// Test user data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  profile_picture_url: null,
  created_at: new Date(),
  updated_at: new Date()
};

// Test task data
const testTasks = [
  {
    id: 'task-1',
    user_id: 'user-123',
    title: 'Completed Task',
    description: 'A completed task',
    status: 'completed' as const,
    priority: 'medium' as const,
    due_date: null,
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'task-2',
    user_id: 'user-123',
    title: 'Pending Task',
    description: 'A pending task',
    status: 'pending' as const,
    priority: 'high' as const,
    due_date: new Date(),
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'task-3',
    user_id: 'user-123',
    title: 'In Progress Task',
    description: 'A task in progress',
    status: 'in_progress' as const,
    priority: 'low' as const,
    due_date: null,
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Test document data
const testDocuments = [
  {
    id: 'doc-1',
    user_id: 'user-123',
    name: 'Test Document 1',
    description: 'First test document',
    file_url: 'https://example.com/doc1.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    folder_path: '/documents',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: 'doc-2',
    user_id: 'user-123',
    name: 'Test Document 2',
    description: null,
    file_url: 'https://example.com/doc2.docx',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 2048,
    folder_path: null,
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Test activity log data
const testActivityLogs = [
  {
    id: 'activity-1',
    user_id: 'user-123',
    action: 'task_created',
    description: 'Created a new task',
    entity_type: 'task' as const,
    entity_id: 'task-1',
    created_at: new Date() // Recent activity
  },
  {
    id: 'activity-2',
    user_id: 'user-123',
    action: 'document_uploaded',
    description: 'Uploaded a new document',
    entity_type: 'document' as const,
    entity_id: 'doc-1',
    created_at: new Date() // Recent activity
  },
  {
    id: 'activity-3',
    user_id: 'user-123',
    action: 'profile_updated',
    description: 'Updated profile picture',
    entity_type: 'profile' as const,
    entity_id: 'user-123',
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago (should not be counted)
  }
];

describe('getDashboardStats', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return zero stats for user with no data', async () => {
    // Create user but no tasks, documents, or activity
    await db.insert(usersTable).values(testUser).execute();

    const result = await getDashboardStats('user-123');

    expect(result.total_tasks).toEqual(0);
    expect(result.completed_tasks).toEqual(0);
    expect(result.pending_tasks).toEqual(0);
    expect(result.total_documents).toEqual(0);
    expect(result.recent_activity_count).toEqual(0);
  });

  it('should return correct stats for user with all data types', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create tasks
    await db.insert(tasksTable).values(testTasks).execute();

    // Create documents
    await db.insert(documentsTable).values(testDocuments).execute();

    // Create activity logs
    await db.insert(activityLogTable).values(testActivityLogs).execute();

    const result = await getDashboardStats('user-123');

    expect(result.total_tasks).toEqual(3);
    expect(result.completed_tasks).toEqual(1); // Only one completed task
    expect(result.pending_tasks).toEqual(1); // Only one pending task
    expect(result.total_documents).toEqual(2);
    expect(result.recent_activity_count).toEqual(2); // Two activities within last 7 days
  });

  it('should only count data for specified user', async () => {
    // Create test user
    await db.insert(usersTable).values(testUser).execute();

    // Create another user
    const otherUser = {
      ...testUser,
      id: 'user-456',
      email: 'other@example.com'
    };
    await db.insert(usersTable).values(otherUser).execute();

    // Create tasks for test user
    await db.insert(tasksTable).values(testTasks).execute();

    // Create tasks for other user
    const otherUserTasks = testTasks.map(task => ({
      ...task,
      id: task.id + '-other',
      user_id: 'user-456'
    }));
    await db.insert(tasksTable).values(otherUserTasks).execute();

    // Create documents for test user
    await db.insert(documentsTable).values(testDocuments).execute();

    // Create documents for other user
    const otherUserDocs = testDocuments.map(doc => ({
      ...doc,
      id: doc.id + '-other',
      user_id: 'user-456'
    }));
    await db.insert(documentsTable).values(otherUserDocs).execute();

    const result = await getDashboardStats('user-123');

    // Should only count data for user-123, not user-456
    expect(result.total_tasks).toEqual(3);
    expect(result.completed_tasks).toEqual(1);
    expect(result.pending_tasks).toEqual(1);
    expect(result.total_documents).toEqual(2);
  });

  it('should handle recent activity date filtering correctly', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create activity logs with different dates
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);

    const activityLogs = [
      {
        id: 'activity-recent-1',
        user_id: 'user-123',
        action: 'task_created',
        description: 'Recent activity 1',
        entity_type: 'task' as const,
        entity_id: 'task-1',
        created_at: now
      },
      {
        id: 'activity-recent-2',
        user_id: 'user-123',
        action: 'document_uploaded',
        description: 'Recent activity 2',
        entity_type: 'document' as const,
        entity_id: 'doc-1',
        created_at: threeDaysAgo
      },
      {
        id: 'activity-old',
        user_id: 'user-123',
        action: 'profile_updated',
        description: 'Old activity',
        entity_type: 'profile' as const,
        entity_id: 'user-123',
        created_at: tenDaysAgo
      }
    ];

    await db.insert(activityLogTable).values(activityLogs).execute();

    const result = await getDashboardStats('user-123');

    // Should only count activities from last 7 days
    expect(result.recent_activity_count).toEqual(2);
  });

  it('should handle user with mixed task statuses correctly', async () => {
    // Create user
    await db.insert(usersTable).values(testUser).execute();

    // Create tasks with various statuses
    const mixedTasks = [
      { ...testTasks[0], status: 'completed' as const },
      { ...testTasks[1], id: 'task-4', status: 'pending' as const },
      { ...testTasks[2], id: 'task-5', status: 'pending' as const },
      { 
        id: 'task-6',
        user_id: 'user-123',
        title: 'Another completed task',
        description: null,
        status: 'completed' as const,
        priority: 'medium' as const,
        due_date: null,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await db.insert(tasksTable).values(mixedTasks).execute();

    const result = await getDashboardStats('user-123');

    expect(result.total_tasks).toEqual(4);
    expect(result.completed_tasks).toEqual(2);
    expect(result.pending_tasks).toEqual(2);
  });

  it('should return stats with correct data types', async () => {
    // Create user with minimal data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(tasksTable).values([testTasks[0]]).execute();

    const result = await getDashboardStats('user-123');

    // Verify all returned values are numbers
    expect(typeof result.total_tasks).toBe('number');
    expect(typeof result.completed_tasks).toBe('number');
    expect(typeof result.pending_tasks).toBe('number');
    expect(typeof result.total_documents).toBe('number');
    expect(typeof result.recent_activity_count).toBe('number');

    // Verify they are non-negative integers
    expect(result.total_tasks).toBeGreaterThanOrEqual(0);
    expect(result.completed_tasks).toBeGreaterThanOrEqual(0);
    expect(result.pending_tasks).toBeGreaterThanOrEqual(0);
    expect(result.total_documents).toBeGreaterThanOrEqual(0);
    expect(result.recent_activity_count).toBeGreaterThanOrEqual(0);
  });
});