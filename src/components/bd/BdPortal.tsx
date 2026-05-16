'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { bdRegister, bdGetMe, bdGetCustomers, BdInfo, CustomerRow } from '@/lib/api';
import { signInWithGoogle } from '@/lib/firebase';

// ── Tiny helpers ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-2 px-3 py-1 text-xs rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}

// ── Register view ─────────────────────────────────────────────────────────────

function RegisterView({ onRegistered }: { onRegistered: (info: BdInfo) => void }) {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await bdRegister(name.trim() || (user?.displayName ?? ''));
      onRegistered(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 rounded-2xl border border-border bg-card shadow-sm">
      <h1 className="text-2xl font-bold text-foreground mb-1">Become a Business Developer</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Get your personal referral link and earn 30% commission on every credit your customers purchase.
      </p>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Your name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={user?.displayName ?? 'Jane Smith'}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Your email</label>
          <div className="px-3 py-2 rounded-lg border border-border bg-muted text-muted-foreground text-sm">
            {user?.email}
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? 'Registering…' : 'Get my referral code'}
        </button>
      </form>
    </div>
  );
}

// ── Dashboard view ────────────────────────────────────────────────────────────

function DashboardView({ info, customers }: { info: BdInfo; customers: CustomerRow[] }) {
  const commissionPct = Math.round(info.commission_rate * 100);

  return (
    <div className="max-w-3xl mx-auto py-10 px-4 flex flex-col gap-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Business Developer Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Welcome back, {info.name} · {commissionPct}% commission
        </p>
      </div>

      {/* Referral code */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Your referral code</p>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-mono font-bold text-primary">{info.referral_code}</span>
          <CopyButton text={info.referral_code} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">Referral link</p>
        <div className="flex items-center mt-1">
          <span className="text-sm text-foreground font-mono break-all">{info.referral_url}</span>
          <CopyButton text={info.referral_url} />
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Share this link with prospects. When they sign up, they're automatically attributed to you.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Stat label="Customers" value={info.customer_count} />
        <Stat label="Commission rate" value={`${commissionPct}%`} />
        <Stat
          label="Est. revenue / mo"
          value={`$${info.estimated_revenue_usd.toFixed(2)}`}
        />
      </div>

      {/* Customer list */}
      <div>
        <h2 className="text-base font-semibold text-foreground mb-3">Your customers</h2>
        {customers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground text-sm">
            No customers yet — share your referral link to get started.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Profile</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-foreground font-medium">{c.tenant_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.email ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(c.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Revenue estimates are based on average credit consumption. Actual payouts will be calculated monthly.
      </p>
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

export default function BdPortal() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<'loading' | 'unauthenticated' | 'not-registered' | 'dashboard'>('loading');
  const [bdInfo, setBdInfo] = useState<BdInfo | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);

  const load = useCallback(async () => {
    try {
      const [meRes, cusRes] = await Promise.all([bdGetMe(), bdGetCustomers()]);
      setBdInfo(meRes.data);
      setCustomers(cusRes.customers);
      setState('dashboard');
    } catch {
      setState('not-registered');
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { setState('unauthenticated'); return; }
    load();
  }, [authLoading, isAuthenticated, load]);

  // Attach ?ref= code from URL if present (for regular customers, not BDs)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref') ?? localStorage.getItem('bd_ref');
    if (ref) localStorage.setItem('bd_ref', ref);
  }, []);

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (state === 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-xl font-semibold text-foreground">Sign in to access the BD portal</h1>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (state === 'not-registered') {
    return <RegisterView onRegistered={(info) => { setBdInfo(info); setState('dashboard'); load(); }} />;
  }

  return <DashboardView info={bdInfo!} customers={customers} />;
}
