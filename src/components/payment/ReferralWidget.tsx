'use client';
// src/components/payment/ReferralWidget.tsx
//
// "Refer a friend" panel shown inside the credits/payment modal.
// - Shows the user's referral URL with a copy button.
// - Shows stats: N friends joined · N credits earned.
// - Fetches from GET /referral/my-link.

import React, { useState, useEffect, useCallback } from 'react';
import { FiUsers, FiCopy, FiCheck, FiGift } from 'react-icons/fi';
import { getReferralLink, ReferralLinkResult } from '@/lib/paymentService';

interface ReferralWidgetProps {
  /** Compact mode = narrower for sidebars; full = wider card */
  compact?: boolean;
}

const ReferralWidget: React.FC<ReferralWidgetProps> = ({ compact = false }) => {
  const [data, setData] = useState<ReferralLinkResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await getReferralLink();
      setData(result);
    } catch {
      // silently ignore — user may have just signed up
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.referral_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for browsers without clipboard API
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse rounded-lg border border-border bg-muted/30 p-4">
        <div className="h-4 w-32 rounded bg-muted mb-2" />
        <div className="h-8 w-full rounded bg-muted" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={`rounded-lg border border-border bg-card ${compact ? 'p-4' : 'p-5'}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="rounded-full bg-primary/10 p-1.5">
          <FiGift className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Refer a friend</h3>
          <p className="text-xs text-muted-foreground">
            Earn 50 credits for each friend who signs up with your link
          </p>
        </div>
      </div>

      {/* Referral URL row */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 min-w-0 rounded-md border border-border bg-muted/40 px-3 py-1.5">
          <p className="truncate text-xs font-mono text-foreground">{data.referral_url}</p>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md border border-border bg-secondary px-3 py-1.5 text-xs font-medium transition-colors hover:bg-secondary/80 flex-shrink-0"
          aria-label="Copy referral link"
        >
          {copied ? (
            <>
              <FiCheck className="h-3.5 w-3.5 text-green-500" />
              <span className="text-green-600 dark:text-green-400">Copied</span>
            </>
          ) : (
            <>
              <FiCopy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <FiUsers className="h-3.5 w-3.5" />
          <span>
            <span className="font-semibold text-foreground">{data.total_referrals}</span>
            {' '}
            {data.total_referrals === 1 ? 'friend joined' : 'friends joined'}
          </span>
        </div>
        <div className="h-3 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>
            <span className="font-semibold text-foreground">{data.credits_earned}</span>
            {' credits earned'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReferralWidget;
