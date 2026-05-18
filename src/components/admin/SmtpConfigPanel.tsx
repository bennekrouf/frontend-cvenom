'use client';

import { useState, useEffect } from 'react';
import { getSmtpConfig, saveSmtpConfig, SmtpConfig } from '@/lib/api';
import { toast } from 'sonner';

export default function SmtpConfigPanel() {
  const [config, setConfig] = useState<SmtpConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [from, setFrom] = useState('');

  useEffect(() => {
    getSmtpConfig()
      .then((cfg) => {
        setConfig(cfg);
        setHost(cfg.smtp_host ?? '');
        setPort(String(cfg.smtp_port ?? 587));
        setUser(cfg.smtp_user ?? '');
        setFrom(cfg.email_from ?? '');
      })
      .catch(() => toast.error('Failed to load SMTP config'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, string | number> = {};
      if (host)     body.smtp_host = host;
      if (port)     body.smtp_port = Number(port);
      if (user)     body.smtp_user = user;
      if (password) body.smtp_password = password;
      if (from)     body.email_from = from;

      await saveSmtpConfig(body);
      setConfig((prev) => prev ? { ...prev, smtp_host: host, smtp_port: Number(port), smtp_user: user, email_from: from, has_password: !!password || prev.has_password } : prev);
      setPassword('');
      toast.success('SMTP config saved — active immediately, no restart needed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>;

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-white mb-1">Email / SMTP</h2>
      <p className="text-sm text-slate-400 mb-6">
        Changes take effect immediately — no server restart required.
        Recommended: <a href="https://app.brevo.com" target="_blank" rel="noreferrer" className="text-indigo-400 underline">Brevo</a> (free 300 emails/day).
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs text-slate-400 mb-1">SMTP Host</label>
            <input
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp-relay.brevo.com"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Port</label>
            <input
              value={port}
              onChange={(e) => setPort(e.target.value)}
              placeholder="587"
              type="number"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">SMTP Login (username)</label>
          <input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            placeholder="your-brevo-login@email.com"
            type="email"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">
            SMTP Password / API Key
            {config?.has_password && <span className="ml-2 text-green-400">✓ saved</span>}
          </label>
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={config?.has_password ? '(leave blank to keep current)' : 'Enter password or API key'}
            type="password"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">From address</label>
          <input
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            placeholder="noreply@cvenom.com"
            type="email"
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm rounded font-medium"
        >
          {saving ? 'Saving…' : 'Save SMTP config'}
        </button>
      </form>
    </div>
  );
}
