'use client';
import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FiCode, FiPlus, FiTrash2 } from 'react-icons/fi';
import { SectionCard, Field } from './SectionCard';
import { TagInput } from './TagInput';

interface Props {
  data: Record<string, string[]>;
  onChange: (data: Record<string, string[]>) => void;
}

export const SkillsSection: React.FC<Props> = ({ data, onChange }) => {
  const t = useTranslations('cvForm');
  const DISPLAY_LABELS: Record<string, string> = {
    programming_languages: t('skillsProgrammingLanguages'),
    frameworks: t('skillsFrameworks'),
    tools: t('skillsTools'),
    technical: t('skillsTechnical'),
  };
  const [newCategory, setNewCategory] = useState('');
  const [showCategoryInput, setShowCategoryInput] = useState(false);

  const updateCategory = (key: string, tags: string[]) => {
    onChange({ ...data, [key]: tags });
  };

  const removeCategory = (key: string) => {
    const next = { ...data };
    delete next[key];
    onChange(next);
  };

  const addCategory = () => {
    const key = newCategory.trim().toLowerCase().replace(/\s+/g, '_');
    if (key && !(key in data)) {
      onChange({ ...data, [key]: [] });
    }
    setNewCategory('');
    setShowCategoryInput(false);
  };

  // Always show default categories first, then custom ones
  const defaultKeys = ['programming_languages', 'frameworks', 'tools', 'technical'];
  const customKeys = Object.keys(data).filter((k) => !defaultKeys.includes(k));
  const orderedKeys = [...defaultKeys.filter((k) => k in data), ...customKeys];

  return (
    <SectionCard
      icon={<FiCode className="h-4 w-4" />}
      title={t('sectionSkills')}
      action={
        showCategoryInput ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              onBlur={() => { if (!newCategory.trim()) setShowCategoryInput(false); }}
              placeholder={t('placeholderCategoryName')}
              className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              type="button"
              onClick={addCategory}
              className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90"
            >
              {t('add')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCategoryInput(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <FiPlus className="h-3.5 w-3.5" />
            {t('addCategory')}
          </button>
        )
      }
    >
      <div className="space-y-4">
        {orderedKeys.map((key) => (
          <div key={key} className="flex items-start gap-2">
            <Field
              label={DISPLAY_LABELS[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              className="flex-1"
            >
              <TagInput
                tags={data[key] ?? []}
                onChange={(tags) => updateCategory(key, tags)}
                placeholder={t('placeholderAddSkill')}
              />
            </Field>
            {!defaultKeys.includes(key) && (
              <button
                type="button"
                onClick={() => removeCategory(key)}
                className="mt-6 rounded p-1 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                aria-label="Remove category"
              >
                <FiTrash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {orderedKeys.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-2">
{t('noSkillsYet')}
          </p>
        )}
      </div>
    </SectionCard>
  );
};
