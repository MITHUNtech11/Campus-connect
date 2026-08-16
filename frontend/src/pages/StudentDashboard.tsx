/**
 * Student dashboard — every panel is backed by the real Express/Supabase API.
 *
 *   GET  /api/faculty                → mentor directory + live status
 *   POST /api/ai/recommend           → backend's own keyword-vector matcher
 *   GET  /api/bookings               → the caller's own bookings
 *   DELETE /api/bookings/:id         → cancel
 *
 * Booking a slot and leaving a review are NOT handled here: both live on the
 * teacher's profile page (pages/Profile.tsx), which every "View Profile & Book"
 * link and AI recommendation on this page routes to. This page previously also
 * carried a full duplicate of that flow in a modal, but nothing ever opened it
 * — see the note on the faculty directory below.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, MapPin, ShieldCheck, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, TEACHER_STATUS_DOT, BOOKING_STATUS_TEXT } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import api, { avatarSrc } from '../lib/api';
import type { AiRecommendation, Booking, Faculty, User } from '../types';
import ErrorBanner from '../components/ErrorBanner';

export default function StudentDashboard({ user }: { user: User }) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // AI mentor search (backend /api/ai/recommend)
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [recommendations, setRecommendations] = useState<AiRecommendation[] | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [facultyRows, bookingRows] = await Promise.all([
        api.faculty.list(),
        api.bookings.list(),
      ]);
      setFaculty(facultyRows);
      setBookings(bookingRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /** Per-block mentor counts, derived from live teacher_tags data. */
  const blockActivity = useMemo(() => {
    const map = new Map<string, { total: number; available: number }>();
    for (const f of faculty) {
      const block = f.cabin_block || 'Unassigned';
      const entry = map.get(block) || { total: 0, available: 0 };
      entry.total += 1;
      if (f.status === 'Available') entry.available += 1;
      map.set(block, entry);
    }
    return [...map.entries()]
      .map(([block, v]) => ({ block, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [faculty]);

  const facultyById = useMemo(
    () => Object.fromEntries(faculty.map((f) => [f.id, f])),
    [faculty],
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setRecommendations(null);
    try {
      const recs = await api.ai.recommend(searchQuery.trim());
      setRecommendations(recs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recommendation failed');
    } finally {
      setIsSearching(false);
    }
  };

  const cancelBooking = async (id: string) => {
    try {
      await api.bookings.cancel(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel booking');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {error && <ErrorBanner message={error} />}

      {/* Hero + reputation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <h1 className="text-3xl font-bold mb-2">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-indigo-100 max-w-md">
              Find the right mentor for your doubts, track campus activity, and build your academic
              reputation.
            </p>

            <form onSubmit={handleSearch} className="mt-8 relative max-w-xl">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Sparkles className="h-5 w-5 text-indigo-400" />
              </div>
              <input
                type="text"
                placeholder="Describe your doubt: 'help with SQL joins'"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-12 pr-28 py-4 rounded-xl border-0 ring-1 ring-white/20 bg-white/10 text-white placeholder:text-indigo-200 focus:ring-2 focus:ring-white focus:bg-white/20 transition-all backdrop-blur-sm"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute inset-y-2 right-2 px-4 bg-white text-indigo-900 font-medium rounded-lg hover:bg-indigo-50 transition-colors disabled:opacity-75"
              >
                {isSearching ? <span className="animate-pulse">Matching…</span> : 'Match me'}
              </button>
            </form>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-slate-700">Reputation Score</h3>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900">{user.reputation_score}</span>
              <span className="text-sm font-medium text-slate-500">/ 100</span>
            </div>
            <p className="text-sm text-slate-500 mt-2">
              {user.no_shows > 0
                ? `${user.no_shows} no-show${user.no_shows > 1 ? 's' : ''} on record`
                : 'No missed consultations — keep it up.'}
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Next tier: Priority Booking</span>
              <span>100</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, Math.max(0, user.reputation_score))}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI recommendations */}
      {recommendations && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-lg">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-indigo-900 mb-4">
                Recommended mentors for “{searchQuery}”
              </h3>

              {recommendations.length === 0 ? (
                <p className="text-indigo-800 text-sm">
                  No faculty profiles matched that topic yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec) => {
                    const teacher = facultyById[rec.teacher_id];
                    if (!teacher) return null;
                    return (
                      <div
                        key={rec.teacher_id}
                        className="bg-white rounded-xl p-4 border border-indigo-100 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={avatarSrc(teacher)}
                            alt=""
                            className="w-12 h-12 rounded-full ring-2 ring-indigo-50 bg-white shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 truncate">{teacher.name}</h4>
                            <p className="text-sm text-slate-500 truncate">{rec.reason}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md">
                            {(rec.score * 100).toFixed(0)}% match
                          </span>
                          <Link
                            to={`/profile/${rec.teacher_id}`}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors text-sm"
                          >
                            View
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Live activity + my bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Live Campus Activity</h2>
            <span className="text-sm text-slate-500">from faculty check-ins</span>
          </div>

          {blockActivity.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No faculty have checked in to a block yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {blockActivity.map(({ block, total, available }) => (
                <div
                  key={block}
                  className={cn(
                    'p-4 rounded-xl border transition-colors',
                    available >= 3
                      ? 'bg-emerald-50 border-emerald-100'
                      : available >= 1
                        ? 'bg-amber-50 border-amber-100'
                        : 'bg-slate-50 border-slate-200',
                  )}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-slate-900 text-sm">{block}</span>
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full mt-1.5',
                        available >= 3
                          ? 'bg-emerald-500'
                          : available >= 1
                            ? 'bg-amber-500'
                            : 'bg-slate-400',
                      )}
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    {available} of {total} available
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">My Bookings</h2>
          {bookings.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center">
              No consultations booked yet.
            </p>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {bookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {facultyById[b.teacher_id] ? (
                        <Link
                          to={`/profile/${b.teacher_id}`}
                          className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                        >
                          {facultyById[b.teacher_id].name}
                        </Link>
                      ) : (
                        'Faculty member'
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(parseISO(b.created_at), 'MMM d')} •{' '}
                      <span className={cn('font-semibold', BOOKING_STATUS_TEXT[b.status])}>
                        {b.status}
                      </span>
                    </p>
                  </div>
                  <button
                    onClick={() => cancelBooking(b.id)}
                    title="Cancel booking"
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Faculty directory.
          Each card links to /profile/:id — that page loads the teacher's open
          slots and reviews and owns the book/review actions, so this page
          deliberately holds no booking UI of its own. */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900">Faculty Directory</h2>
          <div className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${faculty.length} teachers found`}
          </div>
        </div>

        {!loading && faculty.length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">
            No teacher accounts exist in the database yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {faculty.map((teacher) => {
              const isAvailable = teacher.status === 'Available';
              return (
                <div
                  key={teacher.id}
                  className={cn(
                    "p-5 rounded-2xl border transition-all flex flex-col hover:shadow-md",
                    isAvailable
                      ? "bg-emerald-50/65 border-emerald-100/80 hover:border-emerald-300 hover:bg-emerald-50"
                      : "bg-slate-50 border-slate-200/60 hover:border-slate-300 opacity-80 hover:opacity-100"
                  )}
                >
                  <div className="flex gap-4 items-start mb-4">
                    <img
                      src={avatarSrc(teacher)}
                      alt={teacher.name}
                      className="w-14 h-14 rounded-xl ring-2 ring-white shadow-sm bg-white"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight truncate">
                        {teacher.name}
                      </h3>
                      <p className="text-sm text-slate-500 truncate">{teacher.department}</p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-6 flex-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" /> {teacher.reputation_score}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1.5 truncate">
                        <MapPin className="w-4 h-4" /> {teacher.cabin_block || 'Campus'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm pt-1">
                      <span className="text-slate-500">Status</span>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            TEACHER_STATUS_DOT[teacher.status] || 'bg-slate-400',
                          )}
                        />
                        <span className="font-medium text-slate-700">{teacher.status}</span>
                      </div>
                    </div>
                    {teacher.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-2">
                        {teacher.subjects.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 bg-white text-slate-600 text-[11px] font-medium rounded-md border border-slate-200"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/profile/${teacher.id}`}
                    className={cn(
                      "w-full py-2.5 border font-medium rounded-xl transition-colors text-center text-sm",
                      isAvailable
                        ? "bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300"
                    )}
                  >
                    View Profile & Book
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
