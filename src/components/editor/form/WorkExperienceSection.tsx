'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiBriefcase, FiChevronDown, FiChevronUp, FiPlus, FiTrash2, FiArrowUp, FiArrowDown } from 'react-icons/fi';
import { SectionCard, Field } from './SectionCard';
import { InlineField } from './InlineField';
import { TagInput } from './TagInput';
import type { WorkExperienceEntry } from '@/types/cvFormData';

interface Props {
  data: WorkExperienceEntry[];
  onChange: (data: WorkExperienceEntry[]) => void;
}

const emptyEntry = (): WorkExperienceEntry => ({
  company: '',
  title: '',
  date: '',
  description: '',
  responsibilities: [],
  technologies: [],
});

const ExperienceCard: React.FC<{
  entry: WorkExperienceEntry;
  index: number;
  total: number;
  onChange: (entry: WorkExperienceEntry) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}> = ({ entry, index, total, onChange, onRemove, onMove }) => {
  const t = useTranslations('cvForm');
  const [open, setOpen] = useState(index === 0);
  const set = (field: keyof WorkExperienceEntry) => (v: string) =>
    onChange({ ...entry, [field]: v });

  const header = entry.company
    ? `${entry.company}${entry.title ? ` · ${entry.title}` : ''}${entry.date ? ` · ${entry.date}` : ''}`
    : t('newExperience');

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex flex-1 items-center gap-2 text-left"
        >
          {open
            ? <FiChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            : <FiChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
          <span className="text-sm font-medium text-foreground truncate">{header}</span>
        </button>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Move up"><FiArrowUp className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={() => onMove(1)} disabled={index === total - 1}
            className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
            aria-label="Move down"><FiArrowDown className="h-3.5 w-3.5" /></button>
          <button type="button" onClick={onRemove}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove"><FiTrash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {/* Expanded fields */}
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineField label={t('labelCompany')}   value={entry.company}     placeholder={t('placeholderCompany')}   onChange={set('company')} />
            <InlineField label={t('labelJobTitle')}  value={entry.title}       placeholder={t('placeholderJobTitle')}  onChange={set('title')} />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InlineField label={t('labelDateRange')}  value={entry.date}        placeholder={t('placeholderDateRange')}  onChange={set('date')} />
            <InlineField label={t('labelCompanyDesc')} value={entry.description} placeholder={t('placeholderCompanyDesc')} onChange={set('description')} />
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

export const WorkExperienceSection: React.FC<Props> = ({ data, onChange }) => {
  const t = useTranslations('cvForm');
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

  return (
    <SectionCard
      icon={<FiBriefcase className="h-4 w-4" />}
      title={t('sectionWorkExperience')}
      action={
        <button
          type="button"
          onClick={() => onChange([...data, emptyEntry()])}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        >
          <FiPlus className="h-3.5 w-3.5" />
          {t('addExperience')}
        </button>
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
            key={i}
            entry={entry}
            index={i}
            total={data.length}
            onChange={(e) => update(i, e)}
            onRemove={() => remove(i)}
            onMove={(dir) => move(i, dir)}
          />
        ))}
      </div>
    </SectionCard>
  );
};
