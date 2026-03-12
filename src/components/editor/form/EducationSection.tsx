'use client';
import React from 'react';
import { useTranslations } from 'next-intl';
import { FiBookOpen, FiPlus, FiTrash2 } from 'react-icons/fi';
import { SectionCard } from './SectionCard';
import { InlineField } from './InlineField';
import type { EducationEntry } from '@/types/cvFormData';

interface Props {
  data: EducationEntry[];
  onChange: (data: EducationEntry[]) => void;
}

const emptyEntry = (): EducationEntry => ({ title: '', date: '', location: '' });

export const EducationSection: React.FC<Props> = ({ data, onChange }) => {
  const t = useTranslations('cvForm');
  const update = (i: number, field: keyof EducationEntry) => (v: string) => {
    const next = [...data];
    next[i] = { ...data[i], [field]: v };
    onChange(next);
  };

  return (
    <SectionCard
      icon={<FiBookOpen className="h-4 w-4" />}
      title={t('sectionEducation')}
      action={
        <button
          type="button"
          onClick={() => onChange([...data, emptyEntry()])}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        >
          <FiPlus className="h-3.5 w-3.5" />
          {t('addEducation')}
        </button>
      }
    >
      <div className="space-y-3">
        {data.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
{t('noEducationYet')}
          </p>
        )}
        {data.map((entry, i) => (
          <div key={i} className="group/card rounded-lg border border-border bg-background p-4">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <InlineField
                  label={t('labelDegree')}
                  value={entry.title}
                  placeholder={t('placeholderDegree')}
                  onChange={update(i, 'title')}
                  className="sm:col-span-3"
                />
                <InlineField
                  label={t('labelDate')}
                  value={entry.date}
                  placeholder={t('placeholderEducationDate')}
                  onChange={update(i, 'date')}
                />
                <InlineField
                  label={t('labelLocation')}
                  value={entry.location}
                  placeholder={t('placeholderEducationLocation')}
                  onChange={update(i, 'location')}
                  className="sm:col-span-2"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(data.filter((_, idx) => idx !== i))}
                className="mt-5 rounded p-1 text-muted-foreground opacity-0 group-hover/card:opacity-100 hover:text-destructive transition-all flex-shrink-0"
                aria-label="Remove"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
};
