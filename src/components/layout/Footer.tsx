'use client';

import React from 'react';
import Link from 'next/link';
import { useLocale } from 'next-intl';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const locale = useLocale();
  const l = (path: string) => `/${locale}${path}`;

  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="space-y-4">
            <Link href={l('/')} className="flex items-center gap-2">
              <span className="font-bold text-xl text-foreground">cVenom</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              AI-powered CV, cover letter, and portfolio generator. Match your profile to any job on LinkedIn.
            </p>
            <p className="text-xs text-muted-foreground">
              contact@cvenom.com
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm">Product</h3>
            <ul className="space-y-2.5">
              {[
                { label: '📄 CV Generator', href: l('/') },
                { label: '✉️ Cover Letter', href: l('/') },
                { label: '🖼️ Portfolio', href: l('/') },
                { label: '🔗 LinkedIn Match', href: l('/') },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Earn */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm">Earn with cVenom</h3>
            <ul className="space-y-2.5">
              {[
                { label: 'Become a Business Developer', href: l('/bd') },
                { label: 'How commissions work', href: l('/bd') },
                { label: '30% on every referral', href: l('/bd') },
              ].map(({ label, href }) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & social */}
          <div>
            <h3 className="font-semibold text-foreground mb-4 text-sm">Legal</h3>
            <ul className="space-y-2.5">
              <li>
                <a
                  href="https://mayorana.ch/en/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Privacy Policy
                </a>
              </li>
              <li>
                <a
                  href="https://mayorana.ch/en/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  Terms of Service
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-10 pt-8 flex flex-col md:flex-row md:justify-between items-center gap-3">
          <p className="text-sm text-muted-foreground">
            &copy; {currentYear} Mayorana. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href={l('/bd')} className="text-sm text-primary font-medium hover:underline">
              💸 Earn 30% commission →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
