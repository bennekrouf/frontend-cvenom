// src/lib/paymentService.ts
//
// Client-side payment service for cvenom.
// Calls the cvenom backend payment endpoints (not api0 directly).
//
// Backend routes:
//   POST /payment/intent  → create Stripe PaymentIntent
//   POST /payment/confirm → verify payment & top-up api0 credits
//   GET  /payment/balance → what the user can spend, and the part of it that is
//                           their mayorana plan's
//   GET  /payment/transactions?limit=N → credit transaction history
//   GET  /payment/plans   → the mayorana plans on sale (no sign-in needed)
//
// Credits come two ways: a mayorana plan (monthly, spent first, lapses at
// renewal; it counts here when mayorana's sign-in has the same email) or a
// one-off top-up on this site (never expires). When CVenom's api0 workspace
// bills each person's plan (`billing_mode: "user"`), the plan is the only way:
// the balance is the plan's credits left, and there are no top-ups.

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
  /** Everything spendable: plan credits left plus the CVenom balance. */
  balance: number;
  /** The part of `balance` from the user's mayorana plan (absent on an older backend). */
  plan_credits_left?: number;
  /** The live mayorana plan, null without one (absent on an older backend). */
  plan?: PlanSummary | null;
  /** "user": credits come only from the plan, no top-ups. Absent or "tenant" otherwise. */
  billing_mode?: string | null;
}

/** The user's live mayorana plan, as the api0 store describes it. */
export interface PlanSummary {
  name: string;
  credits_granted: number;
  credits_left: number;
  /** When this month's credits lapse, and the plan renews or ends (ISO date). */
  period_end: string;
  cancel_at_period_end: boolean;
  is_free: boolean;
}

export interface Credits {
  balance: number;
  planCreditsLeft: number;
  plan: PlanSummary | null;
  /** Credits come only from the mayorana plan: no balance, no top-ups. */
  planOnly: boolean;
}

export interface MayoranaPlan {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  currency: string;
  monthly_credits: number;
  /** The apps it unlocks, by product id; "*" is every app. */
  products: string[];
}

export interface PlansResult {
  plans: MayoranaPlan[];
  pricingUrl: string;
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
 *
 * @param amountUnits  Whole-number amount in the chosen currency (e.g. 10 for CHF 10).
 * @param currency     ISO 4217 lowercase code (default: 'usd').
 */
export async function createPaymentIntent(
  amountUnits: number,
  currency = 'usd'
): Promise<CreateIntentResult> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/payment/intent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ amount_dollars: amountUnits, currency }),
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
  paymentIntentId: string,
  /** ISO time the buyer waived the 14-day withdrawal right (stored on the Stripe payment). */
  withdrawalWaiverAcceptedAt: string
): Promise<ConfirmPaymentResult> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/payment/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      payment_intent_id: paymentIntentId,
      withdrawal_waiver_accepted_at: withdrawalWaiverAcceptedAt,
    }),
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
  return (await getCredits()).balance;
}

/** The balance and how much of it is the user's mayorana plan. */
export async function getCredits(): Promise<Credits> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/payment/balance`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Balance fetch failed (${res.status})`);
  }

  const result = json as BalanceResult;
  return {
    balance: result.balance,
    planCreditsLeft: result.plan_credits_left ?? 0,
    plan: result.plan ?? null,
    planOnly: result.billing_mode === 'user',
  };
}

// ── Plans (mayorana) ──────────────────────────────────────────────────────────

/** Where mayorana sells its plans; `from=cvenom` brings the buyer back here. */
export const MAYORANA_PRICING_URL = 'https://mayorana.ch/pricing?from=cvenom';

/** What a CV (or cover letter) costs, for "≈ N CVs a month". */
export const CV_CREDITS = 20;

/** Top-ups: credits per whole unit of currency (backend confirm_payment_handler). */
export const TOPUP_CREDITS_PER_UNIT = 4;

export async function getPlans(): Promise<PlansResult> {
  const res = await fetch(`${getApiBase()}/payment/plans`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.error || `Plans fetch failed (${res.status})`);
  }
  return {
    plans: (json.plans ?? []).map((p: MayoranaPlan) => ({ ...p, products: p.products ?? [] })),
    pricingUrl: json.pricing_url || MAYORANA_PRICING_URL,
  };
}

/** A plan's monthly price, e.g. "CHF 19" (`price_cents` is in the smallest unit). */
export function formatPlanPrice(plan: Pick<MayoranaPlan, 'price_cents' | 'currency'>, locale: string): string {
  const currency = plan.currency.toUpperCase();
  const digits =
    new Intl.NumberFormat(locale, { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const value = plan.price_cents / 10 ** digits;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(value) ? 0 : digits,
  }).format(value);
}

