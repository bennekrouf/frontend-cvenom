'use client';

import React, { useEffect, useState } from 'react';
import { adminGetFeedbacks, type FeedbackRow } from '@/lib/api';

const SCORE_LABELS = ['', 'Very dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very satisfied'];
const SCORE_EMOJIS = ['', '\u{1F621}', '\u{1F61E}', '\u{1F610}', '\u{1F60A}', '\u{1F929}'];
const SCORE_COLORS = ['', 'text-red-400', 'text-orange-400', 'text-yellow-400', 'text-lime-400', 'text-emerald-400'];

export default function FeedbackPanel() {
  const [feedbacks, setFeedbacks] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await adminGetFeedbacks();
        setFeedbacks(res.feedbacks);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load feedbacks');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = feedbacks.filter(
    (f) =>
      f.email.toLowerCase().includes(search.toLowerCase()) ||
      f.reason.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = feedbacks.length
    ? (feedbacks.reduce((s, f) => s + f.score, 0) / feedbacks.length).toFixed(1)
    : '—';
  const contactCount = feedbacks.filter((f) => f.contact_ok).length;
  const creditCount = feedbacks.filter((f) => f.credits_granted).length;

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">User Feedback</h2>

      {loading && <p className="text-slate-400 text-sm">Loading...</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}

      {!loading && !error && (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="bg-slate-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{feedbacks.length}</p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{avgScore}</p>
              <p className="text-xs text-slate-400">Avg Score</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{creditCount}</p>
              <p className="text-xs text-slate-400">Credits Given</p>
            </div>
            <div className="bg-slate-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold">{contactCount}</p>
              <p className="text-xs text-slate-400">Contactable</p>
            </div>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search by email or reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded-md bg-slate-700 border border-slate-600 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Table */}
          <div className="overflow-x-auto rounded-lg border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-left text-xs text-slate-400">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Reason</th>
                  <th className="px-3 py-2 text-center">Credits</th>
                  <th className="px-3 py-2 text-center">Contact</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                      No feedback yet.
                    </td>
                  </tr>
                )}
                {filtered.map((f) => (
                  <tr key={f.id} className="border-t border-slate-700 hover:bg-slate-750">
                    <td className="px-3 py-2 whitespace-nowrap text-slate-400 text-xs">
                      {new Date(f.created_at + 'Z').toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">{f.email}</td>
                    <td className={`px-3 py-2 whitespace-nowrap ${SCORE_COLORS[f.score]}`}>
                      <span className="mr-1">{SCORE_EMOJIS[f.score]}</span>
                      {SCORE_LABELS[f.score]}
                    </td>
                    <td className="px-3 py-2 text-slate-300 max-w-xs truncate" title={f.reason}>
                      {f.reason || <span className="text-slate-600 italic">empty</span>}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {f.credits_granted ? (
                        <span className="text-emerald-400 text-xs font-medium">+10</span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {f.contact_ok ? (
                        <span className="text-emerald-400">Yes</span>
                      ) : (
                        <span className="text-slate-600">No</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
