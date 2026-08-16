/**
 * Port of frontend/src/pages/Login.tsx.
 *
 *   POST /api/auth/login  (via AuthContext.login → api.auth.login)
 *
 * The role toggle stays optional exactly as on the web: the backend
 * cross-checks it and 403s on a mismatch, so leaving it unset logs in with
 * whatever role the account actually has.
 *
 * The two-column marketing panel becomes a stacked header card — a 5/12 + 7/12
 * split has nowhere to go on a phone.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Briefcase, GraduationCap, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorBanner, Field, GradientCard } from '../components/ui';
import { cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { Role } from '../types';
import type { RootStackParamList } from '../navigation/types';

const ROLES: { value: Role; label: string; Icon: typeof GraduationCap }[] = [
  { value: 'student', label: 'Student', Icon: GraduationCap },
  { value: 'teacher', label: 'Teacher', Icon: Briefcase },
  { value: 'admin', label: 'Admin', Icon: ShieldCheck },
];

export default function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await login(email.trim(), password, role ?? undefined);
      // No navigate() call: App.tsx swaps the auth stack for the app stack as
      // soon as `user` becomes non-null.
    } catch (err) {
      setError(errMessage(err, 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-4 pb-16" keyboardShouldPersistTaps="handled">
        <GradientCard from={colors.indigo600} to={colors.blue900} className="p-7 mb-6 rounded-3xl">
          <View className="flex-row items-center gap-2 mb-8">
            <View className="w-10 h-10 bg-white rounded-xl items-center justify-center">
              <Text className="text-indigo-600 font-bold text-xl">C</Text>
            </View>
            <Text className="text-2xl font-bold text-white">CampusConnect</Text>
          </View>

          <Text className="text-3xl font-bold text-white mb-3">Your Smart Campus Ecosystem.</Text>
          <Text className="text-indigo-100 text-base leading-relaxed">
            Find available faculty, book consultation slots, and keep up with campus announcements.
          </Text>

          <View className="mt-7 bg-white/10 p-5 rounded-2xl border border-white/20">
            <Text className="text-sm text-white font-medium leading-relaxed">
              Signed in sessions are secured with short-lived access tokens and rotating refresh
              tokens.
            </Text>
          </View>
        </GradientCard>

        <View className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          <Text className="text-2xl font-bold text-slate-900 mb-1">Welcome back</Text>
          <Text className="text-slate-500 mb-6">
            Enter your college credentials to access your dashboard.
          </Text>

          {!!error && <ErrorBanner message={error} className="mb-5" />}

          <Text className="text-sm font-medium text-slate-700 mb-2">
            Sign in as <Text className="text-slate-400 font-normal">(optional)</Text>
          </Text>
          <View className="flex-row gap-2 mb-5">
            {ROLES.map(({ value, label, Icon }) => {
              const active = role === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRole(active ? null : value)}
                  className={cn(
                    'flex-1 items-center gap-1.5 py-3 rounded-xl border-2',
                    active ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white',
                  )}
                >
                  <Icon size={20} color={active ? colors.indigo700 : colors.slate500} />
                  <Text
                    className={cn(
                      'text-xs font-semibold',
                      active ? 'text-indigo-700' : 'text-slate-500',
                    )}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Field
            label="College Email"
            value={email}
            onChangeText={setEmail}
            placeholder="name@college.edu"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            className="mb-4"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            className="mb-6"
          />

          <Button
            label={isLoading ? 'Authenticating…' : 'Sign In'}
            variant="dark"
            onPress={handleLogin}
            disabled={isLoading}
          />

          <View className="flex-row justify-center items-center gap-1 mt-7">
            <Text className="text-sm text-slate-600">Don't have an account?</Text>
            <Pressable onPress={() => navigation.navigate('Signup')}>
              <Text className="text-sm text-indigo-600 font-bold">Apply for access</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
