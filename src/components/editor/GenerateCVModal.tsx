// src/components/editor/GenerateCVModal.tsx
'use client';

import React, { useState } from 'react';

interface GenerateCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onGenerateCV: (language: string) => Promise<void>;
  isGenerating: boolean;
}

const GenerateCVModal: React.FC<GenerateCVModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  onGenerateCV,
  isGenerating
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const handleGenerate = async () => {
    await onGenerateCV(selectedLanguage);
  };

  const handleClose = () => {
    if (!isGenerating) {
      onClose();
    }
  };

  if (!isOpen || !collaboratorName) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-96">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Generate CV for {collaboratorName}
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Language
            </label>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              disabled={isGenerating}
              className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
            >
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleClose}
              disabled={isGenerating}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenerateCVModal;
