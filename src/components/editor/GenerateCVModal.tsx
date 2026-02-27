// src/components/editor/GenerateCVModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { getTemplates } from '@/lib/api';

interface Template {
  name: string;
  description: string;
}

interface GenerateCVModalProps {
  isOpen: boolean;
  onClose: () => void;
  collaboratorName: string | null;
  onGenerateCV: (language: string, template: string) => Promise<void>;
  isGenerating: boolean;
}

// ── Visual thumbnail SVG previews per template ────────────────────────────────

const TemplateThumbnail: React.FC<{ name: string }> = ({ name }) => {
  switch (name) {
    case 'tech':
      return (
        // Two-column layout, slate header, skill chips
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Header bar */}
          <rect width="120" height="32" fill="#2D3748" />
          <rect x="8" y="8" width="50" height="6" rx="1" fill="#fff" opacity="0.9" />
          <rect x="8" y="18" width="30" height="4" rx="1" fill="#4299E1" />
          {/* Sidebar */}
          <rect x="0" y="32" width="36" height="128" fill="#F7FAFC" />
          {/* Sidebar skill chips */}
          <rect x="4" y="40" width="28" height="4" rx="1" fill="#4299E1" opacity="0.5" />
          <rect x="4" y="48" width="14" height="5" rx="2.5" fill="#BEE3F8" />
          <rect x="20" y="48" width="12" height="5" rx="2.5" fill="#BEE3F8" />
          <rect x="4" y="56" width="18" height="5" rx="2.5" fill="#BEE3F8" />
          <rect x="4" y="66" width="28" height="4" rx="1" fill="#4299E1" opacity="0.5" />
          <rect x="4" y="73" width="12" height="4" rx="1" fill="#CBD5E0" />
          <rect x="4" y="80" width="20" height="4" rx="1" fill="#CBD5E0" />
          <rect x="4" y="87" width="16" height="4" rx="1" fill="#CBD5E0" />
          {/* Main col */}
          {/* Section label */}
          <rect x="42" y="36" width="8" height="8" rx="1" fill="#4299E1" />
          <rect x="52" y="39" width="30" height="3" rx="1" fill="#2D3748" opacity="0.7" />
          {/* Experience entries */}
          <rect x="42" y="52" width="40" height="4" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="42" y="58" width="24" height="3" rx="1" fill="#4299E1" opacity="0.6" />
          <rect x="42" y="64" width="70" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="68" width="65" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="72" width="50" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="82" width="40" height="4" rx="1" fill="#2D3748" opacity="0.8" />
          <rect x="42" y="88" width="24" height="3" rx="1" fill="#4299E1" opacity="0.6" />
          <rect x="42" y="94" width="70" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="98" width="55" height="2" rx="1" fill="#CBD5E0" />
          <rect x="42" y="102" width="60" height="2" rx="1" fill="#CBD5E0" />
        </svg>
      );

    case 'executive':
      return (
        // Single-column, centered name, gold accents
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Top gold rule */}
          <rect x="10" y="12" width="100" height="1.5" fill="#C9A84C" />
          {/* Name centered */}
          <rect x="25" y="18" width="70" height="7" rx="1" fill="#1A1A2E" opacity="0.85" />
          {/* Gold rule */}
          <rect x="10" y="29" width="100" height="1" fill="#C9A84C" />
          {/* Title centered */}
          <rect x="35" y="33" width="50" height="5" rx="1" fill="#C9A84C" opacity="0.7" />
          {/* Contact line */}
          <rect x="20" y="41" width="80" height="2.5" rx="1" fill="#4A4A6A" opacity="0.4" />
          {/* Section */}
          <rect x="10" y="50" width="60" height="3" rx="1" fill="#1A1A2E" opacity="0.7" />
          <rect x="10" y="55" width="100" height="1" fill="#C9A84C" opacity="0.5" />
          {/* Achievement box */}
          <rect x="10" y="59" width="100" height="20" rx="2" fill="#FFFBEB" stroke="#C9A84C" strokeWidth="0.5" />
          <rect x="14" y="63" width="6" height="6" rx="1" fill="#C9A84C" opacity="0.6" />
          <rect x="23" y="64" width="60" height="2.5" rx="1" fill="#1A1A2E" opacity="0.6" />
          <rect x="14" y="71" width="6" height="6" rx="1" fill="#C9A84C" opacity="0.6" />
          <rect x="23" y="72" width="50" height="2.5" rx="1" fill="#1A1A2E" opacity="0.6" />
          {/* Experience section */}
          <rect x="10" y="85" width="70" height="3" rx="1" fill="#1A1A2E" opacity="0.7" />
          <rect x="10" y="90" width="100" height="1" fill="#C9A84C" opacity="0.5" />
          <rect x="10" y="94" width="55" height="3.5" rx="1" fill="#1A1A2E" opacity="0.8" />
          <rect x="10" y="100" width="35" height="3" rx="1" fill="#C9A84C" opacity="0.6" />
          <rect x="10" y="105" width="95" height="2" rx="1" fill="#6B6B8A" opacity="0.4" />
          <rect x="10" y="109" width="88" height="2" rx="1" fill="#6B6B8A" opacity="0.4" />
          <rect x="10" y="113" width="92" height="2" rx="1" fill="#6B6B8A" opacity="0.4" />
        </svg>
      );

    case 'creative':
      return (
        // Dark sidebar + bold rose accent bar
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Dark sidebar */}
          <rect width="38" height="160" fill="#1C1C1E" />
          {/* Sidebar avatar circle */}
          <circle cx="19" cy="28" r="12" fill="#E85D75" opacity="0.3" />
          <circle cx="19" cy="28" r="8" fill="#E85D75" opacity="0.5" />
          {/* Sidebar name */}
          <rect x="6" y="44" width="26" height="4" rx="1" fill="#F9FAFB" opacity="0.8" />
          <rect x="8" y="51" width="22" height="3" rx="1" fill="#E85D75" opacity="0.7" />
          {/* Sidebar skill pills */}
          <rect x="4" y="62" width="30" height="2.5" rx="1" fill="#E85D75" opacity="0.5" />
          <rect x="4" y="67" width="14" height="6" rx="3" fill="none" stroke="#E85D75" strokeWidth="0.5" opacity="0.8" />
          <rect x="20" y="67" width="12" height="6" rx="3" fill="none" stroke="#E85D75" strokeWidth="0.5" opacity="0.8" />
          <rect x="4" y="76" width="18" height="6" rx="3" fill="none" stroke="#E85D75" strokeWidth="0.5" opacity="0.8" />
          <rect x="4" y="90" width="30" height="2.5" rx="1" fill="#E85D75" opacity="0.5" />
          <rect x="4" y="95" width="30" height="2.5" rx="1" fill="#F9FAFB" opacity="0.3" />
          <rect x="4" y="100" width="24" height="2.5" rx="1" fill="#F9FAFB" opacity="0.3" />
          {/* Main area */}
          {/* Accent bar header */}
          <rect x="38" y="0" width="5" height="45" fill="#E85D75" />
          <rect x="48" y="10" width="60" height="8" rx="1" fill="#1C1C1E" opacity="0.85" />
          <rect x="48" y="22" width="40" height="5" rx="1" fill="#E85D75" opacity="0.7" />
          {/* Section label */}
          <rect x="43" y="50" width="15" height="3" rx="1" fill="#E85D75" opacity="0.6" />
          <rect x="60" y="51" width="55" height="1" fill="#E85D75" opacity="0.2" />
          {/* Entries */}
          <rect x="43" y="57" width="55" height="3.5" rx="1" fill="#1C1C1E" opacity="0.7" />
          <rect x="43" y="63" width="30" height="3" rx="2" fill="#FDEDF0" />
          <rect x="43" y="69" width="70" height="2" rx="1" fill="#6B7280" opacity="0.4" />
          <rect x="43" y="73" width="62" height="2" rx="1" fill="#6B7280" opacity="0.4" />
          <rect x="43" y="82" width="55" height="3.5" rx="1" fill="#1C1C1E" opacity="0.7" />
          <rect x="43" y="88" width="30" height="3" rx="2" fill="#FDEDF0" />
          <rect x="43" y="94" width="70" height="2" rx="1" fill="#6B7280" opacity="0.4" />
          <rect x="43" y="98" width="58" height="2" rx="1" fill="#6B7280" opacity="0.4" />
        </svg>
      );

    case 'consulting':
      return (
        // Corporate blue header, mission entries with left border
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Header band */}
          <rect width="120" height="36" rx="3" fill="#023E8A" />
          <rect x="8" y="8" width="55" height="7" rx="1" fill="#fff" opacity="0.9" />
          <rect x="8" y="19" width="35" height="4" rx="1" fill="#0096C7" opacity="0.8" />
          {/* Availability badge */}
          <rect x="80" y="13" width="32" height="12" rx="3" fill="#16A34A" />
          <rect x="83" y="16" width="26" height="3" rx="1" fill="#fff" opacity="0.9" />
          {/* Competency tags */}
          <rect x="8" y="43" width="25" height="7" rx="2" fill="#EFF6FF" stroke="#0096C7" strokeWidth="0.5" />
          <rect x="36" y="43" width="22" height="7" rx="2" fill="#EFF6FF" stroke="#0096C7" strokeWidth="0.5" />
          <rect x="61" y="43" width="28" height="7" rx="2" fill="#EFF6FF" stroke="#0096C7" strokeWidth="0.5" />
          {/* Section band */}
          <rect x="8" y="56" width="104" height="11" rx="2" fill="#023E8A" />
          <rect x="13" y="59" width="60" height="4" rx="1" fill="#fff" opacity="0.85" />
          {/* Mission entry 1 with left border */}
          <rect x="8" y="72" width="3" height="26" rx="1" fill="#0096C7" />
          <rect x="14" y="72" width="55" height="4" rx="1" fill="#023E8A" opacity="0.8" />
          <rect x="14" y="78" width="35" height="3" rx="1" fill="#0096C7" opacity="0.6" />
          <rect x="14" y="84" width="90" height="2" rx="1" fill="#9CA3AF" opacity="0.5" />
          <rect x="14" y="88" width="80" height="2" rx="1" fill="#9CA3AF" opacity="0.5" />
          <rect x="14" y="92" width="85" height="2" rx="1" fill="#9CA3AF" opacity="0.5" />
          {/* Mission entry 2 */}
          <rect x="8" y="103" width="3" height="26" rx="1" fill="#0096C7" />
          <rect x="14" y="103" width="50" height="4" rx="1" fill="#023E8A" opacity="0.8" />
          <rect x="14" y="109" width="30" height="3" rx="1" fill="#0096C7" opacity="0.6" />
          <rect x="14" y="115" width="90" height="2" rx="1" fill="#9CA3AF" opacity="0.5" />
          <rect x="14" y="119" width="75" height="2" rx="1" fill="#9CA3AF" opacity="0.5" />
          <rect x="14" y="123" width="82" height="2" rx="1" fill="#9CA3AF" opacity="0.5" />
        </svg>
      );

    case 'academic':
      return (
        // Classic ruled, publication entries with green accent
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Top ruled bar */}
          <rect x="0" y="0" width="120" height="4" fill="#1E3A5F" />
          {/* Name */}
          <rect x="8" y="10" width="65" height="7" rx="1" fill="#1E3A5F" opacity="0.85" />
          {/* Title */}
          <rect x="8" y="20" width="45" height="4.5" rx="1" fill="#2E7D32" opacity="0.7" />
          {/* Rule */}
          <rect x="8" y="29" width="104" height="1.5" fill="#1E3A5F" />
          {/* Research interest tags */}
          <rect x="8" y="35" width="28" height="7" rx="3.5" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="0.5" />
          <rect x="39" y="35" width="22" height="7" rx="3.5" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="0.5" />
          <rect x="64" y="35" width="32" height="7" rx="3.5" fill="#C8E6C9" stroke="#2E7D32" strokeWidth="0.5" />
          {/* Section */}
          <rect x="8" y="48" width="50" height="3" rx="1" fill="#1E3A5F" opacity="0.8" />
          <rect x="62" y="50" width="50" height="1" fill="#90A4AE" opacity="0.6" />
          {/* Experience */}
          <rect x="8" y="55" width="55" height="3.5" rx="1" fill="#1E3A5F" opacity="0.75" />
          <rect x="8" y="61" width="35" height="2.5" rx="1" fill="#546E7A" opacity="0.5" />
          <rect x="8" y="66" width="95" height="2" rx="1" fill="#B0BEC5" opacity="0.5" />
          <rect x="8" y="70" width="88" height="2" rx="1" fill="#B0BEC5" opacity="0.5" />
          {/* Publications section */}
          <rect x="8" y="79" width="45" height="3" rx="1" fill="#1E3A5F" opacity="0.8" />
          <rect x="57" y="81" width="55" height="1" fill="#90A4AE" opacity="0.6" />
          {/* Publication entry — green left border */}
          <rect x="8" y="86" width="2" height="16" rx="1" fill="#2E7D32" />
          <rect x="13" y="86" width="70" height="3.5" rx="1" fill="#1E3A5F" opacity="0.75" />
          <rect x="13" y="92" width="90" height="2.5" rx="1" fill="#546E7A" opacity="0.4" />
          <rect x="13" y="97" width="75" height="2" rx="1" fill="#546E7A" opacity="0.3" />
          {/* Grant entry */}
          <rect x="8" y="108" width="3" height="3" rx="1" fill="#2E7D32" opacity="0.7" />
          <rect x="14" y="108" width="60" height="3.5" rx="1" fill="#1E3A5F" opacity="0.75" />
          <rect x="90" y="107" width="22" height="6" rx="3" fill="#C8E6C9" />
          <rect x="14" y="114" width="40" height="2" rx="1" fill="#546E7A" opacity="0.4" />
        </svg>
      );

    default:
      // Generic / default template
      return (
        <svg viewBox="0 0 120 160" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Simple header */}
          <rect x="8" y="10" width="60" height="7" rx="1" fill="#14A4E6" opacity="0.8" />
          <rect x="8" y="20" width="40" height="4" rx="1" fill="#757575" opacity="0.5" />
          <rect x="8" y="28" width="104" height="1" fill="#14A4E6" opacity="0.3" />
          {/* Section */}
          <rect x="8" y="36" width="50" height="3.5" rx="1" fill="#14A4E6" opacity="0.6" />
          <rect x="60" y="38" width="52" height="1" fill="#757575" opacity="0.3" />
          {/* Skills table */}
          <rect x="8" y="45" width="30" height="3" rx="1" fill="#333" opacity="0.5" />
          <rect x="42" y="45" width="55" height="3" rx="1" fill="#9CA3AF" opacity="0.4" />
          <rect x="8" y="51" width="30" height="3" rx="1" fill="#333" opacity="0.5" />
          <rect x="42" y="51" width="45" height="3" rx="1" fill="#9CA3AF" opacity="0.4" />
          <rect x="8" y="57" width="30" height="3" rx="1" fill="#333" opacity="0.5" />
          <rect x="42" y="57" width="50" height="3" rx="1" fill="#9CA3AF" opacity="0.4" />
          {/* Experience section */}
          <rect x="8" y="68" width="65" height="3.5" rx="1" fill="#14A4E6" opacity="0.6" />
          <rect x="75" y="70" width="37" height="1" fill="#757575" opacity="0.3" />
          <rect x="8" y="76" width="55" height="4" rx="1" fill="#333" opacity="0.7" />
          <rect x="8" y="83" width="95" height="2" rx="1" fill="#9CA3AF" opacity="0.4" />
          <rect x="8" y="87" width="88" height="2" rx="1" fill="#9CA3AF" opacity="0.4" />
          <rect x="8" y="91" width="80" height="2" rx="1" fill="#9CA3AF" opacity="0.4" />
          <rect x="8" y="100" width="50" height="4" rx="1" fill="#333" opacity="0.7" />
          <rect x="8" y="107" width="95" height="2" rx="1" fill="#9CA3AF" opacity="0.4" />
          <rect x="8" y="111" width="70" height="2" rx="1" fill="#9CA3AF" opacity="0.4" />
        </svg>
      );
  }
};

