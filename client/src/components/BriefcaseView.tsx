import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import { 
  Upload,
  FileText,
  FolderOpen,
  Download,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  File,
  Image,
  Video,
  Music,
  Archive,
  Briefcase
} from 'lucide-react';
import type { Document, CreateDocumentInput, UpdateDocumentInput } from '../../../server/src/schema';

export function BriefcaseView() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [newDocument, setNewDocument] = useState<CreateDocumentInput>({
    name: '',
    description: null,
    file_url: '',
    file_type: '',
    file_size: 0,
    folder_path: null
  });

  const [editDocument, setEditDocument] = useState<Partial<UpdateDocumentInput>>({});

  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getDocuments.query({ 
        folderPath: currentFolder || undefined 
      });
      setDocuments(result);
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocument.name.trim() || !newDocument.file_url.trim()) return;

    try {
      const documentData = {
        ...newDocument,
        folder_path: currentFolder || null
      };
      const createdDocument = await trpc.createDocument.mutate(documentData);
      setDocuments((prev: Document[]) => [...prev, createdDocument]);
      setNewDocument({
        name: '',
        description: null,
        file_url: '',
        file_type: '',
        file_size: 0,
        folder_path: null
      });
      setIsCreateDialogOpen(false);
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Document Uploaded',
        description: `Uploaded document: ${createdDocument.name}`,
        entityType: 'document',
        entityId: createdDocument.id
      });
    } catch (error) {
      console.error('Failed to create document:', error);
    }
  };

  const handleUpdateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDocument || !editDocument.id) return;

    try {
      const updatedDocument = await trpc.updateDocument.mutate(editDocument as UpdateDocumentInput);
      setDocuments((prev: Document[]) => 
        prev.map((doc: Document) => doc.id === updatedDocument.id ? updatedDocument : doc)
      );
      setEditingDocument(null);
      setEditDocument({});
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Document Updated',
        description: `Updated document: ${updatedDocument.name}`,
        entityType: 'document',
        entityId: updatedDocument.id
      });
    } catch (error) {
      console.error('Failed to update document:', error);
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      await trpc.deleteDocument.mutate({ documentId });
      setDocuments((prev: Document[]) => prev.filter((doc: Document) => doc.id !== documentId));
      
      // Log activity
      await trpc.logActivity.mutate({
        action: 'Document Deleted',
        description: 'Deleted a document',
        entityType: 'document',
        entityId: documentId
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('image')) return <Image className="h-5 w-5 text-green-600" />;
    if (type.includes('video')) return <Video className="h-5 w-5 text-red-600" />;
    if (type.includes('audio')) return <Music className="h-5 w-5 text-purple-600" />;
    if (type.includes('pdf') || type.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />;
    if (type.includes('zip') || type.includes('archive')) return <Archive className="h-5 w-5 text-orange-600" />;
    return <File className="h-5 w-5 text-gray-600" />;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const filteredDocuments = documents.filter((doc: Document) => {
    if (!searchQuery) return true;
    return doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (doc.description && doc.description.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const startEdit = (document: Document) => {
    setEditingDocument(document);
    setEditDocument({
      id: document.id,
      name: document.name,
      description: document.description,
      folder_path: document.folder_path
    });
  };

  // Get unique folder paths for breadcrumbs
  const folderPaths = currentFolder.split('/').filter(Boolean);

  // Simulate file upload (in real app, this would handle actual file uploads)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to Supabase storage here
      // For now, we'll simulate with a placeholder URL
      setNewDocument((prev: CreateDocumentInput) => ({
        ...prev,
        name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_url: `https://placeholder-storage.com/${file.name}` // Placeholder URL
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Briefcase 💼</h2>
          <p className="text-gray-600 mt-1">Your secure document fortress and knowledge arsenal</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload New Document</DialogTitle>
              <DialogDescription>
                Add a new document to your secure briefcase
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateDocument}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="file">Select File *</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    className="cursor-pointer"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Note: In this demo, files are not actually uploaded. In production, this would integrate with Supabase Storage.
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="name">Document Name *</Label>
                  <Input
                    id="name"
                    value={newDocument.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewDocument((prev: CreateDocumentInput) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="Enter document name"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newDocument.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setNewDocument((prev: CreateDocumentInput) => ({ 
                        ...prev, 
                        description: e.target.value || null 
                      }))
                    }
                    placeholder="Describe this document..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="folder">Folder Path</Label>
                  <Input
                    id="folder"
                    value={newDocument.folder_path || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setNewDocument((prev: CreateDocumentInput) => ({ 
                        ...prev, 
                        folder_path: e.target.value || null 
                      }))
                    }
                    placeholder="e.g., /projects/contracts"
                  />
                </div>
                
                {/* Manual entry fields for demo */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="file_url">File URL *</Label>
                    <Input
                      id="file_url"
                      value={newDocument.file_url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewDocument((prev: CreateDocumentInput) => ({ ...prev, file_url: e.target.value }))
                      }
                      placeholder="https://example.com/file.pdf"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="file_size">File Size (bytes) *</Label>
                    <Input
                      id="file_size"
                      type="number"
                      value={newDocument.file_size}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setNewDocument((prev: CreateDocumentInput) => ({ 
                          ...prev, 
                          file_size: parseInt(e.target.value) || 0 
                        }))
                      }
                      placeholder="1024"
                      required
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Upload Document
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Navigation */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        {/* Breadcrumbs */}
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentFolder('')}
            className={!currentFolder ? 'bg-purple-100' : ''}
          >
            <Briefcase className="h-4 w-4 mr-1" />
            Root
          </Button>
          {folderPaths.map((folder, index) => (
            <div key={index} className="flex items-center space-x-2">
              <span>/</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentFolder(folderPaths.slice(0, index + 1).join('/'))}
                className={index === folderPaths.length - 1 ? 'bg-purple-100' : ''}
              >
                <FolderOpen className="h-4 w-4 mr-1" />
                {folder}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredDocuments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No documents found' : 'No documents in this folder'}
            </h3>
            <p className="text-gray-500">
              {searchQuery 
                ? 'Try adjusting your search terms or browse different folders.'
                : 'Upload your first document to start building your knowledge arsenal!'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((document: Document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(document.file_type)}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate" title={document.name}>
                        {document.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(document.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button variant="ghost" size="sm" asChild>
                      <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => startEdit(document)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteDocument(document.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                {document.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {document.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {document.created_at.toLocaleDateString()}
                  </span>
                  {document.folder_path && (
                    <Badge variant="outline" className="text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      {document.folder_path.split('/').pop()}
                    </Badge>
                  )}
                </div>
                
                <div className="mt-3 flex items-center space-x-2">
                  <Button size="sm" variant="outline" asChild>
                    <a href={document.file_url} download>
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <a href={document.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Document Dialog */}
      <Dialog open={editingDocument !== null} onOpenChange={() => setEditingDocument(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Document</DialogTitle>
            <DialogDescription>Update document information</DialogDescription>
          </DialogHeader>
          {editingDocument && (
            <form onSubmit={handleUpdateDocument}>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-name">Document Name *</Label>
                  <Input
                    id="edit-name"
                    value={editDocument.name || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditDocument((prev) => ({ ...prev, name: e.target.value }))
                    }
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editDocument.description || ''}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                      setEditDocument((prev) => ({ ...prev, description: e.target.value || null }))
                    }
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-folder">Folder Path</Label>
                  <Input
                    id="edit-folder"
                    value={editDocument.folder_path || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setEditDocument((prev) => ({ ...prev, folder_path: e.target.value || null }))
                    }
                    placeholder="e.g., /projects/contracts"
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="submit" className="bg-purple-600 hover:bg-purple-700">
                  Update Document
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}