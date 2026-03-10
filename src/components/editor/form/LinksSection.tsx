'use client';
import React from 'react';
import { FiLink, FiGithub, FiLinkedin, FiGlobe } from 'react-icons/fi';
import { SectionCard, Field } from './SectionCard';
import type { LinksData } from '@/types/cvFormData';

interface Props {
  data: LinksData;
  onChange: (data: LinksData) => void;
}

const LinkField: React.FC<{
  label: string;
  icon: React.ReactNode;
  id: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}> = ({ label, icon, id, value, placeholder, onChange }) => (
  <Field label={label} htmlFor={id}>
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
        {icon}
      </span>
      <input
        id={id}
        type="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  </Field>
);

export const LinksSection: React.FC<Props> = ({ data, onChange }) => (
  <SectionCard icon={<FiLink className="h-4 w-4" />} title="Links">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <LinkField
        label="GitHub"
        icon={<FiGithub className="h-4 w-4" />}
        id="link-github"
        value={data.github}
        placeholder="https://github.com/username"
        onChange={(v) => onChange({ ...data, github: v })}
      />
      <LinkField
        label="LinkedIn"
        icon={<FiLinkedin className="h-4 w-4" />}
        id="link-linkedin"
        value={data.linkedin}
        placeholder="https://linkedin.com/in/username"
        onChange={(v) => onChange({ ...data, linkedin: v })}
      />
      <LinkField
        label="Website / Portfolio"
        icon={<FiGlobe className="h-4 w-4" />}
        id="link-website"
        value={data.website}
        placeholder="https://yoursite.com"
        onChange={(v) => onChange({ ...data, website: v })}
      />
    </div>
  </SectionCard>
);
