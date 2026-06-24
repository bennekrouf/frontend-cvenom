'use client';

import { useState, useEffect } from 'react';
import { FiX, FiFileText } from 'react-icons/fi';
import { listBrands, type BrandSummary } from '@/lib/api';

const ALL_LANGUAGES = [
  { value: 'en', label: '🇬🇧 English' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'de', label: '🇩🇪 Deutsch' },
];

// Reuse the same per-collaborator brand-memory key as GenerateCVModal so the
// brand picked for the CV is preselected here too — that's the whole point
// of a "consistent branded folder of materials".
const lastBrandKey = (collab: string) => `cvenom:last-brand:${collab}`;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onGenerate: (language: string, brandSlug: string | null) => void;
  isGenerating: boolean;
  availableLanguages: string[];
}

export default function GeneratePortfolioModal({
  isOpen,
  onClose,
  collaboratorName,
  onGenerate,
  isGenerating,
  availableLanguages,
}: Props) {
  const langs = availableLanguages.length > 0 ? availableLanguages : ['en'];
  const [selectedLanguage, setSelectedLanguage] = useState(langs[0]);
  const [brands, setBrands] = useState<BrandSummary[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedLanguage(langs[0]);
    // Fetch brands and preselect whichever the user last picked for this
    // collaborator (set by GenerateCVModal). Silent fallback to no brand
    // if the call fails or the previous pick was deleted.
    listBrands()
      .then((list) => {
        setBrands(list);
        if (collaboratorName) {
          const remembered = localStorage.getItem(lastBrandKey(collaboratorName));
          if (remembered && list.some((b) => b.slug === remembered)) {
            setSelectedBrand(remembered);
            return;
          }
        }
        setSelectedBrand(null);
      })
      .catch(() => {
        setBrands([]);
        setSelectedBrand(null);
      });
  }, [isOpen, collaboratorName]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">Generate Portfolio</h2>
            {collaboratorName && (
              <p className="text-xs text-muted-foreground mt-0.5">{collaboratorName}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted transition-colors"
          >
            <FiX className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Info */}
          <div className="rounded-lg border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-4">
            <p className="text-sm text-violet-800 dark:text-violet-300 font-medium mb-1">
              What goes in your portfolio?
            </p>
            <p className="text-xs text-violet-700 dark:text-violet-400 leading-relaxed">
              Your portfolio is built from the <code className="font-mono">[[projects]]</code> sections
              in your <code className="font-mono">cv_params.toml</code> file. Add one block per project
              with title, role, date, description, technologies, highlights, and an optional URL.
            </p>
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Language</label>
            {langs.length === 1 ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-violet-300 bg-violet-50 text-violet-800 text-sm font-medium w-fit">
                {ALL_LANGUAGES.find(l => l.value === langs[0])?.label ?? langs[0].toUpperCase()}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {langs.map(value => {
                  const lang = ALL_LANGUAGES.find(l => l.value === value);
                  const label = lang?.label ?? value.toUpperCase();
                  const active = selectedLanguage === value;
                  return (
                    <button
                      key={value}
                      onClick={() => setSelectedLanguage(value)}
                      className={`py-2 px-4 rounded-md text-sm font-medium border transition-colors ${
                        active
                          ? 'border-violet-500 bg-violet-600 text-white'
                          : 'border-border bg-card text-foreground hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Brand picker — only shows when the tenant has at least one brand.
              Picks up the same selection the CV modal uses so a generated CV
              + portfolio pair share the same branding without re-selection. */}
          {brands.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Brand</label>
              <p className="text-xs text-muted-foreground mb-2">
                Applies this brand's colors and logo. Choose Default to use the template's own styling.
              </p>
              <select
                value={selectedBrand ?? ''}
                onChange={(e) => setSelectedBrand(e.target.value || null)}
                disabled={isGenerating}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
              >
                <option value="">Default (no brand)</option>
                {brands.map((b) => (
                  <option key={b.slug} value={b.slug}>
                    {b.name}{b.has_logo ? ' · logo' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* toml snippet hint */}
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer select-none hover:text-foreground transition-colors">
              Show example project entry
            </summary>
            <pre className="mt-2 text-xs bg-muted rounded-md p-3 overflow-x-auto text-foreground leading-relaxed">{`[[projects]]
title = "My Project"
role = "Tech Lead"
date = "2024 – Present"
description = "Brief overview of the project."
technologies = ["Rust", "React", "Docker"]
highlights = [
  "Key achievement or outcome",
  "Another measurable result",
]
url = "https://github.com/you/project"`}</pre>
          </details>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (collaboratorName) {
                if (selectedBrand) {
                  localStorage.setItem(lastBrandKey(collaboratorName), selectedBrand);
                } else {
                  localStorage.removeItem(lastBrandKey(collaboratorName));
                }
              }
              onGenerate(selectedLanguage, selectedBrand);
            }}
            disabled={isGenerating || !collaboratorName}
            className="flex items-center gap-2 px-5 py-2 rounded-md bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <FiFileText className="h-3.5 w-3.5" />
                Generate Portfolio
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
