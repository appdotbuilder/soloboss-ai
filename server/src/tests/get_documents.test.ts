import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, documentsTable } from '../db/schema';
import { getDocuments } from '../handlers/get_documents';

// Test data
const testUser = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User',
  profile_picture_url: null
};

const testUser2 = {
  id: 'user-2',
  email: 'test2@example.com',
  first_name: 'Test',
  last_name: 'User2',
  profile_picture_url: null
};

const testDocuments = [
  {
    id: 'doc-1',
    user_id: 'user-1',
    name: 'Document 1',
    description: 'First document',
    file_url: 'https://example.com/doc1.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    folder_path: null
  },
  {
    id: 'doc-2',
    user_id: 'user-1',
    name: 'Document 2',
    description: 'Second document',
    file_url: 'https://example.com/doc2.pdf',
    file_type: 'application/pdf',
    file_size: 2048,
    folder_path: 'work'
  },
  {
    id: 'doc-3',
    user_id: 'user-1',
    name: 'Document 3',
    description: null,
    file_url: 'https://example.com/doc3.docx',
    file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 4096,
    folder_path: 'work'
  },
  {
    id: 'doc-4',
    user_id: 'user-1',
    name: 'Document 4',
    description: 'Fourth document',
    file_url: 'https://example.com/doc4.jpg',
    file_type: 'image/jpeg',
    file_size: 512,
    folder_path: 'personal'
  },
  {
    id: 'doc-5',
    user_id: 'user-2',
    name: 'Other User Document',
    description: 'Document from another user',
    file_url: 'https://example.com/doc5.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    folder_path: null
  }
];

describe('getDocuments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  beforeEach(async () => {
    // Insert test users
    await db.insert(usersTable).values([testUser, testUser2]);

    // Insert test documents with slight delays to ensure different timestamps
    for (const doc of testDocuments) {
      await db.insert(documentsTable).values(doc);
      await new Promise(resolve => setTimeout(resolve, 1)); // Ensure different timestamps
    }
  });

  it('should return all documents for a user', async () => {
    const result = await getDocuments('user-1');

    expect(result).toHaveLength(4);
    expect(result.every(doc => doc.user_id === 'user-1')).toBe(true);
    
    // Verify all expected documents are included
    const docIds = result.map(doc => doc.id);
    expect(docIds).toContain('doc-1');
    expect(docIds).toContain('doc-2');
    expect(docIds).toContain('doc-3');
    expect(docIds).toContain('doc-4');
    expect(docIds).not.toContain('doc-5'); // Should not include other user's documents
  });

  it('should return documents ordered by created_at descending', async () => {
    const result = await getDocuments('user-1');

    expect(result).toHaveLength(4);
    
    // Check that documents are ordered by created_at in descending order (newest first)
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].created_at >= result[i].created_at).toBe(true);
    }
  });

  it('should filter documents by folder path', async () => {
    const result = await getDocuments('user-1', 'work');

    expect(result).toHaveLength(2);
    expect(result.every(doc => doc.folder_path === 'work')).toBe(true);
    
    const docIds = result.map(doc => doc.id);
    expect(docIds).toContain('doc-2');
    expect(docIds).toContain('doc-3');
  });

  it('should filter documents in root folder when folderPath is null', async () => {
    const result = await getDocuments('user-1', null);

    expect(result).toHaveLength(1);
    expect(result[0].folder_path).toBe(null);
    expect(result[0].id).toBe('doc-1');
  });

  it('should return empty array for non-existent folder', async () => {
    const result = await getDocuments('user-1', 'non-existent-folder');

    expect(result).toHaveLength(0);
  });

  it('should return empty array for user with no documents', async () => {
    // Insert a user with no documents
    await db.insert(usersTable).values({
      id: 'user-3',
      email: 'test3@example.com',
      first_name: 'Test',
      last_name: 'User3',
      profile_picture_url: null
    });

    const result = await getDocuments('user-3');

    expect(result).toHaveLength(0);
  });

  it('should return empty array for non-existent user', async () => {
    const result = await getDocuments('non-existent-user');

    expect(result).toHaveLength(0);
  });

  it('should include all document fields', async () => {
    const result = await getDocuments('user-1');

    expect(result.length).toBeGreaterThan(0);
    
    const doc = result[0];
    expect(doc.id).toBeDefined();
    expect(doc.user_id).toBeDefined();
    expect(doc.name).toBeDefined();
    expect(doc.file_url).toBeDefined();
    expect(doc.file_type).toBeDefined();
    expect(doc.file_size).toBeDefined();
    expect(doc.created_at).toBeInstanceOf(Date);
    expect(doc.updated_at).toBeInstanceOf(Date);
    // description and folder_path can be null
  });

  it('should handle documents with different file types', async () => {
    const result = await getDocuments('user-1');

    const fileTypes = result.map(doc => doc.file_type);
    expect(fileTypes).toContain('application/pdf');
    expect(fileTypes).toContain('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(fileTypes).toContain('image/jpeg');
  });

  it('should handle documents with null descriptions', async () => {
    const result = await getDocuments('user-1');

    // Find document with null description
    const docWithNullDesc = result.find(doc => doc.id === 'doc-3');
    expect(docWithNullDesc).toBeDefined();
    expect(docWithNullDesc!.description).toBe(null);
  });
});