// ── Label display name ─────────────────────────────────────────────────────────
const TEMPLATE_LABELS: Record<string, string> = {
  default:    'Default',
  tech:       'Tech',
  executive:  'Executive',
  creative:   'Creative',
  consulting: 'Consulting',
  academic:   'Academic',
  mycompany:  'Company',
  keyteo_full:'Company Full',
};

const getLabel = (name: string) =>
  TEMPLATE_LABELS[name] ?? name.charAt(0).toUpperCase() + name.slice(1);

// ── Main component ─────────────────────────────────────────────────────────────

const GenerateCVModal: React.FC<GenerateCVModalProps> = ({
  isOpen,
  onClose,
  collaboratorName,
  onGenerateCV,
  isGenerating,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [selectedTemplate, setSelectedTemplate] = useState('default');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  useEffect(() => {
    if (isOpen) fetchTemplates();
  }, [isOpen]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const response = await getTemplates();
      if (response.success && response.data) {
        setTemplates(response.data);
        if (response.data.length > 0) {
          const def =
            response.data.find((t: Template) => t.name === 'default') ||
            response.data[0];
          setSelectedTemplate(def.name);
        }
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    }
    setLoadingTemplates(false);
  };

  const handleGenerate = () => onGenerateCV(selectedLanguage, selectedTemplate);

  const handleClose = () => {
    if (!isGenerating) onClose();
  };

  if (!isOpen || !collaboratorName) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <h3 className="text-lg font-semibold text-foreground">
            Generate CV
            <span className="ml-2 text-primary font-normal">— {collaboratorName}</span>
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a template and language, then export as PDF.
          </p>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Language selector */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Language
            </label>
            <div className="flex gap-2">
              {[
                { value: 'en', label: '🇬🇧  English' },
                { value: 'fr', label: '🇫🇷  Français' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setSelectedLanguage(value)}
                  disabled={isGenerating}
                  className={`
                    flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors
                    ${selectedLanguage === value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Template grid */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">
              Template
            </label>

            {loadingTemplates ? (
              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="rounded-lg border border-border bg-muted animate-pulse aspect-[3/4]" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {templates.map((template) => {
                  const isSelected = selectedTemplate === template.name;
                  return (
                    <button
                      key={template.name}
                      onClick={() => !isGenerating && setSelectedTemplate(template.name)}
                      disabled={isGenerating}
                      title={template.description}
                      className={`
                        group flex flex-col rounded-lg border-2 overflow-hidden text-left
                        transition-all duration-150 focus:outline-none
                        disabled:cursor-not-allowed
                        ${isSelected
                          ? 'border-primary shadow-md shadow-primary/20 scale-[1.02]'
                          : 'border-border hover:border-primary/50 hover:shadow-sm'
                        }
                      `}
                    >
                      {/* Thumbnail area */}
                      <div
                        className={`
                          relative w-full aspect-[3/4] bg-white overflow-hidden
                          ${isSelected ? '' : 'opacity-90 group-hover:opacity-100'}
                        `}
                      >
                        <TemplateThumbnail name={template.name} />

                        {/* Selected checkmark */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow">
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </div>

                      {/* Name label */}
                      <div
                        className={`
                          px-2 py-1.5 text-center text-xs font-semibold truncate w-full
                          ${isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground group-hover:text-foreground'
                          }
                        `}
                      >
                        {getLabel(template.name)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Selected template description */}
            {!loadingTemplates && selectedTemplate && (() => {
              const t = templates.find(t => t.name === selectedTemplate);
              return t ? (
                <p className="mt-3 text-xs text-muted-foreground italic">
                  <span className="font-medium text-foreground not-italic">{getLabel(t.name)}:</span>{' '}
                  {t.description}
                </p>
              ) : null;
            })()}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3 shrink-0">
          <button
            onClick={handleClose}
            disabled={isGenerating}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={isGenerating || loadingTemplates}
            className="px-5 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Generating…
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17a4 4 0 004 4h10a4 4 0 000-8h-1a5 5 0 00-9.9-1M3 17H2" />
                </svg>
                Generate PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GenerateCVModal;
