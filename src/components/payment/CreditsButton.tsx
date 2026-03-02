'use client';
// src/components/payment/CreditsButton.tsx
//
// A small button shown in the Navbar when the user is authenticated.
// Clicking it opens a modal overlay containing the StripePaymentForm.

import React, { useState, useEffect, useRef } from 'react';
import { FiZap } from 'react-icons/fi';
import { useAuth } from '@/contexts/AuthContext';
import StripePaymentForm from './StripePaymentForm';

const CreditsButton: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!isAuthenticated) return null;

  const handleSuccess = (creditsAdded: number, _newBalance: number) => {
    // The success step inside StripePaymentForm handles the UI.
    // We could show a toast here if a toast library were available.
    console.info(`[cvenom] ${creditsAdded} credits added to account`);
  };

  return (
    <>
      {/* Trigger button in Navbar */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-secondary"
        aria-label="Add credits"
      >
        <FiZap className="h-3.5 w-3.5 text-primary" />
        <span className="hidden sm:inline">Credits</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            // Close if click is on the backdrop (not inside the card)
            if (e.target === overlayRef.current) setOpen(false);
          }}
        >
          <StripePaymentForm
            onSuccess={handleSuccess}
            onClose={() => setOpen(false)}
          />
        </div>
      )}
    </>
  );
};

export default CreditsButton;
