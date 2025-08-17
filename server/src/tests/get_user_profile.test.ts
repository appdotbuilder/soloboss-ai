import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { getUserProfile } from '../handlers/get_user_profile';
import { randomUUID } from 'crypto';

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user profile when user exists', async () => {
    // Create a test user
    const userId = randomUUID();
    const testUser = {
      id: userId,
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      profile_picture_url: 'https://example.com/avatar.jpg'
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await getUserProfile(userId);

    // Verify user profile is returned correctly
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId);
    expect(result!.email).toEqual('test@example.com');
    expect(result!.first_name).toEqual('John');
    expect(result!.last_name).toEqual('Doe');
    expect(result!.profile_picture_url).toEqual('https://example.com/avatar.jpg');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return user profile with null profile_picture_url', async () => {
    // Create a test user without profile picture
    const userId = randomUUID();
    const testUser = {
      id: userId,
      email: 'nopic@example.com',
      first_name: 'Jane',
      last_name: 'Smith',
      profile_picture_url: null
    };

    await db.insert(usersTable)
      .values(testUser)
      .execute();

    const result = await getUserProfile(userId);

    // Verify user profile handles null profile picture
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(userId);
    expect(result!.email).toEqual('nopic@example.com');
    expect(result!.first_name).toEqual('Jane');
    expect(result!.last_name).toEqual('Smith');
    expect(result!.profile_picture_url).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when user does not exist', async () => {
    const nonExistentUserId = randomUUID();

    const result = await getUserProfile(nonExistentUserId);

    expect(result).toBeNull();
  });

  it('should return correct user when multiple users exist', async () => {
    // Create multiple test users
    const user1Id = randomUUID();
    const user2Id = randomUUID();
    
    const testUsers = [
      {
        id: user1Id,
        email: 'user1@example.com',
        first_name: 'User',
        last_name: 'One',
        profile_picture_url: null
      },
      {
        id: user2Id,
        email: 'user2@example.com',
        first_name: 'User',
        last_name: 'Two',
        profile_picture_url: 'https://example.com/user2.jpg'
      }
    ];

    await db.insert(usersTable)
      .values(testUsers)
      .execute();

    // Fetch specific user
    const result = await getUserProfile(user2Id);

    // Verify correct user is returned
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(user2Id);
    expect(result!.email).toEqual('user2@example.com');
    expect(result!.first_name).toEqual('User');
    expect(result!.last_name).toEqual('Two');
    expect(result!.profile_picture_url).toEqual('https://example.com/user2.jpg');
  });

  it('should handle empty string userId gracefully', async () => {
    const result = await getUserProfile('');

    expect(result).toBeNull();
  });
});