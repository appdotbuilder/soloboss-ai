import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type User } from '../schema';
import { updateUserProfile } from '../handlers/update_user_profile';
import { eq } from 'drizzle-orm';

// Test user data
const testUser = {
  id: 'user-123',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  profile_picture_url: null
};

describe('updateUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update user first name', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateUserProfileInput = {
      first_name: 'Jane'
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.id).toEqual('user-123');
    expect(result.first_name).toEqual('Jane');
    expect(result.last_name).toEqual('Doe'); // Should remain unchanged
    expect(result.email).toEqual('test@example.com');
    expect(result.profile_picture_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update user last name', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateUserProfileInput = {
      last_name: 'Smith'
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.id).toEqual('user-123');
    expect(result.first_name).toEqual('John'); // Should remain unchanged
    expect(result.last_name).toEqual('Smith');
    expect(result.email).toEqual('test@example.com');
    expect(result.profile_picture_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update profile picture URL', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateUserProfileInput = {
      profile_picture_url: 'https://example.com/avatar.jpg'
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.id).toEqual('user-123');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.profile_picture_url).toEqual('https://example.com/avatar.jpg');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set profile picture URL to null', async () => {
    // Create a test user with existing profile picture
    const userWithAvatar = {
      ...testUser,
      profile_picture_url: 'https://example.com/old-avatar.jpg'
    };
    await db.insert(usersTable).values(userWithAvatar).execute();

    const input: UpdateUserProfileInput = {
      profile_picture_url: null
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.id).toEqual('user-123');
    expect(result.profile_picture_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update multiple fields at once', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateUserProfileInput = {
      first_name: 'Alice',
      last_name: 'Johnson',
      profile_picture_url: 'https://example.com/new-avatar.jpg'
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.id).toEqual('user-123');
    expect(result.first_name).toEqual('Alice');
    expect(result.last_name).toEqual('Johnson');
    expect(result.profile_picture_url).toEqual('https://example.com/new-avatar.jpg');
    expect(result.email).toEqual('test@example.com'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update the database record', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateUserProfileInput = {
      first_name: 'Updated',
      last_name: 'Name'
    };

    await updateUserProfile('user-123', input);

    // Verify the database was updated
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, 'user-123'))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].first_name).toEqual('Updated');
    expect(users[0].last_name).toEqual('Name');
    expect(users[0].email).toEqual('test@example.com');
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should update the updated_at timestamp', async () => {
    // Create a test user first
    const originalTimestamp = new Date('2023-01-01T00:00:00Z');
    const userWithOldTimestamp = {
      ...testUser,
      updated_at: originalTimestamp
    };
    await db.insert(usersTable).values(userWithOldTimestamp).execute();

    const input: UpdateUserProfileInput = {
      first_name: 'Updated'
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const input: UpdateUserProfileInput = {
      first_name: 'Jane'
    };

    await expect(updateUserProfile('non-existent-user', input))
      .rejects.toThrow(/User with id non-existent-user not found/i);
  });

  it('should handle empty input object', async () => {
    // Create a test user first
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateUserProfileInput = {};

    const result = await updateUserProfile('user-123', input);

    // Should only update the timestamp, all other fields remain the same
    expect(result.id).toEqual('user-123');
    expect(result.first_name).toEqual('John');
    expect(result.last_name).toEqual('Doe');
    expect(result.email).toEqual('test@example.com');
    expect(result.profile_picture_url).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should preserve existing profile picture when not updated', async () => {
    // Create a test user with existing profile picture
    const userWithAvatar = {
      ...testUser,
      profile_picture_url: 'https://example.com/existing-avatar.jpg'
    };
    await db.insert(usersTable).values(userWithAvatar).execute();

    const input: UpdateUserProfileInput = {
      first_name: 'Updated'
    };

    const result = await updateUserProfile('user-123', input);

    expect(result.first_name).toEqual('Updated');
    expect(result.profile_picture_url).toEqual('https://example.com/existing-avatar.jpg');
  });
});