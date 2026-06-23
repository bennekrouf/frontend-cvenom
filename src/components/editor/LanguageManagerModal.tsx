'use client';
// LanguageManagerModal — manage per-profile language files.
//
// Two actions:
//  1. Relabel  — rename an existing experiences_XX.typ (e.g. fix a wrong language tag).
//               Blocked when the target language file already exists.
//  2. Translate — request an AI translation to a language that has no file yet.
//               Calls POST /translate and triggers a file-tree refresh on completion.

import React, { useState, useEffect, useCallback } from 'react';
import { FiCheck, FiEdit3, FiGlobe, FiRefreshCw, FiX, FiAlertTriangle } from 'react-icons/fi';
import { changeProfileLanguage, translateCV } from '@/lib/api';

// ── Constants ──────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGS: { code: string; label: string; flag: string }[] = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'pt', label: 'Português',  flag: '🇵🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
];

function getLangMeta(code: string) {
  return SUPPORTED_LANGS.find(l => l.code === code) ?? { code, label: code.toUpperCase(), flag: '🌐' };
}

// ── Props ──────────────────────────────────────────────────────────────────────

interface LanguageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  /** Existing language codes derived from experiences_XX.typ files */
  existingLanguages: string[];
  /** Called after any change so the parent can refresh the file tree */
  onChanged: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────────

