/**
 * Shared primitives, ported from the repeated markup in frontend/src/pages/*
 * plus frontend/src/components/{ErrorBanner,SentimentBadge,ProtectedRoute}.tsx.
 *
 * Two web concepts have no React Native equivalent and are adapted here rather
 * than in each screen:
 *   - `<select>` → `<OptionRow>` / `<OptionGrid>`, a row/grid of pressable pills.
 *     Same value set, same single-select semantics, no native picker module.
 *   - `<form onSubmit>` → an explicit submit button. RN has no form element, so
 *     each screen's submit handler is wired to the button's onPress instead.
 */

import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  View,
  type TextInputProps,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { Text, TextInput } from './Text';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Eye, EyeOff, Minus, ThumbsDown, ThumbsUp, X } from 'lucide-react-native';
import { cn } from '../lib/utils';
import { colors } from '../lib/colors';
import { avatarFor } from '../lib/api';

// ------------------------------------------------------------------ feedback

/** The red inline error banner repeated across every screen's error state. */
export function ErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <View
      className={cn(
        'flex-row items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100',
        className,
      )}
    >
      <AlertCircle size={18} color={colors.red700} />
      <Text className="flex-1 text-sm text-red-700">{message}</Text>
    </View>
  );
}

/** Small pill rendering a review's AI sentiment label (backend/server/api/ai.cjs). */
export function SentimentBadge({ sentiment }: { sentiment: string }) {
  const key = sentiment.toLowerCase();
  const positive = key.startsWith('pos');
  const negative = key.startsWith('neg');
  const tint = positive ? colors.emerald700 : negative ? colors.red700 : colors.slate700;
  return (
    <View
      className={cn(
        'flex-row items-center gap-1 px-2 py-0.5 rounded-full',
        positive ? 'bg-emerald-100' : negative ? 'bg-red-100' : 'bg-slate-100',
      )}
    >
      {positive ? (
        <ThumbsUp size={11} color={tint} />
      ) : negative ? (
        <ThumbsDown size={11} color={tint} />
      ) : (
        <Minus size={11} color={tint} />
      )}
      <Text
        className={cn(
          'text-[10px] font-bold uppercase',
          positive ? 'text-emerald-700' : negative ? 'text-red-700' : 'text-slate-700',
        )}
      >
        {sentiment}
      </Text>
    </View>
  );
}

/** Port of ProtectedRoute.tsx's FullPageSpinner. */
export function FullPageSpinner({ label = 'Loading your campus…' }: { label?: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 py-16">
      <ActivityIndicator size="large" color={colors.indigo600} />
      <Text className="text-sm text-slate-500">{label}</Text>
    </View>
  );
}

/** Empty-state block used where the web app renders a dashed placeholder box. */
export function EmptyState({ icon, title }: { icon?: ReactNode; title: string }) {
  return (
    <View className="items-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
      {icon}
      <Text className="text-slate-500 font-medium text-center mt-3 px-4">{title}</Text>
    </View>
  );
}

// ------------------------------------------------------------------ surfaces

/** The `bg-white rounded-2xl shadow-sm border border-slate-200` card. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <View className={cn('bg-white rounded-2xl p-5 border border-slate-200 shadow-sm', className)}>
      {children}
    </View>
  );
}

/**
 * The web app's `bg-gradient-to-br from-… to-…` hero cards.
 *
 * NativeWind cannot express a CSS gradient, and `expo-linear-gradient` is a
 * third-party component that does not accept `className`. So the gradient is
 * painted as an absolutely-filled layer behind a normal className-styled View —
 * that keeps the padding/radius/spacing classes identical to the web source.
 */
export function GradientCard({
  from,
  to,
  className,
  children,
}: {
  from: string;
  to: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <View className={cn('rounded-2xl overflow-hidden', className)}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  );
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return <Text className={cn('text-lg font-bold text-slate-900', className)}>{children}</Text>;
}

/**
 * Deterministic DiceBear avatar (see avatarFor in lib/api.ts). Pass `seed`
 * (a user's avatar_seed, when known) to show their chosen picture instead of
 * the name-derived default — same fallback as avatarSrc().
 */
export function Avatar({ name, seed, size = 40, rounded = 'rounded-full' }: {
  name: string;
  seed?: string | null;
  size?: number;
  rounded?: string;
}) {
  return (
    <Image
      source={{ uri: avatarFor(seed || name) }}
      style={{ width: size, height: size }}
      className={cn('bg-slate-100', rounded)}
    />
  );
}

/** The colored status dot (`w-2 h-2 rounded-full`) used beside a teacher status. */
export function Dot({ className, size = 8 }: { className?: string; size?: number }) {
  return <View style={{ width: size, height: size }} className={cn('rounded-full', className)} />;
}

/** The pill/chip used for statuses, tags, subjects and counts. */
export function Pill({
  children,
  className,
  textClassName,
}: {
  children: ReactNode;
  className?: string;
  textClassName?: string;
}) {
  return (
    <View className={cn('px-2.5 py-1 rounded-full', className)}>
      <Text className={cn('text-[11px] font-bold', textClassName)}>{children}</Text>
    </View>
  );
}

