'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { checkFeedbackEligible, submitFeedback } from '@/lib/api';
import { toast } from 'sonner';

const LS_KEY = 'cvenom_feedback_last';
const LS_OPTOUT = 'cvenom_feedback_optout';

const safeReadLS = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const safeWriteLS = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private mode / quota exceeded — silently ignore
  }
};

const SATISFACTION_LABELS = [
  'Very dissatisfied',
  'Dissatisfied',
  'Neutral',
  'Satisfied',
  'Very satisfied',
];

const SATISFACTION_EMOJIS = ['\u{1F621}', '\u{1F61E}', '\u{1F610}', '\u{1F60A}', '\u{1F929}'];

type View = 'feedback' | 'optout' | 'confirm-short';

export default function FeedbackPopup() {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>('feedback');
  const [score, setScore] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [contactOk, setContactOk] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (safeReadLS(LS_OPTOUT) === 'true') return;
      const last = safeReadLS(LS_KEY);
      const today = new Date().toISOString().slice(0, 10);
      if (last === today) return;

      try {
        const { eligible } = await checkFeedbackEligible();
        if (eligible) {
          setView('feedback'); // reset to main form in case a prior session ended on a sub-view
          setOpen(true);
        }
      } catch {
        // not logged in or network error — skip silently
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const dismissToday = useCallback(() => {
    safeWriteLS(LS_KEY, new Date().toISOString().slice(0, 10));
    setOpen(false);
  }, []);

  const handleClose = useCallback(() => {
    // Show opt-out confirmation instead of closing immediately
    setView('optout');
  }, []);

  const handleOptOut = useCallback(() => {
    safeWriteLS(LS_OPTOUT, 'true');
    setOpen(false);
  }, []);

  const handleOptOutClose = useCallback(() => {
    // User chose "Close" on opt-out screen → just dismiss for today
    dismissToday();
  }, [dismissToday]);

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await submitFeedback({
        score: score!,
        reason: reason.slice(0, 500),
        contact_ok: contactOk,
      });
      toast.success(res.message);
      dismissToday();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  }, [score, reason, contactOk, dismissToday]);

  const handleSubmit = useCallback(async () => {
    if (score === null) {
      toast.error('Please select a satisfaction level.');
      return;
    }
    const wc = reason.trim().split(/\s+/).filter(Boolean).length;
    if (wc < 10) {
      // Show confirmation instead of submitting directly
      setView('confirm-short');
      return;
    }
    doSubmit();
  }, [score, reason, doSubmit]);

  if (!open) return null;

  const wordCount = reason.trim().split(/\s+/).filter(Boolean).length;
  const qualifies = wordCount >= 10;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      {view === 'feedback' ? (
        <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white">
            <h2 className="text-lg font-semibold">Give feedback to CVenom</h2>
            <p className="text-sm text-white/80 mt-0.5">
              Earn <span className="font-bold text-yellow-300">+10 credits</span> for detailed feedback (10+ words)
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Satisfaction scale */}
            <div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">
                How satisfied or dissatisfied are you with CVenom?
              </p>
              <div className="flex justify-between gap-1">
                {SATISFACTION_LABELS.map((label, i) => {
                  const val = i + 1;
                  const selected = score === val;
                  return (
                    <button
                      key={val}
                      onClick={() => setScore(val)}
                      className={`flex-1 flex flex-col items-center gap-1 rounded-xl py-3 px-1 border-2 transition-all text-xs
                        ${selected
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 scale-105'
                          : 'border-zinc-200 dark:border-zinc-700 hover:border-indigo-300'
                        }`}
                    >
                      <span className="text-2xl">{SATISFACTION_EMOJIS[i]}</span>
                      <span className={`leading-tight text-center ${selected ? 'font-semibold text-indigo-700 dark:text-indigo-300' : 'text-zinc-500 dark:text-zinc-400'}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1.5">
                What were the reasons for giving the score above?
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Tell us what you liked or what we can improve..."
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-zinc-50 dark:bg-zinc-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex justify-between mt-1 text-xs text-zinc-400">
                <span>
                  {wordCount} word{wordCount !== 1 ? 's' : ''}
                  {!qualifies && wordCount > 0 && (
                    <span className="text-amber-500 ml-1">
                      ({10 - wordCount} more for +10 credits)
                    </span>
                  )}
                  {qualifies && (
                    <span className="text-emerald-500 ml-1">
                      You qualify for +10 credits!
                    </span>
                  )}
                </span>
                <span>{reason.length}/500</span>
              </div>
            </div>

            {/* Contact checkbox */}
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={contactOk}
                onChange={(e) => setContactOk(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                It is OK to contact me about my feedback
              </span>
            </label>

            {/* Privacy note */}
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-snug">
              By pressing submit, you agree that your feedback will be used to improve CVenom products and services.
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              Close
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || score === null}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>
      ) : view === 'confirm-short' ? (
        /* Not enough words — let user go back or submit anyway */
        <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 overflow-hidden">
          <div className="px-6 py-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              Almost there!
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Your feedback has only{' '}
              <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                {reason.trim().split(/\s+/).filter(Boolean).length}
              </span>{' '}
              words. Write at least <span className="font-semibold text-indigo-500">10 words</span> to
              earn <span className="font-semibold text-yellow-500">+10 credits</span>.
            </p>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <button
              onClick={doSubmit}
              disabled={submitting}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              {submitting ? 'Submitting...' : 'Submit anyway'}
            </button>
            <button
              onClick={() => setView('feedback')}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition"
            >
              Add more words
            </button>
          </div>
        </div>
      ) : (
        /* Opt-out confirmation */
        <div className="relative w-full max-w-sm mx-4 rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 overflow-hidden">
          <div className="px-6 py-6 space-y-4">
            <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              Stop seeing this survey again?
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Select opt-out if you prefer not to see this survey again in the future.
            </p>
          </div>
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50">
            <button
              onClick={handleOptOutClose}
              className="px-4 py-2 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
            >
              Close
            </button>
            <button
              onClick={handleOptOut}
              className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 transition"
            >
              Opt out
            </button>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}
