'use client';
import React from 'react';
import { FiUser } from 'react-icons/fi';
import { SectionCard } from './SectionCard';
import { InlineField } from './InlineField';
import type { PersonalData } from '@/types/cvFormData';

interface Props {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
}

export const PersonalSection: React.FC<Props> = ({ data, onChange }) => {
  const set = (field: keyof PersonalData) => (v: string) =>
    onChange({ ...data, [field]: v });

  return (
    <SectionCard icon={<FiUser className="h-4 w-4" />} title="Personal Information">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <InlineField
          label="Full Name"
          value={data.name}
          placeholder="Jane Smith"
          onChange={set('name')}
        />
        <InlineField
          label="Professional Title"
          value={data.title}
          placeholder="Senior Software Engineer"
          onChange={set('title')}
        />
        <InlineField
          label="Email"
          value={data.email}
          placeholder="jane@example.com"
          type="email"
          onChange={set('email')}
        />
        <InlineField
          label="Phone"
          value={data.phone}
          placeholder="+41 76 123 45 67"
          type="tel"
          onChange={set('phone')}
        />
        <InlineField
          label="Address"
          value={data.address}
          placeholder="Zurich, Switzerland"
          onChange={set('address')}
          className="sm:col-span-2"
        />
        <InlineField
          label="Professional Summary"
          value={data.summary}
          placeholder="Brief overview of your expertise, experience and key strengths…"
          onChange={set('summary')}
          multiline
          rows={4}
          className="sm:col-span-2"
        />
      </div>
    </SectionCard>
  );
};
