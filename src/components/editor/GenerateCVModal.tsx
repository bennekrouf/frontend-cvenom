'use client';

import React, { useState, useEffect } from 'react';

interface Template {
  name: string;
  description: string;
}

interface GenerateCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onGenerateCV: (language: string, template: string) => Promise<void>;
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
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
    }
  }, [isOpen]);

  // Make sure the Template interface is properly used
const fetchTemplates = async () => {
  setLoadingTemplates(true);
  try {
    const response = await fetch('/api/cv/templates');
    const data: { success: boolean; templates: Template[] } = await response.json();
    
    if (data.success) {
      setTemplates(data.templates);
      // Set default template if available
      if (data.templates.length > 0) {
        const defaultTemplate = data.templates.find((t: Template) => t.name === 'default') || data.templates[0];
        setSelectedTemplate(defaultTemplate.name);
      }
    }
  } catch (error) {
    console.error('Error fetching templates:', error);
  }
  setLoadingTemplates(false);
};

  const handleGenerate = async () => {
    await onGenerateCV(selectedLanguage, selectedTemplate);
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
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Template
            </label>
            {loadingTemplates ? (
              <div className="text-sm text-muted-foreground">Loading templates...</div>
            ) : (
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                disabled={isGenerating}
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:opacity-50"
              >
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name} - {template.description}
                  </option>
                ))}
              </select>
            )}
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
              disabled={isGenerating || loadingTemplates}
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
