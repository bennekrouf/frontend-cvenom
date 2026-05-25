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

interface AdminAddCreditsResponse {
  success: boolean;
  email: string;
  amount: number;
  new_balance: number;
  description: string | null;
}

async function adminAddCredits(email: string, amount: number, description?: string): Promise<AdminAddCreditsResponse> {
  return apiRequest('/admin/credits', {
    method: 'POST',
    requireAuth: true,
    body: { email, amount, ...(description ? { description } : {}) },
  });
}

// ── Credits tab ───────────────────────────────────────────────────────────────

function TransactionDrawer({ email, onClose, onBalanceChanged }: { email: string; onClose: () => void; onBalanceChanged?: () => void }) {
  const [data, setData] = useState<AdminUserTransactionsResponse | null>(null);
  const [error, setError] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditDesc, setCreditDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadTransactions = useCallback(() => {
    fetchUserTransactions(email)
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, [email]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  const handleAddCredits = async () => {
    const amount = parseInt(creditAmount, 10);
    if (!amount || amount === 0) return;
    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await adminAddCredits(email, amount, creditDesc || undefined);
      setSubmitMsg({ ok: true, text: `${amount > 0 ? '+' : ''}${amount} credits. New balance: ${res.new_balance}` });
      setCreditAmount('');
      setCreditDesc('');
      loadTransactions();
      onBalanceChanged?.();
    } catch (e) {
      setSubmitMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed' });
    } finally {
      setSubmitting(false);
    }
  };

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

        {/* ── Add / remove credits form ── */}
        <div className="px-6 py-4 border-b border-border bg-muted/30">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Adjust credits</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input
                type="number"
                value={creditAmount}
                onChange={e => setCreditAmount(e.target.value)}
                placeholder="Amount (e.g. 100 or -20)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={creditDesc}
                onChange={e => setCreditDesc(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <button
              onClick={handleAddCredits}
              disabled={submitting || !creditAmount || parseInt(creditAmount, 10) === 0}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : 'Apply'}
            </button>
          </div>
          {submitMsg && (
            <p className={`text-xs mt-2 ${submitMsg.ok ? 'text-green-600' : 'text-red-500'}`}>
              {submitMsg.text}
            </p>
          )}
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
      {selected && <TransactionDrawer email={selected} onClose={() => setSelected(null)} onBalanceChanged={load} />}

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

// ── Commissions tab ───────────────────────────────────────────────────────────

interface CommissionGroup {
  referral_code: string;
  bd_name: string;
  bd_email: string;
  pending_count: number;
  pending_dollars: number;
  paid_dollars: number;
}

async function fetchCommissions(): Promise<{
  success: boolean;
  total_pending_dollars: number;
  total_paid_dollars: number;
  groups: CommissionGroup[];
}> {
  return apiRequest('/admin/commissions', { requireAuth: true });
}

async function markPaid(referral_code: string): Promise<{ success: boolean; rows_updated: number; total_paid_dollars: number }> {
  return apiRequest('/admin/commissions/pay', {
    method: 'POST',
    body: { referral_code },
    requireAuth: true,
  });
}

function AdminCommissionsTab() {
  const [data, setData] = useState<{ total_pending_dollars: number; total_paid_dollars: number; groups: CommissionGroup[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetchCommissions()
      .then(setData)
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkPaid = async (group: CommissionGroup) => {
    if (!confirm(`Mark $${group.pending_dollars.toFixed(2)} as paid to ${group.bd_name} (${group.bd_email})?`)) return;
    setPaying(group.referral_code);
    try {
      await markPaid(group.referral_code);
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to mark as paid');
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-5">
            <p className="text-xs text-amber-700 dark:text-amber-400 uppercase tracking-wide">Pending payout</p>
            <p className="text-2xl font-bold text-amber-800 dark:text-amber-300 mt-1">
              ${data.total_pending_dollars.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 p-5">
            <p className="text-xs text-green-700 dark:text-green-400 uppercase tracking-wide">Total paid out</p>
            <p className="text-2xl font-bold text-green-800 dark:text-green-300 mt-1">
              ${data.total_paid_dollars.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">BDs with earnings</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {data.groups.filter(g => g.pending_dollars > 0 || g.paid_dollars > 0).length}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={load} className="px-4 py-2 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">
          Refresh
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && data && (
        data.groups.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground text-sm">
            No commissions yet. They appear here when referred customers purchase credits.
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">BD</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pending sales</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Pending commission</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Total paid</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.groups.map(g => (
                  <tr key={g.referral_code} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{g.bd_name}</p>
                      <p className="text-xs text-muted-foreground">{g.bd_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{g.referral_code}</span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{g.pending_count}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-medium ${g.pending_dollars > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                        ${g.pending_dollars.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                      ${g.paid_dollars.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {g.pending_dollars > 0 && (
                        <button
                          onClick={() => handleMarkPaid(g)}
                          disabled={paying === g.referral_code}
                          className="text-xs px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
                        >
                          {paying === g.referral_code ? 'Paying…' : 'Mark paid'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
      <p className="text-xs text-muted-foreground">
        "Mark paid" sets all pending commissions for that BD to paid status. Record actual bank transfers separately.
      </p>
    </div>
  );
}

// ── Models tab ────────────────────────────────────────────────────────────────

const PROVIDERS = ['claude', 'cohere', 'deepseek'] as const;
type Provider = typeof PROVIDERS[number];

const KNOWN_MODELS: Record<Provider, string[]> = {
  claude:   ['claude-sonnet-4-6', 'claude-haiku-4-5-20251001', 'claude-opus-4-7', 'claude-sonnet-4-5-20250929'],
  cohere:   ['command-r7b-12-2024', 'command-a-03-2025', 'command-r-plus'],
  deepseek: ['deepseek-v4-pro', 'deepseek-v4-flash', 'deepseek-chat', 'deepseek-reasoner'],
};

const OPERATIONS = [
  { key: 'cv_import',      label: 'CV Import / Extraction' },
  { key: 'translation',    label: 'Translation' },
  { key: 'job_matching',   label: 'Job Matching' },
  { key: 'cv_optimization',label: 'CV Optimisation' },
  { key: 'cover_letter',   label: 'Cover Letter' },
  { key: 'portfolio',      label: 'Portfolio Generation' },
] as const;

type OperationKey = typeof OPERATIONS[number]['key'];

interface ProviderModelConfig {
  model: string;
  max_tokens: number;
  temperature: number;
  api_key_masked?: string;
  api_key?: string;
}

interface ModelConfigData {
  providers: Record<OperationKey, string>;
  claude?: ProviderModelConfig;
  cohere?: ProviderModelConfig;
  deepseek?: ProviderModelConfig;
  config_path?: string;
}

async function fetchModelConfig(): Promise<{ success: boolean; config: ModelConfigData; config_path: string }> {
  return apiRequest('/admin/models', { requireAuth: true });
}

async function saveModelConfig(data: ModelConfigData): Promise<{ success: boolean; message: string; restarted: boolean }> {
  return apiRequest('/admin/models', { method: 'POST', body: data, requireAuth: true });
}

function AdminModelsTab() {
  const [config, setConfig] = useState<ModelConfigData | null>(null);
  const [configPath, setConfigPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(() => {
    setLoading(true); setError('');
    fetchModelConfig()
      .then(r => { setConfig(r.config); setConfigPath(r.config_path); })
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setProvider = (op: OperationKey, provider: string) => {
    if (!config) return;
    setConfig({ ...config, providers: { ...config.providers, [op]: provider } });
  };

  const setModel = (provider: Provider, model: string) => {
    if (!config) return;
    const existing = config[provider] ?? { model: '', max_tokens: 4000, temperature: 0.1 };
    setConfig({ ...config, [provider]: { ...existing, model } });
  };

  const setMaxTokens = (provider: Provider, max_tokens: number) => {
    if (!config) return;
    const existing = config[provider] ?? { model: '', max_tokens: 4000, temperature: 0.1 };
    setConfig({ ...config, [provider]: { ...existing, max_tokens } });
  };

  const setApiKey = (provider: Provider, api_key: string) => {
    if (!config) return;
    const existing = config[provider] ?? { model: '', max_tokens: 4000, temperature: 0.1 };
    setConfig({ ...config, [provider]: { ...existing, api_key } });
  };

  const save = async () => {
    if (!config) return;
    setSaving(true); setError(''); setNotice('');
    try {
      const result = await saveModelConfig(config);
      setNotice(result.message);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      {error && <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {notice && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} className="ml-4 text-green-600 hover:text-green-800">×</button>
        </div>
      )}

      {config && (<>
        {/* Operation → provider mapping */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-1">Provider per operation</h2>
          <p className="text-xs text-muted-foreground mb-4">
            Config file: <code className="font-mono">{configPath}</code>
          </p>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Operation</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Provider</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Endpoint</th>
                </tr>
              </thead>
              <tbody>
                {OPERATIONS.map(op => (
                  <tr key={op.key} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium text-foreground">{op.label}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {PROVIDERS.map(p => (
                          <button
                            key={p}
                            onClick={() => setProvider(op.key, p)}
                            className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                              config.providers[op.key] === p
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-primary/40'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-muted-foreground font-mono">
                        /{op.key.replace('_', '-')}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Provider model settings */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-4">Model settings per provider</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {PROVIDERS.map(provider => {
              const cfg = config[provider];
              const isUsed = Object.values(config.providers).includes(provider);
              return (
                <div key={provider} className={`rounded-xl border p-4 flex flex-col gap-3 ${isUsed ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/20 opacity-60'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground capitalize">{provider}</h3>
                    {isUsed && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">in use</span>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">Model</label>
                    <input
                      list={`${provider}-models`}
                      value={cfg?.model ?? ''}
                      onChange={e => setModel(provider, e.target.value)}
                      placeholder="model name"
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <datalist id={`${provider}-models`}>
                      {KNOWN_MODELS[provider].map(m => <option key={m} value={m} />)}
                    </datalist>
                    <label className="text-xs font-medium text-muted-foreground mt-1">Max tokens</label>
                    <input
                      type="number"
                      value={cfg?.max_tokens ?? 4000}
                      onChange={e => setMaxTokens(provider, parseInt(e.target.value) || 4000)}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <label className="text-xs font-medium text-muted-foreground mt-1">API Key</label>
                    <input
                      type="password"
                      value={cfg?.api_key ?? ''}
                      onChange={e => setApiKey(provider, e.target.value)}
                      placeholder={cfg?.api_key_masked || 'Using env variable'}
                      className="w-full px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {cfg?.api_key_masked && !cfg?.api_key && (
                      <p className="text-[10px] text-muted-foreground">Current: {cfg.api_key_masked}</p>
                    )}
                    {!cfg?.api_key_masked && !cfg?.api_key && (
                      <p className="text-[10px] text-muted-foreground">Fallback: env ${provider.toUpperCase()}_API_KEY</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={save}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {saving ? 'Saving & restarting…' : 'Save & restart cv-import'}
          </button>
          <button onClick={load} className="px-4 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">
            Reload
          </button>
          <p className="text-xs text-muted-foreground">
            cv-import will restart automatically (~2s downtime). Changes take effect immediately after.
          </p>
        </div>
      </>)}
    </div>
  );
}

type AdminTab = 'bd' | 'credits' | 'commissions' | 'models';

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
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← CV Editor
            </a>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin</h1>
              <p className="text-muted-foreground text-sm mt-1">{user.email}</p>
            </div>
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
          {(['bd', 'commissions', 'credits', 'models'] as AdminTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'bd' ? '👥 Business Developers'
                : tab === 'commissions' ? '💰 Commissions'
                : tab === 'credits' ? '💳 Credits'
                : '🤖 Models'}
            </button>
          ))}
        </div>

        {/* Models tab */}
        {activeTab === 'models' && <AdminModelsTab />}

        {/* Commissions tab */}
        {activeTab === 'commissions' && <AdminCommissionsTab />}

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
