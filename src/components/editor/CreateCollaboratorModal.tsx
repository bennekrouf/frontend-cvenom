// src/components/editor/CreateCollaboratorModal.tsx
'use client';

import React, { useState } from 'react';

interface CreateCollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateCollaborator: (name: string) => Promise<void>;
  isLoading: boolean;
}

const CreateCollaboratorModal: React.FC<CreateCollaboratorModalProps> = ({
  isOpen,
  onClose,
  onCreateCollaborator,
  isLoading
}) => {
  const [newPersonName, setNewPersonName] = useState('');

  const handleSubmit = async () => {
    if (!newPersonName.trim()) return;
    await onCreateCollaborator(newPersonName.trim());
    setNewPersonName('');
  };

  const handleClose = () => {
    onClose();
    setNewPersonName('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold text-foreground mb-4">Add New Collaborator</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Collaborator Name
            </label>
            <input
              type="text"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="e.g., john-doe"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Use lowercase with hyphens (e.g., john-doe)
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!newPersonName.trim() || isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateCollaboratorModal;
