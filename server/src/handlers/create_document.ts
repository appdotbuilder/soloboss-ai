import { db } from '../db';
import { documentsTable, usersTable } from '../db/schema';
import { type CreateDocumentInput, type Document } from '../schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const createDocument = async (userId: string, input: CreateDocumentInput): Promise<Document> => {
  try {
    // Verify that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1)
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${userId} not found`);
    }

    // Generate UUID for the document
    const documentId = randomUUID();

    // Insert document record
    const result = await db.insert(documentsTable)
      .values({
        id: documentId,
        user_id: userId,
        name: input.name,
        description: input.description,
        file_url: input.file_url,
        file_type: input.file_type,
        file_size: input.file_size,
        folder_path: input.folder_path
      })
      .returning()
      .execute();

    const document = result[0];
    return document;
  } catch (error) {
    console.error('Document creation failed:', error);
    throw error;
  }
};