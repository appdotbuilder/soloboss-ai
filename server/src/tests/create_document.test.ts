import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { documentsTable, usersTable } from '../db/schema';
import { type CreateDocumentInput } from '../schema';
import { createDocument } from '../handlers/create_document';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Test user data
const testUserId = randomUUID();
const testUser = {
  id: testUserId,
  email: 'test@example.com',
  first_name: 'Test',
  last_name: 'User'
};

// Test document input
const testInput: CreateDocumentInput = {
  name: 'Test Document.pdf',
  description: 'A test document for testing',
  file_url: 'https://example.com/files/test-document.pdf',
  file_type: 'application/pdf',
  file_size: 1024000,
  folder_path: '/work/reports'
};

describe('createDocument', () => {
  beforeEach(async () => {
    await createDB();
    
    // Create test user
    await db.insert(usersTable)
      .values(testUser)
      .execute();
  });
  
  afterEach(resetDB);

  it('should create a document successfully', async () => {
    const result = await createDocument(testUserId, testInput);

    // Verify basic fields
    expect(result.name).toEqual('Test Document.pdf');
    expect(result.description).toEqual(testInput.description);
    expect(result.file_url).toEqual(testInput.file_url);
    expect(result.file_type).toEqual('application/pdf');
    expect(result.file_size).toEqual(1024000);
    expect(result.folder_path).toEqual('/work/reports');
    expect(result.user_id).toEqual(testUserId);
    
    // Verify auto-generated fields
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('string');
    expect(result.id.length).toBeGreaterThan(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save document to database', async () => {
    const result = await createDocument(testUserId, testInput);

    // Query the document from database
    const documents = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.id, result.id))
      .execute();

    expect(documents).toHaveLength(1);
    const savedDocument = documents[0];
    
    expect(savedDocument.name).toEqual('Test Document.pdf');
    expect(savedDocument.description).toEqual(testInput.description);
    expect(savedDocument.file_url).toEqual(testInput.file_url);
    expect(savedDocument.file_type).toEqual('application/pdf');
    expect(savedDocument.file_size).toEqual(1024000);
    expect(savedDocument.folder_path).toEqual('/work/reports');
    expect(savedDocument.user_id).toEqual(testUserId);
    expect(savedDocument.created_at).toBeInstanceOf(Date);
    expect(savedDocument.updated_at).toBeInstanceOf(Date);
  });

  it('should handle document with minimal data', async () => {
    const minimalInput: CreateDocumentInput = {
      name: 'Simple.txt',
      description: null,
      file_url: 'https://example.com/simple.txt',
      file_type: 'text/plain',
      file_size: 512,
      folder_path: null
    };

    const result = await createDocument(testUserId, minimalInput);

    expect(result.name).toEqual('Simple.txt');
    expect(result.description).toBeNull();
    expect(result.folder_path).toBeNull();
    expect(result.file_url).toEqual(minimalInput.file_url);
    expect(result.file_type).toEqual('text/plain');
    expect(result.file_size).toEqual(512);
    expect(result.user_id).toEqual(testUserId);
  });

  it('should handle document with different file types', async () => {
    const imageInput: CreateDocumentInput = {
      name: 'photo.jpg',
      description: 'A test image',
      file_url: 'https://example.com/photo.jpg',
      file_type: 'image/jpeg',
      file_size: 2048000,
      folder_path: '/photos'
    };

    const result = await createDocument(testUserId, imageInput);

    expect(result.name).toEqual('photo.jpg');
    expect(result.file_type).toEqual('image/jpeg');
    expect(result.file_size).toEqual(2048000);
    expect(result.folder_path).toEqual('/photos');
  });

  it('should throw error for non-existent user', async () => {
    const nonExistentUserId = randomUUID();

    await expect(
      createDocument(nonExistentUserId, testInput)
    ).rejects.toThrow(/User with ID .* not found/i);
  });

  it('should create multiple documents for same user', async () => {
    const input1: CreateDocumentInput = {
      name: 'Document1.pdf',
      description: 'First document',
      file_url: 'https://example.com/doc1.pdf',
      file_type: 'application/pdf',
      file_size: 1000,
      folder_path: '/folder1'
    };

    const input2: CreateDocumentInput = {
      name: 'Document2.docx',
      description: 'Second document',
      file_url: 'https://example.com/doc2.docx',
      file_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      file_size: 2000,
      folder_path: '/folder2'
    };

    const result1 = await createDocument(testUserId, input1);
    const result2 = await createDocument(testUserId, input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.user_id).toEqual(testUserId);
    expect(result2.user_id).toEqual(testUserId);
    expect(result1.name).toEqual('Document1.pdf');
    expect(result2.name).toEqual('Document2.docx');

    // Verify both are saved in database
    const allDocuments = await db.select()
      .from(documentsTable)
      .where(eq(documentsTable.user_id, testUserId))
      .execute();

    expect(allDocuments).toHaveLength(2);
  });

  it('should handle large file sizes', async () => {
    const largeFileInput: CreateDocumentInput = {
      name: 'large-video.mp4',
      description: 'A large video file',
      file_url: 'https://example.com/large-video.mp4',
      file_type: 'video/mp4',
      file_size: 1073741824, // 1GB in bytes
      folder_path: '/videos'
    };

    const result = await createDocument(testUserId, largeFileInput);

    expect(result.file_size).toEqual(1073741824);
    expect(result.name).toEqual('large-video.mp4');
    expect(result.file_type).toEqual('video/mp4');
  });
});