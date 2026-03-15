// src/components/editor/OptimizeModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiTarget, FiCheckCircle, FiAlertCircle, FiLoader, FiClipboard, FiArrowRight, FiSave } from 'react-icons/fi';
import { optimizeCV, saveOptimizedProfile, KeywordAnalysis } from '@/lib/api';
import { fileTreeEvents } from '@/lib/fileTreeEvents';

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

// ── Helpers ────────────────────────────────────────────────────────────────────

function isLinkedInUrl(url: string): boolean {
  return url.includes('linkedin.com');
}

function isScrapingError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes('scraping') ||
    lower.includes('extract job') ||
    lower.includes('login') ||
    lower.includes('paste the job')
  );
}

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

// ── Score bar ──────────────────────────────────────────────────────────────────

const ScoreBar: React.FC<{ score: number; label: string; highlight?: boolean }> = ({
  score,
  label,
  highlight = false,
}) => {
  const barColor =
    score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="flex-1 text-center">
      <div
        className={`text-3xl font-bold tabular-nums ${
          highlight ? 'text-foreground' : 'text-muted-foreground'
        }`}
      >
        {score}%
      </div>
      <div className="mt-1.5 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="text-xs text-muted-foreground mt-1">{label}</div>
    </div>
  );
};

// ── Main component ─────────────────────────────────────────────────────────────

