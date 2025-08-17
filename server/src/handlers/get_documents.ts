import { db } from '../db';
import { documentsTable } from '../db/schema';
import { type Document } from '../schema';
import { eq, and, desc, isNull } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export const getDocuments = async (userId: string, folderPath?: string | null): Promise<Document[]> => {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(documentsTable.user_id, userId));

    // Add folder filtering if specified
    if (folderPath !== undefined) {
      if (folderPath === null) {
        // Filter for documents in root (null folder_path)
        conditions.push(isNull(documentsTable.folder_path));
      } else {
        // Filter for documents in specific folder
        conditions.push(eq(documentsTable.folder_path, folderPath));
      }
    }

    // Build query with all clauses in one chain
    const results = await db.select()
      .from(documentsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(documentsTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to fetch documents:', error);
    throw error;
  }
};