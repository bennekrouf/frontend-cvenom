'use client';
// src/components/payment/StripePaymentForm.tsx
//
// Two-step Stripe payment form for cvenom.
//   Step 1 – amount selection (quick buttons + custom input)
//   Step 2 – Stripe Elements payment form
//
// On success, the cvenom backend tops up api0 credit balance:
//   $1 = 100 api0 credits

import React, { useState, useCallback } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { FiArrowLeft, FiLoader, FiCreditCard, FiDollarSign, FiCheckCircle, FiAlertTriangle } from 'react-icons/fi';
import { createPaymentIntent, confirmPayment } from '@/lib/paymentService';

// Stripe promise is created lazily once we have the publishable key.
let stripePromise: Promise<Stripe | null> | null = null;

function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
}

// ── Quick-select amounts ──────────────────────────────────────────────────────

const QUICK_AMOUNTS = [
  { label: '$5', value: 5, sub: '500 credits' },
  { label: '$10', value: 10, sub: '1 000 credits' },
  { label: '$25', value: 25, sub: '2 500 credits' },
  { label: '$50', value: 50, sub: '5 000 credits' },
];

// ── Inner form (rendered inside <Elements>) ───────────────────────────────────

interface PaymentFormContentProps {
  amount: number;
  onBack: () => void;
  onSuccess: (creditsAdded: number, newBalance: number) => void;
}

const PaymentFormContent: React.FC<PaymentFormContentProps> = ({
  amount,
  onBack,
  onSuccess,
}) => {
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
          // We handle everything in-page (no redirect needed for cards)
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
            <p className="text-xs text-muted-foreground">Amount to pay</p>
            <p className="text-xl font-bold">${amount.toFixed(2)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Change
        </button>
      </div>

      {/* Stripe Elements */}
      <div className="rounded-lg border border-border p-4">
        <PaymentElement />
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
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || !elements || loading}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? (
            <>
              <FiLoader className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <FiCreditCard className="h-4 w-4" />
              Pay ${amount.toFixed(2)}
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
  const [step, setStep] = useState<Step>('amount');
  const [amount, setAmount] = useState(10);
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [intentError, setIntentError] = useState<string | null>(null);

  const [successInfo, setSuccessInfo] = useState<{ creditsAdded: number; newBalance: number } | null>(null);

  // ── Derived ────────────────────────────────────────────────────────────────

  const finalAmount = useCallback((): number => {
    if (useCustom && customAmount) {
      const v = parseFloat(customAmount);
      return isNaN(v) ? 0 : v;
    }
    return amount;
  }, [useCustom, customAmount, amount]);

  // ── Handlers ───────────────────────────────────────────────────────────────

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
      setIntentError('Minimum amount is $1.00');
      return;
    }
    setIntentError(null);
    setLoadingIntent(true);
    try {
      const result = await createPaymentIntent(Math.round(fa));
      setClientSecret(result.client_secret);
      setPublishableKey(result.publishable_key);
      // Reset the stripe promise so it uses the (potentially new) publishable key
      stripePromise = null;
      setStep('payment');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to initialise payment';
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
            {step === 'amount' && 'Add Credits'}
            {step === 'payment' && 'Payment Details'}
            {step === 'success' && 'Payment Successful'}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {step === 'amount' && '1 dollar = 100 credits'}
            {step === 'payment' && 'Complete your purchase securely via Stripe'}
            {step === 'success' && 'Your credits have been added'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-6">
        {/* ── Step 1: Amount selection ── */}
        {step === 'amount' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {QUICK_AMOUNTS.map((item) => {
                const selected = amount === item.value && !useCustom;
                return (
                  <button
                    key={item.value}
                    onClick={() => handleAmountSelect(item.value)}
                    className={`flex flex-col items-center rounded-lg border-2 p-4 transition-all ${
                      selected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <span className="text-lg font-bold">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.sub}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom amount */}
            <div className="space-y-1.5">
              <label htmlFor="custom-amount" className="text-sm font-medium text-foreground">
                Custom amount
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <input
                  id="custom-amount"
                  type="text"
                  inputMode="decimal"
                  value={customAmount}
                  onChange={(e) => handleCustomChange(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-background py-2.5 pl-7 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
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
                  Setting up…
                </>
              ) : (
                `Continue · Pay $${finalAmount() >= 1 ? finalAmount().toFixed(2) : '—'}`
              )}
            </button>
          </div>
        )}

        {/* ── Step 2: Stripe payment form ── */}
        {step === 'payment' && clientSecret && publishableKey && (
          <Elements
            stripe={getStripePromise(publishableKey)}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: { colorPrimary: '#0f172a' },
              },
            }}
          >
            <PaymentFormContent
              amount={finalAmount()}
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
              <p className="text-lg font-semibold text-foreground">Credits Added!</p>
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{successInfo.creditsAdded.toLocaleString()} credits</span>{' '}
                have been added to your account.
              </p>
              <p className="text-xs text-muted-foreground">
                New balance:{' '}
                <span className="font-medium text-foreground">
                  {successInfo.newBalance.toLocaleString()} credits
                </span>
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={handleReset}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Add More
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Done
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