// ------------------------------------------------------------------- buttons

export function Button({
  label,
  onPress,
  disabled,
  loading,
  icon,
  variant = 'primary',
  className,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  variant?: 'primary' | 'dark' | 'ghost' | 'danger' | 'success';
  className?: string;
}) {
  const surface = {
    primary: 'bg-indigo-600',
    dark: 'bg-slate-900',
    ghost: 'bg-white border border-slate-200',
    danger: 'bg-white border border-red-200',
    success: 'bg-emerald-600',
  }[variant];
  const text = {
    primary: 'text-white',
    dark: 'text-white',
    ghost: 'text-slate-700',
    danger: 'text-red-600',
    success: 'text-white',
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center gap-2 px-5 py-3 rounded-xl',
        surface,
        (disabled || loading) && 'opacity-50',
        className,
      )}
    >
      {!loading && icon}
      <Text className={cn('font-semibold text-sm', text)}>{loading ? 'Working…' : label}</Text>
    </Pressable>
  );
}

/**
 * Small square icon button (the p-2 hover:bg-* buttons in the web tables/lists).
 *
 * `label` is the RN counterpart of the web buttons' `title=` tooltip: a phone has
 * no hover, so the same string is exposed to screen readers instead of being
 * dropped.
 */
export function IconButton({
  onPress,
  disabled,
  children,
  className,
  label,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={cn('p-2 rounded-lg', disabled && 'opacity-40', className)}
    >
      {children}
    </Pressable>
  );
}

// -------------------------------------------------------------------- inputs

export function Field({
  label,
  hint,
  className,
  ...inputProps
}: TextInputProps & { label?: string; hint?: string; className?: string }) {
  // Any password field (secureTextEntry) gets a show/hide eye button for free —
  // `visible` overrides the caller's secureTextEntry rather than replacing it,
  // so the field still starts masked.
  const [visible, setVisible] = useState(false);
  const isPassword = !!inputProps.secureTextEntry;

  return (
    <View className={className}>
      {!!label && (
        <Text className="text-sm font-medium text-slate-700 mb-1.5">
          {label}
          {!!hint && <Text className="text-slate-400 font-normal"> {hint}</Text>}
        </Text>
      )}
      <View className={isPassword ? 'relative justify-center' : undefined}>
        <TextInput
          placeholderTextColor={colors.slate400}
          {...inputProps}
          secureTextEntry={isPassword && !visible}
          className={cn(
            'px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm',
            inputProps.multiline && 'h-24',
            isPassword && 'pr-11',
          )}
          style={inputProps.multiline ? { textAlignVertical: 'top' } : undefined}
        />
        {isPassword && (
          <Pressable
            onPress={() => setVisible((v) => !v)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
            className="absolute right-3 top-0 bottom-0 justify-center"
          >
            {visible ? (
              <EyeOff size={18} color={colors.slate400} />
            ) : (
              <Eye size={18} color={colors.slate400} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}

/**
 * Single-select replacement for `<select>`: a wrapping row of pressable pills.
 * `columns` is unused on purpose — the row wraps naturally.
 */
export function OptionRow<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label?: string;
  options: readonly T[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View>
      {!!label && <Text className="text-sm font-medium text-slate-700 mb-1.5">{label}</Text>}
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              disabled={disabled}
              onPress={() => onChange(option)}
              className={cn(
                'px-3 py-2 rounded-xl border',
                active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200',
                disabled && 'opacity-50',
              )}
            >
              <Text
                className={cn(
                  'text-xs font-semibold',
                  active ? 'text-white' : 'text-slate-600',
                )}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Multi-select chip group — port of Onboarding.tsx's ChipGroup. */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <View>
      <Text className="text-sm font-medium text-slate-700 mb-2">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => onToggle(option)}
              className={cn(
                'px-3 py-1.5 rounded-full border',
                active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200',
              )}
            >
              <Text
                className={cn('text-xs font-medium', active ? 'text-white' : 'text-slate-600')}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Checkbox replacement (RN has no <input type="checkbox">). */
export function Checkbox({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onToggle(!checked)}
      className="flex-row items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200"
    >
      <View
        className={cn(
          'w-5 h-5 rounded items-center justify-center border',
          checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300',
        )}
      >
        {checked && <Text className="text-white text-xs font-bold">✓</Text>}
      </View>
      <Text className="flex-1 text-sm font-medium text-slate-700">{label}</Text>
    </Pressable>
  );
}

// -------------------------------------------------------------------- modals

/**
 * The centred `fixed inset-0 bg-slate-900/40` dialog the web app uses for every
 * create/edit form. RN has no backdrop-blur, so this is a flat scrim.
 */
export function DialogModal({
  visible,
  title,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/50 justify-center p-4">
        <View className="bg-white rounded-3xl p-6 max-h-[85%]">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-xl font-bold text-slate-900">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={22} color={colors.slate400} />
            </Pressable>
          </View>
          {children}
        </View>
      </View>
    </Modal>
  );
}
