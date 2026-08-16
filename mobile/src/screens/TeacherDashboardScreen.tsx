/**
 * Teacher dashboard — port of frontend/src/pages/TeacherDashboard.tsx.
 *
 *   GET    /api/faculty                → own live status row (teacher_tags)
 *   PATCH  /api/faculty/:id/status     → change status / cabin
 *   GET    /api/slots?teacher_id=      → own consultation slots
 *   POST   /api/slots                  → publish a slot
 *   DELETE /api/slots/:id              → remove an unbooked slot
 *   GET    /api/bookings               → incoming booking requests
 *   PATCH  /api/bookings/:id/status    → accept / decline / complete
 *   POST   /api/bookings/:id/no_show   → mark a no-show (docks reputation)
 *   GET    /api/ratings/:teacher_id    → own reviews
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import {
  Check,
  MapPin,
  Plus,
  Star,
  Trash2,
  UserX,
  Users,
  X,
} from 'lucide-react-native';
import api from '../lib/api';
import {
  Button,
  Card,
  DialogModal,
  Dot,
  ErrorBanner,
  Field,
  GradientCard,
  IconButton,
  OptionRow,
  Pill,
  SectionTitle,
} from '../components/ui';
import {
  BOOKING_STATUS_BADGE,
  TEACHER_STATUS_DOT,
  averageStars,
  cn,
  errMessage,
} from '../lib/utils';
import { colors } from '../lib/colors';
import type { Booking, Faculty, Rating, Slot, TeacherStatus, User } from '../types';
import type { RootStackParamList } from '../navigation/types';

const STATUSES: TeacherStatus[] = ['Available', 'Busy', 'In Class', 'Offline'];
const SLOT_TYPES = ['1-on-1 Consultation', 'Group Session', 'Lab Help'] as const;

export default function TeacherDashboardScreen({ user }: { user: User }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [profile, setProfile] = useState<Faculty | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [slotForm, setSlotForm] = useState({
    subject: '',
    topic: '',
    date: '',
    time: '',
    duration: '30',
    type: '1-on-1 Consultation' as (typeof SLOT_TYPES)[number],
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
      setError(errMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const slotsById = useMemo(() => Object.fromEntries(slots.map((s) => [s.id, s])), [slots]);

  const changeStatus = async (status: TeacherStatus) => {
    setBusy('status');
    setError(null);
    try {
      await api.faculty.updateStatus(user.id, { status });
      setProfile((p) => (p ? { ...p, status } : p));
    } catch (err) {
      setError(errMessage(err, 'Could not update status'));
    } finally {
      setBusy(null);
    }
  };

  const createSlot = async () => {
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
      });
      setSlots((prev) => [slot, ...prev]);
      setShowSlotModal(false);
      setSlotForm({
        subject: '',
        topic: '',
        date: '',
        time: '',
        duration: '30',
        type: '1-on-1 Consultation',
      });
    } catch (err) {
      setError(errMessage(err, 'Could not create slot'));
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
      setError(errMessage(err, 'Could not delete slot'));
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
      setError(errMessage(err, 'Could not update booking'));
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
      setError(errMessage(err, 'Could not mark no-show'));
    } finally {
      setBusy(null);
    }
  };

  const avgRating = averageStars(ratings);
  const pending = bookings.filter((b) => b.status === 'PENDING');

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <Text className="text-slate-500">Loading dashboard…</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        className="bg-slate-50"
        contentContainerClassName="p-4 pb-28 gap-6"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
            tintColor={colors.indigo600}
          />
        }
      >
        {!!error && <ErrorBanner message={error} />}



        {/* Current status */}
        <GradientCard from={colors.slate900} to={colors.slate800} className="p-6">
          <View className="flex-row justify-between items-start mb-6">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-white mb-1">Current Status</Text>
              <Text className="text-slate-400 text-sm">Visible to all students</Text>
            </View>
            <View className="flex-row items-center gap-2 bg-white/10 px-3 py-2 rounded-full">
              <Star size={14} color={colors.amber400} fill={colors.amber400} />
              <Text className="font-bold text-white">{avgRating}</Text>
              <Text className="text-slate-300 text-sm">({ratings.length})</Text>
            </View>
          </View>

          <View className="bg-white/10 rounded-xl p-4 mb-4">
            <Text className="text-slate-400 text-xs mb-1 uppercase">Location</Text>
            {profile?.cabin_block ? (
              <View className="flex-row items-center gap-2">
                <MapPin size={16} color={colors.emerald400} />
                <Text className="font-medium text-white">
                  {profile.cabin_block}
                  {profile.cabin_room ? `, ${profile.cabin_room}` : ''}
                </Text>
              </View>
            ) : (
              <Text className="font-medium text-slate-400">Not checked in</Text>
            )}
          </View>

          <View className="bg-white/10 rounded-xl p-4">
            <View className="flex-row items-center gap-2 mb-3">
              <Dot size={10} className={TEACHER_STATUS_DOT[profile?.status || 'Offline']} />
              <Text className="text-slate-400 text-xs uppercase">Availability</Text>
            </View>
            {/* The web app uses a <select>; RN gets a pill row with the same values. */}
            <View className="flex-row flex-wrap gap-2">
              {STATUSES.map((s) => {
                const active = (profile?.status || 'Offline') === s;
                return (
                  <Pressable
                    key={s}
                    disabled={busy === 'status'}
                    onPress={() => changeStatus(s)}
                    className={cn(
                      'px-3 py-2 rounded-xl border',
                      active ? 'bg-white border-white' : 'bg-white/5 border-white/20',
                      busy === 'status' && 'opacity-50',
                    )}
                  >
                    <Text
                      className={cn(
                        'text-xs font-semibold',
                        active ? 'text-slate-900' : 'text-slate-200',
                      )}
                    >
                      {s}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </GradientCard>

        {/* Consultation slots */}
        <Card>
          <View className="flex-row items-center justify-between mb-5">
            <SectionTitle>Consultation Slots</SectionTitle>
            <Pressable
              onPress={() => setShowSlotModal(true)}
              className="flex-row items-center gap-1.5 px-3 py-2 bg-indigo-50 rounded-lg"
            >
              <Plus size={16} color={colors.indigo600} />
              <Text className="text-sm font-medium text-indigo-600">New Slot</Text>
            </Pressable>
          </View>

          <View className="gap-4">
            {slots.length === 0 ? (
              <Text className="text-center py-6 text-slate-500 text-sm">
                No published slots. Create one!
              </Text>
            ) : (
              slots.map((slot) => (
                <View
                  key={slot.id}
                  className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex-row justify-between items-center gap-3"
                >
                  <View className="flex-row gap-3 items-center flex-1">
                    <View className="w-16 h-14 rounded-xl bg-indigo-100 items-center justify-center">
                      <Text className="text-sm font-bold text-indigo-700">{slot.time}</Text>
                      <Text className="text-[10px] text-indigo-700 mt-1">{slot.date}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="font-bold text-slate-900" numberOfLines={1}>
                        {slot.topic}
                      </Text>
                      <Text className="text-sm text-slate-500" numberOfLines={1}>
                        {slot.subject} • {slot.duration} min
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <Pill
                      className={slot.is_booked ? 'bg-amber-100' : 'bg-emerald-100'}
                      textClassName={slot.is_booked ? 'text-amber-700' : 'text-emerald-700'}
                    >
                      {slot.is_booked ? 'Booked' : 'Open'}
                    </Pill>
                    {!slot.is_booked && (
                      <IconButton onPress={() => deleteSlot(slot.id)} disabled={busy === slot.id}>
                        <Trash2 size={16} color={colors.slate400} />
                      </IconButton>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </Card>

        {/* Booking requests */}
        <Card>
          <View className="flex-row items-center justify-between mb-5">
            <SectionTitle>Booking Requests</SectionTitle>
            {pending.length > 0 && (
              <Pill className="bg-amber-100" textClassName="text-amber-700">
                {pending.length} pending
              </Pill>
            )}
          </View>

          <View className="gap-4">
            {bookings.length === 0 ? (
              <View className="items-center py-6">
                <View className="w-16 h-16 bg-slate-50 rounded-full items-center justify-center mb-3">
                  <Users size={30} color={colors.slate300} />
                </View>
                <Text className="text-slate-500 text-sm">
                  No students have booked with you yet.
                </Text>
              </View>
            ) : (
              bookings.map((b) => {
                const slot = b.slot_id ? slotsById[b.slot_id] : undefined;
                return (
                  <View
                    key={b.id}
                    className="p-4 rounded-xl border border-slate-100 bg-slate-50 gap-3"
                  >
                    <View className="flex-row justify-between items-start gap-3">
                      <View className="flex-1">
                        <Text className="font-bold text-slate-900" numberOfLines={1}>
                          {slot ? slot.topic : 'Consultation request'}
                        </Text>
                        {!!b.student && (
                          <Pressable
                            onPress={() => navigation.navigate('Profile', { id: b.student!.id })}
                          >
                            <Text className="text-xs font-bold text-indigo-600 mb-1">
                              Booked by: {b.student.name}
                            </Text>
                          </Pressable>
                        )}
                        <Text className="text-xs text-slate-500">
                          {slot ? `${slot.date} at ${slot.time}` : 'No slot attached'} • requested{' '}
                          {format(parseISO(b.created_at), 'MMM d')}
                        </Text>
                      </View>
                      <Pill
                        className={BOOKING_STATUS_BADGE[b.status]}
                        textClassName={BOOKING_STATUS_BADGE[b.status]}
                      >
                        {b.status}
                      </Pill>
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      {b.status === 'PENDING' && (
                        <>
                          <Button
                            label="Accept"
                            variant="success"
                            onPress={() => setBookingStatus(b.id, 'ACCEPTED')}
                            disabled={busy === b.id}
                            icon={<Check size={14} color={colors.white} />}
                            className="px-3 py-2"
                          />
                          <Button
                            label="Decline"
                            variant="ghost"
                            onPress={() => setBookingStatus(b.id, 'DECLINED')}
                            disabled={busy === b.id}
                            icon={<X size={14} color={colors.slate600} />}
                            className="px-3 py-2"
                          />
                        </>
                      )}
                      {b.status === 'ACCEPTED' && (
                        <>
                          <Button
                            label="Mark completed"
                            onPress={() => setBookingStatus(b.id, 'COMPLETED')}
                            disabled={busy === b.id}
                            icon={<Check size={14} color={colors.white} />}
                            className="px-3 py-2"
                          />
                          <Button
                            label="No-show"
                            variant="danger"
                            onPress={() => markNoShow(b.id)}
                            disabled={busy === b.id}
                            icon={<UserX size={14} color={colors.red600} />}
                            className="px-3 py-2"
                          />
                        </>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </Card>

        {/* Reviews */}
        <Card>
          <SectionTitle className="mb-5">Recent Student Reviews</SectionTitle>
          {ratings.length === 0 ? (
            <Text className="text-sm text-slate-500 py-5 text-center">No reviews yet.</Text>
          ) : (
            <View className="gap-4">
              {ratings.slice(0, 6).map((r) => (
                <View key={r.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                  <View className="flex-row items-center gap-1 mb-2">
                    <Star size={14} color={colors.amber500} fill={colors.amber500} />
                    <Text className="text-sm font-bold text-amber-500">{r.stars}.0</Text>
                  </View>
                  <Text className="text-slate-700 text-sm leading-relaxed" numberOfLines={4}>
                    {r.review}
                  </Text>
                  <Text className="mt-2 text-[10px] text-slate-400">
                    {format(parseISO(r.created_at), 'MMM d, yyyy')}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Card>
      </ScrollView>

      {/* Slot creation modal */}
      <DialogModal
        visible={showSlotModal}
        title="Create New Slot"
        onClose={() => setShowSlotModal(false)}
      >
        <ScrollView contentContainerClassName="gap-4" keyboardShouldPersistTaps="handled">
          <Field
            label="Subject"
            value={slotForm.subject}
            onChangeText={(subject) => setSlotForm({ ...slotForm, subject })}
            placeholder="e.g. Database Systems"
          />
          <Field
            label="Topic"
            value={slotForm.topic}
            onChangeText={(topic) => setSlotForm({ ...slotForm, topic })}
            placeholder="e.g. Normalization doubts"
          />
          <View className="flex-row gap-4">
            {/* The web app uses <input type="date"/type="time">; RN has no such
                widget without a native picker module, so these stay plain text
                fields in the exact formats the backend columns expect. */}
            <Field
              label="Date"
              hint="(YYYY-MM-DD)"
              value={slotForm.date}
              onChangeText={(date) => setSlotForm({ ...slotForm, date })}
              placeholder="2026-08-20"
              className="flex-1"
            />
            <Field
              label="Time"
              hint="(HH:MM)"
              value={slotForm.time}
              onChangeText={(time) => setSlotForm({ ...slotForm, time })}
              placeholder="14:30"
              className="flex-1"
            />
          </View>
          <Field
            label="Duration (min)"
            value={slotForm.duration}
            onChangeText={(duration) => setSlotForm({ ...slotForm, duration })}
            keyboardType="number-pad"
          />
          <OptionRow
            label="Type"
            options={SLOT_TYPES}
            value={slotForm.type}
            onChange={(type) => setSlotForm({ ...slotForm, type })}
          />
          <Button
            label={busy === 'slot' ? 'Creating…' : 'Create Slot'}
            onPress={createSlot}
            disabled={busy === 'slot' || !slotForm.subject || !slotForm.topic || !slotForm.time}
          />
        </ScrollView>
      </DialogModal>
    </>
  );
}
