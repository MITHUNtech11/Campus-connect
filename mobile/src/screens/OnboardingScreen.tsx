/**
 * Onboarding wizard — port of frontend/src/pages/Onboarding.tsx.
 *
 *   PATCH /api/onboarding/me        → public.users preference columns +
 *                                     onboarding_completed = true
 *   PATCH /api/faculty/:id/status   → public.teacher_tags (subjects / cabin),
 *                                     which /api/onboarding/me deliberately
 *                                     does not own (see onboarding.cjs).
 *
 * Same intro slides per role, same student/teacher form split, and the same
 * concurrent Promise.all of the two writes. Rendered by App.tsx as a full-screen
 * modal whenever `user.onboarding_completed` is false.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { ArrowRight, CheckCircle2, MapPin, Sparkles } from 'lucide-react-native';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Button,
  Checkbox,
  ChipGroup,
  ErrorBanner,
  Field,
  OptionRow,
} from '../components/ui';
import { cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { User } from '../types';

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

const COMM_MODES = ['In person', 'Video call', 'Chat'] as const;

export default function OnboardingScreen({
  user,
  onComplete,
}: {
  user: User;
  onComplete: () => void;
}) {
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
  const [maxBookings, setMaxBookings] = useState(String(user.max_bookings_per_day ?? 5));

  const isTeacher = user.role === 'teacher';

  const intro =
    user.role === 'admin'
      ? [
          {
            title: 'Welcome, Administrator',
            description:
              'You have access to account management, campus-wide stats and the full audit trail.',
            icon: <Sparkles size={44} color={colors.indigo500} />,
          },
        ]
      : isTeacher
        ? [
            {
              title: 'Welcome, Professor!',
              description: "Let's set up your digital presence on CampusConnect.",
              icon: <Sparkles size={44} color={colors.indigo500} />,
            },
          ]
        : [
            {
              title: 'Welcome to CampusConnect!',
              description: "Let's show you around your new smart campus ecosystem.",
              icon: <Sparkles size={44} color={colors.indigo500} />,
            },
            {
              title: 'Live Faculty Map',
              description:
                'See which blocks have available mentors right now, drawn from live faculty check-ins.',
              icon: <MapPin size={44} color={colors.emerald500} />,
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
      setError(errMessage(err, 'Could not save your preferences'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-900/50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-4 py-10 grow justify-center" keyboardShouldPersistTaps="handled">
        <View className="bg-white rounded-3xl p-6">
          {!isFormStep ? (
            <View className="items-center">
              <View className="w-24 h-24 bg-slate-50 rounded-full items-center justify-center mb-6">
                {intro[step].icon}
              </View>
              <Text className="text-2xl font-bold text-slate-900 mb-3 text-center">
                {intro[step].title}
              </Text>
              <Text className="text-slate-600 text-center leading-relaxed mb-8">
                {intro[step].description}
              </Text>
            </View>
          ) : (
            <View className="mb-6">
              <Text className="text-2xl font-bold text-slate-900 mb-1">
                {isTeacher ? 'Your teaching profile' : 'Tell us what you need'}
              </Text>
              <Text className="text-slate-500 mb-5 text-sm">
                {isTeacher
                  ? 'Students see this on the faculty directory and the campus map.'
                  : 'We use this to point you at the right mentors.'}
              </Text>

              <View className="gap-5">
                <Field
                  label="Short bio"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  placeholder={
                    isTeacher
                      ? 'e.g. 12 years teaching databases and distributed systems.'
                      : 'e.g. Third-year CS student focused on backend engineering.'
                  }
                />

                {isTeacher ? (
                  <>
                    <Field
                      label="Subjects"
                      hint="(comma separated)"
                      value={subjects}
                      onChangeText={setSubjects}
                      placeholder="Data Structures, Algorithms"
                    />
                    <View className="flex-row gap-4">
                      <Field
                        label="Block"
                        value={cabinBlock}
                        onChangeText={setCabinBlock}
                        placeholder="e.g. AHS Block"
                        className="flex-1"
                      />
                      <Field
                        label="Room"
                        value={cabinRoom}
                        onChangeText={setCabinRoom}
                        placeholder="304"
                        className="flex-1"
                      />
                    </View>
                    <ChipGroup
                      label="Office hours"
                      options={TIME_OPTIONS}
                      selected={officeHours}
                      onToggle={(v) => toggle(officeHours, setOfficeHours, v)}
                    />
                    <Field
                      label="Max bookings / day"
                      value={maxBookings}
                      onChangeText={setMaxBookings}
                      keyboardType="number-pad"
                    />
                  </>
                ) : (
                  <>
                    <ChipGroup
                      label="Interests"
                      options={INTEREST_OPTIONS}
                      selected={interests}
                      onToggle={(v) => toggle(interests, setInterests, v)}
                    />
                    <Field
                      label="Learning goals"
                      value={learningGoals}
                      onChangeText={setLearningGoals}
                      placeholder="e.g. Get comfortable with SQL joins before finals"
                    />
                    <ChipGroup
                      label="Preferred times"
                      options={TIME_OPTIONS}
                      selected={preferredTimes}
                      onToggle={(v) => toggle(preferredTimes, setPreferredTimes, v)}
                    />
                    <OptionRow
                      label="Preferred mode"
                      options={COMM_MODES}
                      value={commMode as (typeof COMM_MODES)[number]}
                      onChange={setCommMode}
                    />
                  </>
                )}
              </View>
            </View>
          )}

          {!!error && <ErrorBanner message={error} className="mb-5" />}

          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <View
                  key={i}
                  className={cn('h-2 rounded-full', i === step ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200')}
                />
              ))}
            </View>

            <Button
              label={isSaving ? 'Saving…' : isFormStep ? "Let's Go!" : 'Next'}
              onPress={handleNext}
              disabled={isSaving}
              icon={
                isSaving ? undefined : isFormStep ? (
                  <CheckCircle2 size={16} color={colors.white} />
                ) : (
                  <ArrowRight size={16} color={colors.white} />
                )
              }
            />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
