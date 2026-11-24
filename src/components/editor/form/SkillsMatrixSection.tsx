'use client';
// Skills matrix (skill · years · level) drawn by the enterprise3 template.
// "Compute" fills the empty years from the mission dates and guesses levels;
// "Refine with AI" also asks the AI. Values the user typed are never replaced.

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiGrid, FiPlus, FiTrash2, FiCpu, FiZap, FiLoader } from 'react-icons/fi';
import { SectionCard } from './SectionCard';
import { suggestSkillsMatrix } from '@/lib/cvDataService';
import type { MatrixSource, SkillsMatrixGroup, SkillsMatrixItem } from '@/types/cvFormData';

interface Props {
  profileName: string;
  language: string;
  data: SkillsMatrixGroup[];
  onChange: (data: SkillsMatrixGroup[]) => void;
}

const inputCls =
  'w-full rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30';

const LevelPicker: React.FC<{ value: number; onChange: (v: number) => void; label: string }> = ({ value, onChange, label }) => (
  <div className="flex items-center gap-1" role="radiogroup" aria-label={label}>
    {[1, 2, 3, 4].map((n) => (
      <button
        key={n}
        type="button"
        role="radio"
        aria-checked={value === n}
        title={String(n)}
        // A second click on the current level clears it.
        onClick={() => onChange(value === n ? 0 : n)}
        className={`h-3.5 w-3.5 rounded-full border transition-colors ${
          n <= value ? 'border-[#E31937] bg-[#E31937]' : 'border-border bg-muted hover:bg-muted-foreground/30'
        }`}
      />
    ))}
  </div>
);

const SourceTag: React.FC<{ source?: MatrixSource }> = ({ source }) => {
  const t = useTranslations('cvForm');
  if (!source || source === 'user') return null;
  const label = source === 'ai' ? t('matrixSourceAi') : source === 'computed' ? t('matrixSourceComputed') : t('matrixSourceEstimate');
  const cls = source === 'ai' ? 'bg-violet-500/10 text-violet-600' : 'bg-sky-500/10 text-sky-600';
  return <span className={`ml-1 rounded px-1 text-[10px] font-medium uppercase ${cls}`}>{label}</span>;
};

export const SkillsMatrixSection: React.FC<Props> = ({ profileName, language, data, onChange }) => {
  const t = useTranslations('cvForm');
  const [busy, setBusy] = useState<'compute' | 'ai' | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const setGroup = (gi: number, g: SkillsMatrixGroup) => onChange(data.map((x, i) => (i === gi ? g : x)));
  const setItem = (gi: number, ii: number, patch: Partial<SkillsMatrixItem>) => {
    const g = data[gi];
    setGroup(gi, { ...g, items: g.items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });
  };

  const suggest = async (ai: boolean) => {
    setBusy(ai ? 'ai' : 'compute');
    setMessage(null);
    try {
      const r = await suggestSkillsMatrix(profileName, data, ai, language);
      onChange(r.groups);
      if (r.ai_error) setMessage(t('matrixAiFailed'));
      else if (r.groups.length === 0) setMessage(t('matrixNothingToSuggest'));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const actionBtn = 'flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted disabled:opacity-50';

  return (
    <SectionCard
      icon={<FiGrid className="h-4 w-4" />}
      title={t('sectionSkillsMatrix')}
      action={
        <div className="flex items-center gap-2">
          <button type="button" className={actionBtn} disabled={busy !== null} onClick={() => suggest(false)} title={t('matrixComputeHint')}>
            {busy === 'compute' ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiCpu className="h-3.5 w-3.5" />}
            {t('matrixCompute')}
          </button>
          <button type="button" className={actionBtn} disabled={busy !== null} onClick={() => suggest(true)} title={t('matrixAiHint')}>
            {busy === 'ai' ? <FiLoader className="h-3.5 w-3.5 animate-spin" /> : <FiZap className="h-3.5 w-3.5" />}
            {t('matrixAi')}
          </button>
        </div>
      }
    >
      <p className="mb-4 text-xs text-muted-foreground">{t('matrixIntro')}</p>
      {message && <p className="mb-3 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700">{message}</p>}

      <div className="space-y-5">
        {data.map((g, gi) => (
          <div key={gi} className="rounded-lg border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
              <input
                className={`${inputCls} font-semibold uppercase`}
                value={g.category}
                placeholder={t('matrixCategory')}
                onChange={(e) => setGroup(gi, { ...g, category: e.target.value })}
              />
              <button
                type="button"
                onClick={() => onChange(data.filter((_, i) => i !== gi))}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                aria-label={t('matrixRemoveCategory')}
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="divide-y divide-border">
              <div className="grid grid-cols-[1fr_7.5rem_9rem_1.75rem] gap-2 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                <span>{t('matrixSkill')}</span>
                <span>{t('matrixYears')}</span>
                <span>{t('matrixLevel')}</span>
                <span />
              </div>
              {g.items.map((it, ii) => (
                <div key={ii} className="grid grid-cols-[1fr_7.5rem_9rem_1.75rem] items-center gap-2 px-3 py-1.5">
                  <input className={inputCls} value={it.name} placeholder={t('matrixSkill')}
                    onChange={(e) => setItem(gi, ii, { name: e.target.value })} />
                  <div className="flex items-center">
                    <input className={inputCls} value={it.years} placeholder="5, 10+"
                      onChange={(e) => setItem(gi, ii, { years: e.target.value, years_source: 'user' })} />
                    <SourceTag source={it.years ? it.years_source : undefined} />
                  </div>
                  <div className="flex items-center">
                    <LevelPicker value={it.level} label={t('matrixLevel')}
                      onChange={(level) => setItem(gi, ii, { level, level_source: 'user' })} />
                    <SourceTag source={it.level ? it.level_source : undefined} />
                  </div>
                  <button
                    type="button"
                    onClick={() => setGroup(gi, { ...g, items: g.items.filter((_, i) => i !== ii) })}
                    className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={t('matrixRemoveSkill')}
                  >
                    <FiTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setGroup(gi, { ...g, items: [...g.items, { name: '', years: '', level: 0 }] })}
                className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <FiPlus className="h-3.5 w-3.5" /> {t('matrixAddSkill')}
              </button>
            </div>
          </div>
        ))}
        {data.length === 0 && <p className="py-2 text-center text-sm text-muted-foreground">{t('matrixEmpty')}</p>}
        <button
          type="button"
          onClick={() => onChange([...data, { category: '', items: [{ name: '', years: '', level: 0 }] }])}
          className="flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
        >
          <FiPlus className="h-3.5 w-3.5" /> {t('addCategory')}
        </button>
        <p className="text-[11px] text-muted-foreground">{t('matrixLegend')}</p>
      </div>
    </SectionCard>
  );
};
