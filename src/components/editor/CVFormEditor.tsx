'use client';

import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from 'react';
import { FiCheck, FiLoader, FiAlertCircle } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { getCvData, saveCvData } from '@/lib/cvDataService';
import { emptyCvFormData } from '@/types/cvFormData';
import type { CvFormData } from '@/types/cvFormData';

import { PersonalSection } from './form/PersonalSection';
import { LinksSection } from './form/LinksSection';
import { WorkExperienceSection } from './form/WorkExperienceSection';
import { EducationSection } from './form/EducationSection';
import { SkillsSection } from './form/SkillsSection';
import { LanguagesSection } from './form/LanguagesSection';
import { StylingSection } from './form/StylingSection';

// ── Types ─────────────────────────────────────────────────────────────────────

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface Props {
  profileName: string;
  language?: string;
  availableLanguages?: string[];
  onLanguageChange?: (lang: string) => void;
}

export interface CVFormEditorHandle {
  /** Flush any pending auto-save immediately. Returns a promise that resolves when done. */
  saveNow: () => Promise<void>;
}

// ── Component ─────────────────────────────────────────────────────────────────

const CVFormEditor = forwardRef<CVFormEditorHandle, Props>(({ profileName, language = 'en', availableLanguages = [], onLanguageChange }, ref) => {
  const t = useTranslations('cvForm');
  const [data, setData] = useState<CvFormData>(emptyCvFormData());
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<CvFormData | null>(null);

  // ── Load data on mount / profile change ──────────────────────────────────

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setLoadError(null);
      setSaveStatus('idle');

      try {
        const fetched = await getCvData(profileName, language);
        if (!cancelled) {
          setData(fetched);
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : 'Failed to load CV data');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [profileName, language]);

  // ── Persist helper ────────────────────────────────────────────────────────

  const persist = useCallback(async (payload: CvFormData) => {
    setSaveStatus('saving');
    try {
      await saveCvData(profileName, payload, language);
      setSaveStatus('saved');
      // Reset to idle after 2 s so the "Saved" pill fades away
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (err) {
      console.error('CV auto-save failed:', err);
      setSaveStatus('error');
    }
    pendingDataRef.current = null;
  }, [profileName, language]);

  // ── Exposed imperative handle ─────────────────────────────────────────────

  useImperativeHandle(ref, () => ({
    saveNow: async () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      const payload = pendingDataRef.current ?? data;
      await persist(payload);
    },
  }), [data, persist]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  // ── Change handler ────────────────────────────────────────────────────────

  const handleChange = useCallback((updated: CvFormData) => {
    setData(updated);
    pendingDataRef.current = updated;
    setSaveStatus('pending');

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      persist(updated);
    }, 2000);
  }, [persist]);

  // ── Section-level change helpers ──────────────────────────────────────────

  const update = useCallback(<K extends keyof CvFormData>(key: K, value: CvFormData[K]) => {
    handleChange({ ...data, [key]: value });
  }, [data, handleChange]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">{t('loadingCvData')}</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground max-w-sm text-center">
          <FiAlertCircle className="w-10 h-10 text-red-400" />
          <p className="font-medium text-foreground">{t('failedToLoadCv')}</p>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {/* Save-status pill — only renders when there's something to show */}
      {saveStatus !== 'idle' && (
        <div className="sticky top-0 z-10 flex items-center justify-end px-6 py-2 bg-background/80 backdrop-blur border-b border-border">
          <SavePill status={saveStatus} />
        </div>
      )}

      {/* Form sections */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <PersonalSection
          data={data.personal}
          onChange={(v) => update('personal', v)}
        />
        <LinksSection
          data={data.links}
          onChange={(v) => update('links', v)}
        />
        <WorkExperienceSection
          data={data.work_experience}
          onChange={(v) => update('work_experience', v)}
          availableLanguages={availableLanguages}
          selectedLanguage={language}
          onLanguageChange={onLanguageChange}
        />
        <EducationSection
          data={data.education}
          onChange={(v) => update('education', v)}
        />
        <SkillsSection
          data={data.skills}
          onChange={(v) => update('skills', v)}
        />
        <LanguagesSection
          data={data.languages}
          onChange={(v) => update('languages', v)}
        />
        <StylingSection
          data={data.styling}
          onChange={(v) => update('styling', v)}
        />
      </div>
    </div>
  );
});

CVFormEditor.displayName = 'CVFormEditor';

export default CVFormEditor;

// ── Save status pill ──────────────────────────────────────────────────────────

const SavePill: React.FC<{ status: SaveStatus }> = ({ status }) => {
  const t = useTranslations('cvForm');
  if (status === 'idle') return null;

  const configs: Record<Exclude<SaveStatus, 'idle'>, { label: string; cls: string; icon: React.ReactNode }> = {
    pending: {
      label: t('statusUnsaved'),
      cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
      icon: <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />,
    },
    saving: {
      label: t('statusSaving'),
      cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      icon: <FiLoader className="w-3 h-3 animate-spin" />,
    },
    saved: {
      label: t('statusSaved'),
      cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      icon: <FiCheck className="w-3 h-3" />,
    },
    error: {
      label: t('statusSaveFailed'),
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      icon: <FiAlertCircle className="w-3 h-3" />,
    },
  };

  const { label, cls, icon } = configs[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {icon}
      {label}
    </span>
  );
};
