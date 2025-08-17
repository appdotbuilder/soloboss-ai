import { db } from '../db';
import { documentsTable } from '../db/schema';
import { eq, and } from 'drizzle-orm';

export async function deleteDocument(userId: string, documentId: string): Promise<boolean> {
  try {
    // First, verify the document exists and belongs to the user
    const existingDocument = await db.select()
      .from(documentsTable)
      .where(
        and(
          eq(documentsTable.id, documentId),
          eq(documentsTable.user_id, userId)
        )
      )
      .execute();

    // If document doesn't exist or doesn't belong to user, return false
    if (existingDocument.length === 0) {
      return false;
    }

    // Delete the document from database
    const deleteResult = await db.delete(documentsTable)
      .where(
        and(
          eq(documentsTable.id, documentId),
          eq(documentsTable.user_id, userId)
        )
      )
      .execute();

    // Return true if deletion was successful (affected rows > 0)
    return deleteResult.rowCount !== null && deleteResult.rowCount > 0;
  } catch (error) {
    console.error('Document deletion failed:', error);
    throw error;
  }
}