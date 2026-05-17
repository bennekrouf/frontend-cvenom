'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest, BdInfo, CustomerRow } from '@/lib/api';
import { signInWithGoogle } from '@/lib/firebase';

const ADMIN_EMAIL = 'mohamed.bennekrouf@gmail.com';

// ── Credits API types ─────────────────────────────────────────────────────────

interface AdminUserCredit {
  email: string;
  tenant_name: string;
  balance: number;
  joined_at: string;
}

interface AdminCreditUsersResponse {
  success: boolean;
  total_users: number;
  total_credits: number;
  users: AdminUserCredit[];
}

interface AdminUserTransactionsResponse {
  success: boolean;
  email: string;
  balance: number;
  transactions: Array<{
    id?: string | number;
    action_type?: string;
    amount?: number;
    balance_after?: number;
    description?: string;
    created_at?: string;
    [key: string]: unknown;
  }>;
}

async function fetchCreditUsers(): Promise<AdminCreditUsersResponse> {
  return apiRequest('/admin/credits/users', { requireAuth: true });
}

async function fetchUserTransactions(email: string): Promise<AdminUserTransactionsResponse> {
  return apiRequest(`/admin/credits/transactions/${encodeURIComponent(email)}`, { requireAuth: true });
}

// ── Credits tab ───────────────────────────────────────────────────────────────

