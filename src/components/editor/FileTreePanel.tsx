'use client';

import React from 'react';
import {
  FiFolder,
  FiFile,
  FiRefreshCw,
  FiToggleRight,
  FiToggleLeft,
  FiChevronRight,
  FiChevronDown,
  FiTrash2,
  FiCamera,
  FiFileText,
  FiUser
} from 'react-icons/fi';
import { User } from 'firebase/auth';

interface FileTreeItem {
  type: 'file' | 'folder';
  size?: number;
  modified?: Date;
  children?: Record<string, FileTreeItem>;
}

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
}

const FileTreePanel: React.FC<FileTreePanelProps> = ({
  fileTree,
  selectedFile,
  selectedCollaborator,
  expandedFolders,
  autoSaveEnabled,
  isLoading,
  isAuthenticated,
  user,
  loading,
  onLoadFileTree,
  onToggleAutoSave,
  // onCreateCollaborator,
  onDeleteCollaborator,
  onToggleFolder,
  onLoadFile,
  onSelectCollaborator,
  onShowUploadModal,
  onShowGenerateModal,
}) => {
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
            } ${isSelectedCollaborator ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''} ${!isEditable && !isFolder ? 'opacity-50' : ''
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
          <span className="text-sm font-medium flex-1">{name}</span>

          {/* Collaborator Actions Menu */}
          {isCollaboratorFolder && isSelectedCollaborator && isAuthenticated && (
            <div className="flex items-center space-x-1 opacity-60 group-hover:opacity-100 transition-opacity ml-2">
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
                title={`Delete collaborator ${name} and all associated files`}
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
            {Object.entries(item.children).map(([childName, childItem]) =>
              renderFileTreeItem(childName, `${path}/${childName}`, childItem, level + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-80 border-r border-border bg-card flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Files</h2>
          <div className="flex gap-2">
            <button
              onClick={onLoadFileTree}
              disabled={!isAuthenticated}
              className="p-1.5 hover:bg-secondary rounded-md transition-colors disabled:opacity-50"
              title={
                isAuthenticated
                  ? isLoading
                    ? 'Refreshing file tree...'
                    : 'Refresh file tree from server'
                  : 'Sign in to refresh files'
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
                  ? `Auto-save: ${autoSaveEnabled
                    ? 'ON - Files automatically save 10 seconds after editing'
                    : 'OFF - Files must be saved manually with Ctrl+S or Save button'
                  }`
                  : 'Sign in to enable auto-save feature'
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
          <div className="mb-3 p-2 bg-primary/10 border border-primary/20 rounded-md">
            <div className="flex items-center space-x-2">
              <FiUser className="w-4 h-4 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary truncate">{user.displayName || 'User'}</p>
                <p className="text-xs text-primary/70 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          {isAuthenticated ? 'Editable: .typ, .toml files only' : 'Sign in to view and edit your files'}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {loading ? (
          <div className="text-sm text-muted-foreground p-2 text-center">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Checking authentication...
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center p-4">
            <FiFolder className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground mb-3">Sign in to view your CV files</p>
          </div>
        ) : fileTree ? (
          <div className="space-y-1">
            {Object.entries(fileTree).map(([name, item]) => renderFileTreeItem(name, name, item))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground p-2">
            {isLoading ? 'Loading files...' : 'No files found'}
          </div>
        )}
      </div>
    </div>
  );
};

export default FileTreePanel;
