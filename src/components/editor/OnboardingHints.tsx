'use client';

import React, { useState, useEffect } from 'react';
import { FiUpload, FiTarget, FiFileText, FiMessageSquare, FiX } from 'react-icons/fi';

const STORAGE_KEY = 'cvenom-onboarding-dismissed';

interface Hint {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const hints: Hint[] = [
  {
    id: 'upload',
    icon: <FiUpload className="h-5 w-5 text-blue-500" />,
    title: 'Upload your CV',
    description: 'Drop a PDF or Word document to create your profile automatically.',
  },
  {
    id: 'optimize',
    icon: <FiTarget className="h-5 w-5 text-orange-500" />,
    title: 'Optimize for a job',
    description: 'Paste a LinkedIn job URL to tailor your CV with AI.',
  },
  {
    id: 'generate',
    icon: <FiFileText className="h-5 w-5 text-green-500" />,
    title: 'Generate PDF',
    description: 'Export a polished CV or portfolio in one click.',
  },
  {
    id: 'chat',
    icon: <FiMessageSquare className="h-5 w-5 text-purple-500" />,
    title: 'Chat assistant',
    description: 'Ask the AI to edit your profile, fix wording, or add sections.',
  },
];

const OnboardingHints: React.FC = () => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  if (dismissed) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">Getting started</h3>
        <button
          onClick={dismiss}
          className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          aria-label="Dismiss hints"
        >
          <FiX className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {hints.map((h) => (
          <div
            key={h.id}
            className="rounded-lg border border-border bg-card p-3 space-y-1.5"
          >
            {h.icon}
            <p className="text-xs font-medium text-foreground">{h.title}</p>
            <p className="text-[11px] leading-snug text-muted-foreground">{h.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OnboardingHints;
