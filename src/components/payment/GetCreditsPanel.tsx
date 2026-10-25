'use client';
// src/components/payment/GetCreditsPanel.tsx
//
// "Get credits": the two ways to have credits, plan first.
//   - A mayorana plan: monthly credits for CVenom and the other mayorana apps,
//     bought on mayorana.ch. Its prices come from the api0 gateway (via
//     GET /payment/plans), never from this site. The plan counts here when
//     mayorana's sign-in has the same email as this one.
//   - A one-off top-up (StripePaymentForm), which never expires.
// A subscriber sees their plan (PlanStatus) and a link to manage it.
//
// Opened from the navbar's credits button, the /credits page, and wherever an
// operation fails for lack of credits (openGetCredits, with `reason`).

import React, { useEffect, useState } from 'react';
import { FiAlertTriangle, FiExternalLink, FiLoader, FiStar, FiZap } from 'react-icons/fi';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import {
  getCredits,
  getPlans,
  formatPlanPrice,
  planAppNames,
  CV_CREDITS,
  MAYORANA_PRICING_URL,
  MayoranaPlan,
  PlanSummary,
} from '@/lib/paymentService';
import PlanStatus from './PlanStatus';
import StripePaymentForm from './StripePaymentForm';

interface GetCreditsPanelProps {
  /** Why it opened, e.g. the out-of-credits error; shown at the top. */
  reason?: string;
  onClose?: () => void;
  onTopUpSuccess?: (creditsAdded: number, newBalance: number) => void;
}

type PlansLoad =
  | { kind: 'loading' }
  | { kind: 'ready'; plans: MayoranaPlan[]; pricingUrl: string }
  | { kind: 'error' };

const GetCreditsPanel: React.FC<GetCreditsPanelProps> = ({ reason, onClose, onTopUpSuccess }) => {
  const t = useTranslations('getCredits');
  const locale = useLocale();
  const { user, isAuthenticated } = useAuth();

  const [plansLoad, setPlansLoad] = useState<PlansLoad>({ kind: 'loading' });
  const [planCreditsLeft, setPlanCreditsLeft] = useState(0);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);

  useEffect(() => {
    getPlans()
      .then(({ plans, pricingUrl }) => setPlansLoad({ kind: 'ready', plans, pricingUrl }))
      .catch(() => setPlansLoad({ kind: 'error' }));
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    getCredits()
      .then((c) => {
        setPlanCreditsLeft(c.planCreditsLeft);
        setPlan(c.plan);
      })
      .catch(() => {});
  }, [isAuthenticated]);

  if (showTopUp) {
    return (
      <div className="flex w-full max-w-md flex-col gap-2">
        <StripePaymentForm onSuccess={onTopUpSuccess} onClose={onClose} />
        <button
          type="button"
          onClick={() => setShowTopUp(false)}
          className="self-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          ← {t('backToPlans')}
        </button>
      </div>
    );
  }

  const pricingUrl = plansLoad.kind === 'ready' ? plansLoad.pricingUrl : MAYORANA_PRICING_URL;
  // A plan whose month is used up still shows, with when it renews.
  const hasPlan = plan !== null || planCreditsLeft > 0;
  const plans = plansLoad.kind === 'ready' ? plansLoad.plans : [];
  // The middle plan is the one mayorana points people to too.
  const featuredIndex = plans.length > 1 ? Math.floor(plans.length / 2) : -1;

  return (
    <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="font-semibold text-foreground">{t('title')}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{t('subtitle')}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('close')}
          >
            ✕
          </button>
        )}
      </div>

      <div className="space-y-5 p-6">
        {reason && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-foreground">
            <FiAlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
            <span>{reason}</span>
          </div>
        )}

        {hasPlan && <PlanStatus plan={plan} planCreditsLeft={planCreditsLeft} pricingUrl={pricingUrl} />}

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {hasPlan ? t('otherPlans') : t('plansHeading')}
          </p>

          {plansLoad.kind === 'loading' && (
            <div className="flex justify-center py-6 text-muted-foreground">
              <FiLoader className="h-4 w-4 animate-spin" />
            </div>
          )}

          {plansLoad.kind === 'error' && (
            <a
              href={pricingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border p-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              {t('seePlans')} <FiExternalLink className="h-4 w-4" />
            </a>
          )}

          <div className="space-y-2">
            {plans.map((plan, index) => {
              const apps = planAppNames(plan.products);
              const featured = index === featuredIndex;
              return (
                <a
                  key={plan.id}
                  href={pricingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                    featured ? 'border-primary ring-1 ring-primary' : 'border-border'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="flex items-center gap-1.5 font-semibold text-foreground">
                      {plan.name}
                      {featured && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold uppercase text-primary-foreground">
                          <FiStar className="h-2.5 w-2.5" />
                          {t('popular')}
                        </span>
                      )}
                    </span>
                    <span className="whitespace-nowrap text-sm">
                      <span className="font-semibold text-foreground">{formatPlanPrice(plan, locale)}</span>
                      <span className="text-muted-foreground"> {t('perMonth')}</span>
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-foreground">
                    <FiZap className="h-3 w-3 text-primary" />
                    {t('planCredits', {
                      credits: plan.monthly_credits.toLocaleString(locale),
                      cvs: Math.floor(plan.monthly_credits / CV_CREDITS),
                    })}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {apps === null
                      ? t('allApps')
                      : apps.length > 0
                        ? t('plusApps', { apps: apps.join(', ') })
                        : t('cvenomOnly')}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:underline">
                    {t('subscribe')} <FiExternalLink className="h-3 w-3" />
                  </span>
                </a>
              );
            })}
          </div>

          {plansLoad.kind !== 'error' && (
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {user?.email ? t('sameEmail', { email: user.email }) : t('sameEmailSignedOut')}
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setShowTopUp(true)}
            className="flex w-full items-center justify-between rounded-lg border border-border px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
          >
            <span>
              <span className="block font-medium text-foreground">{t('topUpTitle')}</span>
              <span className="block text-xs text-muted-foreground">{t('topUpSubtitle')}</span>
            </span>
            <span aria-hidden className="text-muted-foreground">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GetCreditsPanel;
