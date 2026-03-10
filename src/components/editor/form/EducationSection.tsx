'use client';
import React from 'react';
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
  const update = (i: number, field: keyof EducationEntry) => (v: string) => {
    const next = [...data];
    next[i] = { ...data[i], [field]: v };
    onChange(next);
  };

  return (
    <SectionCard
      icon={<FiBookOpen className="h-4 w-4" />}
      title="Education"
      action={
        <button
          type="button"
          onClick={() => onChange([...data, emptyEntry()])}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
        >
          <FiPlus className="h-3.5 w-3.5" />
          Add Education
        </button>
      }
    >
      <div className="space-y-3">
        {data.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">
            No education entries yet — click "Add Education"
          </p>
        )}
        {data.map((entry, i) => (
          <div key={i} className="group/card rounded-lg border border-border bg-background p-4">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <InlineField
                  label="Degree / Diploma"
                  value={entry.title}
                  placeholder="B.Sc. Computer Science — MIT"
                  onChange={update(i, 'title')}
                  className="sm:col-span-3"
                />
                <InlineField
                  label="Date"
                  value={entry.date}
                  placeholder="2015 – 2019"
                  onChange={update(i, 'date')}
                />
                <InlineField
                  label="Location"
                  value={entry.location}
                  placeholder="Cambridge, MA"
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
