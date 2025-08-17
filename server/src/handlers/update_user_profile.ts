import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserProfileInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUserProfile = async (userId: string, input: UpdateUserProfileInput): Promise<User> => {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.first_name !== undefined) {
      updateData.first_name = input.first_name;
    }

    if (input.last_name !== undefined) {
      updateData.last_name = input.last_name;
    }

    if (input.profile_picture_url !== undefined) {
      updateData.profile_picture_url = input.profile_picture_url;
    }

    // Update the user profile
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, userId))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`User with id ${userId} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('User profile update failed:', error);
    throw error;
  }
};