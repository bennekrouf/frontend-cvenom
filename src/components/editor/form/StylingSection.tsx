'use client';
import React from 'react';
import { FiDroplet, FiCamera } from 'react-icons/fi';
import { SectionCard } from './SectionCard';
import type { StylingData } from '@/types/cvFormData';

interface Props {
  data: StylingData;
  onChange: (data: StylingData) => void;
}

// ── Colour picker ─────────────────────────────────────────────────────────────

const ColorPicker: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}> = ({ id, label, value, onChange }) => (
  <div className="space-y-1.5">
    <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
      {label}
    </span>
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
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
  </div>
);

// ── Toggle switch ─────────────────────────────────────────────────────────────

const Toggle: React.FC<{
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ id, checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    id={id}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
      checked ? 'bg-primary' : 'bg-muted'
    }`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

// ── Section ───────────────────────────────────────────────────────────────────

export const StylingSection: React.FC<Props> = ({ data, onChange }) => (
  <SectionCard icon={<FiDroplet className="h-4 w-4" />} title="Styling">

    {/* Colour pickers */}
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
    <div className="mt-4 flex items-center gap-3 rounded-lg border border-border p-3">
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
        className="ml-auto rounded-md px-3 py-1 text-xs font-medium text-white shadow-sm"
        style={{ backgroundColor: data.primary_color }}
      >
        Preview
      </div>
    </div>

    {/* Divider */}
    <div className="my-5 border-t border-border" />

    {/* Photo toggle */}
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
          <FiCamera className="h-4 w-4 text-muted-foreground" />
        </div>
        <div>
          <label
            htmlFor="styling-show-photo"
            className="cursor-pointer text-sm font-medium text-foreground"
          >
            Show profile photo
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Displays your uploaded photo on the CV.{' '}
            <span className="text-muted-foreground/60">
              Upload via the ⋯ menu on your profile in the sidebar.
            </span>
          </p>
          {data.show_photo && (
            <p className="mt-2 inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
              ⚠ Photos are common in CH/EU/Asia but uncommon in US/UK — check local norms.
            </p>
          )}
        </div>
      </div>
      <Toggle
        id="styling-show-photo"
        checked={data.show_photo}
        onChange={(v) => onChange({ ...data, show_photo: v })}
      />
    </div>

  </SectionCard>
);
