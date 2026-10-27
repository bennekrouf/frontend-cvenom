'use client';
// src/components/payment/CreditsPage.tsx
//
// /[locale]/credits — the user's credit balance and full transaction history.
// The balance shows how much of it is the user's mayorana plan, and the plan
// itself (PlanStatus) when they have one. "Get credits"
// opens the plans and top-up panel in place; a successful top-up refreshes the
// page data and tells the navbar balance to refresh (CREDITS_UPDATED_EVENT).
// The page reloads when its tab comes back into view, so credits bought on
// mayorana.ch show up on return (?subscribed=1 is where mayorana sends them).
// When credits come only from the plan (per-person billing), the balance is
// the plan's credits left this month and the button opens the plans, not a top-up.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiZap, FiArrowDownRight, FiArrowUpRight, FiClock, FiLoader, FiAlertTriangle, FiUser, FiCheck } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import {
  getCredits,
  getTransactions,
  CreditTransaction,
  MAX_TRANSACTIONS,
  CREDITS_UPDATED_EVENT,
  MAYORANA_PRICING_URL,
  PlanSummary,
} from '@/lib/paymentService';
import GetCreditsPanel from './GetCreditsPanel';
import PlanStatus from './PlanStatus';

type Filter = 'all' | 'used' | 'added';

const REFUND_SUFFIX = '_refund';

