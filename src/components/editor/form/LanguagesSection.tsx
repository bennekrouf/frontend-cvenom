'use client';
import React from 'react';
import { FiGlobe } from 'react-icons/fi';
import { SectionCard, Field } from './SectionCard';
import { TagInput } from './TagInput';
import type { LanguagesData } from '@/types/cvFormData';

interface Props {
  data: LanguagesData;
  onChange: (data: LanguagesData) => void;
}

const LEVELS: { key: keyof LanguagesData; label: string; badge: string }[] = [
  { key: 'native',       label: 'Native',       badge: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  { key: 'fluent',       label: 'Fluent',       badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { key: 'intermediate', label: 'Intermediate', badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { key: 'basic',        label: 'Basic',        badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400' },
];

export const LanguagesSection: React.FC<Props> = ({ data, onChange }) => (
  <SectionCard icon={<FiGlobe className="h-4 w-4" />} title="Languages">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {LEVELS.map(({ key, label, badge }) => (
        <div key={key} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </label>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge}`}>
              {data[key].length}
            </span>
          </div>
          <TagInput
            tags={data[key]}
            onChange={(tags) => onChange({ ...data, [key]: tags })}
            placeholder={`Add ${label.toLowerCase()} language…`}
          />
        </div>
      ))}
    </div>
  </SectionCard>
);
