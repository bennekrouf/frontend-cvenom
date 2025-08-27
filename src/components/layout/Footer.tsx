'use client';

import React from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const locale = useLocale();
  const t = useTranslations('footer');

  // Helper function to get localized path
  const getLocalizedPath = (path: string) => {
    if (locale === 'en') return path;
    return `/${locale}${path}`;
  };

  // Empty footer navigation - add your own
  const footerNav = [
    // Example: { label: t('privacy'), path: "/privacy" },
    // Example: { label: t('terms'), path: "/terms" },
  ];

  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* Column 1: Logo & Description */}
          <div className="space-y-4">
            <Link href={getLocalizedPath("/")} className="flex items-center space-x-2">
              <span className="font-bold text-xl text-foreground">MyApp</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              {t('description')}
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="font-medium text-foreground mb-4">{t('quick_links')}</h3>
            <ul className="space-y-2">
              {footerNav.map((item) => (
                <li key={item.label}>
                  <Link
                    href={getLocalizedPath(item.path)}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Placeholder */}
          <div>
            <h3 className="font-medium text-foreground mb-4">{t('category')}</h3>
            <ul className="space-y-2">
              {/* Add your links here */}
            </ul>
          </div>

          {/* Column 4: Contact */}
          <div>
            <h3 className="font-medium text-foreground mb-4">{t('connect')}</h3>
            <div className="flex space-x-4 mb-4">
              {/* Add your social links here */}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('email_label')} contact@myapp.com
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 flex flex-col md:flex-row md:justify-between items-center">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} MyApp. {t('copyright')}
          </p>
          <p className="text-sm text-muted-foreground mt-2 md:mt-0">
            {t('tagline')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
