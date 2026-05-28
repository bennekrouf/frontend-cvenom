// src/components/editor/PreferencesModal.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FiX, FiSettings, FiLoader, FiMail } from 'react-icons/fi';
import { getPreferences, updatePreferences, EmailPreferences } from '@/lib/api';
import { useTranslations } from 'next-intl';

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EmailToggle {
  key: keyof EmailPreferences;
  labelKey: string;
  descKey: string;
}

const EMAIL_TOGGLES: EmailToggle[] = [
  { key: 'cv_ready',           labelKey: 'emailCvReady',           descKey: 'emailCvReadyDesc' },
  { key: 'portfolio_ready',    labelKey: 'emailPortfolioReady',    descKey: 'emailPortfolioReadyDesc' },
  { key: 'cover_letter_ready', labelKey: 'emailCoverLetterReady',  descKey: 'emailCoverLetterReadyDesc' },
  { key: 'cv_imported',        labelKey: 'emailCvImported',        descKey: 'emailCvImportedDesc' },
  { key: 'translation_ready',  labelKey: 'emailTranslationReady',  descKey: 'emailTranslationReadyDesc' },
  { key: 'ats_results',        labelKey: 'emailAtsResults',        descKey: 'emailAtsResultsDesc' },
  { key: 'nudge',              labelKey: 'emailNudge',             descKey: 'emailNudgeDesc' },
  { key: 'win_back',           labelKey: 'emailWinBack',           descKey: 'emailWinBackDesc' },
  { key: 'new_template',       labelKey: 'emailNewTemplate',       descKey: 'emailNewTemplateDesc' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Francais' },
];

const PreferencesModal: React.FC<PreferencesModalProps> = ({ isOpen, onClose }) => {
  const t = useTranslations('preferences');

  const [emailPrefs, setEmailPrefs] = useState<EmailPreferences>({});
  const [preferredLang, setPreferredLang] = useState('en');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPreferences();
      setEmailPrefs(data.email_prefs ?? {});
      setPreferredLang(data.preferred_lang ?? 'en');
    } catch {
      // defaults are fine
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadPrefs();
  }, [isOpen, loadPrefs]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEnabled = (key: keyof EmailPreferences) => emailPrefs[key] !== false;

  const toggle = (key: keyof EmailPreferences) => {
    setEmailPrefs((prev) => ({ ...prev, [key]: !isEnabled(key) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePreferences({ email_prefs: emailPrefs, preferred_lang: preferredLang });
      onClose();
    } catch {
      // stay open on error
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FiSettings className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">{t('title')}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-secondary rounded-md transition-colors text-muted-foreground hover:text-foreground"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <FiLoader className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Language preference */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">{t('emailLanguage')}</label>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => setPreferredLang(lang.code)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                      preferredLang === lang.code
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-background border-border text-foreground hover:bg-secondary'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Email toggles */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FiMail className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-foreground">{t('emailNotifications')}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-4">{t('emailNotificationsDesc')}</p>

              <div className="space-y-3">
                {EMAIL_TOGGLES.map(({ key, labelKey, descKey }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isEnabled(key)}
                      onChange={() => toggle(key)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-blue-500 focus:ring-blue-500/30 cursor-pointer"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-medium text-foreground group-hover:text-blue-500 transition-colors">
                        {t(labelKey)}
                      </span>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(descKey)}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        {!loading && (
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium bg-secondary text-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {saving ? (
                <><FiLoader className="w-4 h-4 animate-spin" /> {t('saving')}</>
              ) : (
                t('save')
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default PreferencesModal;
