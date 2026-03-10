'use client';
import React from 'react';
import { FiBookOpen, FiPlus, FiTrash2 } from 'react-icons/fi';
import { SectionCard, Field, TextInput } from './SectionCard';
import type { EducationEntry } from '@/types/cvFormData';

interface Props {
  data: EducationEntry[];
  onChange: (data: EducationEntry[]) => void;
}

const emptyEntry = (): EducationEntry => ({ title: '', date: '', location: '' });

export const EducationSection: React.FC<Props> = ({ data, onChange }) => {
  const update = (i: number, entry: EducationEntry) => {
    const next = [...data];
    next[i] = entry;
    onChange(next);
  };

  const set = (i: number, field: keyof EducationEntry) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => update(i, { ...data[i], [field]: e.target.value });

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
          <div key={i} className="rounded-lg border border-border bg-background p-4">
            <div className="flex items-start gap-2">
              <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Degree / Diploma" htmlFor={`edu-title-${i}`} className="sm:col-span-3">
                  <TextInput
                    id={`edu-title-${i}`}
                    value={entry.title}
                    onChange={set(i, 'title')}
                    placeholder="B.Sc. Computer Science — MIT"
                  />
                </Field>
                <Field label="Date" htmlFor={`edu-date-${i}`}>
                  <TextInput
                    id={`edu-date-${i}`}
                    value={entry.date}
                    onChange={set(i, 'date')}
                    placeholder="2015 – 2019"
                  />
                </Field>
                <Field label="Location" htmlFor={`edu-loc-${i}`} className="sm:col-span-2">
                  <TextInput
                    id={`edu-loc-${i}`}
                    value={entry.location}
                    onChange={set(i, 'location')}
                    placeholder="Cambridge, MA"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={() => onChange(data.filter((_, idx) => idx !== i))}
                className="mt-6 rounded p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
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
