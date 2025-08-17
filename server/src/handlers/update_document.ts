import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type UpdateDocumentInput, type Document } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function updateDocument(userId: string, input: UpdateDocumentInput): Promise<Document> {
  try {
    // Build the update object with only provided fields
    const updateData: Partial<typeof documentsTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.name !== undefined) {
      updateData.name = input.name;
    }

    if (input.description !== undefined) {
      updateData.description = input.description;
    }

    if (input.folder_path !== undefined) {
      updateData.folder_path = input.folder_path;
    }

    // Update the document, ensuring it belongs to the user
    const result = await db.update(documentsTable)
      .set(updateData)
      .where(
        and(
          eq(documentsTable.id, input.id),
          eq(documentsTable.user_id, userId)
        )
      )
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error('Document not found or access denied');
    }

    return result[0];
  } catch (error) {
    console.error('Document update failed:', error);
    throw error;
  }
}