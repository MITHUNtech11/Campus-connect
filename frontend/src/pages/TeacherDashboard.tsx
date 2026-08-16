/**
 * Teacher dashboard — backed by the real Express/Supabase API.
 *
 *   GET   /api/faculty                  → own live status row (teacher_tags)
 *   PATCH /api/faculty/:id/status       → change status / cabin
 *   GET   /api/slots?teacher_id=        → own consultation slots
 *   POST  /api/slots                    → publish a slot
 *   DELETE /api/slots/:id               → remove an unbooked slot
 *   GET   /api/bookings                 → incoming booking requests
 *   PATCH /api/bookings/:id/status      → accept / decline / complete
 *   POST  /api/bookings/:id/no_show     → mark a no-show (docks reputation)
 *   GET   /api/ratings/:teacher_id      → own reviews
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  MapPin,
  Users,
  Plus,
  Trash2,
  X,
  Star,
  Check,
  UserX,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn, averageStars, TEACHER_STATUS_DOT, BOOKING_STATUS_BADGE } from '../lib/utils';
import { format, parseISO } from 'date-fns';
import api from '../lib/api';
import { SLOT_CATEGORIES } from '../types';
import type { Booking, Faculty, Rating, Slot, TeacherStatus, User } from '../types';
import ErrorBanner from '../components/ErrorBanner';

const STATUSES: TeacherStatus[] = ['Available', 'Busy', 'In Class', 'Offline'];

/** Slot-category select labels, keyed off the shared SLOT_CATEGORIES enum. */
const CATEGORY_LABELS: Record<(typeof SLOT_CATEGORIES)[number], string> = {
  Academic: 'Academic (Doubt Solving)',
  'Mock Interview': 'Mock Interview Prep',
  'Resume Review': 'Resume Critique',
  'Career Guidance': 'Career Guidance / Placements',
};

