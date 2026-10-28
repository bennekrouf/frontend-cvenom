'use client';
// src/components/payment/CreditsButton.tsx
//
// Always-visible Credits button in the Navbar.
// - Authenticated   → opens the "Get credits" panel (plans, then top-up).
// - Unauthenticated → opens a lightweight "sign in first" prompt;
//                     after sign-in the panel opens automatically.
// It also opens when something asks for it (GET_CREDITS_EVENT: an operation
// that failed for lack of credits), and refreshes the balance whenever the tab
// comes back into view, e.g. after subscribing on mayorana.ch in another tab.
//
// Both modals are rendered via React Portal (attached to document.body)
// so they escape the Navbar's sticky/z-index stacking context and always
// paint above all page content.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiZap, FiUser, FiFileText, FiGlobe, FiGift, FiMail } from 'react-icons/fi';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import GetCreditsPanel from './GetCreditsPanel';
import ReferralWidget from './ReferralWidget';
import { getCredits, CREDITS_UPDATED_EVENT, GET_CREDITS_EVENT } from '@/lib/paymentService';

const CreditsButton: React.FC = () => {
  const t = useTranslations('credits');
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  // Per-person billing: credits come only from the plan, so no referral bonus to offer.
  const [planOnly, setPlanOnly] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);

  const fetchBalance = useCallback(async () => {
    try {
      const c = await getCredits();
      setBalance(c.balance);
      setPlanOnly(c.planOnly);
    } catch {
      // silently ignore — user may not be signed in yet
    }
  }, []);

  // Portal target is only available in the browser
  useEffect(() => { setMounted(true); }, []);

  // Fetch balance when authenticated
  useEffect(() => {
    if (isAuthenticated) fetchBalance();
    else setBalance(null);
  }, [isAuthenticated, fetchBalance]);

  // Refresh when credits change elsewhere (e.g. top-up on the /credits page)
  useEffect(() => {
    if (!isAuthenticated) return;
    window.addEventListener(CREDITS_UPDATED_EVENT, fetchBalance);
    return () => window.removeEventListener(CREDITS_UPDATED_EVENT, fetchBalance);
  }, [isAuthenticated, fetchBalance]);

  // Back from mayorana.ch (or anywhere): the plan may have just started.
  useEffect(() => {
    if (!isAuthenticated) return;
    const onVisible = () => { if (document.visibilityState === 'visible') fetchBalance(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, fetchBalance]);

  // Opened from elsewhere, e.g. an operation refused for lack of credits.
  useEffect(() => {
    const handler = (e: Event) => {
      // The navbar has one button for desktop and one for mobile; only the
      // one on screen answers, so the panel opens once.
      if (buttonRef.current?.offsetParent === null) return;
      setReason((e as CustomEvent<{ reason?: string }>).detail?.reason);
      if (isAuthenticated) {
        setOpen(true);
        fetchBalance();
      } else {
        setShowLoginPrompt(true);
      }
    };
    window.addEventListener(GET_CREDITS_EVENT, handler);
    return () => window.removeEventListener(GET_CREDITS_EVENT, handler);
  }, [isAuthenticated, fetchBalance]);

  // Close on Escape
  useEffect(() => {
    if (!open && !showLoginPrompt) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); setShowLoginPrompt(false); }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, showLoginPrompt]);

  // Prevent body scroll when any modal is open
  useEffect(() => {
    document.body.style.overflow = (open || showLoginPrompt) ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open, showLoginPrompt]);

  const handleButtonClick = () => {
    setReason(undefined);
    if (isAuthenticated) {
      setOpen(true);
    } else {
      setShowLoginPrompt(true);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    const result = await signInWithGoogle();
    setIsSigningIn(false);
    setShowLoginPrompt(false);
    if (!result.error) {
      // Signed in — open the payment modal immediately.
      setOpen(true);
    }
  };

  const handleSuccess = (creditsAdded: number, newBalance: number) => {
    console.info(`[cvenom] ${creditsAdded} credits added to account`);
    setBalance(newBalance);
    window.dispatchEvent(new Event(CREDITS_UPDATED_EVENT));
  };

  return (
    <>
      {/* Trigger button — always visible in Navbar */}
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
        aria-label={t('buttonAriaLabel')}
      >
        <FiZap className="h-3.5 w-3.5 text-primary" />
        {isAuthenticated && balance !== null ? (
          <span className="text-sm font-semibold tabular-nums">
            {balance.toLocaleString()}
          </span>
        ) : (
          <span className="hidden sm:inline">{t('buttonLabel')}</span>
        )}
      </button>

      {/* ── Portals: rendered on document.body, above all stacking contexts ── */}
      {mounted && showLoginPrompt && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (!promptRef.current?.contains(e.target as Node)) setShowLoginPrompt(false);
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              ref={promptRef}
              className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg"
            >
              <div className="mb-4 flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2.5">
                  <FiZap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{t('loginTitle')}</h3>
                  <p className="text-xs text-muted-foreground">{t('loginSubtitle')}</p>
                </div>
              </div>

              {/* Welcome bonus */}
              <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-3 py-2">
                <FiGift className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                  {t('welcomeBonusPrefix')}{' '}
                  <span className="font-bold">{t('welcomeBonusFree')}</span>{' '}
                  {t('welcomeBonusSuffix')}
                </p>
              </div>

              {/* What credits do */}
              <div className="mb-5 grid grid-cols-2 gap-2">
                {([
                  { icon: FiFileText, labelKey: 'actionExportPdf',   cost: 20 },
                  { icon: FiMail,     labelKey: 'actionCoverLetter', cost: 20 },
                  { icon: FiZap,      labelKey: 'actionOptimize',    cost: 5  },
                  { icon: FiGlobe,    labelKey: 'actionTranslate',   cost: 5  },
                ] as const).map(({ icon: Icon, labelKey, cost }) => (
                  <div key={labelKey} className="flex flex-col items-center gap-1 rounded-md border border-border bg-muted/40 p-2 text-center">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-medium text-foreground">{t(labelKey)}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {t('creditPlural', { count: cost })}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  {t('cancelButton')}
                </button>
                <button
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {isSigningIn ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : (
                    <FiUser className="h-4 w-4" />
                  )}
                  {isSigningIn ? t('signingIn') : t('signInButton')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (!paymentCardRef.current?.contains(e.target as Node)) setOpen(false);
          }}
        >
          <div className="flex min-h-full items-center justify-center p-4">
            <div ref={paymentCardRef} className="flex flex-col gap-4 w-full max-w-md">
              <GetCreditsPanel
                reason={reason}
                onTopUpSuccess={handleSuccess}
                onClose={() => setOpen(false)}
              />
              {!planOnly && <ReferralWidget />}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CreditsButton;
