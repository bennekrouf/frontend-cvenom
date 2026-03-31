'use client';
// src/components/payment/StripePaymentForm.tsx
//
// Two-step Stripe payment form for cvenom.
//   Step 1 – amount + currency selection (quick buttons + custom input)
//   Step 2 – Stripe Elements payment form
//
// Currency is auto-detected from the browser timezone (e.g. Europe/Zurich → CHF).
// The user can override it with the currency picker.
//
// Credit rate: 1 whole unit of any supported currency = 100 credits.
//   CHF 10 = $10 = €10 = £10 = 1 000 credits.

import React, { useState, useCallback, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import {
  FiArrowLeft,
  FiLoader,
  FiCreditCard,
  FiDollarSign,
  FiCheckCircle,
  FiAlertTriangle,
  FiFileText,
  FiGlobe,
  FiZap,
  FiMail,
  FiChevronDown,
  FiClock,
} from 'react-icons/fi';
import { createPaymentIntent, confirmPayment, getTransactions, CreditTransaction } from '@/lib/paymentService';
import { useTranslations } from 'next-intl';
import {
  detectCurrency,
  formatAmount,
  SUPPORTED_CURRENCIES,
  type Currency,
} from '@/lib/currencyUtils';

// Stripe promise is created lazily once we have the publishable key.
let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

// ── Dark-mode detection hook ──────────────────────────────────────────────────

function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDark;
}

// ── Credit actions reference ──────────────────────────────────────────────────

const CREDIT_ACTIONS = [
  { icon: FiFileText, labelKey: 'actionExportPdf' as const,    cost: 20 },
  { icon: FiMail,     labelKey: 'actionCoverLetter' as const,  cost: 20 },
  { icon: FiZap,      labelKey: 'actionOptimize' as const,     cost: 5  },
  { icon: FiGlobe,    labelKey: 'actionTranslate' as const,    cost: 5  },
];

// ── Quick-select amounts (currency-agnostic whole units) ──────────────────────
// Pricing: $5 = 20 credits · CV/cover letter = 20 cr · optimize/translate = 5 cr · free tier = 100 cr (5 CVs)

const QUICK_AMOUNTS = [
  { value: 5,  credits: 20,  badgeKey: null },
  { value: 10, credits: 40,  badgeKey: 'badgePopular' as const },
  { value: 25, credits: 100, badgeKey: 'badgeBestValue' as const },
  { value: 50, credits: 200, badgeKey: 'badgePowerUser' as const },
];

function actionIcon(type: string): string {
  const icons: Record<string, string> = {
    cv_generation: '📄', cover_letter: '✉️', optimize: '⚡',
    translate: '🌐', cv_import: '📥', topup: '💳', welcome: '🎁',
  };
  return icons[type] ?? '💳';
}

function actionLabel(type: string): string {
  const labels: Record<string, string> = {
    cv_generation: 'CV Generated', cover_letter: 'Cover Letter',
    optimize: 'Optimization', translate: 'Translation',
    cv_import: 'CV Import', topup: 'Credit Top-up', welcome: 'Welcome Bonus',
  };
  return labels[type] ?? type;
}

function formatTxDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// ── Currency picker ───────────────────────────────────────────────────────────

interface CurrencyPickerProps {
  value: Currency;
  onChange: (c: Currency) => void;
}

