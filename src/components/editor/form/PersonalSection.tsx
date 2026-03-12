'use client';
import React from 'react';
import { FiUser } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { SectionCard } from './SectionCard';
import { InlineField } from './InlineField';
import type { PersonalData } from '@/types/cvFormData';

interface Props {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
}

export const PersonalSection: React.FC<Props> = ({ data, onChange }) => {
  const t = useTranslations('cvForm');
  const set = (field: keyof PersonalData) => (v: string) =>
    onChange({ ...data, [field]: v });

  return (
    <SectionCard icon={<FiUser className="h-4 w-4" />} title={t('sectionPersonal')}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InlineField
          label={t('labelFullName')}
          value={data.name}
          placeholder={t('placeholderFullName')}
          onChange={set('name')}
        />
        <InlineField
          label={t('labelProfessionalTitle')}
          value={data.title}
          placeholder={t('placeholderProfessionalTitle')}
          onChange={set('title')}
        />
        <InlineField
          label={t('labelEmail')}
          value={data.email}
          placeholder={t('placeholderEmail')}
          type="email"
          onChange={set('email')}
        />
        <InlineField
          label={t('labelPhone')}
          value={data.phone}
          placeholder={t('placeholderPhone')}
          type="tel"
          onChange={set('phone')}
        />
        <InlineField
          label={t('labelAddress')}
          value={data.address}
          placeholder={t('placeholderAddress')}
          onChange={set('address')}
          className="sm:col-span-2"
        />
        <InlineField
          label={t('labelSummary')}
          value={data.summary}
          placeholder={t('placeholderSummary')}
          onChange={set('summary')}
          multiline
          rows={4}
          className="sm:col-span-2"
        />
      </div>
    </SectionCard>
  );
};
