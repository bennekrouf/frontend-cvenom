'use client';
import React from 'react';
import { FiLink, FiGithub, FiLinkedin, FiGlobe } from 'react-icons/fi';
import { SectionCard } from './SectionCard';
import { InlineField } from './InlineField';
import type { LinksData } from '@/types/cvFormData';

interface Props {
  data: LinksData;
  onChange: (data: LinksData) => void;
}

export const LinksSection: React.FC<Props> = ({ data, onChange }) => {
  const set = (field: keyof LinksData) => (v: string) =>
    onChange({ ...data, [field]: v });

  return (
    <SectionCard icon={<FiLink className="h-4 w-4" />} title="Links">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-start gap-2">
          <FiGithub className="mt-[1.6rem] h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <InlineField
            label="GitHub"
            value={data.github}
            placeholder="github.com/username"
            onChange={set('github')}
            className="flex-1"
          />
        </div>
        <div className="flex items-start gap-2">
          <FiLinkedin className="mt-[1.6rem] h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <InlineField
            label="LinkedIn"
            value={data.linkedin}
            placeholder="linkedin.com/in/username"
            onChange={set('linkedin')}
            className="flex-1"
          />
        </div>
        <div className="flex items-start gap-2">
          <FiGlobe className="mt-[1.6rem] h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <InlineField
            label="Website / Portfolio"
            value={data.website}
            placeholder="yoursite.com"
            onChange={set('website')}
            className="flex-1"
          />
        </div>
      </div>
    </SectionCard>
  );
};
