'use client';

import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useState } from 'react';

const FileEditor = dynamic(() => import('@/components/editor/FileEditor'), { ssr: false });

// ── Feature card ──────────────────────────────────────────────────────────────

function Feature({
  icon, title, description,
}: {
  icon: string; title: string; description: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-6 hover:border-primary/40 hover:shadow-sm transition-all">
      <span className="text-3xl">{icon}</span>
      <h3 className="font-semibold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// ── Step ──────────────────────────────────────────────────────────────────────

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
        {n}
      </div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

// ── Sign-in button ────────────────────────────────────────────────────────────

function SignInButton({ label = 'Start for free — sign in with Google', size = 'md' }: { label?: string; size?: 'md' | 'lg' }) {
  const [loading, setLoading] = useState(false);
  const go = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };
  return (
    <button
      onClick={go}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-semibold shadow hover:opacity-90 disabled:opacity-50 transition-opacity ${size === 'lg' ? 'px-8 py-4 text-base' : 'px-6 py-3 text-sm'}`}
    >
      {loading ? (
        <span className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
      )}
      {loading ? 'Signing in…' : label}
    </button>
  );
}

// ── Main landing page ─────────────────────────────────────────────────────────

export default function LandingPage() {
  const { isAuthenticated, loading } = useAuth();
  const locale = useLocale();

  // Authenticated users go straight to the editor
  if (!loading && isAuthenticated) {
    return <FileEditor />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 border-b border-border">
        <div className="container py-20 md:py-28 flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            AI-powered · ATS-optimised · Multilingual
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight leading-tight">
            Land your next job<br />
            <span className="text-primary">with the right CV</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl">
            Create a professional CV, cover letter, and portfolio in minutes. Match it to any job posting from LinkedIn. Let AI do the heavy lifting.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <SignInButton size="lg" />
            <a
              href="#features"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-6 py-4 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              See what's included ↓
            </a>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Free to start · No credit card required · 100 free credits on sign-up
          </p>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="container py-20 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground">Everything you need to get hired</h2>
          <p className="text-muted-foreground mt-3">Four tools, one platform. All AI-assisted.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <Feature
            icon="📄"
            title="CV Generator"
            description="Pick a template, fill your profile, and generate a polished PDF in seconds. ATS-friendly by design."
          />
          <Feature
            icon="✉️"
            title="Cover Letter"
            description="Paste the job description and get a tailored cover letter that speaks directly to the hiring manager."
          />
          <Feature
            icon="🖼️"
            title="Portfolio"
            description="AI extracts your best projects from your CV and compiles them into a visual portfolio PDF — no editing needed."
          />
          <Feature
            icon="🔗"
            title="LinkedIn Match"
            description="Paste a LinkedIn job URL and instantly see how well your CV matches the requirements, with actionable tips."
          />
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/30 py-20">
        <div className="container max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">How it works</h2>
          <div className="flex flex-col gap-8">
            <Step n={1} title="Create your profile" desc="Add your experience, skills, and education once. Reuse it for every application." />
            <Step n={2} title="Choose a document" desc="Generate a CV, cover letter, or portfolio in your language — English, French, or German." />
            <Step n={3} title="Match to a job posting" desc="Paste a LinkedIn URL. The AI compares your profile and tells you exactly what to improve." />
            <Step n={4} title="Download and apply" desc="Get a clean, recruiter-ready PDF. Apply with confidence." />
          </div>
          <div className="mt-12 text-center">
            <SignInButton />
          </div>
        </div>
      </section>

      {/* ── BD / Earn money ────────────────────────────────────────────────── */}
      <section className="container py-20 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-primary/20 p-8 md:p-12 flex flex-col md:flex-row gap-8 items-center">
          <div className="flex-1 flex flex-col gap-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              💸 Earn with cVenom
            </span>
            <h2 className="text-3xl font-bold text-foreground">
              Help people land jobs.<br />Earn 30% commission.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Become a cVenom Business Developer. Share your unique referral link with job seekers, career coaches, or HR professionals. Every time one of your referrals purchases credits, you earn 30% — automatically tracked, paid monthly.
            </p>
            <ul className="flex flex-col gap-2 text-sm text-foreground">
              {[
                'No selling — just share your link',
                'Instant dashboard: track your customers and earnings',
                '30% commission on every credit purchase',
                'Paid monthly, no minimum threshold',
              ].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <span className="text-primary font-bold">✓</span> {item}
                </li>
              ))}
            </ul>
            <div className="flex gap-3 mt-2">
              <Link
                href={`/${locale}/bd`}
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Get my referral code →
              </Link>
              <SignInButton label="Sign in first" size="md" />
            </div>
          </div>
          <div className="flex-shrink-0 flex flex-col gap-4 w-full md:w-56">
            {[
              { label: 'Commission rate', value: '30%', color: 'text-primary' },
              { label: 'Avg customer / month', value: '~$5', color: 'text-foreground' },
              { label: 'Your cut per customer', value: '~$1.50', color: 'text-green-600' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border border-border bg-background p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ──────────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-primary/5 py-20">
        <div className="container max-w-2xl mx-auto text-center flex flex-col gap-6">
          <h2 className="text-3xl font-bold text-foreground">Ready to stand out?</h2>
          <p className="text-muted-foreground">
            Join thousands of candidates who use cVenom to write better CVs, faster.
            Start free — 100 credits included.
          </p>
          <div className="flex justify-center">
            <SignInButton size="lg" />
          </div>
        </div>
      </section>

    </div>
  );
}
