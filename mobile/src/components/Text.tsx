/**
 * Poppins-defaulted drop-ins for RN's `Text`/`TextInput`.
 *
 * RN's `Text`/`TextInput` are function components with no `defaultProps`
 * (React dropped that for function components), so there is no single place
 * to set a default font the way `font-sans` on the body cascades on the web
 * (frontend/src/index.css). Every screen imports `Text`/`TextInput` from here
 * instead of 'react-native' so the `font-sans` class (mapped to Poppins in
 * tailwind.config.js) applies everywhere by default; an explicit `className`
 * on the call site still layers on top via `cn`/`twMerge`.
 */

import {
  Text as RNText,
  TextInput as RNTextInput,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import { cn } from '../lib/utils';

export function Text({ className, ...props }: TextProps) {
  return <RNText className={cn('font-sans', className)} {...props} />;
}

export function TextInput({ className, ...props }: TextInputProps) {
  return <RNTextInput className={cn('font-sans', className)} {...props} />;
}
