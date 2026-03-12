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
  FiList,
  FiMessageSquare,
  FiFileText,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import CVFormEditor, { type CVFormEditorHandle } from './CVFormEditor';

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

/** Mirror of FileTreePanel's sort — picks the most-recently-modified profile name. */
function getLatestModified(item: FileTreeItem): number {
  if (item.type === 'file') return item.modified ? new Date(item.modified).getTime() : 0;
  if (!item.children) return 0;
  return Math.max(0, ...Object.values(item.children).map(getLatestModified));
}

function getFirstProfile(tree: Record<string, FileTreeItem>): string | null {
  const profiles = Object.entries(tree)
    .filter(([, item]) => item.type === 'folder')
    .sort(([, a], [, b]) => getLatestModified(b) - getLatestModified(a));
  return profiles.length > 0 ? profiles[0][0] : null;
}

interface FileEditorProps {
  initialProfile?: string;
}

const FileEditor = ({ initialProfile }: FileEditorProps) => {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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

  // Form / Code / Chat view toggle
  const [viewMode, setViewMode] = useState<'form' | 'code' | 'chat'>('form');
  const cvFormEditorRef = useRef<CVFormEditorHandle>(null);

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

  /** Switch to Code view – flush any pending form auto-save first */
  const switchToCode = useCallback(async () => {
    if (viewMode === 'form' && cvFormEditorRef.current) {
      await cvFormEditorRef.current.saveNow();
    }
    setViewMode('code');
  }, [viewMode]);

  /** Select a collaborator, switch to Form view, and sync the profile name into the URL. */
  const handleSelectCollaborator = useCallback((name: string) => {
    setSelectedCollaborator(name);
    setViewMode('form');
    setSelectedFile(null);
    setFileContent('');
    setUnsavedChanges(false);
    // Reflect the active profile in the URL so a page refresh restores the same profile.
    router.replace(`${pathname}?profile=${encodeURIComponent(name)}`, { scroll: false });
  }, [pathname, router]);

  const loadFileTree = useCallback(async (): Promise<Record<string, FileTreeItem> | null> => {
    if (!isAuthenticated) {
      setFileTree(null);
      return null;
    }

    setIsLoading(true);
    try {
      const tree = await getTenantFileTree();
      setFileTree(tree);
      return tree;
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
      return null;
    } finally {
      setIsLoading(false);
    }
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

    // Flush any pending form auto-save then switch to code view
    if (viewMode === 'form' && cvFormEditorRef.current) {
      await cvFormEditorRef.current.saveNow();
    }
    setViewMode('code');

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

    // The cv-import service may finish writing files slightly after returning success.
    // Poll until the new profile appears in the file tree (max ~10s).
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
    let found = false;
    for (let attempt = 0; attempt < 10 && !found; attempt++) {
      if (attempt > 0) await sleep(1000);
      const tree = await loadFileTree();
      found = !!(tree && personName in tree);
    }

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
      loadFileTree().then(tree => {
        if (!tree) return;
        // Prefer the profile from the URL (?profile=…), fall back to the most-recently-modified one.
        const profileToSelect =
          (initialProfile && initialProfile in tree)
            ? initialProfile
            : getFirstProfile(tree);
        if (profileToSelect) {
          setSelectedCollaborator(profileToSelect);
          setExpandedFolders(new Set(['data', profileToSelect]));
          // If we fell back to a different profile than what's in the URL, sync the URL.
          if (profileToSelect !== initialProfile) {
            router.replace(
              `${pathname}?profile=${encodeURIComponent(profileToSelect)}`,
              { scroll: false },
            );
          }
        }
      });
    } else {
      setFileTree(null);
      setSelectedFile(null);
      setFileContent('');
      setSelectedCollaborator(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // When the selected collaborator changes, default back to form view
  useEffect(() => {
    if (selectedCollaborator) {
      setViewMode('form');
      // Close any open file so the form view takes over
      setSelectedFile(null);
      setFileContent('');
      setUnsavedChanges(false);
    }
  }, [selectedCollaborator]);

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
            onSelectCollaborator={handleSelectCollaborator}
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
          <div className="h-14 flex items-center gap-2 px-4">

            {/* ── Left zone: icon + name + subtitle (shrinks gracefully) ── */}
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {viewMode === 'chat'
                ? <FiMessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                : viewMode === 'form' && selectedCollaborator
                ? <FiList className="h-4 w-4 shrink-0 text-muted-foreground" />
                : <FiCode className="h-4 w-4 shrink-0 text-muted-foreground" />
              }
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground leading-tight">
                  {selectedFile && viewMode === 'code'
                    ? selectedFile.split('/').pop()
                    : selectedCollaborator ?? 'CV Assistant'}
                </p>
                <p className="truncate text-xs text-muted-foreground leading-tight">
                  {viewMode === 'chat'
                    ? 'Chat assistant'
                    : selectedCollaborator && viewMode === 'form'
                    ? 'Form editor · auto-saves'
                    : selectedFile
                    ? `${selectedFile} · ${getFileLanguage(selectedFile)}`
                    : selectedCollaborator
                    ? 'Code view · select a file'
                    : isAuthenticated ? t('cvAssistantEnabled') : t('cvAssistantSignIn')}
                </p>
              </div>
              {selectedFile && viewMode === 'code' && (
                <button
                  onClick={closeFile}
                  className="ml-1 shrink-0 rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  title={t('closeFileTooltip')}
                >
                  <FiX className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* ── Right zone: fixed-width toolbar, never reflows ── */}
            <div className="flex shrink-0 items-center gap-1.5">

              {/* Form / Code / Chat segmented toggle — only when a profile is active */}
              {selectedCollaborator && isAuthenticated && (
                <>
                  <div className="flex overflow-hidden rounded-md border border-border text-xs font-medium">
                    <button
                      onClick={() => setViewMode('form')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 transition-colors ${
                        viewMode === 'form'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                      title="Switch to Form editor"
                    >
                      <FiList className="h-3 w-3" />
                      <span className="hidden sm:inline">Form</span>
                    </button>
                    <button
                      onClick={switchToCode}
                      className={`flex items-center gap-1 border-l border-border px-2.5 py-1.5 transition-colors ${
                        viewMode === 'code'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                      title="Switch to Code editor"
                    >
                      <FiCode className="h-3 w-3" />
                      <span className="hidden sm:inline">Code</span>
                    </button>
                    <button
                      onClick={() => setViewMode('chat')}
                      className={`flex items-center gap-1 border-l border-border px-2.5 py-1.5 transition-colors ${
                        viewMode === 'chat'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                      }`}
                      title="Switch to Chat assistant"
                    >
                      <FiMessageSquare className="h-3 w-3" />
                      <span className="hidden sm:inline">Chat</span>
                    </button>
                  </div>
                  <div className="h-5 w-px bg-border" />
                </>
              )}

              {/* Upload CV */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowUploadZone(!showUploadZone)}
                  className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  title="Upload and convert a CV to create a new profile"
                >
                  <FiUpload className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden lg:inline">Upload CV</span>
                </button>
              )}

              {/* Optimize for ATS */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowOptimizeModal(true)}
                  disabled={!selectedCollaborator}
                  className="flex items-center gap-1.5 rounded-md bg-orange-500 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
                  title={selectedCollaborator ? 'Optimize CV for a job posting URL' : 'Select a profile first'}
                >
                  <FiTarget className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden lg:inline">Optimize</span>
                </button>
              )}

              {/* Generate PDF */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowGenerateModal(true)}
                  disabled={!selectedCollaborator}
                  className="flex items-center gap-1.5 rounded-md bg-green-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                  title={selectedCollaborator ? 'Generate CV as PDF' : 'Select a profile first'}
                >
                  <FiFileText className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden lg:inline">Generate</span>
                </button>
              )}

              {/* New profile */}
              <button
                onClick={isAuthenticated ? () => setShowCreateModal(true) : undefined}
                disabled={!isAuthenticated}
                className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                title={isAuthenticated ? t('createCollaboratorTooltip') : t('authRequiredCollaborators')}
              >
                <FiPlus className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden md:inline">{t('addCollaborator')}</span>
              </button>

              {/* Save — always rendered to keep width stable; invisible in form/chat mode */}
              <button
                onClick={saveFile}
                disabled={viewMode !== 'code' || !selectedFile || !unsavedChanges || !isAuthenticated}
                className={`flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 ${
                  viewMode !== 'code' ? 'invisible' : ''
                }`}
                title={
                  !isAuthenticated ? t('signInToSaveFiles') :
                  !selectedFile    ? t('selectFileToSave') :
                  !unsavedChanges  ? t('noUnsavedChanges') :
                                     t('saveFileTooltip')
                }
              >
                <FiSave className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">{t('save')}</span>
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
                <button
                  onClick={() => signInWithGoogle()}
                  className="flex items-center space-x-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors mx-auto"
                >
                  <FiUser className="w-5 h-5" />
                  <span>Sign In with Google</span>
                </button>
              </div>
            </div>
          ) : !fileTree || Object.keys(fileTree).length === 0 ? (
            /* ── No profiles yet — prompt to upload ── */
            <div className="h-full flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <CVUploadDropZone onUploadSuccess={handleUploadSuccess} />
                <p className="text-xs text-muted-foreground mt-4">
                  Supported format: .docx files only
                </p>
              </div>
            </div>
          ) : viewMode === 'chat' ? (
            /* ── Chat assistant (explicit mode) — profile-scoped ── */
            <ChatComponent
              isVisible={true}
              isAuthenticated={isAuthenticated}
              profileName={selectedCollaborator ?? undefined}
            />
          ) : selectedCollaborator && viewMode === 'form' ? (
            /* ── Form editor ── */
            <CVFormEditor
              ref={cvFormEditorRef}
              profileName={selectedCollaborator}
            />
          ) : selectedFile ? (
            /* ── Code editor (raw TOML / Typst textarea) ── */
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
            /* ── Fallback: chat when no profile selected or code with no file ── */
            <ChatComponent
              isVisible={true}
              isAuthenticated={isAuthenticated}
              profileName={selectedCollaborator ?? undefined}
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
