'use client';
import React from 'react';
import { FiDroplet } from 'react-icons/fi';
import { SectionCard, Field } from './SectionCard';
import type { StylingData } from '@/types/cvFormData';

interface Props {
  data: StylingData;
  onChange: (data: StylingData) => void;
}

const ColorPicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ id, label, value, onChange }) => (
  <Field label={label} htmlFor={id}>
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      {/* Native color input hidden behind a styled swatch */}
      <label htmlFor={id} className="relative cursor-pointer">
        <span
          className="block h-7 w-7 rounded-md border border-border shadow-sm"
          style={{ backgroundColor: value }}
        />
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          const v = e.target.value;
          if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
        }}
        maxLength={7}
        className="flex-1 bg-transparent font-mono text-sm text-foreground focus:outline-none"
        placeholder="#000000"
      />
    </div>
  </Field>
);

export const StylingSection: React.FC<Props> = ({ data, onChange }) => (
  <SectionCard icon={<FiDroplet className="h-4 w-4" />} title="Styling">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <ColorPicker
        id="color-primary"
        label="Primary Colour"
        value={data.primary_color}
        onChange={(v) => onChange({ ...data, primary_color: v })}
      />
      <ColorPicker
        id="color-secondary"
        label="Secondary Colour"
        value={data.secondary_color}
        onChange={(v) => onChange({ ...data, secondary_color: v })}
      />
    </div>

    {/* Live preview swatch */}
    <div className="mt-4 flex gap-3 rounded-lg border border-border p-3">
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: data.primary_color }}
        />
        <span className="text-xs text-muted-foreground">Primary</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className="h-6 w-6 rounded-full border border-border shadow-sm"
          style={{ backgroundColor: data.secondary_color }}
        />
        <span className="text-xs text-muted-foreground">Secondary</span>
      </div>
      <div
        className="ml-auto h-6 rounded-md px-3 flex items-center text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: data.primary_color }}
      >
        Preview
      </div>
    </div>
  </SectionCard>
);
