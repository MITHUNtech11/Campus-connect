import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { avatarFor, avatarSrc } from '../lib/api';
import type { User, Booking, Slot, Rating, TeacherStatus } from '../types';
import {
  Mail,
  Calendar,
  ShieldCheck,
  Award,
  MessageSquare,
  MapPin,
  Clock,
  Pencil,
  Check,
  Shuffle,
  ChevronLeft,
  Star,
  AlertCircle,
} from 'lucide-react';
import {
  cn,
  averageStars,
  avatarCandidates,
  parseCsv,
  toCsv,
  TEACHER_STATUS_DOT,
  TEACHER_STATUS_BADGE,
  BOOKING_STATUS_BADGE,
} from '../lib/utils';
import { format, parseISO } from 'date-fns';
import ErrorBanner from '../components/ErrorBanner';
import SentimentBadge from '../components/SentimentBadge';

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, setUser: setAuthUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);

  // Teacher-specific states
  const [slots, setSlots] = useState<Slot[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [isBooking, setIsBooking] = useState<string | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [reviewStars, setReviewStars] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);

  // Student-specific states
  const [studentBookings, setStudentBookings] = useState<Booking[]>([]);

  // Edit form state
  const [form, setForm] = useState({
    name: '',
    department: '',
    avatar_seed: '',
    bio: '',
    interestsString: '',
    learning_goals: '',
    preferred_timesString: '',
    comm_mode: '',
    office_hoursString: '',
    max_bookings_per_day: 5,
    // Teacher specific
    cabin_block: '',
    cabin_room: '',
    status: 'Offline' as TeacherStatus,
    status_note: '',
    subjectsString: '',
  });

  const isOwnProfile = !id || id === currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isOwnProfile || isAdmin;

  // Recommended avatar picker: a stable set of "near" variants of the
  // profile's own name, plus a fresh random batch every time Shuffle is
  // clicked (avatarShuffle only ever increments, so it doubles as a cache key).
  const [avatarShuffle, setAvatarShuffle] = useState(0);
  const avatarOptions = useMemo(
    () => avatarCandidates(profile?.name || '', avatarShuffle > 0),
    [profile?.name, avatarShuffle],
  );

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const targetId = id || currentUser?.id;
      if (!targetId) throw new Error('No user specified');

      // Fetch user profile from enhanced backend
      const userProfile = await api.auth.getProfile(targetId);
      setProfile(userProfile);

      // Populate edit form
      setForm({
        name: userProfile.name || '',
        department: userProfile.department || '',
        avatar_seed: userProfile.avatar_seed || userProfile.name || '',
        bio: userProfile.bio || '',
        interestsString: toCsv(userProfile.interests),
        learning_goals: userProfile.learning_goals || '',
        preferred_timesString: toCsv(userProfile.preferred_times),
        comm_mode: userProfile.comm_mode || '',
        office_hoursString: toCsv(userProfile.office_hours),
        max_bookings_per_day: userProfile.max_bookings_per_day || 5,
        cabin_block: userProfile.cabin_block || '',
        cabin_room: userProfile.cabin_room || '',
        status: (userProfile.status || 'Offline') as TeacherStatus,
        status_note: userProfile.status_note || '',
        subjectsString: toCsv(userProfile.subjects),
      });

      // Role specific queries
      if (userProfile.role === 'teacher') {
        const [slotsRows, ratingsRows] = await Promise.all([
          api.slots.list(userProfile.id),
          api.ratings.forTeacher(userProfile.id),
        ]);
        setSlots(slotsRows);
        setRatings(ratingsRows);
      } else if (userProfile.role === 'student') {
        const bookingRows = await api.bookings.list({ student_id: userProfile.id });
        setStudentBookings(bookingRows);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaveBusy(true);
    setError(null);

    const payload: any = {
      name: form.name.trim(),
      department: form.department.trim(),
      avatar_seed: form.avatar_seed,
      bio: form.bio.trim(),
      interests: parseCsv(form.interestsString),
      learning_goals: form.learning_goals.trim(),
      preferred_times: parseCsv(form.preferred_timesString),
      comm_mode: form.comm_mode.trim(),
      max_bookings_per_day: Number(form.max_bookings_per_day),
    };

    if (profile.role === 'teacher') {
      payload.cabin_block = form.cabin_block.trim();
      payload.cabin_room = form.cabin_room.trim();
      payload.status = form.status;
      payload.status_note = form.status_note.trim();
      payload.subjects = parseCsv(form.subjectsString);
      payload.office_hours = parseCsv(form.office_hoursString);
    }

    try {
      const targetId = id || currentUser?.id;
      const updatedUser = await api.auth.updateProfile(payload, targetId);
      setProfile(updatedUser);
      setIsEditing(false);

      // If we updated our own profile, sync auth context with the response
      // we already have — no need to round-trip /api/auth/me again.
      if (isOwnProfile) {
        setAuthUser(updatedUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save profile changes');
    } finally {
      setSaveBusy(false);
    }
  };

  const handleBookSlot = async (slot: Slot) => {
    if (!profile) return;
    setIsBooking(slot.id);
    setBookingError(null);
    try {
      await api.bookings.create({ teacher_id: profile.id, slot_id: slot.id });
      // Reload slots
      setSlots(await api.slots.list(profile.id));
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Booking failed');
    } finally {
      setIsBooking(null);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !reviewText.trim()) return;
    setReviewBusy(true);
    setBookingError(null);
    try {
      let sentiment = 'Positive';
      let sentimentScore = 0.5;
      try {
        const s = await api.ai.sentiment(reviewText);
        sentiment = s.sentiment;
        sentimentScore = s.score;
      } catch {
        // sentiment failure shouldn't block review
      }

      await api.ratings.create({
        teacher_id: profile.id,
        stars: reviewStars,
        review: reviewText.trim(),
        sentiment,
        sentiment_score: sentimentScore,
      });
      setRatings(await api.ratings.forTeacher(profile.id));
      setReviewText('');
      setReviewStars(5);
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Review submission failed');
    } finally {
      setReviewBusy(false);
    }
  };

  const avgStars = averageStars(ratings);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] animate-pulse">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">Fetching profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-900 mb-2">User Not Found</h2>
        <p className="text-slate-500 mb-6">The requested user profile does not exist or has been deleted.</p>
        <button
          onClick={() => navigate(-1)}
          className="px-5 py-2.5 bg-slate-900 text-white font-medium rounded-xl hover:bg-slate-800 transition-colors"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Back link */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" /> Go Back
      </button>

      {error && <ErrorBanner message={error} className="shadow-sm" />}

      {/* Header Profile Info card */}
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden relative">
        <div className="h-32 bg-gradient-to-r from-indigo-900 via-indigo-800 to-blue-900" />
        <div className="p-8 pt-0 relative flex flex-col md:flex-row items-center md:items-end justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-16">
            <img
              src={isEditing ? avatarFor(form.avatar_seed) : avatarSrc(profile)}
              alt=""
              className="w-32 h-32 rounded-3xl ring-4 ring-white bg-white shadow-lg object-cover bg-slate-100"
            />
            <div className="text-center md:text-left">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-2">
                <h1 className="text-3xl font-extrabold text-slate-900">{profile.name}</h1>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border shadow-sm',
                    profile.role === 'admin'
                      ? 'text-purple-700 bg-purple-50 border-purple-100'
                      : profile.role === 'teacher'
                        ? 'text-indigo-700 bg-indigo-50 border-indigo-100'
                        : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                  )}
                >
                  {profile.role}
                </span>
                {profile.role === 'teacher' && profile.status && (
                  <span
                    className={cn(
                      'px-3 py-1 rounded-full text-xs font-bold border shadow-sm flex items-center gap-1.5',
                      TEACHER_STATUS_BADGE[profile.status]
                    )}
                  >
                    <span className={cn('w-2 h-2 rounded-full', TEACHER_STATUS_DOT[profile.status])} />
                    {profile.status}
                  </span>
                )}
              </div>
              <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" /> {profile.email}
                {profile.department && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-indigo-600 bg-indigo-50/50 px-2.5 py-0.5 rounded-lg text-xs font-bold">
                      {profile.department}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {canEdit && !isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Edit Profile
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        // EDIT MODE FORM
        <form onSubmit={handleSave} className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">Edit Profile Preferences</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl font-medium hover:bg-slate-50 text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveBusy}
                className="px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50 text-sm flex items-center gap-1.5"
              >
                {saveBusy ? 'Saving...' : <><Check className="w-4 h-4" /> Save</>}
              </button>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700">Profile Picture</label>
              <button
                type="button"
                onClick={() => setAvatarShuffle((n) => n + 1)}
                className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Shuffle className="w-3.5 h-3.5" /> Shuffle for more
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {avatarOptions.map((seed) => (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setForm({ ...form, avatar_seed: seed })}
                  title={seed === form.avatar_seed ? 'Selected' : 'Use this picture'}
                  className={cn(
                    'w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shadow-sm transition-all',
                    seed === form.avatar_seed
                      ? 'ring-2 ring-offset-2 ring-indigo-600'
                      : 'ring-1 ring-slate-200 hover:ring-indigo-300'
                  )}
                >
                  <img src={avatarFor(seed)} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Recommended picks based on your profile — pick one, or shuffle for more.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Full Name</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Department</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
                placeholder="e.g. Computer Science"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Bio / Description</label>
              <textarea
                rows={4}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell others about your background, interests, or office details..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Academic Interests (comma separated)
              </label>
              <input
                type="text"
                value={form.interestsString}
                onChange={(e) => setForm({ ...form, interestsString: e.target.value })}
                placeholder="AI, Algorithms, VLSI, Cybersecurity"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Preferred Mode of Communication</label>
              <select
                value={form.comm_mode}
                onChange={(e) => setForm({ ...form, comm_mode: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
              >
                <option value="">Select Mode</option>
                <option value="Email">Email</option>
                <option value="Microsoft Teams">Microsoft Teams</option>
                <option value="Cabin Consultation">Cabin Consultation</option>
                <option value="Phone call">Phone call</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Preferred Timeslots (comma separated)</label>
              <input
                type="text"
                value={form.preferred_timesString}
                onChange={(e) => setForm({ ...form, preferred_timesString: e.target.value })}
                placeholder="Morning, Afternoon, 2 PM - 4 PM"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Max Booking Requests / Day</label>
              <input
                type="number"
                min={1}
                max={20}
                value={form.max_bookings_per_day}
                onChange={(e) => setForm({ ...form, max_bookings_per_day: Number(e.target.value) })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
              />
            </div>

            {profile.role === 'student' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Learning Goals</label>
                <textarea
                  rows={2}
                  value={form.learning_goals}
                  onChange={(e) => setForm({ ...form, learning_goals: e.target.value })}
                  placeholder="What are your goals or topics you wish to master?"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none resize-none"
                />
              </div>
            )}

            {profile.role === 'teacher' && (
              <>
                <div className="border-t border-slate-100 md:col-span-2 pt-4">
                  <h3 className="font-bold text-slate-800 text-sm mb-4">Teacher-Specific Settings</h3>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cabin Block</label>
                  <input
                    type="text"
                    value={form.cabin_block}
                    onChange={(e) => setForm({ ...form, cabin_block: e.target.value })}
                    placeholder="e.g. AHS Block"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Cabin Room</label>
                  <input
                    type="text"
                    value={form.cabin_room}
                    onChange={(e) => setForm({ ...form, cabin_room: e.target.value })}
                    placeholder="304"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Live Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as TeacherStatus })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white"
                  >
                    <option value="Available">Available</option>
                    <option value="Busy">Busy</option>
                    <option value="In Class">In Class</option>
                    <option value="Offline">Offline</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Status Note (e.g. Free till...)</label>
                  <input
                    type="text"
                    value={form.status_note}
                    onChange={(e) => setForm({ ...form, status_note: e.target.value })}
                    placeholder="e.g. free till 4:00 PM"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Subjects Taught (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.subjectsString}
                    onChange={(e) => setForm({ ...form, subjectsString: e.target.value })}
                    placeholder="Data Structures, Compiler Design"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Office Hours (comma separated)
                  </label>
                  <input
                    type="text"
                    value={form.office_hoursString}
                    onChange={(e) => setForm({ ...form, office_hoursString: e.target.value })}
                    placeholder="Mon 2-4 PM, Wed 10-12 AM"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none"
                  />
                </div>
              </>
            )}
          </div>
        </form>
      ) : (
        // VIEW MODE DETAILS
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar panel */}
          <div className="space-y-6">
            {/* Reputation score tile */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-slate-700 text-sm">Reputation Score</h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold text-slate-900">{profile.reputation_score}</span>
                  <span className="text-sm font-semibold text-slate-400">/ 100</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {profile.no_shows > 0
                    ? `${profile.no_shows} no-show${profile.no_shows > 1 ? 's' : ''} on record`
                    : 'Perfect record. 0 no-shows! Keep it up.'}
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, profile.reputation_score))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Availability info / status (For Teacher) */}
            {profile.role === 'teacher' && (
              <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
                <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Availability & Location</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Cabin Location</span>
                    <span className="font-semibold text-slate-900 flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-indigo-500" />
                      {profile.cabin_block && profile.cabin_room
                        ? `${profile.cabin_block} - ${profile.cabin_room}`
                        : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Current Status</span>
                    <span className="font-semibold text-slate-900 capitalize flex items-center gap-1">
                      <span className={cn('w-2 h-2 rounded-full', TEACHER_STATUS_DOT[profile.status || 'Offline'])} />
                      {profile.status || 'Offline'}
                    </span>
                  </div>
                  {profile.status_note && (
                    <div className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-start gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{profile.status_note}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick stats / contacts card */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-200 space-y-4">
              <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">Profile Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Member Since</span>
                  <span className="font-semibold text-slate-800">
                    {profile.created_at ? format(parseISO(profile.created_at), 'MMMM yyyy') : '—'}
                  </span>
                </div>
                {profile.comm_mode && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Preferred Comms</span>
                    <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md text-xs">
                      {profile.comm_mode}
                    </span>
                  </div>
                )}
                {profile.max_bookings_per_day && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Max Bookings/Day</span>
                    <span className="font-semibold text-slate-800">{profile.max_bookings_per_day}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main content panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Bio Card */}
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                About Me
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line text-sm">
                {profile.bio || 'This user has not written a bio yet.'}
              </p>
            </div>

            {/* Academic details */}
            <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200 space-y-6">
              {profile.interests && profile.interests.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-3">Academic Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest) => (
                      <span
                        key={interest}
                        className="px-3 py-1 bg-indigo-50/50 text-indigo-700 border border-indigo-100 text-xs font-semibold rounded-lg shadow-sm"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.role === 'teacher' && profile.subjects && profile.subjects.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-3">Subjects Taught</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.subjects.map((subject) => (
                      <span
                        key={subject}
                        className="px-3 py-1 bg-emerald-50/50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-lg shadow-sm"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.role === 'teacher' && profile.office_hours && profile.office_hours.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-3">Office Hours</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.office_hours.map((hour) => (
                      <span
                        key={hour}
                        className="px-3 py-1 bg-slate-50 text-slate-600 border border-slate-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {hour}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.role === 'student' && profile.learning_goals && (
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-2">Learning Goals</h4>
                  <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line bg-slate-50/80 p-4 rounded-xl border border-slate-100">
                    {profile.learning_goals}
                  </p>
                </div>
              )}

              {profile.role === 'student' && profile.preferred_times && profile.preferred_times.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-800 text-sm mb-3">Preferred Study Timeslots</h4>
                  <div className="flex flex-wrap gap-2">
                    {profile.preferred_times.map((time) => (
                      <span
                        key={time}
                        className="px-3 py-1 bg-amber-50/50 text-amber-700 border border-amber-100 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                      >
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* TEACHER CONSULTATION SLOTS & REVIEW HISTORY */}
            {profile.role === 'teacher' && (
              <>
                {/* Available Slots list */}
                <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200 space-y-4">
                  {bookingError && (
                    <div className="mb-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    Consultation Slots
                  </h3>

                  <div className="space-y-3">
                    {slots.length === 0 ? (
                      <div className="text-center py-8 text-slate-400 text-sm font-medium">
                        No slots published by this faculty member right now.
                      </div>
                    ) : (
                      slots.map((slot) => (
                        <div
                          key={slot.id}
                          className={cn(
                            'p-4 rounded-xl border flex justify-between items-center gap-4 transition-colors',
                            slot.is_booked
                              ? 'bg-slate-50 border-slate-200 opacity-75'
                              : 'bg-white border-slate-200 hover:border-indigo-300 shadow-sm'
                          )}
                        >
                          <div className="flex gap-4 items-center min-w-0">
                            <div
                              className={cn(
                                'w-16 h-14 rounded-xl flex flex-col items-center justify-center shrink-0',
                                slot.is_booked
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-indigo-100 text-indigo-700'
                              )}
                            >
                              <span className="text-sm font-bold leading-none">{slot.time}</span>
                              <span className="text-[10px] uppercase mt-1">{slot.date}</span>
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-bold text-slate-900 truncate">{slot.topic}</h4>
                              <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                  {slot.subject}
                                </span>
                                <span className="text-xs text-slate-400">
                                  {slot.type} • {slot.duration} min
                                </span>
                              </div>
                            </div>
                          </div>

                          {currentUser && currentUser.role === 'student' && (
                            <button
                              disabled={slot.is_booked || isBooking === slot.id}
                              onClick={() => handleBookSlot(slot)}
                              className={cn(
                                'px-4 py-2 rounded-lg font-medium transition-colors text-sm shrink-0',
                                slot.is_booked
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                              )}
                            >
                              {isBooking === slot.id ? 'Booking…' : slot.is_booked ? 'Booked' : 'Book'}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Ratings & Reviews */}
                <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200 space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-indigo-600" />
                      Student Feedback
                    </h3>
                    <div className="flex items-center gap-2 bg-amber-50 px-3.5 py-1.5 rounded-full border border-amber-100 shadow-sm">
                      <Star className="w-4 h-4 text-amber-500 fill-current" />
                      <span className="font-bold text-amber-800">{avgStars}</span>
                      <span className="text-amber-500 text-xs font-semibold">({ratings.length} reviews)</span>
                    </div>
                  </div>

                  {currentUser && currentUser.role === 'student' && (
                    <form
                      onSubmit={handleSubmitReview}
                      className="bg-slate-50 p-4 rounded-2xl border border-slate-200"
                    >
                      <h4 className="text-sm font-bold text-slate-900 mb-2">Write a Review</h4>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs text-slate-600">Stars:</span>
                        <div className="flex items-center">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewStars(star)}
                              className={cn('p-1', reviewStars >= star ? 'text-amber-400' : 'text-slate-300')}
                            >
                              <Star className="w-5 h-5 fill-current" />
                            </button>
                          ))}
                        </div>
                      </div>
                      <textarea
                        required
                        value={reviewText}
                        onChange={(e) => setReviewText(e.target.value)}
                        placeholder="How was your doubt session or consultation experience?"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-600 outline-none mb-3 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={reviewBusy || !reviewText.trim()}
                          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                        >
                          {reviewBusy ? 'Posting…' : 'Submit Review'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-4">
                    {ratings.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 text-sm font-medium">
                        No reviews posted for this teacher yet.
                      </div>
                    ) : (
                      ratings.map((r) => (
                        <div
                          key={r.id}
                          className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 shadow-sm"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2 text-amber-500 text-sm font-bold">
                              <Star className="w-4 h-4 fill-current" /> {r.stars}.0
                            </div>
                            {r.sentiment && <SentimentBadge sentiment={r.sentiment} />}
                          </div>
                          <p className="text-slate-700 text-sm leading-relaxed">{r.review}</p>
                          <div className="mt-2 text-[10px] text-slate-400">
                            {format(parseISO(r.created_at), 'MMM d, yyyy h:mm a')}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}

            {/* STUDENT CONSULTATION HISTORY */}
            {profile.role === 'student' && (
              <div className="bg-white rounded-3xl p-8 shadow-md border border-slate-200 space-y-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-600" />
                  Consultation Bookings
                </h3>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {studentBookings.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm font-medium">
                      No consultations registered for this student.
                    </div>
                  ) : (
                    studentBookings.map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {b.slot?.topic || 'Consultation Doubts'}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {b.slot ? `${b.slot.date} at ${b.slot.time}` : format(parseISO(b.created_at), 'MMM d, yyyy')}
                          </p>
                          {b.slot && (
                            <p className="text-xs text-indigo-600 font-semibold mt-1">
                              Faculty ID: <Link to={`/profile/${b.teacher_id}`} className="underline hover:text-indigo-800">{b.teacher_id.substring(0, 8)}...</Link>
                            </p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider',
                            BOOKING_STATUS_BADGE[b.status],
                          )}
                        >
                          {b.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

