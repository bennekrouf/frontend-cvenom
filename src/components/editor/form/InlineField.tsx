'use client';
// InlineField — displays value as plain text; click the pencil (or the text) to edit inline.
//
// Usage:
//   <InlineField label="Full Name" value={data.name} placeholder="Jane Smith"
//                onChange={v => onChange({ ...data, name: v })} />
//
//   <InlineField label="Summary" value={data.summary} multiline rows={4}
//                onChange={v => onChange({ ...data, summary: v })} />

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FiEdit2 } from 'react-icons/fi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InlineFieldProps {
  /** Small uppercase label shown above the value */
  label: string;
  /** Current value */
  value: string;
  /** Placeholder shown when value is empty */
  placeholder?: string;
  /** Called with the new value when the user commits an edit */
  onChange: (value: string) => void;
  /** Render a <textarea> instead of an <input> */
  multiline?: boolean;
  /** Number of visible rows in multiline mode (default 3) */
  rows?: number;
  /** Extra Tailwind classes for the outer wrapper */
  className?: string;
  /** Input type (e.g. "email", "tel") — only for single-line */
  type?: React.HTMLInputTypeAttribute;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const InlineField: React.FC<InlineFieldProps> = ({
  label,
  value,
  placeholder = '—',
  onChange,
  multiline = false,
  rows = 3,
  className = '',
  type = 'text',
}) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);

  // Keep draft in sync if parent value changes while not editing
  useEffect(() => {
    if (!editing) setDraft(value);
  }, [value, editing]);

  // Focus + select-all when we enter edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = useCallback(() => {
    setDraft(value);
    setEditing(true);
  }, [value]);

  const commit = useCallback(() => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  }, [draft, value, onChange]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
      // Enter commits for single-line; Shift+Enter allows newlines in multiline
      if (e.key === 'Enter' && !multiline) { e.preventDefault(); commit(); }
      if (e.key === 'Enter' && multiline && !e.shiftKey && e.metaKey) { e.preventDefault(); commit(); }
    },
    [commit, cancel, multiline],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  const labelEl = (
    <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70 mb-1 select-none">
      {label}
    </span>
  );

  if (editing) {
    const shared = {
      ref: inputRef as React.Ref<HTMLInputElement & HTMLTextAreaElement>,
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      className:
        'w-full rounded-lg border border-primary/50 bg-background px-3 py-2 text-sm text-foreground ' +
        'placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 ' +
        'transition-shadow',
      placeholder,
    };

    return (
      <div className={`space-y-1 ${className}`}>
        {labelEl}
        {multiline ? (
          <textarea {...shared} rows={rows} style={{ resize: 'none' }} />
        ) : (
          <input {...shared} type={type} />
        )}
        <p className="text-[10px] text-muted-foreground/50">
          {multiline ? 'Click outside to save · Esc to cancel' : 'Enter to save · Esc to cancel'}
        </p>
      </div>
    );
  }

  // ── View mode ─────────────────────────────────────────────────────────────

  const isEmpty = !value;

  return (
    <div className={`group space-y-1 ${className}`}>
      {labelEl}
      <button
        type="button"
        onClick={startEdit}
        className={
          'flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left text-sm ' +
          'hover:bg-muted/60 transition-colors cursor-text'
        }
        title="Click to edit"
      >
        <span
          className={`flex-1 leading-relaxed ${
            isEmpty ? 'italic text-muted-foreground/40' : 'text-foreground'
          } ${multiline ? 'whitespace-pre-wrap' : 'truncate'}`}
        >
          {isEmpty ? placeholder : value}
        </span>
        <FiEdit2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    </div>
  );
};
