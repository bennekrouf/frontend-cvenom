// src/app/[locale]/wallet/page.tsx
'use client';

import { MayoWallet } from 'mayo-payments';
import LayoutTemplate from '@/components/layout/LayoutTemplate';
import { useAuth } from '@/contexts/AuthContext';
import { useLocale } from 'next-intl';

export default function WalletPage() {
  const { user } = useAuth();
  const locale = useLocale();

  const config = {
    stripePublishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
    apiBaseUrl: process.env.NEXT_PUBLIC_API_URL!,
    appSource: 'cvenom-dashboard',
    appName: 'cVenom'
  };

  return (
    <LayoutTemplate>
      <MayoWallet
        config={config}
        userEmail={user?.email || 'anonymous@example.com'}
        locale={locale as 'en' | 'fr'}
        className="max-w-lg mx-auto mt-8"
      />
    </LayoutTemplate>
  );
}
