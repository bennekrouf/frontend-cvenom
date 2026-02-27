'use client';

import CVUploadDropZone from './CVUploadDropZone';
import FileTreePanel from './FileTreePanel';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiSave,
  FiCode,
  FiPlus,
  FiX,
  FiUser,
  FiUpload,
  FiMenu,
  FiChevronLeft,
  FiTarget,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';

import DeleteCollaboratorModal from './DeleteCollaboratorModal';
import { deleteCollaborator, renameCollaborator } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import CreateCollaboratorModal from './CreateCollaboratorModal';
import OptimizeModal from './OptimizeModal';
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
import ChatComponent from '../chat/ChatComponent';
import { signInWithGoogle } from '@/lib/firebase';

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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  // Collaborator and modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebar on mobile
      if (mobile && sidebarOpen) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [sidebarOpen]);

  // All handler functions remain the same...
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
        await loadFileTree();
      } else {
        showStatus(data.message || t('deleteCollaboratorFailed'));
      }
    } catch (error) {
      console.error('Error deleting profile:', error);
      showStatus(t('deleteCollaboratorFailed'));
    }
    setIsDeleting(false);
  };

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(''), 3000);
  };

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

  const handleCreateCollaborator = async (personName: string) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await createCollaborator(personName);
      const data = response as ApiSuccessResponse;

      if (data.success) {
        showStatus(t('collaboratorCreatedSuccess'));
        setShowCreateModal(false);
        await loadFileTree();
        setSelectedCollaborator(personName);
        setExpandedFolders(new Set(['data', personName]));
      } else {
        showStatus(data.message || t('createCollaboratorFailed'));
      }
    } catch (error) {
      console.error('Error creating profile:', error);

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
          errorMessage = error.message;
        }
      }

      showStatus(errorMessage);
    }
    setIsGenerating(false);
  };

  const handleRenameCollaborator = async (oldName: string, newName: string) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    try {
      const response = await renameCollaborator(oldName, newName);
      const data = response as ApiSuccessResponse;

      if (data.success) {
        showStatus(`Collaborator renamed from "${oldName}" to "${newName}"`);

        if (selectedCollaborator === oldName) {
          setSelectedCollaborator(newName);
        }

        await loadFileTree();
      } else {
        showStatus(data.message || 'Failed to rename profile');
      }
    } catch (error) {
      console.error('Error renaming profile:', error);

      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus('Sign in required to rename collaborators');
        } else if (error.message.includes('Session expired')) {
          showStatus('Session expired - please sign in again');
        } else if (error.message.includes('already exists')) {
          showStatus('A profile with that name already exists');
        } else if (error.message.includes('not found')) {
          showStatus('Collaborator not found');
        } else if (error.message.includes('Invalid profile name')) {
          showStatus('Invalid name format - use lowercase letters and hyphens only');
        } else {
          showStatus(error.message || 'Failed to rename profile');
        }
      } else {
        showStatus('Failed to rename profile');
      }
    } finally {
      setIsLoading(false);
    }
  };

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

      // Only show error status for actual errors, not empty states
      if (error instanceof Error) {
        if (error.message.includes('Authentication required')) {
          showStatus(t('signInToViewFiles'));
        } else if (error.message.includes('token expired')) {
          showStatus(t('sessionExpired'));
        } else if (!error.message.includes('No files found') && !error.message.includes('empty')) {
          // Only show error for genuine failures, not empty states
          showStatus(t('loadFilesFailed'));
        }
      }

      // Set empty tree instead of null for empty states
      setFileTree({});
    }
    setIsLoading(false);
  }, [isAuthenticated, t]);

  const isEditableFile = (filename: string) => {
    return filename.endsWith('.typ') || filename.endsWith('.toml');
  };

  const getFileLanguage = (filename: string) => {
    if (filename.endsWith('.typ')) return 'typst';
    if (filename.endsWith('.toml')) return 'toml';
    return 'text';
  };

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!isAuthenticated) return;

    setFileContent(e.target.value);
    setUnsavedChanges(true);

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

  useEffect(() => {
    if (isAuthenticated) {
      loadFileTree();
    } else {
      setFileTree(null);
      setSelectedFile(null);
      setFileContent('');
      setSelectedCollaborator(null);
    }
  }, [isAuthenticated, loadFileTree]);

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  if (!mounted) {
    return (
      <div className="flex h-[calc(100vh-4rem)] bg-background">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mt-8" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background relative">
      {/* Status Message */}
      {statusMessage && (
        <div className="fixed top-20 right-4 z-50 bg-card border border-border rounded-lg px-4 py-2 shadow-lg">
          <p className={`text-sm ${statusMessage.includes('Failed') || statusMessage.includes('required') ? 'text-red-500' : 'text-green-500'}`}>
            {statusMessage}
          </p>
        </div>
      )}

      {/* Mobile Overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Toggle Button for Closed Sidebar */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed top-20 left-4 z-40 p-2 bg-card border border-border rounded-md shadow-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          title="Open sidebar"
        >
          <FiMenu className="w-4 h-4" />
        </button>
      )}

      {/* Left Sidebar - Full Height starting from navbar bottom */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isMobile ? 'fixed left-0 top-16 h-[calc(100vh-4rem)] z-40' : 'relative h-full'}
        transition-transform duration-300 ease-in-out
        ${sidebarOpen && !isMobile ? 'w-80' : 'w-0'}
        bg-card border-r border-border flex flex-col
      `}>
        {/* Toggle Button inside Sidebar */}
        {sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 bg-background border border-border rounded-md shadow-sm hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
            title="Close sidebar"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
        )}

        {sidebarOpen && (
          <FileTreePanel
            fileTree={fileTree}
            selectedFile={selectedFile}
            selectedCollaborator={selectedCollaborator}
            expandedFolders={expandedFolders}
            autoSaveEnabled={autoSaveEnabled}
            isLoading={isLoading}
            isAuthenticated={isAuthenticated}
            user={user}
            loading={loading}
            onLoadFileTree={loadFileTree}
            onToggleAutoSave={() => setAutoSaveEnabled(!autoSaveEnabled)}
            onCreateCollaborator={() => setShowCreateModal(true)}
            onToggleFolder={toggleFolder}
            onLoadFile={loadFile}
            onSelectCollaborator={setSelectedCollaborator}
            onShowUploadModal={() => setShowUploadModal(true)}
            onDeleteCollaborator={() => setShowDeleteModal(true)}
            onShowGenerateModal={() => setShowGenerateModal(true)}
            onRenameCollaborator={handleRenameCollaborator}
          />
        )}
      </div>

      {/* Right Side - Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
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
                <div className="hidden sm:flex items-center space-x-2 text-sm text-orange-500">
                  <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                  <span>{t('unsavedChanges')}</span>
                </div>
              )}

              {lastSaved && isAuthenticated && (
                <div className="hidden md:block text-xs text-muted-foreground">
                  {t('lastSaved')}: {lastSaved.toLocaleTimeString()}
                </div>
              )}

              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowUploadZone(!showUploadZone)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    title="Upload and convert CV to create new profile"
                  >
                    <FiUpload className="w-4 h-4" />
                    <span className="hidden sm:inline">Upload CV</span>
                  </button>
                  <button
                    onClick={() => setShowOptimizeModal(true)}
                    disabled={!selectedCollaborator}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-orange-500 text-white rounded-md text-sm font-medium hover:bg-orange-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title={selectedCollaborator ? 'Optimize CV for ATS with a job posting URL' : 'Select a collaborator first'}
                  >
                    <FiTarget className="w-4 h-4" />
                    <span className="hidden sm:inline">Optimize for ATS</span>
                  </button>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                    title={t('createCollaboratorTooltip')}
                  >
                    <FiPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('addCollaborator')}</span>
                  </button>
                </div>
              ) : (
                <button
                  disabled
                  className="flex items-center space-x-2 px-3 py-1.5 bg-gray-400 text-gray-600 rounded-md text-sm font-medium cursor-not-allowed opacity-50"
                  title={t('authRequiredCollaborators')}
                >
                  <FiPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('addCollaborator')}</span>
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
                <span className="hidden sm:inline">{t('save')}</span>
                <span className="hidden md:inline text-xs opacity-75">Ctrl+S</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          {!isAuthenticated ? (
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center text-muted-foreground max-w-md">
                <FiUser className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">{t('authenticationRequired')}</p>
                <p className="text-sm mb-6">
                  {t('signInGoogle')}
                </p>
                {/* Add the sign-in button here */}
                <button
                  onClick={() => signInWithGoogle()}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mx-auto"
                >
                  <FiUser className="w-5 h-5" />
                  <span>Sign In with Google</span>
                </button>
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
          ) : !fileTree || Object.keys(fileTree).length === 0 ? (
            // No files - force CV upload
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <CVUploadDropZone onUploadSuccess={handleUploadSuccess} />
                <p className="text-xs text-muted-foreground mt-4">
                  Supported format: .docx files only
                </p>
              </div>
            </div>
          ) : (
            <ChatComponent
              isVisible={!selectedFile}
              isAuthenticated={isAuthenticated}
            />
          )}
        </div>
      </div>

      {/* Upload Zone */}
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

      {/* Modals */}
      {isAuthenticated && (
        <>
          <OptimizeModal
            isOpen={showOptimizeModal}
            onClose={() => setShowOptimizeModal(false)}
            collaboratorName={selectedCollaborator}
          />

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