/** The names of the mayorana apps a plan unlocks besides CVenom, by product id. */
const MAYORANA_APP_NAMES: Record<string, string> = {
  jobscout: 'JobScout',
  gitagent: 'GitAgent',
  shipscreen: 'ShipScreen',
  'surface-watch': 'Surface Watch',
  'small-video': 'PolishCast',
  splitter: 'TrackCut',
  publishkit: 'PublishKit',
  spreadwatch: 'SpreadRadar',
};

/** A mayorana app's name from its product id. */
export function appName(id: string): string {
  return MAYORANA_APP_NAMES[id] ?? id;
}

/** `null` when the plan unlocks every app. */
export function planAppNames(products: string[]): string[] | null {
  if (products.includes('*')) return null;
  return products.filter((p) => p !== 'cvenom').map(appName);
}

// ── Getting credits ───────────────────────────────────────────────────────────

/**
 * Asks the navbar's credits button to open the "Get credits" panel, e.g. when
 * an operation failed for lack of credits. `reason` is shown at its top.
 */
export const GET_CREDITS_EVENT = 'cvenom:get-credits';

export function openGetCredits(reason?: string): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<{ reason?: string }>(GET_CREDITS_EVENT, { detail: { reason } }));
}

/** Opens the panel when a backend error body says the user is out of credits. */
export function notifyIfOutOfCredits(body: unknown): void {
  if (body && typeof body === 'object' && (body as { error_code?: string }).error_code === 'INSUFFICIENT_CREDITS') {
    openGetCredits((body as { error?: string }).error);
  }
}

export interface CreditTransaction {
  id: number | string;
  amount: number;
  /** Null for a plan's usage, which has no running balance. */
  balance_after: number | null;
  action_type: string;
  description: string | null;
  created_at: string;
}

/** Largest history the store returns in one call. */
export const MAX_TRANSACTIONS = 1000;

/** Largest page of plan usage the store returns in one call. */
export const MAX_PLAN_USAGE = 200;

/**
 * Fetch the authenticated user's credit transactions, most recent first.
 * Without `limit` the backend returns its default (latest 50).
 */
export async function getTransactions(limit?: number): Promise<CreditTransaction[]> {
  const token = await getAuthToken();
  const query = limit ? `?limit=${limit}` : '';
  const response = await fetch(`${getApiBase()}/payment/transactions${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch transactions');
  const data = await response.json();
  return data.transactions ?? [];
}

/** One row of the user's mayorana plan usage, as GET /payment/plan-usage returns it. */
interface PlanUsageRow {
  id: string;
  created_at: string;
  /** The app that spent it, by product id ("cvenom", "jobscout"…). */
  app: string;
  /** What it was spent on: CVenom's action ("cv_generation") or another app's AI model. */
  model: string;
  /** Negative for a refund. */
  credits: number;
  ok: boolean;
}

/**
 * The user's plan usage as transactions, most recent first: with per-person
 * billing this is their whole history, every app that spends the plan included.
 */
export async function getPlanUsage(limit?: number): Promise<CreditTransaction[]> {
  const token = await getAuthToken();
  const query = limit ? `?limit=${limit}` : '';
  const response = await fetch(`${getApiBase()}/payment/plan-usage${query}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error('Failed to fetch plan usage');
  const data = await response.json();
  return ((data.usage ?? []) as PlanUsageRow[]).map((u) => ({
    id: u.id,
    amount: -u.credits,
    balance_after: null,
    action_type: u.model,
    description: u.app && u.app !== 'cvenom' ? appName(u.app) : null,
    created_at: u.created_at,
  }));
}

/** Fired on window after a balance change so other widgets (navbar) can refresh. */
export const CREDITS_UPDATED_EVENT = 'cvenom:credits-updated';

// ── Referral ──────────────────────────────────────────────────────────────────

export interface ReferralLinkResult {
  referral_code: string;
  referral_url: string;
  total_referrals: number;
  credited_referrals: number;
  credits_earned: number;
}

/**
 * Fetch the authenticated user's referral link and stats.
 */
export async function getReferralLink(): Promise<ReferralLinkResult> {
  const token = await getAuthToken();

  const res = await fetch(`${getApiBase()}/referral/my-link`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || `Referral fetch failed (${res.status})`);
  }

  return json.data as ReferralLinkResult;
}
