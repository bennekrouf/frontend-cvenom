'use client';
import React from 'react';
import { FiUser } from 'react-icons/fi';
import { SectionCard, Field, TextInput, TextArea } from './SectionCard';
import type { PersonalData } from '@/types/cvFormData';

interface Props {
  data: PersonalData;
  onChange: (data: PersonalData) => void;
}

export const PersonalSection: React.FC<Props> = ({ data, onChange }) => {
  const set = (field: keyof PersonalData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => onChange({ ...data, [field]: e.target.value });

  return (
    <SectionCard icon={<FiUser className="h-4 w-4" />} title="Personal Information">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Full Name" htmlFor="personal-name">
          <TextInput
            id="personal-name"
            value={data.name}
            onChange={set('name')}
            placeholder="Jane Smith"
          />
        </Field>

        <Field label="Professional Title" htmlFor="personal-title">
          <TextInput
            id="personal-title"
            value={data.title}
            onChange={set('title')}
            placeholder="Senior Software Engineer"
          />
        </Field>

        <Field label="Email" htmlFor="personal-email">
          <TextInput
            id="personal-email"
            type="email"
            value={data.email}
            onChange={set('email')}
            placeholder="jane@example.com"
          />
        </Field>

        <Field label="Phone" htmlFor="personal-phone">
          <TextInput
            id="personal-phone"
            value={data.phone}
            onChange={set('phone')}
            placeholder="+41 76 123 45 67"
          />
        </Field>

        <Field label="Address" htmlFor="personal-address" className="sm:col-span-2">
          <TextInput
            id="personal-address"
            value={data.address}
            onChange={set('address')}
            placeholder="Zurich, Switzerland"
          />
        </Field>

        <Field label="Professional Summary" htmlFor="personal-summary" className="sm:col-span-2">
          <TextArea
            id="personal-summary"
            value={data.summary}
            onChange={set('summary')}
            rows={4}
            placeholder="Brief overview of your expertise, experience and key strengths…"
          />
        </Field>
      </div>
    </SectionCard>
  );
};