const CreditsPage: React.FC = () => {
  const t = useTranslations('creditsPage');
  const locale = useLocale();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const searchParams = useSearchParams();
  const justSubscribed = searchParams.get('subscribed') === '1';

  const [balance, setBalance] = useState<number | null>(null);
  const [planCreditsLeft, setPlanCreditsLeft] = useState(0);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [planOnly, setPlanOnly] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [showTopUp, setShowTopUp] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [credits, txs] = await Promise.all([getCredits(), getTransactions(MAX_TRANSACTIONS)]);
      setBalance(credits.balance);
      setPlanCreditsLeft(credits.planCreditsLeft);
      setPlan(credits.plan);
      setPlanOnly(credits.planOnly);
      setTransactions(
        [...txs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) load();
  }, [isAuthenticated, load]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [isAuthenticated, load]);

  const totals = useMemo(() => {
    let used = 0;
    let added = 0;
    for (const tx of transactions) {
      if (tx.amount < 0) used += -tx.amount;
      else added += tx.amount;
    }
    return { used, added };
  }, [transactions]);

  const visible = useMemo(() => {
    if (filter === 'used') return transactions.filter((tx) => tx.amount < 0);
    if (filter === 'added') return transactions.filter((tx) => tx.amount > 0);
    return transactions;
  }, [transactions, filter]);

  const actionLabel = (type: string): string => {
    const isRefund = type.endsWith(REFUND_SUFFIX);
    const base = isRefund ? type.slice(0, -REFUND_SUFFIX.length) : type;
    const label = t.has(`actions.${base}`) ? t(`actions.${base}`) : base;
    return isRefund ? `${label} (${t('refundSuffix')})` : label;
  };

  const formatDate = (iso: string): string =>
    new Date(iso).toLocaleString(locale, {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

  const formatNumber = (n: number): string => n.toLocaleString(locale);

  const handleTopUpSuccess = (_creditsAdded: number, newBalance: number) => {
    setBalance(newBalance);
    window.dispatchEvent(new Event(CREDITS_UPDATED_EVENT));
    load();
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    await signInWithGoogle();
    setIsSigningIn(false);
  };

  // ── Signed out ──────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <FiLoader className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container max-w-md py-24 text-center">
        <div className="mx-auto mb-4 w-fit rounded-full bg-primary/10 p-3">
          <FiZap className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mb-6 text-xl font-semibold text-foreground">{t('signInTitle')}</h1>
        <button
          onClick={handleSignIn}
          disabled={isSigningIn}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {isSigningIn ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiUser className="h-4 w-4" />}
          {t('signInButton')}
        </button>
      </div>
    );
  }

  // ── Signed in ───────────────────────────────────────────────────────────────

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('filterAll') },
    { key: 'used', label: t('filterUsed') },
    { key: 'added', label: t('filterAdded') },
  ];

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t(planOnly ? 'subtitlePlanOnly' : 'subtitle')}</p>
        </div>
        <button
          onClick={() => setShowTopUp((v) => !v)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <FiZap className="h-4 w-4" />
          {t(planOnly ? 'changePlan' : 'addCredits')}
        </button>
      </div>

      {justSubscribed && (
        <div className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300">
          <FiCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{plan || planCreditsLeft > 0 ? t('subscribedReady') : t('subscribedPending')}</span>
        </div>
      )}

      {showTopUp && (
        <div className="mx-auto flex max-w-md justify-center">
          <GetCreditsPanel onTopUpSuccess={handleTopUpSuccess} onClose={() => setShowTopUp(false)} />
        </div>
      )}

      {(plan || planCreditsLeft > 0) && !showTopUp && (
        <PlanStatus plan={plan} planCreditsLeft={planCreditsLeft} pricingUrl={MAYORANA_PRICING_URL} planOnly={planOnly} />
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t(planOnly ? 'planBalanceLabel' : 'balanceLabel')}</p>
          <p className="mt-1 flex items-center gap-2 text-3xl font-bold tabular-nums text-foreground">
            <FiZap className="h-6 w-6 text-primary" />
            {balance === null ? '—' : formatNumber(balance)}
          </p>
          {!planOnly && planCreditsLeft > 0 && balance !== null && (
            <p className="mt-1 text-xs text-muted-foreground">
              {t('balanceSplit', {
                plan: formatNumber(planCreditsLeft),
                own: formatNumber(Math.max(balance - planCreditsLeft, 0)),
              })}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('usedLabel')}</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-red-500 dark:text-red-400">
            <FiArrowDownRight className="h-5 w-5" />
            {formatNumber(totals.used)}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('addedLabel')}</p>
          <p className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums text-green-600 dark:text-green-400">
            <FiArrowUpRight className="h-5 w-5" />
            {formatNumber(totals.added)}
          </p>
        </div>
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">{t('shownNote')}</p>

      {/* History */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="font-semibold text-foreground">{t('historyTitle')}</h2>
          <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
            {filters.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  filter === key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
            <FiLoader className="h-4 w-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
            <FiAlertTriangle className="h-6 w-6 text-amber-500" />
            <span>{t('loadError')}</span>
            <button
              onClick={load}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
            >
              {t('retry')}
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-sm text-muted-foreground">
            <FiClock className="h-6 w-6 opacity-40" />
            <span>{transactions.length === 0 ? t('empty') : t('emptyFiltered')}</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="hidden sm:table-header-group">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2 font-medium">{t('colDate')}</th>
                <th className="px-4 py-2 font-medium">{t('colAction')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('colAmount')}</th>
                <th className="px-4 py-2 text-right font-medium">{t('colBalance')}</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((tx) => (
                <tr key={tx.id} className="border-b border-border last:border-0">
                  <td className="hidden whitespace-nowrap px-4 py-3 text-xs text-muted-foreground sm:table-cell">
                    {formatDate(tx.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{actionLabel(tx.action_type)}</p>
                    {tx.description && (
                      <p className="text-xs text-muted-foreground">{tx.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground sm:hidden">{formatDate(tx.created_at)}</p>
                  </td>
                  <td
                    className={`whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums ${
                      tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
                    }`}
                  >
                    {tx.amount > 0 ? '+' : ''}{formatNumber(tx.amount)}
                    <p className="text-xs font-normal text-muted-foreground sm:hidden">
                      {formatNumber(tx.balance_after)}
                    </p>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-muted-foreground sm:table-cell">
                    {formatNumber(tx.balance_after)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {transactions.length >= MAX_TRANSACTIONS && (
        <p className="text-xs text-muted-foreground">{t('truncated', { count: MAX_TRANSACTIONS })}</p>
      )}
    </div>
  );
};

export default CreditsPage;
