'use client';

import { useState, useEffect } from 'react';
import { adminGetCreditUsers, adminAddCredits, AdminUserCredit } from '@/lib/api';
import { toast } from 'sonner';
import { FiSearch, FiPlus, FiMinus, FiRefreshCw } from 'react-icons/fi';

// Hardcoded cost rules — mirrors the Rust backend constants.
// A future improvement could fetch these from a backend config endpoint.
const CREDIT_RULES = [
  { operation: 'CV Generation (PDF)',   cost: 20 },
  { operation: 'Cover Letter',          cost: 20 },
  { operation: 'Portfolio Generation',   cost: 20 },
  { operation: 'ATS Optimization',       cost: 5  },
  { operation: 'CV Translation',         cost: 5  },
  { operation: 'CV Import (upload)',     cost: 4  },
  { operation: 'Welcome Bonus',          cost: -100, label: 'granted' },
];

export default function CreditManagementPanel() {
  const [users, setUsers] = useState<AdminUserCredit[]>([]);
  const [totalCredits, setTotalCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add credits form
  const [selectedEmail, setSelectedEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await adminGetCreditUsers();
      setUsers(res.users);
      setTotalCredits(res.total_credits);
    } catch {
      toast.error('Failed to load credit users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filtered = users.filter(
    u => u.email.toLowerCase().includes(search.toLowerCase()) ||
         u.tenant_name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(amount, 10);
    if (!selectedEmail || !num) {
      toast.error('Email and a non-zero amount are required');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminAddCredits(selectedEmail, num, description || undefined);
      toast.success(`Credits updated! New balance: ${res.new_balance}`);
      setAmount('');
      setDescription('');
      setSelectedEmail('');
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update credits');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* ── Section 1: Credit Cost Rules ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Credit Cost Rules</h2>
        <p className="text-sm text-slate-400 mb-4">
          These costs are defined in the backend code. To change them, update the Rust source and redeploy.
        </p>
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-slate-700/50">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-slate-300">Operation</th>
                <th className="text-right px-4 py-2 font-medium text-slate-300">Credits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {CREDIT_RULES.map(r => (
                <tr key={r.operation} className="hover:bg-slate-700/30">
                  <td className="px-4 py-2">{r.operation}</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {r.label
                      ? <span className="text-green-400">+{Math.abs(r.cost)} {r.label}</span>
                      : <span className="text-red-400">-{r.cost}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Adjust User Credits ── */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Adjust User Credits</h2>
        <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end mb-6">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-slate-400 mb-1">User email</label>
            <input
              type="email"
              value={selectedEmail}
              onChange={e => setSelectedEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="w-28">
            <label className="block text-xs text-slate-400 mb-1">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="+100"
              className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-slate-400 mb-1">Reason (optional)</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="e.g. Support compensation"
              className="w-full px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Updating...' : 'Apply'}
          </button>
        </form>
      </div>

      {/* ── Section 3: All Users ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">
            All Users
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({users.length} users &middot; {totalCredits} total credits)
            </span>
          </h2>
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2 hover:bg-slate-700 rounded-md transition-colors"
            title="Refresh"
          >
            <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-9 pr-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">Loading users...</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-slate-700 max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-slate-300">Email</th>
                  <th className="text-left px-4 py-2 font-medium text-slate-300">Name</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-300">Balance</th>
                  <th className="text-right px-4 py-2 font-medium text-slate-300">Joined</th>
                  <th className="text-center px-4 py-2 font-medium text-slate-300">Quick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filtered.map(u => (
                  <tr key={u.email} className="hover:bg-slate-700/30">
                    <td className="px-4 py-2 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-2">{u.tenant_name}</td>
                    <td className={`px-4 py-2 text-right font-mono ${u.balance <= 0 ? 'text-red-400' : u.balance <= 10 ? 'text-amber-400' : 'text-green-400'}`}>
                      {u.balance}
                    </td>
                    <td className="px-4 py-2 text-right text-xs text-slate-400">
                      {new Date(u.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button
                          onClick={() => { setSelectedEmail(u.email); setAmount('50'); setDescription('Admin top-up'); }}
                          className="p-1 rounded hover:bg-green-600/30 text-green-400"
                          title="Add 50 credits"
                        >
                          <FiPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setSelectedEmail(u.email); setAmount('-50'); setDescription('Admin deduction'); }}
                          className="p-1 rounded hover:bg-red-600/30 text-red-400"
                          title="Remove 50 credits"
                        >
                          <FiMinus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
