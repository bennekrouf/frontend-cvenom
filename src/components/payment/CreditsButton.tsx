'use client';
// src/components/payment/CreditsButton.tsx
//
// Always-visible Credits button in the Navbar.
// - Authenticated   → opens the Stripe payment modal directly.
// - Unauthenticated → opens a lightweight "sign in first" prompt;
//                     after sign-in the payment modal opens automatically.
//
// Both modals are rendered via React Portal (attached to document.body)
// so they escape the Navbar's sticky/z-index stacking context and always
// paint above all page content.

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiZap, FiUser } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import StripePaymentForm from './StripePaymentForm';

const CreditsButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [mounted, setMounted] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);
  const paymentCardRef = useRef<HTMLDivElement>(null);

  // Portal target is only available in the browser
  useEffect(() => { setMounted(true); }, []);

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

  const handleSuccess = (creditsAdded: number, _newBalance: number) => {
    console.info(`[cvenom] ${creditsAdded} credits added to account`);
  };

  return (
    <>
      {/* Trigger button — always visible in Navbar */}
      <button
        onClick={handleButtonClick}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
        aria-label="Add credits"
      >
        <FiZap className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Credits</span>
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
                  <h3 className="font-semibold text-foreground">Buy Credits</h3>
                  <p className="text-xs text-muted-foreground">$1 = 100 credits · secure via Stripe</p>
                </div>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                Credits power AI features: CV generation, job matching, translation, and optimisation.
                Sign in with Google to continue.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowLoginPrompt(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
                >
                  Cancel
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
                  {isSigningIn ? 'Signing in…' : 'Sign In with Google'}
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
            <div ref={paymentCardRef}>
              <StripePaymentForm
                onSuccess={handleSuccess}
                onClose={() => setOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default CreditsButton;
