import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { BookingStatus, Rating, TeacherStatus } from "../types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Live-status dot color, shared by every page that renders a teacher's presence. */
export const TEACHER_STATUS_DOT: Record<TeacherStatus, string> = {
  Available: 'bg-emerald-500',
  Busy: 'bg-amber-500',
  'In Class': 'bg-blue-500',
  Offline: 'bg-slate-400',
};

/** Live-status pill (text + bg + border), shared by every page that renders a bordered status tag. */
export const TEACHER_STATUS_BADGE: Record<TeacherStatus, string> = {
  Available: 'text-emerald-700 bg-emerald-50 border-emerald-100',
  Busy: 'text-amber-700 bg-amber-50 border-amber-100',
  'In Class': 'text-blue-700 bg-blue-50 border-blue-100',
  Offline: 'text-slate-700 bg-slate-50 border-slate-100',
};

/** Live-status solid pill (text + bg, no border), for the plain status chip pattern. */
export const TEACHER_STATUS_PILL: Record<TeacherStatus, string> = {
  Available: 'bg-emerald-100 text-emerald-700',
  Busy: 'bg-amber-100 text-amber-700',
  'In Class': 'bg-blue-100 text-blue-700',
  Offline: 'bg-slate-200 text-slate-600',
};

/** Booking-status pill (text + bg), used wherever a booking is shown as a full badge/chip. */
export const BOOKING_STATUS_BADGE: Record<BookingStatus, string> = {
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  COMPLETED: 'bg-indigo-100 text-indigo-700',
  DECLINED: 'bg-red-100 text-red-700',
  NO_SHOW: 'bg-red-100 text-red-700',
};

/** Booking-status text color only, used where the status is shown inline (no chip background). */
export const BOOKING_STATUS_TEXT: Record<BookingStatus, string> = {
  ACCEPTED: 'text-emerald-600',
  PENDING: 'text-amber-600',
  COMPLETED: 'text-slate-500',
  DECLINED: 'text-slate-500',
  NO_SHOW: 'text-slate-500',
};

/** Average `stars` across a list of ratings, formatted to one decimal, or an em dash when empty. */
export function averageStars(ratings: Pick<Rating, 'stars'>[]): string {
  return ratings.length
    ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1)
    : '—';
}

/** Splits a comma-separated form field into trimmed, non-empty values. */
export function parseCsv(value: string): string[] {
  return value.split(',').map((v) => v.trim()).filter(Boolean);
}

/** Joins an array field back into a comma-separated form value. */
export function toCsv(values?: string[]): string {
  return values?.join(', ') || '';
}

/**
 * A handful of alternate DiceBear seeds "near" a base name/seed, for the
 * profile-picture picker (Profile.tsx). DiceBear's avataaars generator maps
 * each distinct seed string to a different (but stable) combination of
 * face/hair/accessory features, so appending a short suffix to the same base
 * name reliably produces a visually distinct avatar while keeping the set
 * reproducible across renders — refreshing the page shows the same options.
 * `shuffle` swaps in a fresh random batch instead, for "show me more".
 */
const AVATAR_VARIANT_TAGS = ['nova', 'quartz', 'comet', 'atlas', 'lumen', 'pixel', 'echo', 'zephyr'];

export function avatarCandidates(baseSeed: string, shuffle = false): string[] {
  const base = baseSeed || 'user';
  const tags = shuffle
    ? Array.from({ length: AVATAR_VARIANT_TAGS.length }, () => Math.random().toString(36).slice(2, 8))
    : AVATAR_VARIANT_TAGS;
  return [base, ...tags.map((tag) => `${base}-${tag}`)];
}
