// src/components/editor/CoverLetterModal.tsx
'use client';

import React, { useState } from 'react';
import {
  FiX, FiFileText, FiLoader, FiAlertCircle, FiClipboard, FiCheck, FiDownload,
} from 'react-icons/fi';
import { generateCoverLetter, exportCoverLetterDocx } from '@/lib/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CoverLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
}

type Phase = 'idle' | 'generating' | 'done' | 'error';

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
];

// ── Component ──────────────────────────────────────────────────────────────────

const CoverLetterModal: React.FC<CoverLetterModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
}) => {
  const [language, setLanguage] = useState('en');
  const [jobDescription, setJobDescription] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [coverLetter, setCoverLetter] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);

  if (!isOpen) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (!collaboratorName || !jobDescription.trim()) return;

    setPhase('generating');
    setErrorMessage('');
    setCoverLetter('');

    try {
      const response = await generateCoverLetter(collaboratorName, jobDescription, language);
      setCoverLetter(response.data.cover_letter);
      setPhase('done');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cover letter generation failed';
      setErrorMessage(msg);
      setPhase('error');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coverLetter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select textarea
    }
  };

  const handleDownloadPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const name = collaboratorName ?? '';
    printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Cover Letter – ${name}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 12pt; line-height: 1.5;
           max-width: 700px; margin: 40px auto; color: #1a1a1a; }
    p { margin: 0 0 12pt; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  ${coverLetter
    .split(/\n\n+/)
    .map(para => `<p>${para.trim().replace(/\n/g, '<br>')}</p>`)
    .join('')}
  <script>window.onload = () => { window.print(); window.close(); }<\/script>
</body>
</html>`);
    printWindow.document.close();
  };

  const handleDownloadDocx = async () => {
    if (!collaboratorName) return;
    setExportingDocx(true);
    try {
      const blob = await exportCoverLetterDocx(coverLetter, collaboratorName, language);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cover-letter-${collaboratorName}-${language}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('DOCX export failed:', err);
    } finally {
      setExportingDocx(false);
    }
  };

  const handleClose = () => {
    setPhase('idle');
    setCoverLetter('');
    setErrorMessage('');
    setJobDescription('');
    onClose();
  };

  const canGenerate = !!collaboratorName && jobDescription.trim().length > 0 && phase !== 'generating';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative w-full max-w-2xl rounded-xl border border-border bg-card shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <FiFileText className="h-5 w-5 text-purple-500" />
            <h2 className="text-base font-semibold text-foreground">Cover Letter</h2>
            {collaboratorName && (
              <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-600">
                {collaboratorName}
              </span>
            )}
          </div>
          <button onClick={handleClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <FiX className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {/* Language + credits hint */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {LANGUAGES.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => setLanguage(code)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    language === code
                      ? 'bg-purple-600 text-white'
                      : 'border border-border bg-transparent text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">20 credits</span>
          </div>

          {/* Job description textarea */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Job description <span className="text-destructive">*</span>
            </label>
            <textarea
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
              rows={6}
              placeholder="Paste the job posting text here (LinkedIn, company website, etc.)…"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={phase === 'generating'}
            />
          </div>

          {/* Error */}
          {phase === 'error' && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-900/20">
              <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
              <p className="text-red-700 dark:text-red-400">{errorMessage}</p>
            </div>
          )}

          {/* Result */}
          {phase === 'done' && coverLetter && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Generated cover letter</span>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    {copied ? <FiCheck className="h-3.5 w-3.5 text-green-500" /> : <FiClipboard className="h-3.5 w-3.5" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={handleDownloadPdf}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary"
                  >
                    <FiDownload className="h-3.5 w-3.5" />
                    PDF
                  </button>
                  <button
                    onClick={handleDownloadDocx}
                    disabled={exportingDocx}
                    className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50"
                  >
                    {exportingDocx
                      ? <FiLoader className="h-3.5 w-3.5 animate-spin" />
                      : <FiFileText className="h-3.5 w-3.5 text-blue-500" />}
                    Word
                  </button>
                </div>
              </div>
              <textarea
                readOnly
                value={coverLetter}
                rows={12}
                className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-5 py-3">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {phase === 'generating' ? (
              <><FiLoader className="h-4 w-4 animate-spin" /> Generating…</>
            ) : (
              <><FiFileText className="h-4 w-4" /> Generate Cover Letter</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default CoverLetterModal;
