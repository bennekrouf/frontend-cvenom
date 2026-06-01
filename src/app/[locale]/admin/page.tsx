'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { signInWithGoogle } from '@/lib/firebase';
import { useLocale } from 'next-intl';
import SmtpConfigPanel from '@/components/admin/SmtpConfigPanel';
import CreditManagementPanel from '@/components/admin/CreditManagementPanel';
import FeedbackPanel from '@/components/admin/FeedbackPanel';
import ModelConfigPanel from '@/components/admin/ModelConfigPanel';

const ADMIN_EMAIL = 'mohamed.bennekrouf@gmail.com';

const TABS = [
  { id: 'credits', label: 'Credits' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'smtp', label: 'SMTP' },
  { id: 'models', label: 'Models' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function AdminPage() {
  const { user, loading } = useAuth();
  const locale = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>('credits');

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

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 bg-slate-800 rounded-lg p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="bg-slate-800 rounded-lg p-6">
          {activeTab === 'credits' && <CreditManagementPanel />}
          {activeTab === 'feedback' && <FeedbackPanel />}
          {activeTab === 'smtp' && <SmtpConfigPanel />}
          {activeTab === 'models' && <ModelConfigPanel />}
        </section>
      </div>
    </div>
  );
}
