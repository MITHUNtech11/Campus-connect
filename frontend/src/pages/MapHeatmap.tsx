/**
 * Live campus heatmap.
 *
 * There is no dedicated heatmap/geometry endpoint in the backend, so this page
 * derives real data from GET /api/faculty: each teacher's `cabin_block` /
 * `cabin_room` / `status` comes from public.teacher_tags, which is kept current
 * by PATCH /api/faculty/:id/status.
 *
 * The BLOCK RECTANGLES (x/y/width/height) are the only mock left on this page —
 * the database stores no campus floor-plan coordinates. Blocks that exist in
 * the data but have no hardcoded rectangle are listed underneath the canvas, so
 * nothing real is ever hidden.
 */

import { useEffect, useMemo, useState } from 'react';
import { MapPin, RefreshCw, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { cn, TEACHER_STATUS_PILL } from '../lib/utils';
import api from '../lib/api';
import type { Faculty } from '../types';
import ErrorBanner from '../components/ErrorBanner';

/** Purely visual floor-plan layout — not backed by any database column. */
const BLOCK_LAYOUT: Record<string, { x: number; y: number; width: number; height: number }> = {
  'Circular Block': { x: 20, y: 20, width: 200, height: 170 },
  'Rectangular Block': { x: 250, y: 20, width: 220, height: 170 },
  'AHS Block': { x: 500, y: 20, width: 200, height: 170 },
  'SAIL Library': { x: 20, y: 220, width: 220, height: 180 },
  'SSPE Block': { x: 270, y: 220, width: 220, height: 180 },
};

export default function MapHeatmap() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      setFaculty(await api.faculty.list());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load live faculty data');
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
    () => [...byBlock.keys()].filter((b) => !BLOCK_LAYOUT[b]),
    [byBlock],
  );

  const unlocated = faculty.filter((f) => !f.cabin_block);

  const heatColor = (available: number) => {
    if (available >= 5) return 'bg-emerald-600 shadow-emerald-500/50';
    if (available >= 2) return 'bg-emerald-500 shadow-emerald-500/50';
    if (available > 0) return 'bg-amber-500 shadow-amber-500/50';
    return 'bg-slate-300';
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Live Campus Heatmap</h1>
            <p className="text-slate-500 mt-1">
              Mentor availability per block, from live faculty check-ins.
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-800 flex items-center gap-2 disabled:opacity-70 self-start"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {error && <ErrorBanner message={error} className="mb-6" />}

        {/* Legend */}
        <div className="flex flex-wrap gap-6 mb-8 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-600" /> High availability (5+)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" /> Medium (2–4)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" /> Low (1)
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-300" /> None free
          </div>
        </div>

        {/* Floor-plan canvas (layout is decorative; the counts are real) */}
        <div className="relative w-full h-[500px] bg-slate-50 border border-slate-200 rounded-2xl overflow-auto">
          {Object.entries(BLOCK_LAYOUT).map(([block, box]) => {
            const entry = byBlock.get(block);
            const total = entry?.total || 0;
            const available = entry?.available || 0;
            return (
              <motion.div
                key={block}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute border-2 border-slate-300 rounded-xl bg-white/80 backdrop-blur-sm transition-all hover:border-indigo-400 flex flex-col items-center justify-center p-4 shadow-sm"
                style={{ left: box.x, top: box.y, width: box.width, height: box.height }}
              >
                <div
                  className={cn(
                    'w-6 h-6 rounded-full shadow-lg mb-2 flex items-center justify-center',
                    heatColor(available),
                  )}
                >
                  <MapPin className={cn('w-3 h-3', total > 0 ? 'text-white' : 'text-slate-500')} />
                </div>
                <h3 className="font-bold text-slate-800">{block}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {available} free • {total} total
                </p>
              </motion.div>
            );
          })}
        </div>

        {unmappedBlocks.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Other blocks with checked-in faculty
            </h3>
            <div className="flex flex-wrap gap-3">
              {unmappedBlocks.map((block) => {
                const entry = byBlock.get(block)!;
                return (
                  <div
                    key={block}
                    className="px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3"
                  >
                    <div className={cn('w-2.5 h-2.5 rounded-full', heatColor(entry.available))} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{block}</p>
                      <p className="text-xs text-slate-500">
                        {entry.available} free • {entry.total} total
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Per-teacher live board */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" /> Faculty presence board
        </h2>

        {faculty.length === 0 ? (
          <p className="text-sm text-slate-500 py-8 text-center">
            {loading ? 'Loading…' : 'No faculty records found.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {faculty.map((f) => (
              <div
                key={f.id}
                className="p-4 rounded-xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{f.name}</p>
                  <p className="text-xs text-slate-500 truncate">{f.department}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {f.cabin_block ? `${f.cabin_block}${f.cabin_room ? ` · ${f.cabin_room}` : ''}` : 'Not checked in'}
                  </p>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-1 text-[11px] font-bold rounded-full shrink-0',
                    TEACHER_STATUS_PILL[f.status],
                  )}
                >
                  {f.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {unlocated.length > 0 && (
          <p className="mt-4 text-xs text-slate-400">
            {unlocated.length} faculty member{unlocated.length === 1 ? ' has' : 's have'} not checked
            in to a block yet.
          </p>
        )}
      </div>
    </div>
  );
}