const LanguageManagerModal: React.FC<LanguageManagerModalProps> = ({
  isOpen,
  onClose,
  profileName,
  existingLanguages,
  onChanged,
}) => {
  // Relabel state
  const [relabelFrom, setRelabelFrom]   = useState<string | null>(null);
  const [relabelTo, setRelabelTo]       = useState<string>('');
  const [relabelLoading, setRelabelLoading] = useState(false);
  const [relabelError, setRelabelError] = useState<string | null>(null);

  // Translate state
  const [translateTarget, setTranslateTarget] = useState<string>('');
  const [translating, setTranslating]         = useState(false);
  const [translateError, setTranslateError]   = useState<string | null>(null);
  const [translateDone, setTranslateDone]     = useState<string | null>(null); // lang code that just finished

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setRelabelFrom(null);
      setRelabelTo('');
      setRelabelError(null);
      setTranslateTarget('');
      setTranslateError(null);
      setTranslateDone(null);
    }
  }, [isOpen]);

  const handleRelabel = useCallback(async () => {
    if (!relabelFrom || !relabelTo || relabelTo === relabelFrom) return;
    if (existingLanguages.includes(relabelTo)) {
      setRelabelError(`${relabelTo.toUpperCase()} already exists for this profile.`);
      return;
    }
    setRelabelLoading(true);
    setRelabelError(null);
    try {
      await changeProfileLanguage(profileName, relabelTo, relabelFrom);
      onChanged();
      setRelabelFrom(null);
      setRelabelTo('');
    } catch (e) {
      setRelabelError(e instanceof Error ? e.message : 'Failed to relabel');
    } finally {
      setRelabelLoading(false);
    }
  }, [relabelFrom, relabelTo, existingLanguages, profileName, onChanged]);

  const handleTranslate = useCallback(async () => {
    if (!translateTarget) return;
    setTranslating(true);
    setTranslateError(null);
    setTranslateDone(null);
    try {
      await translateCV(profileName, translateTarget);
      setTranslateDone(translateTarget);
      setTranslateTarget('');
      onChanged();
    } catch (e) {
      setTranslateError(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setTranslating(false);
    }
  }, [translateTarget, profileName, onChanged]);

  if (!isOpen) return null;

  const missingLangs = SUPPORTED_LANGS.filter(l => !existingLanguages.includes(l.code));

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-border flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <FiGlobe className="w-4 h-4 text-primary" />
              Languages — {profileName}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Manage CV language files for this profile.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-secondary rounded-md text-muted-foreground">
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Existing languages ── */}
          <section>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Existing language files
            </h4>

            {existingLanguages.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No language files found.</p>
            ) : (
              <div className="space-y-2">
                {existingLanguages.map(lang => {
                  const meta = getLangMeta(lang);
                  const isRelabeling = relabelFrom === lang;
                  return (
                    <div key={lang} className="rounded-lg border border-border p-3 bg-muted/30">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg leading-none">{meta.flag}</span>
                          <div>
                            <span className="text-sm font-medium text-foreground">{meta.label}</span>
                            <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                              experiences_{lang}.typ
                            </span>
                          </div>
                        </div>
                        {!isRelabeling && (
                          <button
                            onClick={() => {
                              setRelabelFrom(lang);
                              setRelabelTo('');
                              setRelabelError(null);
                            }}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground border border-border rounded px-2 py-1 hover:bg-secondary transition-colors"
                            title="Fix wrong language label"
                          >
                            <FiEdit3 className="w-3 h-3" /> Relabel
                          </button>
                        )}
                      </div>

                      {/* Relabel sub-form */}
                      {isRelabeling && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          <p className="text-xs text-muted-foreground">
                            Rename <span className="font-mono font-semibold">experiences_{lang}.typ</span> to a different language code:
                          </p>
                          <div className="flex gap-2">
                            <select
                              value={relabelTo}
                              onChange={e => { setRelabelTo(e.target.value); setRelabelError(null); }}
                              className="flex-1 text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
                            >
                              <option value="">— pick target language —</option>
                              {SUPPORTED_LANGS
                                .filter(l => l.code !== lang)
                                .map(l => (
                                  <option
                                    key={l.code}
                                    value={l.code}
                                    disabled={existingLanguages.includes(l.code)}
                                  >
                                    {l.flag} {l.label} ({l.code})
                                    {existingLanguages.includes(l.code) ? ' — already exists' : ''}
                                  </option>
                                ))}
                            </select>
                            <button
                              onClick={handleRelabel}
                              disabled={!relabelTo || relabelLoading}
                              className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                            >
                              {relabelLoading ? <FiRefreshCw className="w-3 h-3 animate-spin" /> : <FiCheck className="w-3 h-3" />}
                              Apply
                            </button>
                            <button
                              onClick={() => { setRelabelFrom(null); setRelabelError(null); }}
                              className="px-3 py-1.5 bg-secondary text-secondary-foreground text-xs rounded-md hover:bg-secondary/80"
                            >
                              Cancel
                            </button>
                          </div>
                          {relabelError && (
                            <p className="text-xs text-red-500 flex items-center gap-1">
                              <FiAlertTriangle className="w-3 h-3 shrink-0" /> {relabelError}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Add translation ── */}
          {missingLangs.length > 0 && (
            <section>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Add a translation
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                AI will translate this profile's work experience into the selected language.
                Costs 5 credits.
              </p>

              {translateDone && (
                <div className="mb-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg px-3 py-2">
                  <FiCheck className="w-4 h-4 shrink-0" />
                  Translation to {getLangMeta(translateDone).label} completed!
                </div>
              )}

              <div className="flex gap-2">
                <select
                  value={translateTarget}
                  onChange={e => { setTranslateTarget(e.target.value); setTranslateError(null); }}
                  disabled={translating}
                  className="flex-1 text-sm border border-border rounded-md px-2 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
                >
                  <option value="">— select target language —</option>
                  {missingLangs.map(l => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.label}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleTranslate}
                  disabled={!translateTarget || translating}
                  className="px-4 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                >
                  {translating ? (
                    <><FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> Translating…</>
                  ) : (
                    <><FiGlobe className="w-3.5 h-3.5" /> Translate</>
                  )}
                </button>
              </div>

              {translateError && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                  <FiAlertTriangle className="w-3 h-3 shrink-0" /> {translateError}
                </p>
              )}
            </section>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LanguageManagerModal;
