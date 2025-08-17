import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { type UpdateDocumentInput } from '../schema';
import { updateDocument } from '../handlers/update_document';
import { eq } from 'drizzle-orm';

const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
};

const testDocument = {
  id: 'doc-1',
  user_id: 'user-1',
  name: 'Original Document',
  description: 'Original description',
  file_url: 'https://example.com/original.pdf',
  file_type: 'application/pdf',
  file_size: 2048,
  folder_path: '/original/folder'
};

describe('updateDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update document name', async () => {
    // Create prerequisite user and document
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      name: 'Updated Document Name'
    };

    const result = await updateDocument('user-1', input);

    expect(result.id).toEqual('doc-1');
    expect(result.user_id).toEqual('user-1');
    expect(result.name).toEqual('Updated Document Name');
    expect(result.description).toEqual('Original description'); // Should remain unchanged
    expect(result.folder_path).toEqual('/original/folder'); // Should remain unchanged
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update document description', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      description: 'Updated description'
    };

    const result = await updateDocument('user-1', input);

    expect(result.description).toEqual('Updated description');
    expect(result.name).toEqual('Original Document'); // Should remain unchanged
  });

  it('should update document folder path', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      folder_path: '/updated/folder/path'
    };

    const result = await updateDocument('user-1', input);

    expect(result.folder_path).toEqual('/updated/folder/path');
    expect(result.name).toEqual('Original Document'); // Should remain unchanged
  });

  it('should update multiple fields at once', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      name: 'Multi-Update Document',
      description: 'Multi-update description',
      folder_path: '/multi/update/folder'
    };

    const result = await updateDocument('user-1', input);

    expect(result.name).toEqual('Multi-Update Document');
    expect(result.description).toEqual('Multi-update description');
    expect(result.folder_path).toEqual('/multi/update/folder');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should set description to null when explicitly provided', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      description: null
    };

    const result = await updateDocument('user-1', input);

    expect(result.description).toBeNull();
    expect(result.name).toEqual('Original Document'); // Should remain unchanged
  });

  it('should persist changes to database', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      name: 'Database Persisted Name'
    };

    await updateDocument('user-1', input);

    // Verify changes persisted to database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, 'doc-1'))
      .execute();

    expect(documents).toHaveLength(1);
    expect(documents[0].name).toEqual('Database Persisted Name');
    expect(documents[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when document does not exist', async () => {
    // Create user but no document
    await db.insert(usersTable).values(testUser).execute();

    const input: UpdateDocumentInput = {
      id: 'nonexistent-doc',
      name: 'Should Fail'
    };

    await expect(updateDocument('user-1', input)).rejects.toThrow(/not found or access denied/i);
  });

  it('should throw error when user does not own document', async () => {
    // Create two users and a document owned by user-1
    await db.insert(usersTable).values([
      testUser,
      { id: 'user-2', email: 'other@example.com', first_name: 'Other', last_name: 'User' }
    ]).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      name: 'Unauthorized Update'
    };

    // Try to update as user-2
    await expect(updateDocument('user-2', input)).rejects.toThrow(/not found or access denied/i);
  });

  it('should update timestamp without changing other fields', async () => {
    // Create prerequisite data
    await db.insert(usersTable).values(testUser).execute();
    await db.insert(documentsTable).values(testDocument).execute();

    // Record original timestamp
    const originalDoc = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, 'doc-1'))
      .execute();
    const originalTimestamp = originalDoc[0].updated_at;

    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateDocumentInput = {
      id: 'doc-1',
      name: 'Timestamp Test'
    };

    const result = await updateDocument('user-1', input);

    expect(result.updated_at > originalTimestamp).toBe(true);
    expect(result.name).toEqual('Timestamp Test');
    expect(result.description).toEqual('Original description'); // Unchanged
  });
});