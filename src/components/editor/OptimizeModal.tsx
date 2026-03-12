// src/components/editor/OptimizeModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiTarget, FiDownload, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { optimizeCV, optimizeAndGenerate, KeywordAnalysis } from '@/lib/api';

interface OptimizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
}

// ── Language labels ────────────────────────────────────────────────────────────

const LANGUAGES = [
  { code: 'en', label: '🇬🇧 English' },
  { code: 'fr', label: '🇫🇷 Français' },
];

// ── Keyword chip ───────────────────────────────────────────────────────────────

const KeywordChip: React.FC<{ label: string; matched: boolean }> = ({ label, matched }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
      matched
        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
    }`}
  >
    {matched ? <FiCheckCircle className="w-3 h-3" /> : <FiAlertCircle className="w-3 h-3" />}
    {label}
  </span>
);

// ── Main component ─────────────────────────────────────────────────────────────

const OptimizeModal: React.FC<OptimizeModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
}) => {
  const [jobUrl, setJobUrl] = useState('');
  const [language, setLanguage] = useState('en');

  // Optimization state
  const [phase, setPhase] = useState<'idle' | 'optimizing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [optimizations, setOptimizations] = useState<string[]>([]);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Reset form state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPhase('idle');
    setJobUrl('');
    setKeywordAnalysis(null);
    setJobTitle('');
    setCompanyName('');
    setOptimizations([]);
    setErrorMsg('');
  }, [isOpen]);

  // Close on Escape (same guard as backdrop click)
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'optimizing' && !isGeneratingPdf) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, phase, isGeneratingPdf, onClose]);

  if (!isOpen) return null;

  const isReady = Boolean(collaboratorName && jobUrl.trim());

  const handleOptimize = async () => {
    if (!isReady || !collaboratorName) return;
    setPhase('optimizing');
    setErrorMsg('');
    setKeywordAnalysis(null);

    try {
      const resp = await optimizeCV(collaboratorName, jobUrl.trim(), language, 'default');
      setJobTitle(resp.data.job_title);
      setCompanyName(resp.data.company_name);
      setOptimizations(resp.data.optimizations ?? []);
      setKeywordAnalysis(resp.data.keyword_analysis);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Optimization failed');
      setPhase('error');
    }
  };

  const handleDownloadPdf = async () => {
    if (!collaboratorName) return;
    setIsGeneratingPdf(true);
    try {
      const blob = await optimizeAndGenerate(collaboratorName, jobUrl.trim(), language, 'default');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeCo = companyName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      a.download = `${collaboratorName}_ats_${safeCo}_${language}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'PDF generation failed');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'optimizing' && !isGeneratingPdf) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <FiTarget className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Optimize for ATS</h2>
              {collaboratorName && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  Profile: <span className="font-medium">{collaboratorName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={phase === 'optimizing' || isGeneratingPdf}
            className="p-2 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Job URL */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Job Posting URL
            </label>
            <input
              type="url"
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              disabled={phase === 'optimizing'}
              placeholder="https://www.linkedin.com/jobs/view/… or any public job URL"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 disabled:opacity-50 placeholder:text-muted-foreground"
            />
            {!collaboratorName && (
              <p className="mt-1.5 text-xs text-orange-500">
                ⚠ No profile selected. Select a collaborator from the sidebar first.
              </p>
            )}
          </div>

          {/* Language selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Language</label>
            <div className="flex gap-2">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  disabled={phase === 'optimizing'}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    language === lang.code
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-background border-border text-foreground hover:bg-secondary'
                  } disabled:opacity-50`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Results panel */}
          {phase === 'done' && (
            <div className="space-y-4 border border-border rounded-lg p-4 bg-secondary/30">
              {/* Job info */}
              <div className="flex items-start gap-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Optimized for{' '}
                    <span className="text-orange-500">{jobTitle || 'the role'}</span>
                    {companyName ? ` at ${companyName}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profile saved to disk — you can review changes in the editor
                  </p>
                </div>
              </div>

              {/* What was done */}
              {optimizations.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    What changed
                  </p>
                  <ul className="space-y-1">
                    {optimizations.map((item, i) => (
                      <li key={i} className="text-xs text-foreground flex items-start gap-2">
                        <span className="text-orange-500 mt-0.5">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keyword analysis */}
              {keywordAnalysis && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Keyword match — {keywordAnalysis.matched_keywords.length} matched /{' '}
                    {keywordAnalysis.missing_keywords.length} injected
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {keywordAnalysis.matched_keywords.slice(0, 12).map((kw) => (
                      <KeywordChip key={kw} label={kw} matched />
                    ))}
                    {keywordAnalysis.missing_keywords.slice(0, 12).map((kw) => (
                      <KeywordChip key={kw} label={kw} matched={false} />
                    ))}
                    {keywordAnalysis.matched_keywords.length + keywordAnalysis.missing_keywords.length >
                      24 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +
                        {keywordAnalysis.matched_keywords.length +
                          keywordAnalysis.missing_keywords.length -
                          24}{' '}
                        more
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Already in profile
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" /> Newly injected
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error panel */}
          {phase === 'error' && (
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <FiAlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-700 dark:text-red-300">
                  Optimization failed
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={phase === 'optimizing' || isGeneratingPdf}
            className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {phase === 'done' ? 'Close' : 'Cancel'}
          </button>

          <div className="flex gap-2">
            {/* Optimize button — always visible */}
            <button
              onClick={handleOptimize}
              disabled={!isReady || phase === 'optimizing' || isGeneratingPdf}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {phase === 'optimizing' ? (
                <>
                  <FiLoader className="w-4 h-4 animate-spin" />
                  <span>Optimizing…</span>
                </>
              ) : (
                <>
                  <FiTarget className="w-4 h-4" />
                  <span>{phase === 'done' ? 'Re-optimize' : 'Optimize'}</span>
                </>
              )}
            </button>

            {/* Download PDF — only after successful optimization */}
            {phase === 'done' && (
              <button
                onClick={handleDownloadPdf}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGeneratingPdf ? (
                  <>
                    <FiLoader className="w-4 h-4 animate-spin" />
                    <span>Generating…</span>
                  </>
                ) : (
                  <>
                    <FiDownload className="w-4 h-4" />
                    <span>Download PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizeModal;
