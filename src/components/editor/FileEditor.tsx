'use client';

import CVUploadDropZone from './CVUploadDropZone';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiFolder,
  FiFile,
  FiTrash2,
  FiSave,
  FiToggleRight,
  FiToggleLeft,
  FiCode,
  FiRefreshCw,
  FiChevronRight,
  FiChevronDown,
  FiPlus,
  FiCamera,
  FiFileText,
  FiX,
  FiUser,
  FiUpload
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';

import DeleteCollaboratorModal from './DeleteCollaboratorModal';
import { deleteCollaborator } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import CreateCollaboratorModal from './CreateCollaboratorModal';
import UploadPictureModal from './UploadPictureModal';
import GenerateCVModal from './GenerateCVModal';
import {
  createCollaborator,
  getTenantFileTree,
  getTenantFileContent,
  saveTenantFileContent,
  uploadPicture,
  generateCV,
} from '@/lib/api';
import ChatComponent from './ChatComponent';

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
  const { isAuthenticated, loading, user } = useAuth();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);

  const [showUploadZone, setShowUploadZone] = useState(false);
  const t = useTranslations('fileEditor');
  const [fileTree, setFileTree] = useState<Record<string, FileTreeItem> | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState(new Set(['data']));
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDeleteCollaborator = async () => {
    if (!selectedCollaborator || !isAuthenticated) return;

    setIsDeleting(true);
    try {
      const response = await deleteCollaborator(selectedCollaborator);
      const data = response as ApiSuccessResponse;

      if (data.success) {
        showStatus(t('deleteCollaboratorSuccess'));
        setShowDeleteModal(false);
        setSelectedCollaborator(null);
        setSelectedFile(null);
        setFileContent('');
        await loadFileTree(); // Refresh file tree
      } else {
        showStatus(data.message || t('deleteCollaboratorFailed'));
      }
    } catch (error) {
      console.error('Error deleting collaborator:', error);
      showStatus(t('deleteCollaboratorFailed'));
    }
    setIsDeleting(false);
  };

  // Show status message temporarily
  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  // Save file content
  const saveFile = useCallback(async () => {
    if (!selectedFile || !isAuthenticated) return;

    try {
      await saveTenantFileContent(selectedFile, fileContent);
      setUnsavedChanges(false);
      setLastSaved(new Date());
      showStatus(t('fileSavedSuccess'));
    } catch (error) {
      console.error('Error saving file:', error);
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus(t('signInToSave'));
        } else if (error.message.includes('token expired')) {
          showStatus(t('sessionExpired'));
        } else {
          showStatus(t('saveFileFailed'));
        }
      } else {
        showStatus(t('saveFileFailed'));
      }
    }
  }, [selectedFile, fileContent, isAuthenticated, t]);

  const closeFile = () => {
    if (unsavedChanges) {
      const confirmClose = window.confirm(t('confirmCloseUnsaved'));
      if (!confirmClose) return;
    }

    setSelectedFile(null);
    setFileContent('');
    setUnsavedChanges(false);
    setLastSaved(null);
  };

  // Modal handlers with authentication
  const handleCreateCollaborator = async (personName: string) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await createCollaborator(personName);
      const data = response as ApiSuccessResponse;

      if (data.success) {
        showStatus(t('collaboratorCreatedSuccess'));
        setShowCreateModal(false);
        await loadFileTree(); // Refresh file tree
        setSelectedCollaborator(personName); // Auto-select the new person
        setExpandedFolders(new Set(['data', personName])); // Auto-expand their folder
      } else {
        showStatus(data.message || t('createCollaboratorFailed'));
      }
    } catch (error) {
      console.error('Error creating person:', error);

      // Handle specific authentication errors
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus(t('signInToCreateCollaborators'));
        } else if (error.message.includes('token expired')) {
          showStatus(t('sessionExpired'));
        } else {
          showStatus(error.message || t('createCollaboratorFailed'));
        }
      } else {
        showStatus(t('createCollaboratorFailed'));
      }
    }
    setIsLoading(false);
  };

  const handleUploadPicture = async (file: File) => {
    if (!selectedCollaborator || !isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await uploadPicture(selectedCollaborator, file);
      const data = response as ApiSuccessResponse;

      if (data.success) {
        showStatus(t('pictureUploadedSuccess'));
        setShowUploadModal(false);
      } else {
        showStatus(data.message || t('uploadPictureFailed'));
      }
    } catch (error) {
      console.error('Error uploading picture:', error);

      // Handle specific authentication errors
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus(t('signInToUploadPictures'));
        } else if (error.message.includes('token expired')) {
          showStatus(t('sessionExpired'));
        } else {
          showStatus(error.message || t('uploadPictureFailed'));
        }
      } else {
        showStatus(t('uploadPictureFailed'));
      }
    }
    setIsLoading(false);
  };

  const handleGenerateCV = async (language: string, template: string = 'default') => {
    if (!selectedCollaborator || !isAuthenticated) return;

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

      showStatus(t('cvGeneratedSuccess'));
      setShowGenerateModal(false);
    } catch (error) {
      console.error('Error generating CV:', error);

      let errorMessage = t('generateCVFailed');

      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          errorMessage = t('signInToGenerateCV');
        } else if (error.message.includes('token expired')) {
          errorMessage = t('sessionExpired');
        } else {
          // Use the actual error message from the backend
          errorMessage = error.message;
        }
      }

      showStatus(errorMessage);
    }
    setIsGenerating(false);
  };

  // Load file tree from API
  const loadFileTree = useCallback(async () => {
    if (!isAuthenticated) {
      setFileTree(null);
      return;
    }

    setIsLoading(true);
    try {
      const tree = await getTenantFileTree();
      setFileTree(tree);
    } catch (error) {
      console.error('Error loading file tree:', error);
      setFileTree(null);
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus(t('signInToViewFiles'));
        } else if (error.message.includes('token expired')) {
          showStatus(t('sessionExpired'));
        } else {
          showStatus(t('loadFilesFailed'));
        }
      }
    }
    setIsLoading(false);
  }, [isAuthenticated, t]);

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
    if (!isEditableFile(filePath) || !isAuthenticated) return;

    try {
      const content = await getTenantFileContent(filePath);
      setFileContent(content);
      setSelectedFile(filePath);
      setUnsavedChanges(false);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error loading file:', error);
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus(t('signInToAccessFiles'));
          setFileContent(t('authRequiredToView'));
        } else if (error.message.includes('token expired')) {
          showStatus(t('sessionExpired'));
          setFileContent(t('sessionExpiredMessage'));
        } else {
          setFileContent(t('errorLoadingFile') + ': ' + error.message);
        }
      } else {
        setFileContent(t('errorLoadingFileUnknown'));
      }
    }
  };

  // Handle content change
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isAuthenticated) return;

    setFileContent(e.target.value);
    setUnsavedChanges(true);

    // Auto-save after 2 seconds of inactivity
    if (autoSaveEnabled) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveFile();
      }, 10000);
    }
  };

  const handleUploadSuccess = useCallback(async (personName: string) => {
    setShowUploadZone(false);
    await loadFileTree();
    setSelectedCollaborator(personName);
    setExpandedFolders(new Set(['data', personName]));
    showStatus(`CV converted successfully! Collaborator "${personName}" created`);
  }, [loadFileTree]);
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

  // Load files when authentication status changes
  useEffect(() => {
    if (isAuthenticated) {
      loadFileTree();
    } else {
      // Clear data when not authenticated
      setFileTree(null);
      setSelectedFile(null);
      setFileContent('');
      setSelectedCollaborator(null);
    }
  }, [isAuthenticated, loadFileTree]);

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

  // Handle delete button click - FIXED
  const handleDeleteClick = (collaboratorName: string) => {
    setSelectedCollaborator(collaboratorName);
    setShowDeleteModal(true);
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
          className={`flex items-center py-1 px-2 hover:bg-secondary/50 cursor-pointer rounded-sm transition-colors group relative ${isSelected ? 'bg-primary/10 text-primary' : ''
            } ${isSelectedCollaborator ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''} ${!isEditable && !isFolder ? 'opacity-50' : ''}`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          title={
            isFolder ?
              (isCollaboratorFolder ?
                t('collaboratorFolderTooltip', { name }) :
                t('folderTooltip', { name })
              ) :
              (isEditable ?
                t('editableFileTooltip', { name, language: getFileLanguage(name) }) :
                t('readonlyFileTooltip', { name })
              )
          }
          onClick={() => {
            if (isFolder) {
              toggleFolder(path);
              if (isCollaboratorFolder) {
                setSelectedCollaborator(name);
              }
            } else if (isEditable && isAuthenticated) {
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
            <FiFile className={`w-4 h-4 mr-2 ${isEditable ? 'text-green-500' : 'text-muted-foreground'
              }`} />
          )}
          <span className="text-sm font-medium flex-1">{name}</span>

          {/* Collaborator Actions Menu - FIXED */}
          {isCollaboratorFolder && isSelectedCollaborator && isAuthenticated && (
            <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUploadModal(true);
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title={t('uploadPictureTooltip', { name })}
              >
                <FiCamera className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowGenerateModal(true);
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title={t('generateCVTooltip', { name })}
              >
                <FiFileText className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteClick(name); // FIXED: Call the proper handler
                }}
                className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500"
                title={`Delete collaborator ${name} and all associated files`}
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {!isFolder && !isEditable && (
            <span className="ml-auto text-xs text-muted-foreground">{t('readonly')}</span>
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

  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
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
            <h2 className="text-lg font-semibold text-foreground">{t('files')}</h2>
            <div className="flex gap-2">
              <button
                onClick={loadFileTree}
                disabled={!isAuthenticated}
                className="p-1.5 hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
                title={isAuthenticated ?
                  (isLoading ? t('refreshingFileTree') : t('refreshFileTree')) :
                  t('signInToRefresh')
                }
              >
                <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
                disabled={!isAuthenticated}
                className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${autoSaveEnabled && isAuthenticated ? 'text-green-600' : 'text-gray-400 hover:bg-secondary'
                  }`}
                title={isAuthenticated ?
                  `${t('autoSave')}: ${autoSaveEnabled ? t('autoSaveOn') : t('autoSaveOff')}` :
                  t('signInToEnableAutoSave')
                }
              >
                {autoSaveEnabled && isAuthenticated ? (
                  <FiToggleRight className="w-4 h-4" />
                ) : (
                  <FiToggleLeft className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Tenant Indicator */}
          {isAuthenticated && user && (
            <div className="mb-3 space-y-2">
              {/* Personalized Greeting */}
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-md">
                <h3 className="text-sm font-semibold text-primary mb-1">
                  Good morning, {user.displayName?.split(' ')[0]}
                </h3>
                <p className="text-xs text-primary/70">
                  Ready to create amazing CVs?
                </p>
              </div>

              {/* Upload CV Button */}
              <button
                onClick={() => setShowUploadZone(true)}
                className="w-full flex items-center justify-center space-x-2 p-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <FiUpload className="w-4 h-4" />
                <span>Upload & Convert CV</span>
              </button>

              {/* User Info */}
              <div className="p-2 bg-secondary/30 rounded-md">
                <div className="flex items-center space-x-2">
                  <FiUser className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">
                      {user.displayName || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            {isAuthenticated ?
              t('editableFiles') :
              t('signInToEdit')
            }
          </div>
        </div>

        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <div className="text-sm text-muted-foreground p-2 text-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              {t('checkingAuth')}
            </div>
          ) : !isAuthenticated ? (
            <div className="text-center p-4">
              <FiFolder className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted-foreground mb-3">{t('signInToViewFiles')}</p>
            </div>
          ) : fileTree ? (
            <div className="space-y-1">
              {Object.entries(fileTree).map(([name, item]) =>
                renderFileTreeItem(name, name, item)
              )}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground p-2">
              {isLoading ? t('loadingFiles') : t('noFilesFound')}
            </div>
          )}
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col">
        {/* Header with File Actions */}
        <div className="border-b border-border bg-card">
          <div className="h-14 flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <FiCode className="w-5 h-5 text-muted-foreground" />
              <div>
                <h1 className="font-semibold text-foreground">
                  {selectedFile ? selectedFile.split('/').pop() : selectedCollaborator ? selectedCollaborator : 'CV Assistant'}
                </h1>
                {selectedFile ? (
                  <p className="text-xs text-muted-foreground">
                    {selectedFile} • {getFileLanguage(selectedFile)}
                  </p>
                ) : selectedCollaborator ? (
                  <p className="text-xs text-muted-foreground">
                    Collaborator selected • Use chat for commands
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isAuthenticated ? t('cvAssistantEnabled') : t('cvAssistantSignIn')}
                  </p>
                )}
              </div>

              {/* Close File Button */}
              {selectedFile && (
                <button
                  onClick={closeFile}
                  className="ml-2 p-1.5 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
                  title={t('closeFileTooltip')}
                >
                  <FiX className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {unsavedChanges && isAuthenticated && (
                <div className="flex items-center space-x-2 text-sm text-orange-500">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span>{t('unsavedChanges')}</span>
                </div>
              )}

              {lastSaved && isAuthenticated && (
                <div className="text-xs text-muted-foreground">
                  {t('lastSaved')}: {lastSaved.toLocaleTimeString()}
                </div>
              )}

              {/* Conditional Add Collaborator button */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUploadZone(!showUploadZone)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    title="Upload and convert CV to create new collaborator"
                  >
                    <FiUpload className="w-4 h-4" />
                    <span>Upload CV</span>
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    title={t('createCollaboratorTooltip')}
                  >
                    <FiPlus className="w-4 h-4" />
                    <span>{t('addCollaborator')}</span>
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-400 text-gray-600 rounded-md text-sm font-medium cursor-not-allowed opacity-50"
                  title={t('authRequiredCollaborators')}
                >
                  <FiPlus className="w-4 h-4" />
                  <span>{t('addCollaborator')}</span>
                  <span className="text-xs opacity-75">({t('signInRequired')})</span>
                </button>
              )}

              <button
                onClick={saveFile}
                disabled={!selectedFile || !unsavedChanges || !isAuthenticated}
                className="flex items-center space-x-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                title={
                  !isAuthenticated ? t('signInToSaveFiles') :
                    !selectedFile ? t('selectFileToSave') :
                      !unsavedChanges ? t('noUnsavedChanges') :
                        t('saveFileTooltip')
                }
              >
                <FiSave className="w-4 h-4" />
                <span>{t('save')}</span>
                <span className="text-xs opacity-75">Ctrl+S</span>
              </button>
            </div>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          {!isAuthenticated ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground">
                <FiUser className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t('authenticationRequired')}</p>
                <p className="text-sm">
                  {t('signInGoogle')}
                </p>
              </div>
            </div>
          ) : selectedFile ? (
            <div className="h-full p-4">
              <textarea
                ref={textareaRef}
                value={fileContent}
                onChange={handleContentChange}
                className="w-full h-full p-4 bg-background border border-border rounded-lg font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary selectable"
                placeholder={t('startEditingPlaceholder')}
                spellCheck={false}
              />
            </div>
          ) : (
            /* Chat Component - shown when no file is selected */
            <ChatComponent
              isVisible={!selectedFile}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>

      {/* Upload Zone - shown when showUploadZone is true */}
      {showUploadZone && isAuthenticated && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload & Convert CV</h3>
              <button
                onClick={() => setShowUploadZone(false)}
                className="p-2 hover:bg-secondary rounded-md transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
            <CVUploadDropZone onUploadSuccess={handleUploadSuccess} />
          </div>
        </div>
      )}


      {/* Modals - only show when authenticated */}
      {isAuthenticated && (
        <>
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

          {/* Delete Modal - FIXED: Pass correct props */}
          <DeleteCollaboratorModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            collaboratorName={selectedCollaborator}
            onDeleteCollaborator={handleDeleteCollaborator}
            isDeleting={isDeleting}
          />
        </>
      )}
    </div>
  );
};

export default FileEditor;