export default function TeacherDashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<Faculty | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    subject: '',
    topic: '',
    date: '',
    time: '',
    duration: 30,
    type: '1-on-1 Consultation',
    slot_category: 'Academic',
  });



  const load = useCallback(async () => {
    try {
      const [facultyRows, slotRows, bookingRows, ratingRows] = await Promise.all([
        api.faculty.list(),
        api.slots.list(user.id),
        api.bookings.list(),
        api.ratings.forTeacher(user.id),
      ]);
      setProfile(facultyRows.find((f) => f.id === user.id) || null);
      setSlots(slotRows);
      setBookings(bookingRows);
      setRatings(ratingRows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const slotsById = useMemo(() => Object.fromEntries(slots.map((s) => [s.id, s])), [slots]);

  const analyticsData = useMemo(() => {
    const statusCounts = {
      COMPLETED: 0,
      PENDING: 0,
      NO_SHOW: 0,
    };
    const teacherBookings = bookings.filter((b) => b.teacher_id === user.id);
    for (const b of teacherBookings) {
      const status = b.status?.toUpperCase();
      if (status in statusCounts) {
        statusCounts[status as keyof typeof statusCounts] += 1;
      }
    }

    const monthlyCounts: Record<string, number> = {};
    for (const b of teacherBookings) {
      if (!b.created_at) continue;
      try {
        const date = parseISO(b.created_at);
        const monthName = format(date, 'MMM');
        monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + 1;
      } catch {}
    }
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIdx = new Date().getMonth();
    const last6Months = [];
    for (let i = 5; i >= 0; i--) {
      const idx = (currentMonthIdx - i + 12) % 12;
      last6Months.push(months[idx]);
    }
    const volumeData = last6Months.map(month => ({
      name: month,
      value: monthlyCounts[month] || 0,
    }));
    const volumeMax = Math.max(...volumeData.map((d) => d.value), 5);

    let positive = 0;
    let neutral = 0;
    let negative = 0;
    for (const r of ratings) {
      const s = String(r.sentiment || 'Positive').toLowerCase();
      if (s.includes('positive') || r.stars >= 4) positive += 1;
      else if (s.includes('negative') || r.stars <= 2) negative += 1;
      else neutral += 1;
    }
    const totalReviews = ratings.length || 1;
    const sentimentPercentages = {
      positive: Math.round((positive / totalReviews) * 100),
      neutral: Math.round((neutral / totalReviews) * 100),
    };

    return {
      statusCounts,
      volumeData,
      volumeMax,
      sentimentPercentages,
    };
  }, [bookings, ratings, user.id]);

  const changeStatus = async (status: TeacherStatus) => {
    setBusy('status');
    setError(null);
    try {
      await api.faculty.updateStatus(user.id, { status });
      setProfile((p) => (p ? { ...p, status } : p));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setBusy(null);
    }
  };

  const createSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy('slot');
    setError(null);
    try {
      const slot = await api.slots.create({
        subject: slotForm.subject,
        topic: slotForm.topic,
        date: slotForm.date || undefined,
        time: slotForm.time,
        duration: Number(slotForm.duration) || 30,
        type: slotForm.type,
        slot_category: slotForm.slot_category as (typeof SLOT_CATEGORIES)[number],
      });
      setSlots((prev) => [slot, ...prev]);
      setShowSlotModal(false);
      setSlotForm({
        subject: '',
        topic: '',
        date: '',
        time: '',
        duration: 30,
        type: '1-on-1 Consultation',
        slot_category: 'Academic',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create slot');
    } finally {
      setBusy(null);
    }
  };

  const deleteSlot = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.slots.remove(id);
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete slot');
    } finally {
      setBusy(null);
    }
  };

  const setBookingStatus = async (id: string, status: Booking['status']) => {
    setBusy(id);
    setError(null);
    try {
      const updated = await api.bookings.setStatus(id, status);
      setBookings((prev) => prev.map((b) => (b.id === id ? updated : b)));
      // The backend frees the slot server-side on decline (bookings.cjs) —
      // patch it locally instead of refetching the whole slot list.
      if (status === 'DECLINED' && updated.slot_id) {
        setSlots((prev) =>
          prev.map((s) => (s.id === updated.slot_id ? { ...s, is_booked: false } : s)),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update booking');
    } finally {
      setBusy(null);
    }
  };

  const markNoShow = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await api.bookings.markNoShow(id);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: 'NO_SHOW', no_show: true } : b)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not mark no-show');
    } finally {
      setBusy(null);
    }
  };

  const avgRating = averageStars(ratings);

  const pending = bookings.filter((b) => b.status === 'PENDING');

  if (loading) {
    return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {error && <ErrorBanner message={error} />}

      {/* Current status */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 shadow-sm text-white relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10">
          <Users className="w-64 h-64" />
        </div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-2xl font-bold mb-1">Current Status</h2>
              <p className="text-slate-400 text-sm">Visible to all students</p>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <Star className="w-4 h-4 text-amber-400 fill-current" />
              <span className="font-bold">{avgRating}</span>
              <span className="text-slate-300 text-sm">({ratings.length})</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Location</p>
              {profile?.cabin_block ? (
                <p className="font-medium flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                  {profile.cabin_block}
                  {profile.cabin_room && `, ${profile.cabin_room}`}
                </p>
              ) : (
                <p className="font-medium text-slate-400">Not checked in</p>
              )}
            </div>

            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-slate-400 text-xs mb-1 uppercase tracking-wider">Availability</p>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-2.5 h-2.5 rounded-full',
                    TEACHER_STATUS_DOT[profile?.status || 'Offline'],
                  )}
                />
                <select
                  value={profile?.status || 'Offline'}
                  onChange={(e) => changeStatus(e.target.value as TeacherStatus)}
                  disabled={busy === 'status'}
                  className="font-medium bg-transparent text-white focus:outline-none appearance-none cursor-pointer hover:text-indigo-200 transition-colors"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s} className="text-slate-900">
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slots */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Consultation Slots</h3>
            <button
              onClick={() => setShowSlotModal(true)}
              className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 px-3 text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> New Slot
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {slots.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No published slots. Create one!
              </div>
            ) : (
              slots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-4 rounded-xl border border-slate-100 flex justify-between items-center gap-3 bg-slate-50 hover:border-indigo-100 transition-colors"
                >
                  <div className="flex gap-4 items-center min-w-0">
                    <div className="w-16 h-14 rounded-xl bg-indigo-100 flex flex-col items-center justify-center text-indigo-700 shrink-0">
                      <span className="text-sm font-bold leading-none">{slot.time}</span>
                      <span className="text-[10px] mt-1">{slot.date}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{slot.topic}</h4>
                      <p className="text-sm text-slate-500 truncate">
                        {slot.subject} • {slot.duration} min
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        'px-2.5 py-1 text-[11px] font-bold rounded-full',
                        slot.is_booked
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700',
                      )}
                    >
                      {slot.is_booked ? 'Booked' : 'Open'}
                    </span>
                    {!slot.is_booked && (
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        disabled={busy === slot.id}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Booking requests */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Booking Requests</h3>
            {pending.length > 0 && (
              <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                {pending.length} pending
              </span>
            )}
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <p className="text-slate-500 text-sm">No students have booked with you yet.</p>
              </div>
            ) : (
              bookings.map((b) => {
                const slot = b.slot_id ? slotsById[b.slot_id] : undefined;
                return (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 space-y-3"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 truncate">
                          {slot ? slot.topic : 'Consultation request'}
                        </h4>
                        {b.student && (
                          <p className="text-xs font-semibold text-indigo-600 mb-1">
                            Booked by:{' '}
                            <Link
                              to={`/profile/${b.student.id}`}
                              className="font-bold hover:underline"
                            >
                              {b.student.name}
                            </Link>
                          </p>
                        )}
                        <p className="text-xs text-slate-500">
                          {slot ? `${slot.date} at ${slot.time}` : 'No slot attached'} • requested{' '}
                          {format(parseISO(b.created_at), 'MMM d')}
                        </p>
                      </div>
                      <span
                        className={cn(
                          'px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0',
                          BOOKING_STATUS_BADGE[b.status],
                        )}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {b.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => setBookingStatus(b.id, 'ACCEPTED')}
                            disabled={busy === b.id}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <Check className="w-3.5 h-3.5" /> Accept
                          </button>
                          <button
                            onClick={() => setBookingStatus(b.id, 'DECLINED')}
                            disabled={busy === b.id}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <X className="w-3.5 h-3.5" /> Decline
                          </button>
                        </>
                      )}
                      {b.status === 'ACCEPTED' && (
                        <>
                          <button
                            onClick={() => setBookingStatus(b.id, 'COMPLETED')}
                            disabled={busy === b.id}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <Check className="w-3.5 h-3.5" /> Mark completed
                          </button>
                          <button
                            onClick={() => markNoShow(b.id)}
                            disabled={busy === b.id}
                            className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 flex items-center gap-1.5 disabled:opacity-60"
                          >
                            <UserX className="w-3.5 h-3.5" /> No-show
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Analytics Dashboard Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Booking volumes chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Consultation Volumes</h3>
            <p className="text-xs text-slate-500 mb-4">Total appointment requests created over the last 6 months.</p>
          </div>
          <div className="w-full">
            <svg viewBox="0 0 400 180" className="w-full h-48">
              {/* Grid Lines */}
              <line x1="30" y1="20" x2="380" y2="20" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="80" x2="380" y2="80" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="30" y1="140" x2="380" y2="140" stroke="#e2e8f0" strokeWidth="1.5" />
              
              {/* Bars */}
              {analyticsData.volumeData.map((d, idx) => {
                const x = 50 + idx * 55;
                const height = d.value > 0 ? (d.value / analyticsData.volumeMax) * 110 : 2; // min height so it shows if 0
                const y = 140 - height;
                return (
                  <g key={idx}>
                    <rect
                      x={x}
                      y={y}
                      width="26"
                      height={height}
                      rx="4"
                      className="fill-indigo-600 hover:fill-indigo-700 transition-colors duration-200"
                    />
                    <text x={x + 13} y="156" textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">{d.name}</text>
                    {d.value > 0 && (
                      <text x={x + 13} y={y - 6} textAnchor="middle" className="text-[10px] fill-slate-700 font-bold">{d.value}</text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Sentiment and status aggregates */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Feedback & Booking Status</h3>
            <p className="text-xs text-slate-500">Overview of review sentiments and booking states.</p>
          </div>
          
          {/* Sentiment bars */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Positive Review Sentiment</span>
                <span className="text-emerald-600">{analyticsData.sentimentPercentages.positive}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${analyticsData.sentimentPercentages.positive}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-600">Neutral Review Sentiment</span>
                <span className="text-amber-600">{analyticsData.sentimentPercentages.neutral}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full transition-all duration-500" style={{ width: `${analyticsData.sentimentPercentages.neutral}%` }}></div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Booking Metrics</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                <p className="text-[9px] text-emerald-600 font-bold uppercase">Done</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{analyticsData.statusCounts.COMPLETED}</p>
              </div>
              <div className="bg-amber-50 p-2 rounded-lg border border-amber-100">
                <p className="text-[9px] text-amber-600 font-bold uppercase">Pending</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{analyticsData.statusCounts.PENDING}</p>
              </div>
              <div className="bg-rose-50 p-2 rounded-lg border border-rose-100">
                <p className="text-[9px] text-rose-600 font-bold uppercase">No-show</p>
                <p className="text-sm font-extrabold text-slate-800 mt-0.5">{analyticsData.statusCounts.NO_SHOW}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Student Reviews</h3>
        {ratings.length === 0 ? (
          <p className="text-sm text-slate-500 py-6 text-center">No reviews yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ratings.slice(0, 6).map((r) => (
              <div key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex items-center gap-1 text-amber-500 text-sm font-bold mb-2">
                  <Star className="w-4 h-4 fill-current" /> {r.stars}.0
                </div>
                <p className="text-slate-700 text-sm leading-relaxed line-clamp-4">{r.review}</p>
                <p className="mt-2 text-[10px] text-slate-400">
                  {format(parseISO(r.created_at), 'MMM d, yyyy')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slot creation modal */}
      {showSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Create New Slot</h2>
              <button
                onClick={() => setShowSlotModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={createSlot} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input
                  required
                  value={slotForm.subject}
                  onChange={(e) => setSlotForm({ ...slotForm, subject: e.target.value })}
                  placeholder="e.g. Database Systems"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Topic</label>
                <input
                  required
                  value={slotForm.topic}
                  onChange={(e) => setSlotForm({ ...slotForm, topic: e.target.value })}
                  placeholder="e.g. Normalization doubts"
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={slotForm.date}
                    onChange={(e) => setSlotForm({ ...slotForm, date: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={slotForm.time}
                    onChange={(e) => setSlotForm({ ...slotForm, time: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duration (min)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={180}
                    value={slotForm.duration}
                    onChange={(e) => setSlotForm({ ...slotForm, duration: Number(e.target.value) })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select
                    value={slotForm.type}
                    onChange={(e) => setSlotForm({ ...slotForm, type: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                  >
                    <option value="1-on-1 Consultation">1-on-1 Consultation</option>
                    <option value="Group Session">Group Session</option>
                    <option value="Lab Help">Lab Help</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Consultation Category</label>
                <select
                  value={slotForm.slot_category}
                  onChange={(e) => setSlotForm({ ...slotForm, slot_category: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                >
                  {SLOT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={busy === 'slot'}
                className="w-full py-3 mt-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-70"
              >
                {busy === 'slot' ? 'Creating…' : 'Create Slot'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
