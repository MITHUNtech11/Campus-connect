/**
 * Live campus heatmap — port of frontend/src/pages/MapHeatmap.tsx.
 *
 *   GET /api/faculty  → every teacher's cabin_block / cabin_room / status
 *                       (public.teacher_tags, kept current by
 *                       PATCH /api/faculty/:id/status)
 *
 * DELIBERATE DEVIATION FROM THE WEB PAGE.
 * The web version draws an absolutely-positioned floor-plan canvas from a
 * hardcoded BLOCK_LAYOUT rectangle table. That table is decorative — its own
 * header comment says so; the database stores no floor-plan coordinates. A
 * 700x500 absolute canvas is meaningless on a phone, so the same BLOCK_LAYOUT
 * keys are rendered here as a scrollable grid of block cards instead. Every
 * REAL element carries over unchanged:
 *   - the per-block occupancy counts (available / total), still derived from
 *     the live /api/faculty rows
 *   - the same heat-colour thresholds and legend
 *   - "other blocks with checked-in faculty" (blocks present in the data but
 *     absent from the hardcoded layout), so nothing real is hidden
 *   - the per-teacher "Faculty presence board", here as a FlatList
 */

import { useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { Text } from '../components/Text';
import { MapPin, RefreshCw, Users } from 'lucide-react-native';
import api from '../lib/api';
import { Button, Card, Dot, ErrorBanner, Pill, SectionTitle } from '../components/ui';
import { TEACHER_STATUS_PILL, cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { Faculty } from '../types';

/**
 * Purely visual block list — not backed by any database column. Kept identical
 * to the web app's BLOCK_LAYOUT keys (the x/y/width/height values it carried
 * are dropped, since there is no canvas here to place them on).
 */
const KNOWN_BLOCKS = [
  'Circular Block',
  'Rectangular Block',
  'AHS Block',
  'SAIL Library',
  'SSPE Block',
];

export default function MapHeatmapScreen() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setFaculty(await api.faculty.list());
      setError(null);
    } catch (err) {
      setError(errMessage(err, 'Could not load live faculty data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /** block -> { total, available, teachers } aggregated from live teacher_tags. */
  const byBlock = useMemo(() => {
    const map = new Map<string, { total: number; available: number; teachers: Faculty[] }>();
    for (const f of faculty) {
      if (!f.cabin_block) continue;
      const entry = map.get(f.cabin_block) || { total: 0, available: 0, teachers: [] };
      entry.total += 1;
      if (f.status === 'Available') entry.available += 1;
      entry.teachers.push(f);
      map.set(f.cabin_block, entry);
    }
    return map;
  }, [faculty]);

  const unmappedBlocks = useMemo(
    () => [...byBlock.keys()].filter((b) => !KNOWN_BLOCKS.includes(b)),
    [byBlock],
  );

  const unlocated = faculty.filter((f) => !f.cabin_block);

  const heatColor = (available: number) => {
    if (available >= 5) return 'bg-emerald-600';
    if (available >= 2) return 'bg-emerald-500';
    if (available > 0) return 'bg-amber-500';
    return 'bg-slate-300';
  };

  const header = (
    <View className="gap-6 mb-4">
      <Card>
        <View className="mb-5">
          <Text className="text-2xl font-bold text-slate-900">Live Campus Heatmap</Text>
          <Text className="text-slate-500 mt-1">
            Mentor availability per block, from live faculty check-ins.
          </Text>
        </View>

        <Button
          label="Refresh"
          variant="dark"
          onPress={load}
          disabled={loading}
          icon={<RefreshCw size={16} color={colors.white} />}
          className="mb-5"
        />

        {!!error && <ErrorBanner message={error} className="mb-5" />}

        {/* Legend */}
        <View className="flex-row flex-wrap gap-4 mb-6">
          {[
            ['bg-emerald-600', 'High availability (5+)'],
            ['bg-emerald-500', 'Medium (2–4)'],
            ['bg-amber-500', 'Low (1)'],
            ['bg-slate-300', 'None free'],
          ].map(([dot, label]) => (
            <View key={label} className="flex-row items-center gap-2">
              <Dot className={dot} size={12} />
              <Text className="text-sm text-slate-600">{label}</Text>
            </View>
          ))}
        </View>

        {/* Block cards — the mobile stand-in for the decorative floor plan. */}
        <View className="flex-row flex-wrap gap-3">
          {KNOWN_BLOCKS.map((block) => {
            const entry = byBlock.get(block);
            const total = entry?.total || 0;
            const available = entry?.available || 0;
            return (
              <View
                key={block}
                className="flex-1 min-w-[45%] items-center p-4 rounded-xl border-2 border-slate-200 bg-slate-50"
              >
                <View
                  className={cn(
                    'w-8 h-8 rounded-full items-center justify-center mb-2',
                    heatColor(available),
                  )}
                >
                  <MapPin size={14} color={total > 0 ? colors.white : colors.slate500} />
                </View>
                <Text className="font-bold text-slate-800 text-center">{block}</Text>
                <Text className="text-xs text-slate-500 mt-1">
                  {available} free • {total} total
                </Text>
              </View>
            );
          })}
        </View>

        {unmappedBlocks.length > 0 && (
          <View className="mt-6">
            <Text className="text-sm font-semibold text-slate-700 mb-3">
              Other blocks with checked-in faculty
            </Text>
            <View className="flex-row flex-wrap gap-3">
              {unmappedBlocks.map((block) => {
                const entry = byBlock.get(block)!;
                return (
                  <View
                    key={block}
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 flex-row items-center gap-3"
                  >
                    <Dot className={heatColor(entry.available)} size={10} />
                    <View>
                      <Text className="text-sm font-semibold text-slate-800">{block}</Text>
                      <Text className="text-xs text-slate-500">
                        {entry.available} free • {entry.total} total
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </Card>

      <View className="flex-row items-center gap-2">
        <Users size={18} color={colors.indigo600} />
        <SectionTitle>Faculty presence board</SectionTitle>
      </View>
    </View>
  );

  return (
    <FlatList
      className="bg-slate-50"
      contentContainerClassName="p-4 pb-28 gap-3"
      data={faculty}
      keyExtractor={(f) => f.id}
      ListHeaderComponent={header}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.indigo600} />
      }
      ListEmptyComponent={
        <Text className="text-sm text-slate-500 py-6 text-center">
          {loading ? 'Loading…' : 'No faculty records found.'}
        </Text>
      }
      ListFooterComponent={
        unlocated.length > 0 ? (
          <Text className="mt-4 text-xs text-slate-400">
            {unlocated.length} faculty member{unlocated.length === 1 ? ' has' : 's have'} not
            checked in to a block yet.
          </Text>
        ) : null
      }
      renderItem={({ item: f }) => (
        <View className="p-4 rounded-xl border border-slate-100 bg-white flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <Text className="font-semibold text-slate-900" numberOfLines={1}>
              {f.name}
            </Text>
            <Text className="text-xs text-slate-500" numberOfLines={1}>
              {f.department}
            </Text>
            <View className="flex-row items-center gap-1 mt-1">
              <MapPin size={12} color={colors.slate500} />
              <Text className="text-xs text-slate-500">
                {f.cabin_block
                  ? `${f.cabin_block}${f.cabin_room ? ` · ${f.cabin_room}` : ''}`
                  : 'Not checked in'}
              </Text>
            </View>
          </View>
          <Pill
            className={TEACHER_STATUS_PILL[f.status]}
            textClassName={TEACHER_STATUS_PILL[f.status]}
          >
            {f.status}
          </Pill>
        </View>
      )}
    />
  );
}
