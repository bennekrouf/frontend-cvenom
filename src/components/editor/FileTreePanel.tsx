'use client';

import React, { useState } from 'react';
import {
  FiFolder,
  FiFile,
  FiChevronRight,
  FiChevronDown,
  FiChevronLeft,
  FiRefreshCw,
  FiToggleLeft,
  FiToggleRight,
  FiEdit3,
  FiCamera,
  FiFileText,
  FiTrash2,
  FiCheck,
} from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { User } from 'firebase/auth';
import { FileTreeItem, getLatestModified } from '@/lib/api';

interface FileTreePanelProps {
  fileTree: Record<string, FileTreeItem> | null;
  selectedFile: string | null;
  selectedCollaborator: string | null;
  expandedFolders: Set<string>;
  autoSaveEnabled: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  onLoadFileTree: () => void;
  onToggleAutoSave: () => void;
  onCreateCollaborator: () => void;
  onToggleFolder: (folderPath: string) => void;
  onLoadFile: (filePath: string) => void;
  onSelectCollaborator: (name: string) => void;
  onShowUploadModal: () => void;
  onDeleteCollaborator: () => void;
  onShowGenerateModal: () => void;
  onRenameCollaborator?: (oldName: string, newName: string) => void;
  onCloseSidebar: () => void;
}

