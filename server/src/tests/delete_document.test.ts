import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, usersTable } from '../db/schema';
import { deleteDocument } from '../handlers/delete_document';
import { eq, and } from 'drizzle-orm';

// Test data
const testUser = {
  id: 'test-user-1',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe'
};

const testDocument = {
  id: 'test-doc-1',
  user_id: 'test-user-1',
  name: 'Test Document.pdf',
  description: 'A test document',
  file_url: 'https://example.com/file.pdf',
  file_type: 'application/pdf',
  file_size: 1024,
  folder_path: '/documents'
};

const otherUserDocument = {
  id: 'test-doc-2',
  user_id: 'other-user-1',
  name: 'Other User Document.pdf',
  description: 'Document belonging to another user',
  file_url: 'https://example.com/other-file.pdf',
  file_type: 'application/pdf',
  file_size: 2048,
  folder_path: '/documents'
};

describe('deleteDocument', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should successfully delete a document that belongs to the user', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create test document
    await db.insert(documentsTable)
      .values(testDocument)
      .execute();

    // Delete the document
    const result = await deleteDocument(testUser.id, testDocument.id);

    // Verify deletion was successful
    expect(result).toBe(true);

    // Verify document is no longer in database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDocument.id))
      .execute();

    expect(documents).toHaveLength(0);
  });

  it('should return false when document does not exist', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Try to delete non-existent document
    const result = await deleteDocument(testUser.id, 'non-existent-doc-id');

    expect(result).toBe(false);
  });

  it('should return false when document belongs to different user', async () => {
    // Create test users
    await db.insert(usersTable)
      .values([
        testUser,
        { id: 'other-user-1', email: 'other@example.com', first_name: 'Jane', last_name: 'Smith' }
      ])
      .execute();

    // Create document for other user
    await db.insert(documentsTable)
      .values(otherUserDocument)
      .execute();

    // Try to delete document as wrong user
    const result = await deleteDocument(testUser.id, otherUserDocument.id);

    expect(result).toBe(false);

    // Verify document still exists
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, otherUserDocument.id))
      .execute();

    expect(documents).toHaveLength(1);
  });

  it('should only delete the specific document when user has multiple documents', async () => {
    const secondDocument = {
      id: 'test-doc-3',
      user_id: 'test-user-1',
      name: 'Another Document.txt',
      description: 'Another test document',
      file_url: 'https://example.com/another-file.txt',
      file_type: 'text/plain',
      file_size: 512,
      folder_path: '/documents'
    };

    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create multiple documents for the user
    await db.insert(documentsTable)
      .values([testDocument, secondDocument])
      .execute();

    // Delete only the first document
    const result = await deleteDocument(testUser.id, testDocument.id);

    expect(result).toBe(true);

    // Verify only the first document was deleted
    const remainingDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.user_id, testUser.id))
      .execute();

    expect(remainingDocuments).toHaveLength(1);
    expect(remainingDocuments[0].id).toBe(secondDocument.id);

    // Verify the deleted document is gone
    const deletedDocument = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDocument.id))
      .execute();

    expect(deletedDocument).toHaveLength(0);
  });

  it('should handle database constraints properly', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create test document
    await db.insert(documentsTable)
      .values(testDocument)
      .execute();

    // Delete the document
    const result = await deleteDocument(testUser.id, testDocument.id);
    expect(result).toBe(true);

    // Try to delete the same document again
    const secondResult = await deleteDocument(testUser.id, testDocument.id);
    expect(secondResult).toBe(false);
  });

  it('should verify proper security - cannot delete with empty user_id', async () => {
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();

    // Create test document
    await db.insert(documentsTable)
      .values(testDocument)
      .execute();

    // Try to delete with empty user_id
    const result = await deleteDocument('', testDocument.id);

    expect(result).toBe(false);

    // Verify document still exists
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, testDocument.id))
      .execute();

    expect(documents).toHaveLength(1);
  });
});