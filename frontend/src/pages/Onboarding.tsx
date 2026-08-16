/**
 * Onboarding wizard — writes real preferences to the backend.
 *
 *   PATCH /api/onboarding/me        → public.users preference columns +
 *                                     onboarding_completed = true
 *   PATCH /api/faculty/:id/status   → public.teacher_tags (subjects / cabin),
 *                                     which /api/onboarding/me deliberately
 *                                     does not own (see onboarding.cjs).
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Map, MapPin, Sparkles, Calendar, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { User } from '../types';
import ErrorBanner from '../components/ErrorBanner';

const INTEREST_OPTIONS = [
  'Data Structures',
  'Algorithms',
  'Databases',
  'Machine Learning',
  'Web Development',
  'Electronics',
  'Mathematics',
  'Physics',
];

const TIME_OPTIONS = ['Morning (9–12)', 'Afternoon (12–3)', 'Evening (3–6)', 'Late (6–9)'];

export default function Onboarding({ user, onComplete }: { user: User; onComplete: () => void }) {
  const { setUser } = useAuth();
  const [step, setStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Shared
  const [bio, setBio] = useState(user.bio || '');
  // Student
  const [interests, setInterests] = useState<string[]>(user.interests || []);
  const [learningGoals, setLearningGoals] = useState(user.learning_goals || '');
  const [preferredTimes, setPreferredTimes] = useState<string[]>(user.preferred_times || []);
  const [commMode, setCommMode] = useState(user.comm_mode || 'In person');
  // Teacher
  const [subjects, setSubjects] = useState('');
  const [cabinBlock, setCabinBlock] = useState('');
  const [cabinRoom, setCabinRoom] = useState('');
  const [officeHours, setOfficeHours] = useState<string[]>(user.office_hours || []);
  const [maxBookings, setMaxBookings] = useState(user.max_bookings_per_day ?? 5);

  const isTeacher = user.role === 'teacher';

  const intro =
    user.role === 'admin'
      ? [
          {
            title: 'Welcome, Administrator',
            description:
              'You have access to account management, campus-wide stats and the full audit trail.',
            icon: <Sparkles className="w-12 h-12 text-indigo-500" />,
          },
        ]
      : isTeacher
        ? [
            {
              title: 'Welcome, Professor!',
              description: "Let's set up your digital presence on CampusConnect.",
              icon: <Sparkles className="w-12 h-12 text-indigo-500" />,
            },
          ]
        : [
            {
              title: 'Welcome to CampusConnect!',
              description: "Let's show you around your new smart campus ecosystem.",
              icon: <Sparkles className="w-12 h-12 text-indigo-500" />,
            },
            {
              title: 'Live Faculty Map',
              description:
                'See which blocks have available mentors right now, drawn from live faculty check-ins.',
              icon: <MapPin className="w-12 h-12 text-emerald-500" />,
            },
          ];

  const totalSteps = intro.length + 1; // intro slides + one preferences form
  const isFormStep = step === intro.length;

  const toggle = (list: string[], setList: (v: string[]) => void, value: string) =>
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const handleNext = async () => {
    if (!isFormStep) {
      setStep(step + 1);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const onboardingCall = isTeacher
        ? api.onboarding.complete({
            bio,
            office_hours: officeHours,
            max_bookings_per_day: Number(maxBookings) || 5,
          })
        : api.onboarding.complete({
            bio,
            interests,
            learning_goals: learningGoals,
            preferred_times: preferredTimes,
            comm_mode: commMode,
          });

      // Teacher subjects + cabin live in public.teacher_tags, a separate
      // endpoint — independent of the onboarding call above, so run both
      // requests concurrently instead of waiting on them one at a time.
      const facultyCall =
        isTeacher && (subjects.trim() || cabinBlock.trim())
          ? api.faculty.updateStatus(user.id, {
              subjects: subjects
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
              cabin_block: cabinBlock.trim() || undefined,
              cabin_room: cabinRoom.trim() || undefined,
              status: 'Available',
            })
          : Promise.resolve(null);

      const [updated] = await Promise.all([onboardingCall, facultyCall]);

      setUser(updated);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your preferences');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-8 my-8"
      >
        {!isFormStep ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
              {intro[step].icon}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">{intro[step].title}</h2>
            <p className="text-slate-600 mb-10 leading-relaxed">{intro[step].description}</p>
          </div>
        ) : (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">
              {isTeacher ? 'Your teaching profile' : 'Tell us what you need'}
            </h2>
            <p className="text-slate-500 mb-6 text-sm">
              {isTeacher
                ? 'Students see this on the faculty directory and the campus map.'
                : 'We use this to point you at the right mentors.'}
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Short bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  placeholder={
                    isTeacher
                      ? 'e.g. 12 years teaching databases and distributed systems.'
                      : 'e.g. Third-year CS student focused on backend engineering.'
                  }
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none resize-none text-sm"
                />
              </div>

              {isTeacher ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Subjects <span className="text-slate-400 font-normal">(comma separated)</span>
                    </label>
                    <input
                      value={subjects}
                      onChange={(e) => setSubjects(e.target.value)}
                      placeholder="Data Structures, Algorithms"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Block</label>
                      <input
                        value={cabinBlock}
                        onChange={(e) => setCabinBlock(e.target.value)}
                        placeholder="e.g. AHS Block"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Room</label>
                      <input
                        value={cabinRoom}
                        onChange={(e) => setCabinRoom(e.target.value)}
                        placeholder="304"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <ChipGroup
                    label="Office hours"
                    options={TIME_OPTIONS}
                    selected={officeHours}
                    onToggle={(v) => toggle(officeHours, setOfficeHours, v)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max bookings / day
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={maxBookings}
                      onChange={(e) => setMaxBookings(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    />
                  </div>
                </>
              ) : (
                <>
                  <ChipGroup
                    label="Interests"
                    options={INTEREST_OPTIONS}
                    selected={interests}
                    onToggle={(v) => toggle(interests, setInterests, v)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Learning goals
                    </label>
                    <input
                      value={learningGoals}
                      onChange={(e) => setLearningGoals(e.target.value)}
                      placeholder="e.g. Get comfortable with SQL joins before finals"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none text-sm"
                    />
                  </div>
                  <ChipGroup
                    label="Preferred times"
                    options={TIME_OPTIONS}
                    selected={preferredTimes}
                    onToggle={(v) => toggle(preferredTimes, setPreferredTimes, v)}
                  />
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Preferred mode
                    </label>
                    <select
                      value={commMode}
                      onChange={(e) => setCommMode(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 outline-none bg-white text-sm"
                    >
                      <option>In person</option>
                      <option>Video call</option>
                      <option>Chat</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {error && <ErrorBanner message={error} className="mb-6 p-3" />}

        <div className="w-full flex items-center justify-between">
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i === step ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200',
                )}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            disabled={isSaving}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {isSaving ? 'Saving…' : isFormStep ? "Let's Go!" : 'Next'}
            {!isSaving &&
              (isFormStep ? <CheckCircle2 className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onToggle(option)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
              selected.includes(option)
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