const FileTreePanel: React.FC<FileTreePanelProps> = ({
  fileTree,
  selectedFile,
  selectedCollaborator,
  expandedFolders,
  autoSaveEnabled,
  isLoading,
  isAuthenticated,
  loading,
  onLoadFileTree,
  onToggleAutoSave,
  onDeleteCollaborator,
  onToggleFolder,
  onLoadFile,
  onSelectCollaborator,
  onShowUploadModal,
  onShowGenerateModal,
  onRenameCollaborator,
  onCloseSidebar,
}) => {
  const t = useTranslations('fileEditor');
  const [renamingCollaborator, setRenamingCollaborator] = useState<string | null>(null);
  const [newCollaboratorName, setNewCollaboratorName] = useState('');

  const isEditableFile = (filename: string) => {
    return filename.endsWith('.typ') || filename.endsWith('.toml');
  };

  const getFileLanguage = (filename: string) => {
    if (filename.endsWith('.typ')) return 'typst';
    if (filename.endsWith('.toml')) return 'toml';
    return 'text';
  };

  const handleRenameSubmit = (oldName: string) => {
    if (!newCollaboratorName.trim() || newCollaboratorName === oldName) {
      setRenamingCollaborator(null);
      setNewCollaboratorName('');
      return;
    }

    if (onRenameCollaborator) {
      onRenameCollaborator(oldName, newCollaboratorName.trim());
    }

    setRenamingCollaborator(null);
    setNewCollaboratorName('');
  };

  const handleRenameCancel = () => {
    setRenamingCollaborator(null);
    setNewCollaboratorName('');
  };

  const renderFileTreeItem = (name: string, path: string, item: FileTreeItem, level = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedFolders.has(path);
    const isSelected = selectedFile === path;
    const isEditable = !isFolder && isEditableFile(name);
    const isCollaboratorFolder = (level === 1 && path.startsWith('data/')) || (level === 0 && name !== 'data' && isFolder);
    const isSelectedCollaborator = isCollaboratorFolder && selectedCollaborator === name;
    const isRenaming = renamingCollaborator === name;

    return (
      <div key={path}>
        <div
          className={`flex items-center py-1 px-2 hover:bg-secondary/50 cursor-pointer rounded-sm transition-colors group relative ${isSelected ? 'bg-primary/10 text-primary' : ''
            } ${isSelectedCollaborator
              ? 'bg-blue-100 dark:bg-blue-900/40 border-l-2 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold'
              : ''} ${!isEditable && !isFolder ? 'opacity-50' : ''
            }`}
          style={{ paddingLeft: `${8 + level * 16}px` }}
          title={
            isFolder
              ? isCollaboratorFolder
                ? `Collaborator folder: ${name} - Click to expand/collapse and select for actions`
                : `Folder: ${name} - Click to expand/collapse contents`
              : isEditable
                ? `Editable file: ${name} - Click to open in editor (${getFileLanguage(name)})`
                : `Read-only file: ${name} - File type not supported for editing`
          }
          onClick={() => {
            if (isRenaming) return;
            if (isFolder) {
              onToggleFolder(path);
              if (isCollaboratorFolder) {
                onSelectCollaborator(name);
              }
            } else if (isEditable && isAuthenticated) {
              onLoadFile(path);
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
            <FiFile className={`w-4 h-4 mr-2 ${isEditable ? 'text-green-500' : 'text-muted-foreground'}`} />
          )}

          {isRenaming ? (
            <div className="flex items-center flex-1 mr-2">
              <input
                type="text"
                value={newCollaboratorName}
                onChange={(e) => setNewCollaboratorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleRenameSubmit(name);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    handleRenameCancel();
                  }
                }}
                onBlur={handleRenameCancel}
                className="flex-1 px-1 py-0.5 text-sm bg-background border border-primary rounded focus:outline-none"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenameSubmit(name);
                }}
                className="ml-1 p-0.5 hover:bg-secondary rounded text-green-600 hover:text-green-700"
                title="Confirm rename"
              >
                <FiCheck className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <span className="text-sm font-medium flex-1">{name}</span>
          )}

          {isCollaboratorFolder && isSelectedCollaborator && isAuthenticated && !isRenaming && (
            <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity ml-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setRenamingCollaborator(name);
                  setNewCollaboratorName(name);
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title={`Rename profile ${name}`}
              >
                <FiEdit3 className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowUploadModal();
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title={`Upload profile picture for ${name} (JPG, PNG supported)`}
              >
                <FiCamera className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShowGenerateModal();
                }}
                className="p-1 hover:bg-secondary rounded text-muted-foreground hover:text-foreground"
                title={`Generate and download CV PDF for ${name}`}
              >
                <FiFileText className="w-3 h-3" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteCollaborator();
                }}
                className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500"
                title={`Delete profile ${name} and all associated files`}
              >
                <FiTrash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {!isFolder && !isEditable && (
            <span className="ml-auto text-xs text-muted-foreground">readonly</span>
          )}
        </div>

        {isFolder && isExpanded && item.children && (
          <div>
            {Object.entries(item.children)
              .sort(([, a], [, b]) => getLatestModified(b) - getLatestModified(a))
              .map(([childName, childItem]) =>
                renderFileTreeItem(childName, `${path}/${childName}`, childItem, level + 1)
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col w-80">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          {/* Left: close button + title */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={onCloseSidebar}
              className="p-1.5 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
              title={t('closeSidebar')}
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-lg font-semibold text-foreground">{t('profiles')}</h2>
          </div>
          {/* Right: refresh + autosave */}
          <div className="flex gap-2">
            <button
              onClick={onLoadFileTree}
              disabled={!isAuthenticated}
              className="p-1.5 hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
              title={
                isAuthenticated
                  ? isLoading
                    ? t('refreshingFileTree')
                    : t('refreshFileTree')
                  : t('signInToRefresh')
              }
            >
              <FiRefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onToggleAutoSave}
              disabled={!isAuthenticated}
              className={`p-1.5 rounded-md transition-colors disabled:opacity-50 ${autoSaveEnabled && isAuthenticated ? 'text-green-600' : 'text-gray-400 hover:bg-secondary'
                }`}
              title={
                isAuthenticated
                  ? `${t('autoSave')}: ${autoSaveEnabled ? t('autoSaveOn') : t('autoSaveOff')}`
                  : t('signInToEnableAutoSave')
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

        <div className="text-xs text-muted-foreground">
          {isAuthenticated
            ? `${t('editableFilesDesc')} · ${t('uploadFilesDesc')}`
            : t('signInToViewFiles2')
          }
        </div>
      </div>

      {/* File Tree Content */}
      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="text-sm text-muted-foreground p-2 text-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Checking authentication...
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center p-4">
            <FiFolder className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">
              Sign in to view your files
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center p-4">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading files...</p>
          </div>
        ) : !fileTree ? (
          <div className="text-center p-4">
            <FiFolder className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground mb-2">
              No files found
            </p>
            <p className="text-xs text-muted-foreground">
              Create a profile to get started
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {Object.entries(fileTree)
              .sort(([, a], [, b]) => getLatestModified(b) - getLatestModified(a))
              .map(([name, item]) =>
                renderFileTreeItem(name, name, item)
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTreePanel;
