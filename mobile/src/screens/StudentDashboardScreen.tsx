/**
 * Student dashboard — port of frontend/src/pages/StudentDashboard.tsx.
 *
 *   GET    /api/faculty        → mentor directory + live status
 *   POST   /api/ai/recommend   → backend's own keyword-vector matcher
 *   GET    /api/bookings       → the caller's own bookings
 *   DELETE /api/bookings/:id   → cancel
 *
 * Booking a slot and leaving a review are NOT handled here: both live on the
 * teacher's profile screen, which every "View Profile & Book" press and AI
 * recommendation routes to — same split as the web app.
 *
 * The only structural change is layout: the web grid (2/3 hero + 1/3 reputation,
 * then a 3-up faculty grid) becomes a single stacked column, and the faculty
 * directory is a FlatList so a large teacher roster scrolls without mounting
 * every card at once.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { Text, TextInput } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format, parseISO } from 'date-fns';
import { MapPin, ShieldCheck, Sparkles, Trash2 } from 'lucide-react-native';
import api from '../lib/api';
import {
  Avatar,
  Button,
  Card,
  Dot,
  ErrorBanner,
  GradientCard,
  IconButton,
  SectionTitle,
} from '../components/ui';
import { BOOKING_STATUS_TEXT, TEACHER_STATUS_DOT, cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { AiRecommendation, Booking, Faculty, User } from '../types';
import type { RootStackParamList } from '../navigation/types';

export default function StudentDashboardScreen({ user }: { user: User }) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
      setError(errMessage(err, 'Failed to load dashboard data'));
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const facultyById = useMemo(() => Object.fromEntries(faculty.map((f) => [f.id, f])), [faculty]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    setRecommendations(null);
    try {
      const recs = await api.ai.recommend(searchQuery.trim());
      setRecommendations(recs);
    } catch (err) {
      setError(errMessage(err, 'Recommendation failed'));
    } finally {
      setIsSearching(false);
    }
  };

  const cancelBooking = async (id: string) => {
    try {
      await api.bookings.cancel(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError(errMessage(err, 'Could not cancel booking'));
    }
  };

  const header = (
    <View className="gap-6">
      {!!error && <ErrorBanner message={error} />}

      {/* Hero + AI mentor search */}
      <GradientCard from={colors.indigo900} to={colors.blue900} className="p-6">
        <Text className="text-2xl font-bold text-white mb-2">
          Welcome back, {user.name.split(' ')[0]}!
        </Text>
        <Text className="text-indigo-100 leading-relaxed mb-6">
          Find the right mentor for your doubts, track campus activity, and build your academic
          reputation.
        </Text>

        <View className="bg-white/10 border border-white/20 rounded-xl px-3 mb-3 flex-row items-center gap-2">
          <Sparkles size={18} color={colors.indigo300} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Describe your doubt: 'help with SQL joins'"
            placeholderTextColor={colors.indigo200}
            className="flex-1 py-3.5 text-white text-sm"
          />
        </View>
        <Button
          label={isSearching ? 'Matching…' : 'Match me'}
          variant="ghost"
          onPress={handleSearch}
          disabled={isSearching}
        />
      </GradientCard>

      {/* Reputation */}
      <Card>
        <View className="flex-row items-center justify-between mb-2">
          <Text className="font-semibold text-slate-700">Reputation Score</Text>
          <ShieldCheck size={18} color={colors.emerald500} />
        </View>
        <View className="flex-row items-baseline gap-2">
          <Text className="text-4xl font-bold text-slate-900">{user.reputation_score}</Text>
          <Text className="text-sm font-medium text-slate-500">/ 100</Text>
        </View>
        <Text className="text-sm text-slate-500 mt-2">
          {user.no_shows > 0
            ? `${user.no_shows} no-show${user.no_shows > 1 ? 's' : ''} on record`
            : 'No missed consultations — keep it up.'}
        </Text>
        <View className="mt-4 pt-4 border-t border-slate-100">
          <View className="flex-row justify-between mb-1">
            <Text className="text-xs text-slate-500">Next tier: Priority Booking</Text>
            <Text className="text-xs text-slate-500">100</Text>
          </View>
          <View className="w-full bg-slate-100 rounded-full h-2">
            <View
              className="bg-emerald-500 h-2 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, user.reputation_score))}%` }}
            />
          </View>
        </View>
      </Card>

      {/* AI recommendations */}
      {!!recommendations && (
        <View className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100">
          <View className="flex-row items-center gap-3 mb-4">
            <View className="bg-indigo-600 p-2.5 rounded-xl">
              <Sparkles size={20} color={colors.white} />
            </View>
            <Text className="flex-1 text-base font-bold text-indigo-900">
              Recommended mentors for “{searchQuery}”
            </Text>
          </View>

          {recommendations.length === 0 ? (
            <Text className="text-indigo-800 text-sm">No faculty profiles matched that topic yet.</Text>
          ) : (
            <View className="gap-3">
              {recommendations.map((rec) => {
                const teacher = facultyById[rec.teacher_id];
                if (!teacher) return null;
                return (
                  <View
                    key={rec.teacher_id}
                    className="bg-white rounded-xl p-4 border border-indigo-100"
                  >
                    <View className="flex-row items-center gap-3 mb-3">
                      <Avatar name={teacher.name} seed={teacher.avatar_seed} size={44} />
                      <View className="flex-1">
                        <Text className="font-bold text-slate-900" numberOfLines={1}>
                          {teacher.name}
                        </Text>
                        <Text className="text-sm text-slate-500" numberOfLines={1}>
                          {rec.reason}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <View className="bg-indigo-50 px-2 py-1 rounded-md">
                        <Text className="text-xs font-bold text-indigo-700">
                          {(rec.score * 100).toFixed(0)}% match
                        </Text>
                      </View>
                      <Button
                        label="View"
                        onPress={() => navigation.navigate('Profile', { id: rec.teacher_id })}
                        className="px-4 py-2"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Live campus activity */}
      <Card>
        <View className="flex-row items-center justify-between mb-4">
          <SectionTitle>Live Campus Activity</SectionTitle>
          <Text className="text-xs text-slate-500">from faculty check-ins</Text>
        </View>

        {blockActivity.length === 0 ? (
          <Text className="text-sm text-slate-500 py-5 text-center">
            No faculty have checked in to a block yet.
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-3">
            {blockActivity.map(({ block, total, available }) => (
              <View
                key={block}
                className={cn(
                  'flex-1 min-w-[45%] p-4 rounded-xl border',
                  available >= 3
                    ? 'bg-emerald-50 border-emerald-100'
                    : available >= 1
                      ? 'bg-amber-50 border-amber-100'
                      : 'bg-slate-50 border-slate-200',
                )}
              >
                <View className="flex-row justify-between items-start mb-2">
                  <Text className="font-semibold text-slate-900 text-sm flex-1" numberOfLines={1}>
                    {block}
                  </Text>
                  <Dot
                    className={cn(
                      'mt-1.5',
                      available >= 3
                        ? 'bg-emerald-500'
                        : available >= 1
                          ? 'bg-amber-500'
                          : 'bg-slate-400',
                    )}
                  />
                </View>
                <Text className="text-xs text-slate-500">
                  {available} of {total} available
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* My bookings */}
      <Card>
        <SectionTitle className="mb-4">My Bookings</SectionTitle>
        {bookings.length === 0 ? (
          <Text className="text-sm text-slate-500 py-5 text-center">
            No consultations booked yet.
          </Text>
        ) : (
          <View className="gap-3">
            {bookings.map((b) => (
              <View
                key={b.id}
                className="p-3 rounded-xl border border-slate-100 bg-slate-50 flex-row items-center justify-between gap-2"
              >
                <View className="flex-1">
                  {facultyById[b.teacher_id] ? (
                    <Pressable
                      onPress={() => navigation.navigate('Profile', { id: b.teacher_id })}
                    >
                      <Text className="text-sm font-bold text-indigo-600" numberOfLines={1}>
                        {facultyById[b.teacher_id].name}
                      </Text>
                    </Pressable>
                  ) : (
                    <Text className="text-sm font-semibold text-slate-900">Faculty member</Text>
                  )}
                  <Text className="text-xs text-slate-500 mt-0.5">
                    {format(parseISO(b.created_at), 'MMM d')} •{' '}
                    <Text className={cn('font-semibold', BOOKING_STATUS_TEXT[b.status])}>
                      {b.status}
                    </Text>
                  </Text>
                </View>
                <IconButton onPress={() => cancelBooking(b.id)}>
                  <Trash2 size={16} color={colors.slate400} />
                </IconButton>
              </View>
            ))}
          </View>
        )}
      </Card>

      {/* Faculty directory heading — the list itself is this FlatList's data. */}
      <View className="flex-row items-center justify-between">
        <SectionTitle className="text-xl">Faculty Directory</SectionTitle>
        <Text className="text-sm text-slate-500">
          {loading ? 'Loading…' : `${faculty.length} teachers found`}
        </Text>
      </View>
    </View>
  );

  return (
    <FlatList
      data={faculty}
      keyExtractor={(f) => f.id}
      className="bg-slate-50"
      contentContainerClassName="p-4 pb-28 gap-4"
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            loadAll();
          }}
          tintColor={colors.indigo600}
        />
      }
      ListEmptyComponent={
        loading ? null : (
          <Text className="text-sm text-slate-500 py-8 text-center">
            No teacher accounts exist in the database yet.
          </Text>
        )
      }
      renderItem={({ item: teacher }) => {
        const isAvailable = teacher.status === 'Available';
        return (
          <View
            className={cn(
              'p-5 rounded-2xl border',
              isAvailable
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-slate-50 border-slate-200',
            )}
          >
            <View className="flex-row gap-4 items-start mb-4">
              <Avatar name={teacher.name} seed={teacher.avatar_seed} size={56} rounded="rounded-xl" />
              <View className="flex-1">
                <Text className="font-bold text-slate-900 text-lg" numberOfLines={1}>
                  {teacher.name}
                </Text>
                <Text className="text-sm text-slate-500" numberOfLines={1}>
                  {teacher.department}
                </Text>
              </View>
            </View>

            <View className="gap-2 mb-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <ShieldCheck size={16} color={colors.emerald500} />
                  <Text className="text-sm text-slate-500">{teacher.reputation_score}</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <MapPin size={16} color={colors.slate500} />
                  <Text className="text-sm text-slate-500">{teacher.cabin_block || 'Campus'}</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between pt-1">
                <Text className="text-sm text-slate-500">Status</Text>
                <View className="flex-row items-center gap-1.5">
                  <Dot className={TEACHER_STATUS_DOT[teacher.status] || 'bg-slate-400'} />
                  <Text className="text-sm font-medium text-slate-700">{teacher.status}</Text>
                </View>
              </View>
              {teacher.subjects.length > 0 && (
                <View className="flex-row flex-wrap gap-1 pt-2">
                  {teacher.subjects.slice(0, 3).map((s) => (
                    <View
                      key={s}
                      className="px-2 py-0.5 bg-white rounded-md border border-slate-200"
                    >
                      <Text className="text-[11px] font-medium text-slate-600">{s}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>

            <Button
              label="View Profile & Book"
              variant={isAvailable ? 'success' : 'ghost'}
              onPress={() => navigation.navigate('Profile', { id: teacher.id })}
            />
          </View>
        );
      }}
    />
  );
}
