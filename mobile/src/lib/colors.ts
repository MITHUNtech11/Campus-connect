/**
 * Raw hex values for the Tailwind palette the web app uses
 * (frontend/src/index.css + the indigo/slate/emerald classes across
 * frontend/src/pages/*.tsx).
 *
 * NativeWind resolves `className` strings, but a handful of things can't take
 * one: `lucide-react-native` icons want a `color` prop, `expo-linear-gradient`
 * wants a `colors` array, and RN's TextInput wants `placeholderTextColor`.
 * Those read from here so there is exactly one source for a given shade.
 */

export const colors = {
  white: '#ffffff',
  black: '#000000',

  slate50: '#f8fafc',
  slate100: '#f1f5f9',
  slate200: '#e2e8f0',
  slate300: '#cbd5e1',
  slate400: '#94a3b8',
  slate500: '#64748b',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1e293b',
  slate900: '#0f172a',

  indigo50: '#eef2ff',
  indigo100: '#e0e7ff',
  indigo200: '#c7d2fe',
  indigo300: '#a5b4fc',
  indigo400: '#818cf8',
  indigo500: '#6366f1',
  indigo600: '#4f46e5',
  indigo700: '#4338ca',
  indigo800: '#3730a3',
  indigo900: '#312e81',

  blue500: '#3b82f6',
  blue600: '#2563eb',
  blue700: '#1d4ed8',
  blue900: '#1e3a8a',

  emerald50: '#ecfdf5',
  emerald100: '#d1fae5',
  emerald400: '#34d399',
  emerald500: '#10b981',
  emerald600: '#059669',
  emerald700: '#047857',

  amber50: '#fffbeb',
  amber100: '#fef3c7',
  amber200: '#fde68a',
  amber400: '#fbbf24',
  amber500: '#f59e0b',
  amber600: '#d97706',
  amber700: '#b45309',
  amber900: '#78350f',

  red50: '#fef2f2',
  red100: '#fee2e2',
  red500: '#ef4444',
  red600: '#dc2626',
  red700: '#b91c1c',

  purple50: '#faf5ff',
  purple100: '#f3e8ff',
  purple600: '#9333ea',
  purple700: '#7e22ce',
} as const;

/** The indigo-900 → blue-900 gradient used on the hero/header cards. */
export const HERO_GRADIENT = [colors.indigo900, colors.blue900] as const;

/** The slate-900 → slate-800 gradient on the teacher status card. */
export const SLATE_GRADIENT = [colors.slate900, colors.slate800] as const;
