'use client';
// src/components/payment/PlanStatus.tsx
//
// The user's mayorana plan, as the balance read describes it: its name, the
// credits left of this month's, and when it renews (or ends, once cancelled).
// An older store sends only the credits left (no `plan`); then it says that.
// Shown in the "Get credits" panel and on the /credits page.

import React from 'react';
import { FiCheck, FiExternalLink } from 'react-icons/fi';
import { useLocale, useTranslations } from 'next-intl';
import { PlanSummary } from '@/lib/paymentService';

interface PlanStatusProps {
  plan: PlanSummary | null;
  planCreditsLeft: number;
  pricingUrl: string;
  /** Credits come only from the plan, so there are no "own credits" to mention. */
  planOnly?: boolean;
}

const PlanStatus: React.FC<PlanStatusProps> = ({ plan, planCreditsLeft, pricingUrl, planOnly = false }) => {
  const t = useTranslations('getCredits');
  const locale = useLocale();
  const n = (value: number) => value.toLocaleString(locale);

  const ends = plan ? new Date(plan.period_end) : null;
  const endsOn =
    ends && !Number.isNaN(ends.getTime())
      ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(ends)
      : null;
  const used = plan && plan.credits_granted > 0 ? 1 - plan.credits_left / plan.credits_granted : 0;

  return (
    <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <FiCheck className="h-4 w-4 flex-shrink-0 text-primary" />
        {plan
          ? t('planNamed', { name: plan.name, left: n(plan.credits_left), granted: n(plan.credits_granted) })
          : t('planActive', { count: n(planCreditsLeft) })}
      </p>
      {plan && plan.credits_granted > 0 && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round((1 - used) * 100)}%` }} />
        </div>
      )}
      {endsOn && (
        <p className="mt-2 text-xs text-foreground">
          {plan?.cancel_at_period_end ? t('planEnds', { date: endsOn }) : t('planRenews', { date: endsOn })}
        </p>
      )}
      {!plan?.cancel_at_period_end && <p className="mt-1 text-xs text-muted-foreground">{t(planOnly ? 'planOnlyNote' : 'planActiveNote')}</p>}
      <a
        href={pricingUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        {t('managePlan')} <FiExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
};

export default PlanStatus;
