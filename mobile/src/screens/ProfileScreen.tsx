/**
 * Profile (self + others, role-aware) — port of frontend/src/pages/Profile.tsx.
 *
 *   GET   /api/auth/profile[/:id]   → the profile being viewed
 *   PATCH /api/auth/profile[/:id]   → save edits (own profile, or any as admin)
 *   GET   /api/slots?teacher_id=    → a teacher's published slots
 *   GET   /api/ratings/:teacher_id  → a teacher's reviews
 *   POST  /api/bookings             → book a slot (students only)
 *   POST  /api/ai/sentiment         → tag a review before storing it
 *   POST  /api/ratings              → submit a star rating + review
 *   GET   /api/bookings?student_id= → a student's consultation history
 *
 * Same three modes as the web page: view (role-aware panels), edit (the same
 * field set, with the teacher-only block behind the same role check), and the
 * teacher booking/review flows gated on `currentUser.role === 'student'`.
 * The web 1/3 + 2/3 grid becomes one stacked column.
 *
 * This screen is mounted twice — as the "Profile" tab (own profile, no `id`) and
 * as a pushed stack route (`/profile/:id`). Every internal profile link therefore
 * uses navigate(), never push(): a tab navigation object has no push(), while
 * navigate() bubbles to the parent stack from either mounting.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import {
  AlertCircle,
  Award,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Mail,
  MapPin,
  MessageSquare,
  Pencil,
  ShieldCheck,
  Shuffle,
  Star,
} from 'lucide-react-native';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import {
  Avatar,
  Button,
  Card,
  Dot,
  ErrorBanner,
  Field,
  FullPageSpinner,
  GradientCard,
  OptionRow,
  Pill,
  SectionTitle,
  SentimentBadge,
  Checkbox,
} from '../components/ui';
import {
  BOOKING_STATUS_BADGE,
  TEACHER_STATUS_BADGE,
  TEACHER_STATUS_DOT,
  averageStars,
  avatarCandidates,
  cn,
  errMessage,
  parseCsv,
  toCsv,
} from '../lib/utils';
import { colors } from '../lib/colors';
import type { Booking, Rating, Slot, TeacherStatus, User } from '../types';
import type { RootStackParamList } from '../navigation/types';

const COMM_MODES = ['Email', 'Microsoft Teams', 'Cabin Consultation', 'Phone call'] as const;
const STATUSES: TeacherStatus[] = ['Available', 'Busy', 'In Class', 'Offline'];

export default function ProfileScreen() {
  const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const id = route.params?.id;
  const { user: currentUser, setUser: setAuthUser } = useAuth();

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
    max_bookings_per_day: '5',
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
  // tapped (avatarShuffle only ever increments, so it doubles as a cache key).
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

      const userProfile = await api.auth.getProfile(targetId);
      setProfile(userProfile);

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
        max_bookings_per_day: String(userProfile.max_bookings_per_day || 5),
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
      setError(errMessage(err, 'Failed to load profile'));
    } finally {
      setLoading(false);
    }
  }, [id, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
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

      // If we updated our own profile, sync auth context with the response we
      // already have — no need to round-trip /api/auth/me again.
      if (isOwnProfile) setAuthUser(updatedUser);
    } catch (err) {
      setError(errMessage(err, 'Could not save profile changes'));
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
      setSlots(await api.slots.list(profile.id));
    } catch (err) {
      setBookingError(errMessage(err, 'Booking failed'));
    } finally {
      setIsBooking(null);
    }
  };

  const handleSubmitReview = async () => {
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
      setBookingError(errMessage(err, 'Review submission failed'));
    } finally {
      setReviewBusy(false);
    }
  };

  const avgStars = averageStars(ratings);

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <FullPageSpinner label="Fetching profile details..." />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center p-6">
        <AlertCircle size={44} color={colors.red500} />
        <Text className="text-xl font-bold text-slate-900 mt-4 mb-2">User Not Found</Text>
        <Text className="text-slate-500 mb-6 text-center">
          The requested user profile does not exist or has been deleted.
        </Text>
        {navigation.canGoBack() && (
          <Button label="Go Back" variant="dark" onPress={() => navigation.goBack()} />
        )}
      </View>
    );
  }

  return (
    <ScrollView
      className="bg-slate-50"
      contentContainerClassName="p-4 pb-28 gap-6"
      keyboardShouldPersistTaps="handled"
    >
      {navigation.canGoBack() && (
        <Pressable
          onPress={() => navigation.goBack()}
          className="flex-row items-center gap-1.5 self-start"
        >
          <ChevronLeft size={16} color={colors.slate500} />
          <Text className="text-sm font-medium text-slate-500">Go Back</Text>
        </Pressable>
      )}

      {!!error && <ErrorBanner message={error} />}

      {/* Header card */}
      <View className="bg-white rounded-3xl border border-slate-200 overflow-hidden">
        <GradientCard from={colors.indigo900} to={colors.blue900} className="h-24 rounded-none">
          <View />
        </GradientCard>
        <View className="px-6 pb-6 -mt-12">
          <Avatar
            name={profile.name}
            seed={isEditing ? form.avatar_seed : profile.avatar_seed}
            size={96}
            rounded="rounded-3xl"
          />
          <Text className="text-2xl font-extrabold text-slate-900 mt-4">{profile.name}</Text>

          <View className="flex-row items-center flex-wrap gap-2 mt-2">
            <View
              className={cn(
                'px-3 py-1 rounded-full border',
                profile.role === 'admin'
                  ? 'bg-purple-50 border-purple-100'
                  : profile.role === 'teacher'
                    ? 'bg-indigo-50 border-indigo-100'
                    : 'bg-emerald-50 border-emerald-100',
              )}
            >
              <Text
                className={cn(
                  'text-xs font-bold uppercase',
                  profile.role === 'admin'
                    ? 'text-purple-700'
                    : profile.role === 'teacher'
                      ? 'text-indigo-700'
                      : 'text-emerald-700',
                )}
              >
                {profile.role}
              </Text>
            </View>

            {profile.role === 'teacher' && !!profile.status && (
              <View
                className={cn(
                  'flex-row items-center gap-1.5 px-3 py-1 rounded-full border',
                  TEACHER_STATUS_BADGE[profile.status],
                )}
              >
                <Dot className={TEACHER_STATUS_DOT[profile.status]} />
                <Text className={cn('text-xs font-bold', TEACHER_STATUS_BADGE[profile.status])}>
                  {profile.status}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row items-center gap-1.5 mt-3 flex-wrap">
            <Mail size={14} color={colors.slate400} />
            <Text className="text-slate-500 font-medium">{profile.email}</Text>
            {!!profile.department && (
              <View className="bg-indigo-50 px-2.5 py-0.5 rounded-lg">
                <Text className="text-indigo-600 text-xs font-bold">{profile.department}</Text>
              </View>
            )}
          </View>

          {canEdit && !isEditing && (
            <Button
              label="Edit Profile"
              onPress={() => setIsEditing(true)}
              icon={<Pencil size={16} color={colors.white} />}
              className="mt-5"
            />
          )}
        </View>
      </View>

      {isEditing ? (
        // ---------------------------------------------------------- EDIT MODE
        <Card className="rounded-3xl gap-5">
          <View className="flex-row items-center justify-between border-b border-slate-100 pb-4">
            <SectionTitle>Edit Profile</SectionTitle>
            <View className="flex-row gap-2">
              <Button label="Cancel" variant="ghost" onPress={() => setIsEditing(false)} />
              <Button
                label={saveBusy ? 'Saving...' : 'Save'}
                onPress={handleSave}
                disabled={saveBusy}
                icon={<Check size={16} color={colors.white} />}
              />
            </View>
          </View>

          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-sm font-medium text-slate-700">Profile Picture</Text>
              <Pressable
                onPress={() => setAvatarShuffle((n) => n + 1)}
                className="flex-row items-center gap-1.5"
                hitSlop={8}
              >
                <Shuffle size={14} color={colors.indigo600} />
                <Text className="text-xs font-semibold text-indigo-600">Shuffle for more</Text>
              </Pressable>
            </View>
            <View className="flex-row flex-wrap gap-3">
              {avatarOptions.map((seed) => {
                const selected = seed === form.avatar_seed;
                return (
                  <Pressable
                    key={seed}
                    onPress={() => setForm({ ...form, avatar_seed: seed })}
                    className={cn(
                      'w-16 h-16 rounded-2xl overflow-hidden bg-slate-100',
                      selected ? 'border-2 border-indigo-600' : 'border border-slate-200',
                    )}
                  >
                    <Avatar name={seed} size={64} rounded="rounded-none" />
                  </Pressable>
                );
              })}
            </View>
            <Text className="text-xs text-slate-400 mt-2">
              Recommended picks based on your profile — pick one, or shuffle for more.
            </Text>
          </View>

          <Field
            label="Full Name"
            value={form.name}
            onChangeText={(name) => setForm({ ...form, name })}
          />
          <Field
            label="Department"
            value={form.department}
            onChangeText={(department) => setForm({ ...form, department })}
            placeholder="e.g. Computer Science"
          />
          <Field
            label="Bio / Description"
            value={form.bio}
            onChangeText={(bio) => setForm({ ...form, bio })}
            placeholder="Tell others about your background, interests, or office details..."
            multiline
          />
          <Field
            label="Academic Interests"
            hint="(comma separated)"
            value={form.interestsString}
            onChangeText={(interestsString) => setForm({ ...form, interestsString })}
            placeholder="AI, Algorithms, VLSI, Cybersecurity"
          />
          <OptionRow
            label="Preferred Mode of Communication"
            options={COMM_MODES}
            value={form.comm_mode as (typeof COMM_MODES)[number]}
            onChange={(comm_mode) => setForm({ ...form, comm_mode })}
          />
          <Field
            label="Preferred Timeslots"
            hint="(comma separated)"
            value={form.preferred_timesString}
            onChangeText={(preferred_timesString) => setForm({ ...form, preferred_timesString })}
            placeholder="Morning, Afternoon, 2 PM - 4 PM"
          />
          <Field
            label="Max Booking Requests / Day"
            value={form.max_bookings_per_day}
            onChangeText={(max_bookings_per_day) => setForm({ ...form, max_bookings_per_day })}
            keyboardType="number-pad"
          />

          {profile.role === 'student' && (
            <Field
              label="Learning Goals"
              value={form.learning_goals}
              onChangeText={(learning_goals) => setForm({ ...form, learning_goals })}
              placeholder="What are your goals or topics you wish to master?"
              multiline
            />
          )}

          {profile.role === 'teacher' && (
            <>
              <View className="border-t border-slate-100 pt-4">
                <Text className="font-bold text-slate-800 text-sm">Teacher-Specific Settings</Text>
              </View>
              <Field
                label="Cabin Block"
                value={form.cabin_block}
                onChangeText={(cabin_block) => setForm({ ...form, cabin_block })}
                placeholder="e.g. AHS Block"
              />
              <Field
                label="Cabin Room"
                value={form.cabin_room}
                onChangeText={(cabin_room) => setForm({ ...form, cabin_room })}
                placeholder="304"
              />
              <OptionRow
                label="Current Live Status"
                options={STATUSES}
                value={form.status}
                onChange={(status) => setForm({ ...form, status })}
              />
              <Field
                label="Status Note (e.g. Free till...)"
                value={form.status_note}
                onChangeText={(status_note) => setForm({ ...form, status_note })}
                placeholder="e.g. free till 4:00 PM"
              />
              <Field
                label="Subjects Taught"
                hint="(comma separated)"
                value={form.subjectsString}
                onChangeText={(subjectsString) => setForm({ ...form, subjectsString })}
                placeholder="Data Structures, Compiler Design"
              />
              <Field
                label="Office Hours"
                hint="(comma separated)"
                value={form.office_hoursString}
                onChangeText={(office_hoursString) => setForm({ ...form, office_hoursString })}
                placeholder="Mon 2-4 PM, Wed 10-12 AM"
              />

            </>
          )}
        </Card>
      ) : (
        // ---------------------------------------------------------- VIEW MODE
        <>
          {/* Reputation */}
          <Card className="rounded-3xl">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="font-bold text-slate-700 text-sm">Reputation Score</Text>
              <ShieldCheck size={18} color={colors.emerald500} />
            </View>
            <View className="flex-row items-baseline gap-2">
              <Text className="text-4xl font-extrabold text-slate-900">
                {profile.reputation_score}
              </Text>
              <Text className="text-sm font-semibold text-slate-400">/ 100</Text>
            </View>
            <Text className="text-xs text-slate-500 mt-2">
              {profile.no_shows > 0
                ? `${profile.no_shows} no-show${profile.no_shows > 1 ? 's' : ''} on record`
                : 'Perfect record. 0 no-shows! Keep it up.'}
            </Text>
            <View className="mt-4 pt-4 border-t border-slate-100">
              <View className="w-full bg-slate-100 rounded-full h-2">
                <View
                  className="bg-emerald-500 h-2 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, profile.reputation_score))}%` }}
                />
              </View>
            </View>
          </Card>

          {/* Availability & Location (teacher only) */}
          {profile.role === 'teacher' && (
            <Card className="rounded-3xl gap-4">
              <Text className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
                Availability & Location
              </Text>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Cabin Location</Text>
                <View className="flex-row items-center gap-1">
                  <MapPin size={14} color={colors.indigo500} />
                  <Text className="font-semibold text-slate-900 text-sm">
                    {profile.cabin_block && profile.cabin_room
                      ? `${profile.cabin_block} - ${profile.cabin_room}`
                      : 'Unassigned'}
                  </Text>
                </View>
              </View>
              <View className="flex-row justify-between items-center">
                <Text className="text-slate-500 text-sm">Current Status</Text>
                <View className="flex-row items-center gap-1.5">
                  <Dot className={TEACHER_STATUS_DOT[profile.status || 'Offline']} />
                  <Text className="font-semibold text-slate-900 text-sm">
                    {profile.status || 'Offline'}
                  </Text>
                </View>
              </View>
              {!!profile.status_note && (
                <View className="flex-row items-start gap-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <Clock size={14} color={colors.indigo500} />
                  <Text className="flex-1 text-xs text-slate-500">{profile.status_note}</Text>
                </View>
              )}
            </Card>
          )}

          {/* Profile details */}
          <Card className="rounded-3xl gap-3">
            <Text className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
              Profile Details
            </Text>
            <Row
              label="Member Since"
              value={
                profile.created_at ? format(parseISO(profile.created_at), 'MMMM yyyy') : '—'
              }
            />
            {!!profile.comm_mode && <Row label="Preferred Comms" value={profile.comm_mode} />}
            {!!profile.max_bookings_per_day && (
              <Row label="Max Bookings/Day" value={String(profile.max_bookings_per_day)} />
            )}

          </Card>

          {/* About */}
          <Card className="rounded-3xl gap-3">
            <View className="flex-row items-center gap-2">
              <Award size={18} color={colors.indigo600} />
              <SectionTitle>About Me</SectionTitle>
            </View>
            <Text className="text-slate-600 leading-relaxed text-sm">
              {profile.bio || 'This user has not written a bio yet.'}
            </Text>
          </Card>

          {/* Academic details */}
          <Card className="rounded-3xl gap-5">
            {!!profile.interests?.length && (
              <TagBlock
                title="Academic Interests"
                values={profile.interests}
                className="bg-indigo-50 border-indigo-100"
                textClassName="text-indigo-700"
              />
            )}
            {profile.role === 'teacher' && !!profile.subjects?.length && (
              <TagBlock
                title="Subjects Taught"
                values={profile.subjects}
                className="bg-emerald-50 border-emerald-100"
                textClassName="text-emerald-700"
              />
            )}
            {profile.role === 'teacher' && !!profile.office_hours?.length && (
              <TagBlock
                title="Office Hours"
                values={profile.office_hours}
                className="bg-slate-50 border-slate-200"
                textClassName="text-slate-600"
              />
            )}
            {profile.role === 'student' && !!profile.learning_goals && (
              <View>
                <Text className="font-bold text-slate-800 text-sm mb-2">Learning Goals</Text>
                <Text className="text-slate-600 text-sm leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {profile.learning_goals}
                </Text>
              </View>
            )}
            {profile.role === 'student' && !!profile.preferred_times?.length && (
              <TagBlock
                title="Preferred Study Timeslots"
                values={profile.preferred_times}
                className="bg-amber-50 border-amber-100"
                textClassName="text-amber-700"
              />
            )}
          </Card>

          {/* -------------------------------------------- TEACHER: slots + reviews */}
          {profile.role === 'teacher' && (
            <>
              <Card className="rounded-3xl gap-4">
                {!!bookingError && <ErrorBanner message={bookingError} />}

                <View className="flex-row items-center gap-2">
                  <Calendar size={18} color={colors.indigo600} />
                  <SectionTitle>Consultation Slots</SectionTitle>
                </View>

                <View className="gap-3">
                  {slots.length === 0 ? (
                    <Text className="text-center py-6 text-slate-400 text-sm font-medium">
                      No slots published by this faculty member right now.
                    </Text>
                  ) : (
                    slots.map((slot) => (
                      <View
                        key={slot.id}
                        className={cn(
                          'p-4 rounded-xl border flex-row justify-between items-center gap-3',
                          slot.is_booked
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-white border-slate-200',
                        )}
                      >
                        <View className="flex-row gap-3 items-center flex-1">
                          <View
                            className={cn(
                              'w-16 h-14 rounded-xl items-center justify-center',
                              slot.is_booked ? 'bg-slate-200' : 'bg-indigo-100',
                            )}
                          >
                            <Text
                              className={cn(
                                'text-sm font-bold',
                                slot.is_booked ? 'text-slate-600' : 'text-indigo-700',
                              )}
                            >
                              {slot.time}
                            </Text>
                            <Text
                              className={cn(
                                'text-[10px] mt-1',
                                slot.is_booked ? 'text-slate-600' : 'text-indigo-700',
                              )}
                            >
                              {slot.date}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className="font-bold text-slate-900" numberOfLines={1}>
                              {slot.topic}
                            </Text>
                            <View className="flex-row items-center flex-wrap gap-2 mt-1">
                              <View className="bg-slate-100 px-2 py-0.5 rounded-full">
                                <Text className="text-xs font-medium text-slate-500">
                                  {slot.subject}
                                </Text>
                              </View>
                              <Text className="text-xs text-slate-400">
                                {slot.type} • {slot.duration} min
                              </Text>
                            </View>
                          </View>
                        </View>

                        {currentUser?.role === 'student' && (
                          <Button
                            label={
                              isBooking === slot.id
                                ? 'Booking…'
                                : slot.is_booked
                                  ? 'Booked'
                                  : 'Book'
                            }
                            onPress={() => handleBookSlot(slot)}
                            disabled={slot.is_booked || isBooking === slot.id}
                            className="px-4 py-2"
                          />
                        )}
                      </View>
                    ))
                  )}
                </View>
              </Card>

              <Card className="rounded-3xl gap-5">
                <View className="flex-row items-center justify-between border-b border-slate-100 pb-3">
                  <View className="flex-row items-center gap-2">
                    <MessageSquare size={18} color={colors.indigo600} />
                    <SectionTitle>Student Feedback</SectionTitle>
                  </View>
                  <View className="flex-row items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                    <Star size={14} color={colors.amber500} fill={colors.amber500} />
                    <Text className="font-bold text-amber-800">{avgStars}</Text>
                    <Text className="text-amber-500 text-xs font-semibold">
                      ({ratings.length})
                    </Text>
                  </View>
                </View>

                {currentUser?.role === 'student' && (
                  <View className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <Text className="text-sm font-bold text-slate-900 mb-2">Write a Review</Text>
                    <View className="flex-row items-center gap-2 mb-3">
                      <Text className="text-xs text-slate-600">Stars:</Text>
                      <View className="flex-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Pressable key={star} onPress={() => setReviewStars(star)} className="p-1">
                            <Star
                              size={20}
                              color={reviewStars >= star ? colors.amber400 : colors.slate300}
                              fill={reviewStars >= star ? colors.amber400 : colors.slate300}
                            />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                    <Field
                      value={reviewText}
                      onChangeText={setReviewText}
                      placeholder="How was your doubt session or consultation experience?"
                      multiline
                      className="mb-3"
                    />
                    <Button
                      label={reviewBusy ? 'Posting…' : 'Submit Review'}
                      variant="dark"
                      onPress={handleSubmitReview}
                      disabled={reviewBusy || !reviewText.trim()}
                    />
                  </View>
                )}

                <View className="gap-4">
                  {ratings.length === 0 ? (
                    <Text className="text-center py-5 text-slate-400 text-sm font-medium">
                      No reviews posted for this teacher yet.
                    </Text>
                  ) : (
                    ratings.map((r) => (
                      <View
                        key={r.id}
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50"
                      >
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="flex-row items-center gap-2">
                            <Star size={14} color={colors.amber500} fill={colors.amber500} />
                            <Text className="text-sm font-bold text-amber-500">{r.stars}.0</Text>
                          </View>
                          {!!r.sentiment && <SentimentBadge sentiment={r.sentiment} />}
                        </View>
                        <Text className="text-slate-700 text-sm leading-relaxed">{r.review}</Text>
                        <Text className="mt-2 text-[10px] text-slate-400">
                          {format(parseISO(r.created_at), 'MMM d, yyyy h:mm a')}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              </Card>
            </>
          )}

          {/* -------------------------------------------- STUDENT: booking history */}
          {profile.role === 'student' && (
            <Card className="rounded-3xl gap-4">
              <View className="flex-row items-center gap-2">
                <Calendar size={18} color={colors.indigo600} />
                <SectionTitle>Consultation Bookings</SectionTitle>
              </View>

              <View className="gap-3">
                {studentBookings.length === 0 ? (
                  <Text className="text-center py-6 text-slate-400 text-sm font-medium">
                    No consultations registered for this student.
                  </Text>
                ) : (
                  studentBookings.map((b) => (
                    <View
                      key={b.id}
                      className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex-row items-center justify-between gap-3"
                    >
                      <View className="flex-1">
                        <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>
                          {b.slot?.topic || 'Consultation Doubts'}
                        </Text>
                        <Text className="text-xs text-slate-500 mt-0.5">
                          {b.slot
                            ? `${b.slot.date} at ${b.slot.time}`
                            : format(parseISO(b.created_at), 'MMM d, yyyy')}
                        </Text>
                        {!!b.slot && (
                          <Pressable
                            onPress={() => navigation.navigate('Profile', { id: b.teacher_id })}
                          >
                            <Text className="text-xs text-indigo-600 font-semibold mt-1">
                              Faculty ID: {b.teacher_id.substring(0, 8)}...
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Pill
                        className={BOOKING_STATUS_BADGE[b.status]}
                        textClassName={cn('uppercase', BOOKING_STATUS_BADGE[b.status])}
                      >
                        {b.status}
                      </Pill>
                    </View>
                  ))
                )}
              </View>
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-slate-500 text-sm">{label}</Text>
      <Text className="font-semibold text-slate-800 text-sm">{value}</Text>
    </View>
  );
}

function TagBlock({
  title,
  values,
  className,
  textClassName,
}: {
  title: string;
  values: string[];
  className: string;
  textClassName: string;
}) {
  return (
    <View>
      <Text className="font-bold text-slate-800 text-sm mb-3">{title}</Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((v) => (
          <View key={v} className={cn('px-3 py-1 border rounded-lg', className)}>
            <Text className={cn('text-xs font-semibold', textClassName)}>{v}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
