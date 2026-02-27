// src/components/editor/OptimizeModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { FiX, FiTarget, FiDownload, FiCheckCircle, FiAlertCircle, FiLoader } from 'react-icons/fi';
import { getTemplates, optimizeCV, optimizeAndGenerate, KeywordAnalysis } from '@/lib/api';

interface Template {
  name: string;
  description: string;
}

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

// ── Template thumbnail (reuse same SVG previews as GenerateCVModal) ────────────

const TEMPLATE_LABELS: Record<string, string> = {
  default: 'Default',
  tech: 'Tech',
  executive: 'Executive',
  creative: 'Creative',
  consulting: 'Consulting',
  academic: 'Academic',
};

const TemplateThumbnail: React.FC<{ name: string }> = ({ name }) => {
  switch (name) {
    case 'tech':
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="32" fill="#2D3748" />
          <rect x="8" y="8" width="50" height="6" rx="1" fill="#fff" opacity="0.9" />
          <rect x="8" y="18" width="30" height="4" rx="1" fill="#4299E1" />
          <rect x="0" y="32" width="36" height="128" fill="#F7FAFC" />
          <rect x="4" y="40" width="28" height="4" rx="1" fill="#4299E1" opacity="0.5" />
          <rect x="4" y="48" width="14" height="5" rx="2.5" fill="#BEE3F8" />
          <rect x="20" y="48" width="12" height="5" rx="2.5" fill="#BEE3F8" />
          <rect x="4" y="56" width="18" height="5" rx="2.5" fill="#BEE3F8" />
          <rect x="4" y="66" width="28" height="4" rx="1" fill="#4299E1" opacity="0.5" />
          <rect x="4" y="73" width="12" height="4" rx="1" fill="#CBD5E0" />
          <rect x="4" y="80" width="20" height="4" rx="1" fill="#CBD5E0" />
          <rect x="42" y="36" width="8" height="8" rx="1" fill="#4299E1" />
          <rect x="52" y="39" width="30" height="3" rx="1" fill="#2D3748" opacity="0.7" />
          <rect x="42" y="52" width="40" height="4" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="42" y="58" width="24" height="3" rx="1" fill="#4299E1" opacity="0.6" />
          <rect x="42" y="64" width="70" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="68" width="65" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="72" width="50" height="2" rx="1" fill="#CBD5E0" />
        </svg>
      );
    case 'executive':
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="12" width="100" height="1.5" fill="#C9A84C" />
          <rect x="25" y="18" width="70" height="7" rx="1" fill="#1A1A2E" opacity="0.85" />
          <rect x="10" y="29" width="100" height="1" fill="#C9A84C" />
          <rect x="35" y="33" width="50" height="5" rx="1" fill="#C9A84C" opacity="0.7" />
          <rect x="20" y="41" width="80" height="2.5" rx="1" fill="#4A4A6A" opacity="0.4" />
          <rect x="10" y="50" width="60" height="3" rx="1" fill="#1A1A2E" opacity="0.7" />
          <rect x="10" y="55" width="100" height="1" fill="#C9A84C" opacity="0.5" />
          <rect x="10" y="59" width="100" height="20" rx="2" fill="#FFFBEB" stroke="#C9A84C" strokeWidth="0.5" />
          <rect x="14" y="63" width="6" height="6" rx="1" fill="#C9A84C" opacity="0.6" />
          <rect x="24" y="64" width="40" height="3" rx="1" fill="#2D2D4A" opacity="0.6" />
          <rect x="14" y="72" width="6" height="6" rx="1" fill="#C9A84C" opacity="0.6" />
          <rect x="24" y="73" width="55" height="3" rx="1" fill="#2D2D4A" opacity="0.6" />
          <rect x="10" y="86" width="60" height="3" rx="1" fill="#1A1A2E" opacity="0.7" />
          <rect x="10" y="91" width="100" height="1" fill="#C9A84C" opacity="0.5" />
          <rect x="10" y="95" width="100" height="2.5" rx="1" fill="#CBD5E0" />
          <rect x="10" y="100" width="90" height="2.5" rx="1" fill="#CBD5E0" />
          <rect x="10" y="105" width="80" height="2.5" rx="1" fill="#CBD5E0" />
        </svg>
      );
    case 'creative':
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="40" height="160" fill="#1A1A2E" />
          <rect x="6" y="16" width="28" height="28" rx="14" fill="#FF6B6B" opacity="0.3" />
          <rect x="12" y="20" width="16" height="16" rx="8" fill="#FF6B6B" opacity="0.6" />
          <rect x="6" y="52" width="28" height="3" rx="1" fill="#fff" opacity="0.7" />
          <rect x="6" y="58" width="20" height="2.5" rx="1" fill="#FF6B6B" opacity="0.7" />
          <rect x="6" y="68" width="28" height="2.5" rx="1" fill="#fff" opacity="0.4" />
          <rect x="6" y="80" width="15" height="6" rx="3" fill="#FF6B6B" opacity="0.5" />
          <rect x="23" y="80" width="12" height="6" rx="3" fill="#FF9F43" opacity="0.5" />
          <rect x="6" y="89" width="12" height="6" rx="3" fill="#FF9F43" opacity="0.5" />
          <rect x="44" y="10" width="68" height="5" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="44" y="18" width="48" height="3" rx="1" fill="#FF6B6B" opacity="0.6" />
          <rect x="44" y="28" width="100" height="2" rx="1" fill="#CBD5E0" />
          <rect x="44" y="33" width="95" height="2" rx="1" fill="#CBD5E0" />
          <rect x="44" y="44" width="40" height="3" rx="1" fill="#2D3748" opacity="0.7" />
          <rect x="44" y="50" width="68" height="1" fill="#E2E8F0" />
          <rect x="44" y="55" width="68" height="3" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="44" y="61" width="40" height="2.5" rx="1" fill="#FF6B6B" opacity="0.5" />
          <rect x="44" y="67" width="68" height="2" rx="1" fill="#CBD5E0" />
          <rect x="44" y="72" width="60" height="2" rx="1" fill="#CBD5E0" />
        </svg>
      );
    case 'consulting':
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="40" fill="#1E3A5F" />
          <rect x="8" y="8" width="56" height="8" rx="1" fill="#fff" opacity="0.95" />
          <rect x="8" y="20" width="36" height="4" rx="1" fill="#5BA3D9" opacity="0.8" />
          <rect x="80" y="14" width="28" height="14" rx="2" fill="#2ECC71" opacity="0.8" />
          <rect x="83" y="18" width="22" height="3" rx="1" fill="#fff" opacity="0.9" />
          <rect x="8" y="48" width="40" height="3" rx="1" fill="#1E3A5F" opacity="0.7" />
          <rect x="8" y="54" width="104" height="1" fill="#1E3A5F" opacity="0.3" />
          <rect x="8" y="58" width="4" height="18" rx="1" fill="#1E3A5F" opacity="0.5" />
          <rect x="16" y="60" width="40" height="3" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="16" y="66" width="25" height="2.5" rx="1" fill="#5BA3D9" opacity="0.6" />
          <rect x="16" y="71" width="70" height="2" rx="1" fill="#CBD5E0" />
          <rect x="16" y="75" width="60" height="2" rx="1" fill="#CBD5E0" />
          <rect x="8" y="85" width="4" height="18" rx="1" fill="#1E3A5F" opacity="0.5" />
          <rect x="16" y="87" width="45" height="3" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="16" y="93" width="28" height="2.5" rx="1" fill="#5BA3D9" opacity="0.6" />
          <rect x="16" y="98" width="68" height="2" rx="1" fill="#CBD5E0" />
          <rect x="16" y="102" width="55" height="2" rx="1" fill="#CBD5E0" />
        </svg>
      );
    case 'academic':
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect x="8" y="8" width="60" height="8" rx="1" fill="#2D6A4F" opacity="0.9" />
          <rect x="8" y="19" width="40" height="4" rx="1" fill="#52B788" opacity="0.7" />
          <rect x="8" y="26" width="104" height="1" fill="#2D6A4F" opacity="0.5" />
          <rect x="8" y="29" width="80" height="2.5" rx="1" fill="#4A7C59" opacity="0.4" />
          <rect x="8" y="38" width="50" height="3" rx="1" fill="#2D6A4F" opacity="0.7" />
          <rect x="8" y="43" width="104" height="0.75" fill="#2D6A4F" />
          <rect x="8" y="47" width="80" height="2.5" rx="1" fill="#2D3748" opacity="0.7" />
          <rect x="8" y="52" width="60" height="2" rx="1" fill="#CBD5E0" />
          <rect x="8" y="57" width="70" height="2" rx="1" fill="#CBD5E0" />
          <rect x="8" y="65" width="50" height="3" rx="1" fill="#2D6A4F" opacity="0.7" />
          <rect x="8" y="70" width="104" height="0.75" fill="#2D6A4F" />
          <rect x="8" y="74" width="90" height="2.5" rx="1" fill="#2D3748" opacity="0.7" />
          <rect x="8" y="79" width="70" height="2" rx="1" fill="#CBD5E0" />
          <rect x="80" y="74" width="28" height="2.5" rx="1" fill="#52B788" opacity="0.5" />
          <rect x="8" y="90" width="50" height="3" rx="1" fill="#2D6A4F" opacity="0.7" />
          <rect x="8" y="95" width="104" height="0.75" fill="#2D6A4F" />
          <rect x="8" y="99" width="14" height="5" rx="2.5" fill="#D8F3DC" />
          <rect x="25" y="99" width="20" height="5" rx="2.5" fill="#D8F3DC" />
          <rect x="48" y="99" width="18" height="5" rx="2.5" fill="#D8F3DC" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <rect width="120" height="24" fill="#4A5568" />
          <rect x="8" y="6" width="48" height="6" rx="1" fill="#fff" opacity="0.9" />
          <rect x="8" y="15" width="30" height="3" rx="1" fill="#A0AEC0" />
          <rect x="8" y="32" width="50" height="3" rx="1" fill="#2D3748" opacity="0.7" />
          <rect x="8" y="37" width="104" height="1" fill="#4A5568" opacity="0.3" />
          <rect x="8" y="42" width="104" height="2.5" rx="1" fill="#CBD5E0" />
          <rect x="8" y="47" width="88" height="2.5" rx="1" fill="#CBD5E0" />
          <rect x="8" y="58" width="50" height="3" rx="1" fill="#2D3748" opacity="0.7" />
          <rect x="8" y="63" width="104" height="1" fill="#4A5568" opacity="0.3" />
          <rect x="8" y="68" width="80" height="3" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="8" y="74" width="50" height="2.5" rx="1" fill="#A0AEC0" opacity="0.6" />
          <rect x="8" y="80" width="96" height="2" rx="1" fill="#CBD5E0" />
          <rect x="8" y="85" width="90" height="2" rx="1" fill="#CBD5E0" />
          <rect x="8" y="90" width="75" height="2" rx="1" fill="#CBD5E0" />
        </svg>
      );
  }
};

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
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Optimization state
  const [phase, setPhase] = useState<'idle' | 'optimizing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [keywordAnalysis, setKeywordAnalysis] = useState<KeywordAnalysis | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [optimizations, setOptimizations] = useState<string[]>([]);

  // PDF generation state
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Fetch templates when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setPhase('idle');
    setJobUrl('');
    setKeywordAnalysis(null);
    setJobTitle('');
    setCompanyName('');
    setOptimizations([]);
    setErrorMsg('');

    const fetchTemplates = async () => {
      setLoadingTemplates(true);
      try {
        const resp = await getTemplates();
        if (resp && (resp as { data?: Template[] }).data) {
          setTemplates((resp as { data: Template[] }).data);
        }
      } catch {
        // Non-fatal: fall back to built-in list
      } finally {
        setLoadingTemplates(false);
      }
    };
    fetchTemplates();
  }, [isOpen]);

  if (!isOpen) return null;

  const isReady = Boolean(collaboratorName && jobUrl.trim());

  const handleOptimize = async () => {
    if (!isReady || !collaboratorName) return;
    setPhase('optimizing');
    setErrorMsg('');
    setKeywordAnalysis(null);

    try {
      const resp = await optimizeCV(collaboratorName, jobUrl.trim(), language, selectedTemplate);
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
      const blob = await optimizeAndGenerate(collaboratorName, jobUrl.trim(), language, selectedTemplate);
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

  const templateList: Template[] =
    templates.length > 0
      ? templates
      : Object.keys(TEMPLATE_LABELS).map((name) => ({ name, description: TEMPLATE_LABELS[name] }));

  const selectedTemplateDesc =
    templateList.find((t) => t.name === selectedTemplate)?.description ?? '';

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && phase !== 'optimizing' && !isGeneratingPdf) onClose();
      }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Template grid */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Template</label>
            {loadingTemplates ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="aspect-[3/4] bg-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {templateList.map((tmpl) => {
                  const isSelected = tmpl.name === selectedTemplate;
                  return (
                    <button
                      key={tmpl.name}
                      onClick={() => setSelectedTemplate(tmpl.name)}
                      disabled={phase === 'optimizing'}
                      className={`relative aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all focus:outline-none disabled:opacity-50 ${
                        isSelected
                          ? 'border-orange-500 ring-2 ring-orange-500/30'
                          : 'border-border hover:border-orange-400'
                      }`}
                    >
                      <div className="w-full h-full p-1 bg-white dark:bg-gray-900">
                        <TemplateThumbnail name={tmpl.name} />
                      </div>
                      {/* Name bar */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 py-1 text-xs font-medium text-center transition-colors ${
                          isSelected ? 'bg-orange-500 text-white' : 'bg-black/40 text-white'
                        }`}
                      >
                        {TEMPLATE_LABELS[tmpl.name] ?? tmpl.name}
                      </div>
                      {/* Checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <FiCheckCircle className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedTemplateDesc && (
              <p className="mt-2 text-xs text-muted-foreground">{selectedTemplateDesc}</p>
            )}
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
