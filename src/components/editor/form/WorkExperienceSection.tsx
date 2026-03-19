'use client';
import React, { useState, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { FiBriefcase, FiChevronDown, FiChevronUp, FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { SectionCard, Field } from './SectionCard';
import { TagInput } from './TagInput';
import type { WorkExperienceEntry } from '@/types/cvFormData';

const LANG_FLAG: Record<string, string> = { en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', es: '🇪🇸', pt: '🇵🇹', it: '🇮🇹', nl: '🇳🇱', ar: '🇸🇦' };

interface Props {
  data: WorkExperienceEntry[];
  onChange: (data: WorkExperienceEntry[]) => void;
  availableLanguages?: string[];
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
}

const emptyEntry = (): WorkExperienceEntry => ({
  company: '',
  title: '',
  date: '',
  description: '',
  responsibilities: [],
  technologies: [],
});

// Shared input/textarea style
const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ' +
  'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow';

const labelCls = 'block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1 select-none';

// ── ExperienceCard ─────────────────────────────────────────────────────────────

const ExperienceCard: React.FC<{
  entry: WorkExperienceEntry;
  index: number;
  total: number;
  onChange: (entry: WorkExperienceEntry) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
  initialOpen: boolean;
}> = ({ entry, index, total, onChange, onRemove, onMove, initialOpen }) => {
  const t = useTranslations('cvForm');
  const [open, setOpen] = useState(initialOpen);

  const set = useCallback(
    (field: keyof WorkExperienceEntry) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange({ ...entry, [field]: e.target.value }),
    [entry, onChange],
  );

  const header = entry.company
    ? `${entry.company}${entry.title ? ` · ${entry.title}` : ''}${entry.date ? ` · ${entry.date}` : ''}`
    : t('newExperience');

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* ── Card header ── */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left min-w-0"
        >
          {open
            ? <FiChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            : <FiChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className="text-sm font-medium text-foreground truncate">{header}</span>
        </button>

        {/* Controls — intentionally outside the toggle button so clicks don't bubble */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMove(-1); }}
            disabled={index === 0}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Move up"
          >
            <FiArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onMove(1); }}
            disabled={index === total - 1}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Move down"
          >
            <FiArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            aria-label="Remove experience"
            title="Delete this experience"
          >
            <FiTrash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Expanded fields — always-visible inputs (no click-to-edit) ── */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('labelCompany')}</label>
              <input
                className={inputCls}
                value={entry.company}
                onChange={set('company')}
                placeholder={t('placeholderCompany')}
              />
            </div>
            <div>
              <label className={labelCls}>{t('labelJobTitle')}</label>
              <input
                className={inputCls}
                value={entry.title}
                onChange={set('title')}
                placeholder={t('placeholderJobTitle')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelCls}>{t('labelDateRange')}</label>
              <input
                className={inputCls}
                value={entry.date}
                onChange={set('date')}
                placeholder={t('placeholderDateRange')}
              />
            </div>
            <div>
              <label className={labelCls}>{t('labelCompanyDesc')}</label>
              <input
                className={inputCls}
                value={entry.description}
                onChange={set('description')}
                placeholder={t('placeholderCompanyDesc')}
              />
            </div>
          </div>

          <Field label={t('labelResponsibilities')}>
            <TagInput
              tags={entry.responsibilities}
              onChange={(tags) => onChange({ ...entry, responsibilities: tags })}
              placeholder={t('placeholderResponsibility')}
            />
          </Field>

          <Field label={t('labelTechnologies')}>
            <TagInput
              tags={entry.technologies}
              onChange={(tags) => onChange({ ...entry, technologies: tags })}
              placeholder={t('placeholderTechnologies')}
            />
          </Field>
        </div>
      )}
    </div>
  );
};

// ── WorkExperienceSection ──────────────────────────────────────────────────────

export const WorkExperienceSection: React.FC<Props> = ({
  data,
  onChange,
  availableLanguages = [],
  selectedLanguage = 'en',
  onLanguageChange,
}) => {
  const t = useTranslations('cvForm');

  // Stable keys: map each entry to a UUID that persists across re-renders.
  // This prevents React from reusing the wrong ExperienceCard instance (and
  // thus the wrong `open` state) when items are added, removed, or reordered.
  const keyMapRef = useRef<WeakMap<WorkExperienceEntry, string>>(new WeakMap());
  const getKey = (entry: WorkExperienceEntry): string => {
    if (!keyMapRef.current.has(entry)) {
      keyMapRef.current.set(entry, crypto.randomUUID());
    }
    return keyMapRef.current.get(entry)!;
  };

  const update = (i: number, entry: WorkExperienceEntry) => {
    const next = [...data];
    next[i] = entry;
    onChange(next);
  };

  const remove = (i: number) => onChange(data.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const next = [...data];
    const j = i + dir;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const addEntry = () => {
    const entry = emptyEntry();
    onChange([...data, entry]);
  };

  return (
    <SectionCard
      icon={<FiBriefcase className="h-4 w-4" />}
      title={t('sectionWorkExperience')}
      action={
        <div className="flex items-center gap-2">
          {availableLanguages.length > 1 && (
            <div className="flex overflow-hidden rounded-md border border-border text-xs font-medium">
              {availableLanguages.map((lang, idx) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onLanguageChange?.(lang)}
                  className={`flex items-center gap-1 px-2 py-1.5 transition-colors ${
                    idx > 0 ? 'border-l border-border' : ''
                  } ${
                    selectedLanguage === lang
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                  title={lang.toUpperCase()}
                >
                  <span>{LANG_FLAG[lang] ?? '🌐'}</span>
                  <span className="uppercase">{lang}</span>
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addEntry}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <FiPlus className="h-3.5 w-3.5" />
            {t('addExperience')}
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        {data.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            {t('noExperienceYet')}
          </p>
        )}
        {data.map((entry, i) => (
          <ExperienceCard
            key={getKey(entry)}
            entry={entry}
            index={i}
            total={data.length}
            onChange={(e) => update(i, e)}
            onRemove={() => remove(i)}
            onMove={(dir) => move(i, dir)}
            initialOpen={i === 0}
          />
        ))}
      </div>
    </SectionCard>
  );
};
