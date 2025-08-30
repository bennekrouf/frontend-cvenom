'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  FiFolder, 
  FiFile, 
  FiSave, 
  FiSettings, 
  FiCode, 
  FiRefreshCw, 
  FiChevronRight, 
  FiChevronDown,
  FiPlus,
  FiUpload,
  FiDownload
} from 'react-icons/fi';

import CreateCollaboratorModal from './CreateCollaboratorModal';
import UploadPictureModal from './UploadPictureModal';
import GenerateCVModal from './GenerateCVModal';
import AuthGuard from '@/components/auth/AuthGuard';
import { createCollaborator, uploadPicture, generateCV } from '@/lib/api';

interface ApiSuccessResponse {
  success: boolean;
  message?: string;
  [key: string]: unknown;
}

interface FileTreeItem {
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  children?: Record<string, FileTreeItem>;
}

const FileEditor = () => {
  const [fileTree, setFileTree] = useState<Record<string, FileTreeItem> | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['data']));
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Collaborator and modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Show status message temporarily
  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Save file content
  const saveFile = useCallback(async () => {
    if (!selectedFile) return;
    
    try {
      const response = await fetch('/api/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: selectedFile,
          content: fileContent
        })
      });
      
      if (response.ok) {
        setUnsavedChanges(false);
        setLastSaved(new Date());
        showStatus('File saved successfully!');
      } else {
        showStatus('Failed to save file');
      }
    } catch (error) {
      console.error('Error saving file:', error);
      showStatus('Failed to save file');
    }
  }, [selectedFile, fileContent]);



  // Modal handlers with authentication
  const handleCreateCollaborator = async (personName: string) => {
    setIsLoading(true);
    try {
      const response = await createCollaborator(personName);
      const data = response as ApiSuccessResponse;
      
      if (data.success) {
        showStatus('Collaborator created successfully!');
        setShowCreateModal(false);
        await loadFileTree(); // Refresh file tree
        setSelectedCollaborator(personName); // Auto-select the new person
        setExpandedFolders(new Set(['data', personName])); // Auto-expand their folder
      } else {
        showStatus(data.message || 'Failed to create collaborator');
      }
    } catch (error) {
      console.error('Error creating person:', error);
      
      // Handle specific authentication errors
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus('Please sign in to create collaborators');
        } else if (error.message.includes('token expired')) {
          showStatus('Session expired. Please sign in again');
        } else {
          showStatus(error.message || 'Failed to create collaborator');
        }
      } else {
        showStatus('Failed to create collaborator');
      }
    }
    setIsLoading(false);
  };

  const handleUploadPicture = async (file: File) => {
    if (!selectedCollaborator) return;

    setIsLoading(true);
    try {
const response = await uploadPicture(selectedCollaborator, file);
    const data = response as ApiSuccessResponse;
      
      if (data.success) {
        showStatus('Profile picture uploaded successfully!');
        setShowUploadModal(false);
      } else {
        showStatus(data.message || 'Failed to upload picture');
      }
    } catch (error) {
      console.error('Error uploading picture:', error);
      
      // Handle specific authentication errors
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus('Please sign in to upload pictures');
        } else if (error.message.includes('token expired')) {
          showStatus('Session expired. Please sign in again');
        } else {
          showStatus(error.message || 'Failed to upload picture');
        }
      } else {
        showStatus('Failed to upload picture');
      }
    }
    setIsLoading(false);
  };

  const handleGenerateCV = async (language: string, template: string = 'default') => {
    if (!selectedCollaborator) return;

    setIsGenerating(true);
    try {
      const blob = await generateCV(selectedCollaborator, language, template);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cv-${selectedCollaborator}-${language}-${template}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showStatus('CV generated and downloaded successfully!');
      setShowGenerateModal(false);
    } catch (error) {
      console.error('Error generating CV:', error);
      
      // Handle specific authentication errors
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus('Please sign in to generate CVs');
        } else if (error.message.includes('token expired')) {
          showStatus('Session expired. Please sign in again');
        } else {
          showStatus(error.message || 'Failed to generate CV');
        }
      } else {
        showStatus('Failed to generate CV');
      }
    }
    setIsGenerating(false);
  };

  // Load file tree from API
  const loadFileTree = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/files/tree');
      if (response.ok) {
        const tree = await response.json();
        setFileTree(tree);
      }
    } catch (error) {
      console.error('Error loading file tree:', error);
    }
    setIsLoading(false);
  };

  // Check if file is editable (.typ or .toml)
  const isEditableFile = (filename: string) => {
    return filename.endsWith('.typ') || filename.endsWith('.toml');
  };

  // Get file language for syntax highlighting
  const getFileLanguage = (filename: string) => {
    if (filename.endsWith('.typ')) return 'typst';
    if (filename.endsWith('.toml')) return 'toml';
    return 'text';
  };

  // Load file content
  const loadFile = async (filePath: string) => {
    if (!isEditableFile(filePath)) return;
    
    try {
      const response = await fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`);
      if (response.ok) {
        const content = await response.text();
        setFileContent(content);
        setSelectedFile(filePath);
        setUnsavedChanges(false);
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error loading file:', error);
      setFileContent('Error loading file: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setFileContent(e.target.value);
    setUnsavedChanges(true);
    
    // Auto-save after 2 seconds of inactivity
    if (autoSaveEnabled) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveFile();
      }, 2000);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveFile]);

  // Load initial file tree
  useEffect(() => {
    loadFileTree();
  }, []);

  // Toggle folder expansion
  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  // Render file tree item
  const renderFileTreeItem = (name: string, path: string, item: FileTreeItem, level = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(path);
    const isSelected = selectedFile === path;
    const isEditable = !isFolder && isEditableFile(name);
    const isCollaboratorFolder = (level === 1 && path.startsWith('data/')) || (level === 0 && name !== 'data' && isFolder);
    const isSelectedCollaborator = isCollaboratorFolder && selectedCollaborator === name;
    
    return (
      <div key={path}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-secondary/50 cursor-pointer rounded-sm transition-colors group relative ${
            isSelected ? 'bg-primary/10 text-primary' : ''
          } ${isSelectedCollaborator ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''} ${!isEditable && !isFolder ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          onClick={() => {
            if (isFolder) {
              toggleFolder(path);
              if (isCollaboratorFolder) {
                setSelectedCollaborator(name);
              }
            } else if (isEditable) {
              loadFile(path);
            }
          }}
        >
          {isFolder ? (
            <>
              {isExpanded ? (
                <FiChevronDown className="w-3 h-3 mr-1 text-muted-foreground" />
              ) : (
                <FiChevronRight className="w-3 h-3 mr-1 text-muted-foreground" />
              )}
              <FiFolder className={`w-4 h-4 mr-2 ${isCollaboratorFolder ? 'text-blue-500' : 'text-gray-500'}`} />
            </>
          ) : (
            <FiFile className={`w-4 h-4 mr-2 ${
              isEditable ? 'text-green-500' : 'text-muted-foreground'
            }`} />
          )}
          <span className="text-sm font-medium flex-1">{name}</span>

          {/* Collaborator Actions Menu */}
          {isCollaboratorFolder && isSelectedCollaborator && (
            <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUploadModal(true);
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title="Upload picture"
              >
                <FiUpload className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGenerateModal(true);
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title="Generate CV"
              >
                <FiDownload className="w-3 h-3" />
              </button>
            </div>
          )}
          
          {!isFolder && !isEditable && (
            <span className="ml-auto text-xs text-muted-foreground">readonly</span>
          )}
        </div>
        
        {isFolder && isExpanded && item.children && (
          <div>
            {Object.entries(item.children).map(([childName, childItem]) =>
              renderFileTreeItem(childName, `${path}/${childName}`, childItem, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Status Message */}
      {statusMessage && (
        <div className="fixed top-4 right-4 z-50 bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
          <p className={`text-sm ${statusMessage.includes('Failed') || statusMessage.includes('required') ? 'text-red-500' : 'text-green-500'}`}>
            {statusMessage}
          </p>
        </div>
      )}

      {/* Sidebar - File Tree */}
      <div className="w-80 border-r border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-foreground">Files</h2>
            <div className="flex gap-2">
              <button
                onClick={loadFileTree}
                className="p-1.5 hover:bg-secondary rounded-md transition-colors"
                title="Refresh"
              >
                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                className={`p-1.5 rounded-md transition-colors ${
                  autoSaveEnabled ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                }`}
                title={`Auto-save: ${autoSaveEnabled ? 'ON - Files save automatically after 2s' : 'OFF - Use Ctrl+S or Save button'}`}
              >
                <FiSettings className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Editable: .typ, .toml files only
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-2">
          {fileTree ? (
            <div className="space-y-1">
              {Object.entries(fileTree).map(([name, item]) =>
                renderFileTreeItem(name, name, item)
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              {isLoading ? 'Loading files...' : 'No files loaded'}
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with File Actions */}
        <div className="border-b border-border bg-card">
          {/* File Editor Header */}
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <FiCode className="w-5 h-5 text-muted-foreground" />
              <div>
                <h1 className="font-semibold text-foreground">
                  {selectedFile ? selectedFile.split('/').pop() : selectedCollaborator ? `${selectedCollaborator} - No file selected` : 'No file selected'}
                </h1>
                {selectedFile ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedFile} • {getFileLanguage(selectedFile)}
                  </p>
                ) : selectedCollaborator ? (
                  <p className="text-xs text-muted-foreground">
                    Collaborator: {selectedCollaborator}
                  </p>
                ) : null}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {unsavedChanges && (
                <div className="flex items-center space-x-2 text-sm text-orange-500">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span>Unsaved changes</span>
                </div>
              )}
              
              {lastSaved && (
                <div className="text-xs text-muted-foreground">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}
              
              <AuthGuard
                message="Please sign in to add new collaborators and manage CV files."
                fallback={
                  <button
                    disabled
                    className="flex items-center space-x-2 px-3 py-1.5 bg-gray-400 text-gray-600 rounded-md text-sm font-medium cursor-not-allowed opacity-50"
                    title="Sign in to add collaborators"
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>Add Collaborator</span>
                    <span className="text-xs opacity-75">(Sign in required)</span>
                  </button>
                }
              >
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                  title="Add new collaborator"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Add Collaborator</span>
                </button>
              </AuthGuard>
              
              <button
                onClick={saveFile}
                disabled={!selectedFile || !unsavedChanges}
                className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
              >
                <FiSave className="w-4 h-4" />
                <span>Save</span>
                <span className="text-xs opacity-75">Ctrl+S</span>
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-4">
          {selectedFile ? (
            <div className="h-full">
              <textarea
                ref={textareaRef}
                value={fileContent}
                onChange={handleContentChange}
                className="w-full h-full p-4 bg-background border border-border rounded-lg font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary selectable"
                placeholder="Start editing your file..."
                spellCheck={false}
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <FiFile className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No file selected</p>
                <p className="text-sm">
                  Select a .typ or .toml file from the sidebar to start editing
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <CreateCollaboratorModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateCollaborator={handleCreateCollaborator}
        isLoading={isLoading}
      />

      <UploadPictureModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        collaboratorName={selectedCollaborator}
        onUploadPicture={handleUploadPicture}
        isLoading={isLoading}
      />

      <GenerateCVModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        collaboratorName={selectedCollaborator}
        onGenerateCV={handleGenerateCV}
        isGenerating={isGenerating}
      />
    </div>
  );
};

export default FileEditor;
