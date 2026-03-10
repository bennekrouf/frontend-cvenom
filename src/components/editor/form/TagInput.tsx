'use client';
// TagInput — shows existing tags as chips at rest.
// A faint "+ Add" ghost button appears on hover; clicking it reveals a compact
// inline input. Blur or Escape commits any typed text and returns to view mode.

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const TagInput: React.FC<TagInputProps> = ({
  tags,
  onChange,
  placeholder = 'Add…',
  className = '',
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the input as soon as we enter add mode
  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const addTag = (value: string) => {
    const trimmed = value.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === 'Escape') {
      addTag(inputValue); // commit whatever is in the field before closing
      setIsAdding(false);
    }
  };

  const handleBlur = () => {
    addTag(inputValue); // commit on blur too
    setIsAdding(false);
  };

  return (
    <div className={`group/tag flex flex-wrap items-center gap-1.5 py-0.5 ${className}`}>
      {/* Existing tag chips */}
      {tags.map((tag, i) => (
        <span
          key={i}
          className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(i)}
            className="rounded-sm text-primary/60 transition-colors hover:text-destructive"
            aria-label={`Remove ${tag}`}
          >
            <FiX className="h-3 w-3" />
          </button>
        </span>
      ))}

      {/* Inline input (only in add mode) */}
      {isAdding ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={
            'h-[22px] min-w-[100px] rounded-md border border-primary/40 bg-background ' +
            'px-2 text-xs text-foreground placeholder:text-muted-foreground/50 ' +
            'outline-none focus:ring-1 focus:ring-primary/30'
          }
        />
      ) : (
        /* Ghost "+ Add" button — fades in on hover of the parent row */
        <button
          type="button"
          onClick={() => setIsAdding(true)}
          className={
            'flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs ' +
            'text-muted-foreground/50 transition-all ' +
            'opacity-0 group-hover/tag:opacity-100 ' +
            'hover:bg-muted/60 hover:text-muted-foreground'
          }
          aria-label="Add tag"
        >
          <FiPlus className="h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
};
