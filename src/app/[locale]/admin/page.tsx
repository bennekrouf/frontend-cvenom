'use client';

import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import { useLocale } from 'next-intl';
import SmtpConfigPanel from '@/components/admin/SmtpConfigPanel';
import CreditManagementPanel from '@/components/admin/CreditManagementPanel';

const ADMIN_EMAIL = 'mohamed.bennekrouf@gmail.com';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const locale = useLocale();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-slate-300">Sign in to access the admin panel.</p>
          <button
            onClick={() => signInWithGoogle()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded font-medium"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (user.email?.toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-red-400 text-sm">Access denied.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Admin Settings</h1>
          <a
            href={`/${locale}/editor`}
            className="text-sm font-medium px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 transition-colors"
          >
            ← Back to Studio
          </a>
        </div>

        <div className="space-y-10">
          <section className="bg-slate-800 rounded-lg p-6">
            <CreditManagementPanel />
          </section>
          <section className="bg-slate-800 rounded-lg p-6">
            <SmtpConfigPanel />
          </section>
        </div>
      </div>
    </div>
  );
}