const CurrencyPicker: React.FC<CurrencyPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
      >
        <span>{value.flag}</span>
        <span>{value.label}</span>
        <FiChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[120px] rounded-lg border border-border bg-card shadow-lg">
          {SUPPORTED_CURRENCIES.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { onChange(c); setOpen(false); }}
              className={`flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-muted ${
                c.code === value.code ? 'bg-primary/5 font-semibold text-primary' : 'text-foreground'
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Inner form (rendered inside <Elements>) ───────────────────────────────────

interface PaymentFormContentProps {
  amount: number;
  currency: Currency;
  onBack: () => void;
  onSuccess: (creditsAdded: number, newBalance: number) => void;
}

const PaymentFormContent: React.FC<PaymentFormContentProps> = ({
  amount,
  currency,
  onBack,
  onSuccess,
}) => {
  const t = useTranslations('credits');
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError(null);

    try {
      // 1. Confirm payment with Stripe.js
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: 'if_required',
      });

      if (stripeError) {
        throw new Error(stripeError.message || 'Payment failed');
      }

      if (!paymentIntent || paymentIntent.status !== 'succeeded') {
        throw new Error(`Unexpected payment status: ${paymentIntent?.status}`);
      }

      // 2. Notify cvenom backend → verify + top-up credits
      const result = await confirmPayment(paymentIntent.id);
      onSuccess(result.credits_added, result.new_balance);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An error occurred';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Amount summary */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2">
            <FiDollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t('amountToPay')}</p>
            <p className="text-xl font-bold">{formatAmount(amount, currency)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {t('changeButton')}
        </button>
      </div>

      {/* Stripe Elements – wallets:'auto' shows Google Pay / Apple Pay
           when the browser supports them and they are enabled in the
           Stripe Dashboard (Settings → Payment methods). */}
      <div className="rounded-lg border border-border p-4">
        <PaymentElement
          options={{
            wallets: {
              googlePay: 'auto',
              applePay: 'auto',
            },
          }}
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
        >
          <FiArrowLeft className="h-4 w-4" />
          {t('backButton')}
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              {t('processing')}
            </>
          ) : (
            <>
              <FiCreditCard className="h-4 w-4" />
              {t('payButton', { amount: formatAmount(amount, currency) })}
            </>
          )}
        </button>
      </div>
    </form>
  );
};

// ── Main exported component ───────────────────────────────────────────────────

interface StripePaymentFormProps {
  /** Called when the payment + credit top-up succeeds. */
  onSuccess?: (creditsAdded: number, newBalance: number) => void;
  /** Called when the user closes / dismisses the form. */
  onClose?: () => void;
}

type Step = 'amount' | 'payment' | 'success';

export const StripePaymentForm: React.FC<StripePaymentFormProps> = ({
  onSuccess,
  onClose,
}) => {
  const t = useTranslations('credits');
  const isDark = useIsDark();
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Auto-detect currency from timezone; user can override.
  const [currency, setCurrency] = useState<Currency>(() => detectCurrency());

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const [successInfo, setSuccessInfo] = useState<{ creditsAdded: number; newBalance: number } | null>(null);

  // Re-detect on mount (SSR-safe: runs only on client)
  useEffect(() => {
    setCurrency(detectCurrency());
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────

  const finalAmount = useCallback((): number => {
    if (useCustom && customAmount) {
      const v = parseFloat(customAmount);
      return isNaN(v) ? 0 : v;
    }
    return amount;
  }, [useCustom, customAmount, amount]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const txs = await getTransactions();
      setTransactions(txs);
    } catch {
      setTransactions([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleAmountSelect = (val: number) => {
    setAmount(val);
    setUseCustom(false);
    setCustomAmount('');
  };

  const handleCustomChange = (raw: string) => {
    const clean = raw.replace(/[^0-9.]/g, '');
    const parts = clean.split('.');
    if (parts.length > 2) return;
    if (parts[1]?.length > 2) return;
    setCustomAmount(clean);
    const v = parseFloat(clean);
    if (!isNaN(v) && v > 0) {
      setUseCustom(true);
    } else {
      setUseCustom(false);
    }
  };

  const handleContinue = async () => {
    const fa = finalAmount();
    if (fa < 1) {
      setIntentError(t('minimumAmountError'));
      return;
    }
    setIntentError(null);
    setLoadingIntent(true);
    try {
      const result = await createPaymentIntent(Math.round(fa), currency.code);
      setClientSecret(result.client_secret);
      setPublishableKey(result.publishable_key);
      // Reset the stripe promise so it uses the (potentially new) publishable key
      stripePromise = null;
      setStep('payment');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('failedToInitPayment');
      setIntentError(msg);
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleBack = () => {
    setStep('amount');
    setClientSecret(null);
    setPublishableKey(null);
  };

  const handlePaymentSuccess = (creditsAdded: number, newBalance: number) => {
    setSuccessInfo({ creditsAdded, newBalance });
    setStep('success');
    onSuccess?.(creditsAdded, newBalance);
  };

  const handleReset = () => {
    setStep('amount');
    setAmount(10);
    setCustomAmount('');
    setUseCustom(false);
    setClientSecret(null);
    setPublishableKey(null);
    setSuccessInfo(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-semibold text-foreground">
            {step === 'amount' && t('stepAddCredits')}
            {step === 'payment' && t('stepPaymentDetails')}
            {step === 'success' && t('stepSuccess')}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {step === 'amount' && t('stepAddCreditsSubtitle', { currency: currency.label })}
            {step === 'payment' && t('stepPaymentSubtitle')}
            {step === 'success' && t('stepSuccessSubtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Currency picker — only visible on step 1 */}
          {step === 'amount' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { const next = !showHistory; setShowHistory(next); if (next) loadHistory(); }}
                className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors border ${
                  showHistory
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <FiClock className="h-3 w-3" />
                History
              </button>
              <CurrencyPicker value={currency} onChange={setCurrency} />
            </div>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={t('closeButton')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-6">
        {/* ── Step 1: Amount selection ── */}
        {step === 'amount' && (
          <div className="space-y-5">
            {showHistory ? (
              <div className="space-y-2">
                {loadingHistory ? (
                  <div className="flex justify-center py-8 text-sm text-muted-foreground">
                    <FiLoader className="h-4 w-4 animate-spin mr-2" /> Loading…
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex justify-center py-8 text-sm text-muted-foreground">No transactions yet</div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base leading-none">{actionIcon(tx.action_type)}</span>
                          <div>
                            <p className="text-xs font-medium text-foreground">{actionLabel(tx.action_type)}</p>
                            <p className="text-[10px] text-muted-foreground">{formatTxDate(tx.created_at)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                            {tx.amount > 0 ? '+' : ''}{tx.amount} cr
                          </p>
                          <p className="text-[10px] text-muted-foreground">{tx.balance_after} left</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Credit actions explainer */}
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('whatCreditsUnlock')}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {CREDIT_ACTIONS.map(({ icon: Icon, labelKey, cost }) => (
                      <div
                        key={labelKey}
                        className="flex flex-col items-center gap-1 rounded-md border border-border bg-background p-2"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-xs font-medium text-foreground">{t(labelKey)}</span>
                        <span className="text-xs text-muted-foreground">
                          {t('creditPlural', { count: cost })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick-select amounts */}
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_AMOUNTS.map((item) => {
                    const selected = amount === item.value && !useCustom;
                    return (
                      <button
                        key={item.value}
                        onClick={() => handleAmountSelect(item.value)}
                        className={`relative flex flex-col items-center rounded-lg border-2 px-3 pb-3 transition-all ${
                          item.badgeKey ? 'pt-5' : 'pt-3'
                        } ${
                          selected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        {item.badgeKey && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                            {t(item.badgeKey)}
                          </span>
                        )}
                        <span className="text-lg font-bold">
                          {formatAmount(item.value, currency)}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.credits.toLocaleString()} {t('creditsUnit')}
                        </span>
                        <span className="text-[11px] text-muted-foreground/80">
                          {t('optimizationsCount', { count: item.credits.toLocaleString() })}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom amount */}
                <div className="space-y-1.5">
                  <label htmlFor="custom-amount" className="text-sm font-medium text-foreground">
                    {t('customAmountLabel')}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                      {currency.label}
                    </span>
                    <input
                      id="custom-amount"
                      type="text"
                      inputMode="decimal"
                      value={customAmount}
                      onChange={(e) => handleCustomChange(e.target.value)}
                      placeholder="0"
                      className="w-full rounded-lg border border-border bg-background py-2.5 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                  {useCustom && finalAmount() >= 1 && (
                    <p className="text-xs text-muted-foreground">
                      = {Math.round(finalAmount() * 100).toLocaleString()} {t('creditsUnit')} ·{' '}
                      {t('optimizationsCount', { count: Math.round(finalAmount() * 4).toLocaleString() })}
                    </p>
                  )}
                </div>

                {intentError && (
                  <p className="flex items-center gap-1.5 text-sm text-destructive">
                    <FiAlertTriangle className="h-3.5 w-3.5" />
                    {intentError}
                  </p>
                )}

                <button
                  onClick={handleContinue}
                  disabled={loadingIntent || finalAmount() < 1}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  {loadingIntent ? (
                    <>
                      <FiLoader className="h-4 w-4 animate-spin" />
                      {t('settingUp')}
                    </>
                  ) : (
                    t('continueButton', {
                      amount: finalAmount() >= 1 ? formatAmount(finalAmount(), currency) : '—',
                    })
                  )}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Stripe payment form ── */}
        {step === 'payment' && clientSecret && publishableKey && (
          <Elements
            stripe={getStripePromise(publishableKey)}
            options={{
              clientSecret,
              appearance: {
                // 'night' renders Google Pay / Apple Pay buttons in dark style
                theme: isDark ? 'night' : 'stripe',
                variables: {
                  colorPrimary: isDark ? '#818cf8' : '#0f172a',
                },
              },
            }}
          >
            <PaymentFormContent
              amount={finalAmount()}
              currency={currency}
              onBack={handleBack}
              onSuccess={handlePaymentSuccess}
            />
          </Elements>
        )}

        {/* ── Step 3: Success ── */}
        {step === 'success' && successInfo && (
          <div className="flex flex-col items-center gap-5 py-4 text-center">
            <div className="rounded-full bg-green-100 p-4 dark:bg-green-900/30">
              <FiCheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <div className="space-y-1">
              <p className="text-lg font-semibold text-foreground">{t('creditsAddedTitle')}</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {successInfo.creditsAdded.toLocaleString()} {t('creditsUnit')}
                </span>{' '}
                {t('creditsAddedSuffix')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('newBalanceLabel')}{' '}
                <span className="font-medium text-foreground">
                  {successInfo.newBalance.toLocaleString()} {t('creditsUnit')}
                </span>
              </p>
            </div>
            <div className="flex w-full gap-3">
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                {t('addMoreButton')}
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  {t('doneButton')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StripePaymentForm;
