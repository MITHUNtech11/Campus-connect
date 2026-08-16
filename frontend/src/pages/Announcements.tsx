/**
 * Campus announcements — /api/announcements (public.announcements).
 *
 *   GET    /api/announcements          → everyone (pinned first, then newest)
 *   POST   /api/announcements          → teacher/admin  { title, content }
 *   PATCH  /api/announcements/:id/pin  → teacher/admin, toggles pinned
 *   DELETE /api/announcements/:id      → teacher/admin
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, Pin, PinOff, Trash2, Plus, X } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { cn } from '../lib/utils';
import api from '../lib/api';
import type { Announcement, User } from '../types';
import ErrorBanner from '../components/ErrorBanner';

/** Pinned first, then newest — mirrors the backend's own ordering (announcements.cjs). */
function sortAnnouncements(items: Announcement[]): Announcement[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export default function Announcements({ user }: { user: User }) {
  const canManage = user.role === 'teacher' || user.role === 'admin';

  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });

  const load = async () => {
    try {
      setItems(await api.announcements.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('create');
    setError(null);
    try {
      const created = await api.announcements.create({
        title: form.title.trim(),
        content: form.content.trim(),
      });
      setItems((prev) => sortAnnouncements([created, ...prev]));
      setForm({ title: '', content: '' });
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish the announcement');
    } finally {
      setBusy(null);
    }
  };

  const togglePin = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const updated = await api.announcements.togglePin(id);
      setItems((prev) => sortAnnouncements(prev.map((a) => (a.id === id ? updated : a))));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the pin');
    } finally {
      setBusy(null);
    }
  };

  const remove = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.announcements.remove(id);
      setItems((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the announcement');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          <p className="text-slate-500 mt-1">Campus-wide notices from faculty and administration.</p>
        </div>

        {canManage && (
          <button
            onClick={() => setShowForm(true)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Announcement
          </button>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-slate-500 animate-pulse">Loading announcements…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <Megaphone className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-slate-500 font-medium">Nothing has been announced yet.</h3>
          </div>
        ) : (
          items.map((a) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                'rounded-2xl p-6 border shadow-sm',
                a.pinned ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200',
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    {a.pinned && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-1">
                        <Pin className="w-3 h-3" /> Pinned
                      </span>
                    )}
                    {a.author && (
                      <span className="text-slate-500 text-xs font-semibold">
                        By{' '}
                        {a.posted_by ? (
                          <Link
                            to={`/profile/${a.posted_by}`}
                            className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                          >
                            {a.author.name}
                          </Link>
                        ) : (
                          a.author.name
                        )}
                        {' • '}
                      </span>
                    )}
                    <span className="text-slate-400 text-xs">
                      {format(parseISO(a.created_at), 'MMM d, yyyy • h:mm a')}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 mb-2">{a.title}</h2>
                  <p className="text-slate-600 leading-relaxed whitespace-pre-line">{a.content}</p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => togglePin(a.id)}
                      disabled={busy === a.id}
                      title={a.pinned ? 'Unpin' : 'Pin to top'}
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {a.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => remove(a.id)}
                      disabled={busy === a.id}
                      title="Delete"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">New announcement</h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={create} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Library hours extended"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  required
                  rows={5}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="What do students and faculty need to know?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={busy === 'create'}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {busy === 'create' ? 'Publishing…' : 'Publish'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
