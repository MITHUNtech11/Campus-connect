import { useCallback, useEffect, useState } from 'react';
import { Briefcase, FileText, Globe, CheckCircle, Clock, Calendar, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { SLOT_CATEGORIES } from '../types';
import type { Faculty, Slot, SlotCategory, Booking, User } from '../types';
import ErrorBanner from '../components/ErrorBanner';

/** The placement-prep subset of SLOT_CATEGORIES — everything but plain doubt-solving. */
const PLACEMENT_CATEGORIES = SLOT_CATEGORIES.filter((c) => c !== 'Academic') as Exclude<
  SlotCategory,
  'Academic'
>[];

const CATEGORY_COLORS: Record<string, string> = {
  'Mock Interview': 'bg-violet-100 text-violet-700 border-violet-200',
  'Resume Review': 'bg-sky-100 text-sky-700 border-sky-200',
  'Career Guidance': 'bg-amber-100 text-amber-700 border-amber-200',
};

const CATEGORY_ICONS: Record<string, typeof Briefcase> = {
  'Mock Interview': Briefcase,
  'Resume Review': FileText,
  'Career Guidance': Globe,
};

export default function PlacementPortal({ user }: { user: User }) {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Modal State
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [targetCompany, setTargetCompany] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [resumeUrl, setResumeUrl] = useState('');
  const [bookingSubmit, setBookingSubmit] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | Exclude<SlotCategory, 'Academic'>>('all');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      // GET /api/slots with no teacher_id returns every slot in one query —
      // no need to fan out a request per teacher.
      const [facList, allBookings, allSlots] = await Promise.all([
        api.faculty.list(),
        api.bookings.list(),
        api.slots.list(),
      ]);
      setFaculty(facList);

      // Filter out only placement bookings for student view
      setBookings(allBookings.filter(b => b.slot?.slot_category && b.slot.slot_category !== 'Academic'));

      const placementSlots = allSlots.filter(
        (s) => !s.is_booked && s.slot_category && s.slot_category !== 'Academic',
      );
      setSlots(placementSlots);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load placement data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    setBookingSubmit(true);
    setError(null);
    try {
      await api.bookings.create({
        teacher_id: selectedSlot.teacher_id,
        slot_id: selectedSlot.id,
        target_company: targetCompany.trim(),
        job_description: jobDescription.trim(),
        resume_url: resumeUrl.trim() || undefined,
      });

      // Reset fields
      setSelectedSlot(null);
      setTargetCompany('');
      setJobDescription('');
      setResumeUrl('');
      
      // Reload lists
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to book slot');
    } finally {
      setBookingSubmit(false);
    }
  };

  const filteredSlots = slots.filter(s => activeTab === 'all' || s.slot_category === activeTab);
  const teacherMap = Object.fromEntries(faculty.map(f => [f.id, f]));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {error && <ErrorBanner message={error} />}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Briefcase className="w-56 h-56" />
        </div>
        <div className="relative z-10 max-w-2xl">
          <span className="px-3 py-1 bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 rounded-full text-xs font-semibold tracking-wide uppercase">
            Placement Prep Hub
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold mt-3 leading-tight">
            Crack Your Dream Interviews.
          </h1>
          <p className="text-slate-200 mt-2 text-base md:text-lg">
            Book mock interviews, get detailed resume reviews, and receive 1-on-1 placement guidance from professors and placement coordinators.
          </p>
        </div>
      </div>

      {/* Filters Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-4">
        {(['all', ...PLACEMENT_CATEGORIES] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'pb-3 text-sm font-semibold whitespace-nowrap border-b-2 px-1 transition-all',
              activeTab === tab
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            )}
          >
            {tab === 'all' ? 'All Placement Slots' : tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main: Available Slots */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" /> Open Consultation Slots
          </h2>

          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading placement slots...</div>
          ) : filteredSlots.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
              <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="font-medium text-lg">No slots available</p>
              <p className="text-sm mt-1">There are no open slots matching this category right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSlots.map((slot) => {
                const teacher = teacherMap[slot.teacher_id];
                const Icon = CATEGORY_ICONS[slot.slot_category || 'Mock Interview'] || Briefcase;
                return (
                  <motion.div
                    key={slot.id}
                    layoutId={`slot-card-${slot.id}`}
                    className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className={cn('px-2.5 py-1 text-xs font-semibold rounded-full border', CATEGORY_COLORS[slot.slot_category || 'Mock Interview'])}>
                          <span className="flex items-center gap-1">
                            <Icon className="w-3.5 h-3.5" />
                            {slot.slot_category}
                          </span>
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {slot.duration} min
                        </span>
                      </div>
                      
                      <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1">{slot.subject}</h3>
                      <p className="text-slate-500 text-xs mt-1">Focus: {slot.topic}</p>
                      
                      {teacher && (
                        <div className="mt-4 flex items-center gap-2 bg-slate-50 p-2 rounded-xl">
                          <div className="w-7 h-7 bg-indigo-600 text-white font-bold rounded-lg flex items-center justify-center text-xs">
                            {teacher.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">{teacher.name}</p>
                            <p className="text-[10px] text-slate-500">{teacher.department}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-left">
                        <p className="text-[11px] text-slate-400 font-medium uppercase">Date & Time</p>
                        <p className="text-xs font-bold text-slate-700">{slot.date} @ {slot.time}</p>
                      </div>
                      <button
                        onClick={() => setSelectedSlot(slot)}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors"
                      >
                        Book Prep
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Student's Booked Placement Sessions */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" /> My Prep Bookings
          </h2>

          {loading ? (
            <div className="text-center py-6 text-slate-400">Loading your bookings...</div>
          ) : bookings.length === 0 ? (
            <div className="bg-slate-100/50 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-400 text-sm">
              You haven't scheduled any placement prep consultations yet.
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => {
                const teacher = teacherMap[booking.teacher_id];
                const slot = booking.slot;
                const statusColor = 
                  booking.status === 'ACCEPTED' ? 'text-emerald-600 bg-emerald-50' : 
                  booking.status === 'PENDING' ? 'text-amber-600 bg-amber-50' : 'text-slate-500 bg-slate-50';
                
                return (
                  <div key={booking.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className={cn('px-2 py-0.5 text-[10px] font-bold rounded-full', statusColor)}>
                          {booking.status}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {slot?.slot_category}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-800 text-sm leading-snug">{slot?.subject}</h4>
                      <p className="text-slate-500 text-xs mt-0.5">Mentor: {teacher?.name || 'Faculty Member'}</p>
                      
                      {booking.target_company && (
                        <p className="text-[11px] text-slate-600 mt-2 font-medium bg-slate-50 p-1.5 rounded-md inline-block">
                          Target: <span className="font-bold text-slate-800">{booking.target_company}</span>
                        </p>
                      )}
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{slot?.date} @ {slot?.time}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Booking Details Dialog Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSlot(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 max-w-lg w-full relative z-10 space-y-4"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900">Placement Consultation Setup</h3>
                <p className="text-slate-500 text-xs mt-1">Provide your placement details so the mentor can prepare in advance.</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl text-xs space-y-1 border border-slate-150">
                <p className="font-semibold text-slate-700">Slot: {selectedSlot.subject}</p>
                <p className="text-slate-500">Date: {selectedSlot.date} @ {selectedSlot.time}</p>
                <p className="text-slate-500">Category: <span className="font-semibold text-indigo-600">{selectedSlot.slot_category}</span></p>
              </div>

              <form onSubmit={handleBooking} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Company *</label>
                  <input
                    type="text"
                    required
                    value={targetCompany}
                    onChange={(e) => setTargetCompany(e.target.value)}
                    placeholder="e.g. Google, McKinsey, Goldman Sachs"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Resume Link (PDF) / Drive URL</label>
                  <input
                    type="url"
                    value={resumeUrl}
                    onChange={(e) => setResumeUrl(e.target.value)}
                    placeholder="e.g. https://drive.google.com/..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Job Description (JD) *</label>
                  <textarea
                    required
                    rows={4}
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the key skills or role details you want mock prep on..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 text-sm outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={bookingSubmit}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                  >
                    {bookingSubmit ? 'Booking...' : 'Confirm Book'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