function TransactionDrawer({ email, onClose }: { email: string; onClose: () => void }) {
  const [data, setData] = useState<AdminUserTransactionsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUserTransactions(email)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [email]);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-background border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground text-sm">{email}</h2>
            {data && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Balance: <span className="font-bold text-foreground">{data.balance} credits</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {!data && !error && (
            <div className="flex justify-center pt-10">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          )}
          {data && data.transactions.length === 0 && (
            <p className="text-muted-foreground text-sm text-center pt-10">No transactions yet.</p>
          )}
          {data && data.transactions.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Type</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Amount</th>
                  <th className="text-right pb-2 font-medium text-muted-foreground">Balance</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground pl-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((tx, i) => {
                  const amount = tx.amount ?? 0;
                  const positive = amount > 0;
                  return (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-2">
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {tx.action_type ?? '—'}
                        </span>
                        {tx.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[140px]" title={tx.description}>
                            {tx.description}
                          </p>
                        )}
                      </td>
                      <td className={`py-2.5 text-right font-medium ${positive ? 'text-green-600' : 'text-red-500'}`}>
                        {positive ? '+' : ''}{amount}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground">{tx.balance_after ?? '—'}</td>
                      <td className="py-2.5 pl-3 text-muted-foreground whitespace-nowrap">
                        {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminCreditsTab() {
  const [data, setData] = useState<AdminCreditUsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    fetchCreditUsers()
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = data?.users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.tenant_name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <>
      {selected && <TransactionDrawer email={selected} onClose={() => setSelected(null)} />}

      <div className="flex flex-col gap-6">
        {/* Summary */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Users</p>
              <p className="text-2xl font-bold text-foreground mt-1">{data.total_users}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Total credits</p>
              <p className="text-2xl font-bold text-foreground mt-1">{data.total_credits.toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Avg / user</p>
              <p className="text-2xl font-bold text-foreground mt-1">
                {data.total_users > 0 ? Math.round(data.total_credits / data.total_users) : 0}
              </p>
            </div>
          </div>
        )}

        {/* Search + refresh */}
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search by email or profile name…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={load}
            className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
          >
            Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            No users found.
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Profile</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Credits</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors"
                    onClick={() => setSelected(u.email)}
                  >
                    <td className="px-4 py-3 text-foreground">{u.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.tenant_name}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${u.balance > 0 ? 'text-green-600' : 'text-muted-foreground'}`}>
                        {u.balance.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-muted-foreground">Click any row to see credit transaction history.</p>
      </div>
    </>
  );
}

// ── API helpers ───────────────────────────────────────────────────────────────

interface AdminBdRow {
  id: number;
  email: string;
  name: string;
  referral_code: string;
  commission_rate: number;
  customer_count: number;
  estimated_revenue_usd: number;
  created_at: string;
}

interface AdminBdListResponse {
  success: boolean;
  total_bds: number;
  total_customers: number;
  total_estimated_revenue_usd: number;
  business_developers: AdminBdRow[];
}

async function fetchAdminBds(): Promise<AdminBdListResponse> {
  return apiRequest('/admin/bd', { requireAuth: true });
}

async function fetchBdCustomers(code: string): Promise<{ success: boolean; customers: CustomerRow[] }> {
  return apiRequest(`/admin/bd/${encodeURIComponent(code)}/customers`, { requireAuth: true });
}

async function deleteBd(email: string): Promise<void> {
  await apiRequest(`/admin/bd/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
      <span className="text-2xl font-bold text-foreground">{value}</span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </div>
  );
}

function CustomerDrawer({
  code,
  name,
  onClose,
}: {
  code: string;
  name: string;
  onClose: () => void;
}) {
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);

  useEffect(() => {
    fetchBdCustomers(code).then((r) => setCustomers(r.customers)).catch(() => setCustomers([]));
  }, [code]);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/40" onClick={onClose} />
      {/* Panel */}
      <div className="w-full max-w-md bg-background border-l border-border flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">{name}</h2>
            <p className="text-xs text-muted-foreground font-mono">{code}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {customers === null ? (
            <div className="flex justify-center pt-10">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : customers.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center pt-10">No customers yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-2 font-medium text-muted-foreground">Profile</th>
                  <th className="text-left pb-2 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-foreground">{c.tenant_name}</p>
                      {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                    </td>
                    <td className="py-2.5 text-muted-foreground whitespace-nowrap">
                      {new Date(c.joined_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type AdminTab = 'bd' | 'credits';

export default function AdminBdView() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('bd');
  const [data, setData] = useState<AdminBdListResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedBd, setSelectedBd] = useState<AdminBdRow | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setError('');
    fetchAdminBds()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) load();
  }, [authLoading, isAuthenticated]);

  // ── Guard ──────────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-muted-foreground text-sm">Admin access — sign in first</p>
        <button
          onClick={() => signInWithGoogle()}
          className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Access denied.</p>
      </div>
    );
  }

  // ── View ───────────────────────────────────────────────────────────────────

  const handleDelete = async (bd: AdminBdRow) => {
    if (!confirm(`Remove ${bd.name} (${bd.email}) as a business developer?`)) return;
    setDeleting(bd.email);
    try {
      await deleteBd(bd.email);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  return (
    <>
      {selectedBd && (
        <CustomerDrawer
          code={selectedBd.referral_code}
          name={selectedBd.name}
          onClose={() => setSelectedBd(null)}
        />
      )}

      <div className="max-w-5xl mx-auto py-10 px-4 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin</h1>
            <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Credits tab button */}
            <button
              onClick={() => setActiveTab(activeTab === 'credits' ? 'bd' : 'credits')}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                activeTab === 'credits'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border text-foreground hover:bg-muted'
              }`}
            >
              💳 Credits
            </button>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Tab selector */}
        <div className="flex gap-1 border-b border-border">
          {(['bd', 'credits'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'bd' ? '👥 Business Developers' : '💳 Credits'}
            </button>
          ))}
        </div>

        {/* Credits tab */}
        {activeTab === 'credits' && <AdminCreditsTab />}

        {/* BD tab */}
        {activeTab === 'bd' && (<>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <SummaryCard label="Business developers" value={data.total_bds} />
              <SummaryCard label="Total customers" value={data.total_customers} />
              <SummaryCard
                label="Total est. revenue / mo"
                value={`$${data.total_estimated_revenue_usd.toFixed(2)}`}
                sub="30% commission on avg usage"
              />
            </div>

            {/* BD table */}
            {data.business_developers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
                No business developers registered yet.
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Customers</th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground">Est. rev / mo</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Since</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.business_developers.map((bd) => (
                      <tr
                        key={bd.id}
                        className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-foreground">{bd.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{bd.email}</td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            {bd.referral_code}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedBd(bd)}
                            className="text-primary underline underline-offset-2 hover:no-underline"
                          >
                            {bd.customer_count}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right text-foreground font-medium">
                          ${bd.estimated_revenue_usd.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(bd.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => handleDelete(bd)}
                            disabled={deleting === bd.email}
                            className="text-xs text-red-500 hover:text-red-700 disabled:opacity-40 transition-colors"
                          >
                            {deleting === bd.email ? 'Removing…' : 'Remove'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
        </>)}
      </div>
    </>
  );
}
