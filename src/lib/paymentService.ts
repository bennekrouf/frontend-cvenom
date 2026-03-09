// src/lib/paymentService.ts
//
// Client-side payment service for cvenom.
// Calls the cvenom backend payment endpoints (not api0 directly).
//
// Backend routes:
//   POST /payment/intent  → create Stripe PaymentIntent
//   POST /payment/confirm → verify payment & top-up api0 credits
//   GET  /payment/balance → return current user's credit balance

import { auth } from './firebase';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateIntentResult {
  success: boolean;
  client_secret: string;
  publishable_key: string;
}

export interface ConfirmPaymentResult {
  success: boolean;
  message: string;
  credits_added: number;
  new_balance: number;
}

export interface BalanceResult {
  success: boolean;
  balance: number;
}

// ── Helper ────────────────────────────────────────────────────────────────────

async function getAuthToken(): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

function getApiBase(): string {
  if (process.env.NODE_ENV === 'production') {
    return process.env.NEXT_PUBLIC_CVENOM_API_URL || 'https://api.cvenom.com';
  }
  return process.env.NEXT_PUBLIC_CVENOM_API_URL || 'http://127.0.0.1:4002';
}

// ── Service ───────────────────────────────────────────────────────────────────

/**
 * Create a Stripe PaymentIntent on the cvenom backend.
 * Returns the client_secret needed by Stripe.js and the publishable key.
 */
export async function createPaymentIntent(
  amountDollars: number
): Promise<CreateIntentResult> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/payment/intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount_dollars: amountDollars }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Payment intent creation failed (${res.status})`);
  }

  return json as CreateIntentResult;
}

/**
 * Notify the cvenom backend that a Stripe payment succeeded.
 * The backend will verify with Stripe and top-up api0 credits.
 */
export async function confirmPayment(
  paymentIntentId: string
): Promise<ConfirmPaymentResult> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/payment/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ payment_intent_id: paymentIntentId }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Payment confirmation failed (${res.status})`);
  }

  return json as ConfirmPaymentResult;
}

/**
 * Fetch the authenticated user's current credit balance.
 */
export async function getBalance(): Promise<number> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/payment/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Balance fetch failed (${res.status})`);
  }

  return (json as BalanceResult).balance;
}