const OptimizeModal: React.FC<OptimizeModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
}) => {
  const [jobUrl, setJobUrl] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [language, setLanguage] = useState('en');

  // Optimization state
  const [phase, setPhase] = useState<'idle' | 'optimizing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [optimizations, setOptimizations] = useState<string[]>([]);

  // Match scores
  const [beforeScore, setBeforeScore] = useState<number | null>(null);
  const [afterScore, setAfterScore] = useState<number | null>(null);

  // Optimized CV payload (returned by /optimize, sent to /save-optimized)
  const [optimizedCvJson, setOptimizedCvJson] = useState<string | null>(null);

  // "Save as new profile" sub-flow
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [saveProfileName, setSaveProfileName] = useState('');
  const [savePhase, setSavePhase] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Reset form state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPhase('idle');
    setJobUrl('');
    setJobDescription('');
    setKeywordAnalysis(null);
    setJobTitle('');
    setCompanyName('');
    setOptimizations([]);
    setErrorMsg('');
    setBeforeScore(null);
    setAfterScore(null);
    setOptimizedCvJson(null);
    setShowSaveInput(false);
    setSaveProfileName('');
    setSavePhase('idle');
    setSaveError('');
  }, [isOpen]);

  // True when optimization results are present but not yet saved — backdrop/Escape are locked
  const hasUnsavedResults = phase === 'done' && savePhase !== 'saved';

  // Close on Escape — blocked when there are unsaved results
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && phase !== 'optimizing' && !hasUnsavedResults) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, phase, hasUnsavedResults, onClose]);

  if (!isOpen) return null;

  const showPasteArea =
    isLinkedInUrl(jobUrl) || (phase === 'error' && isScrapingError(errorMsg));

  const isReady = Boolean(
    collaboratorName && (jobUrl.trim() || jobDescription.trim()),
  );

  const handleOptimize = async () => {
    if (!isReady || !collaboratorName) return;
    setPhase('optimizing');
    setErrorMsg('');
    setKeywordAnalysis(null);

    try {
      const desc = jobDescription.trim() || undefined;
      const resp = await optimizeCV(
        collaboratorName,
        jobUrl.trim() || 'manual',
        language,
        'default',
        undefined,
        desc,
      );
      setJobTitle(resp.data.job_title);
      setCompanyName(resp.data.company_name);
      setOptimizations(resp.data.optimizations ?? []);
      setKeywordAnalysis(resp.data.keyword_analysis);
      setBeforeScore(resp.data.before_score ?? null);
      setAfterScore(resp.data.after_score ?? null);
      setOptimizedCvJson(resp.data.optimized_cv_json ?? null);
      // Pre-fill save name: "<profile>-ats" or "<profile>-<company>" if known
      const suffix = resp.data.company_name
        ? resp.data.company_name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/_+$/, '')
        : 'ats';
      setSaveProfileName(`${collaboratorName ?? 'profile'}_${suffix}`);
      setSavePhase('idle');
      setShowSaveInput(false);
      setPhase('done');
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Optimization failed');
      setPhase('error');
    }
  };

  const handleSaveProfile = async () => {
    if (!optimizedCvJson || !saveProfileName.trim()) return;
    setSavePhase('saving');
    setSaveError('');
    try {
      await saveOptimizedProfile(saveProfileName.trim(), optimizedCvJson, language);
      setSavePhase('saved');
      fileTreeEvents.emit();
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
      setSavePhase('error');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'optimizing' && !hasUnsavedResults) onClose();
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
            disabled={phase === 'optimizing'}
            className="p-2 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
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
                ⚠ No profile selected. Select a profile from the sidebar first.
              </p>
            )}
          </div>

          {/* Paste description */}
          {showPasteArea && (
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                <FiClipboard className="w-3.5 h-3.5 text-orange-500" />
                {isLinkedInUrl(jobUrl)
                  ? 'Paste job description (LinkedIn requires login to scrape)'
                  : 'Paste job description'}
              </label>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={phase === 'optimizing'}
                rows={6}
                placeholder="Copy the full job description from LinkedIn and paste it here…"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 disabled:opacity-50 placeholder:text-muted-foreground resize-y"
              />
              {isLinkedInUrl(jobUrl) ? (
                <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                  On LinkedIn: scroll to the{' '}
                  <span className="font-medium text-foreground">&quot;About the job&quot;</span> section
                  → select all text (<kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Ctrl+A</kbd> won&apos;t work) →{' '}
                  <kbd className="px-1 py-0.5 rounded bg-muted border border-border text-[10px]">Ctrl+C</kbd> → paste here.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  When a description is pasted, the URL is used for reference only — scraping is skipped.
                </p>
              )}
            </div>
          )}

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
              {/* Success header */}
              <div className="flex items-start gap-3">
                <FiCheckCircle className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    Optimized for{' '}
                    <span className="text-orange-500">{jobTitle || 'the role'}</span>
                    {companyName ? ` at ${companyName}` : ''}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Profile updated — close this and use <strong>Generate</strong> to create your PDF
                  </p>
                </div>
              </div>

              {/* ATS match score */}
              {beforeScore !== null && afterScore !== null && (
                <div className="rounded-lg border border-border p-4 bg-background">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 text-center">
                    ATS Match Score
                  </p>
                  <div className="flex items-center gap-3">
                    <ScoreBar score={beforeScore} label="Before" />
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <FiArrowRight className="w-5 h-5 text-orange-500" />
                      {afterScore > beforeScore && (
                        <span className="text-xs font-bold text-green-500">
                          +{afterScore - beforeScore}%
                        </span>
                      )}
                    </div>
                    <ScoreBar score={afterScore} label="After" highlight />
                  </div>
                </div>
              )}

              {/* What changed */}
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
                    {keywordAnalysis.matched_keywords.length + keywordAnalysis.missing_keywords.length > 24 && (
                      <span className="text-xs text-muted-foreground self-center">
                        +{keywordAnalysis.matched_keywords.length + keywordAnalysis.missing_keywords.length - 24} more
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

              {/* Save as new profile */}
              {savePhase === 'saved' ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <FiCheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Profile <strong>{saveProfileName}</strong> created — select it in the sidebar, then click <strong>Generate</strong>.
                  </p>
                </div>
              ) : showSaveInput ? (
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-foreground">
                    New profile name
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveProfileName}
                      onChange={(e) => setSaveProfileName(e.target.value)}
                      disabled={savePhase === 'saving'}
                      placeholder="e.g. john_acme_corp"
                      className="flex-1 px-3 py-1.5 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 disabled:opacity-50"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveProfile(); if (e.key === 'Escape') setShowSaveInput(false); }}
                      autoFocus
                    />
                    <button
                      onClick={() => setShowSaveInput(false)}
                      disabled={savePhase === 'saving'}
                      className="px-2.5 py-1.5 text-xs bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={!saveProfileName.trim() || savePhase === 'saving'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                    >
                      {savePhase === 'saving' ? (
                        <><FiLoader className="w-3 h-3 animate-spin" /> Saving…</>
                      ) : (
                        <><FiSave className="w-3 h-3" /> Save</>
                      )}
                    </button>
                  </div>
                  {savePhase === 'error' && (
                    <p className="text-xs text-red-500">{saveError}</p>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setShowSaveInput(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors"
                >
                  <FiSave className="w-4 h-4" />
                  Save as new profile
                </button>
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
                {isScrapingError(errorMsg) && (
                  <p className="text-xs text-red-500 dark:text-red-400 mt-1.5 font-medium">
                    ↑ Paste the job description above and try again.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            disabled={phase === 'optimizing'}
            className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            {phase === 'done' ? 'Close' : 'Cancel'}
          </button>

          <button
            onClick={handleOptimize}
            disabled={!isReady || phase === 'optimizing'}
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
        </div>
      </div>
    </div>
  );
};

export default OptimizeModal;
