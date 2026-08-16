/**
 * Port of frontend/src/pages/Signup.tsx — the same three-step wizard.
 *
 *   POST /api/auth/register  (via AuthContext.register → api.auth.register)
 *
 * Step 1 role cards, step 2 credentials (same `password.length < 6` gate),
 * step 3 department. New accounts land with onboarding_completed = false, so
 * App.tsx surfaces the onboarding modal over the dashboard immediately after.
 */

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { Text } from '../components/Text';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ArrowRight,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { Button, ErrorBanner, Field } from '../components/ui';
import { cn, errMessage } from '../lib/utils';
import { colors } from '../lib/colors';
import type { Role } from '../types';
import type { RootStackParamList } from '../navigation/types';

const ROLE_CARDS: { value: Role; title: string; blurb: string; Icon: typeof GraduationCap }[] = [
  {
    value: 'student',
    title: 'Student',
    blurb: 'Find mentors, book consultation slots, and build your reputation score.',
    Icon: GraduationCap,
  },
  {
    value: 'teacher',
    title: 'Teacher',
    blurb: 'Publish consultation slots, broadcast live availability, post announcements.',
    Icon: Briefcase,
  },
  {
    value: 'admin',
    title: 'Admin',
    blurb: 'Manage accounts, review the audit trail, and monitor campus-wide activity.',
    Icon: ShieldCheck,
  },
];

const DEPARTMENTS = [
  'Computer Science',
  'Information Technology',
  'Electronics',
  'Electrical Engineering',
  'Mechanical',
  'Mathematics',
  'Physics',
  'Administration',
];

export default function SignupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { register } = useAuth();

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    department: '',
  });

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleComplete = async () => {
    if (!role) return;
    setIsLoading(true);
    setError(null);
    try {
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role,
        department: formData.department || undefined,
      });
      // App.tsx swaps to the authenticated stack the moment `user` is set.
    } catch (err) {
      setError(errMessage(err, 'Could not create your account'));
      setStep(2);
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
        <View className="items-center mb-8 mt-4">
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-10 h-10 bg-indigo-600 rounded-xl items-center justify-center">
              <Text className="text-white font-bold text-xl">C</Text>
            </View>
            <Text className="text-2xl font-bold text-slate-900">CampusConnect</Text>
          </View>
          <Text className="text-2xl font-bold text-slate-900">Setup your account</Text>
          <Text className="text-slate-500 mt-1">Join the smart campus network in 3 easy steps.</Text>
        </View>

        {/* Progress dots — the web progress bar, adapted to a phone width. */}
        <View className="flex-row items-center justify-center gap-3 mb-6">
          {[1, 2, 3].map((i) => (
            <View
              key={i}
              className={cn(
                'w-10 h-10 rounded-full items-center justify-center',
                step >= i ? 'bg-indigo-600' : 'bg-slate-200',
              )}
            >
              {step > i ? (
                <CheckCircle2 size={18} color={colors.white} />
              ) : (
                <Text className={cn('font-bold', step >= i ? 'text-white' : 'text-slate-500')}>
                  {i}
                </Text>
              )}
            </View>
          ))}
        </View>

        {!!error && <ErrorBanner message={error} className="mb-5" />}

        <View className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
          {step === 1 && (
            <View>
              <Text className="text-xl font-bold text-slate-900 mb-1">I am a...</Text>
              <Text className="text-slate-500 mb-6">
                Select your role on campus to customize your experience.
              </Text>

              <View className="gap-3">
                {ROLE_CARDS.map(({ value, title, blurb, Icon }) => {
                  const active = role === value;
                  return (
                    <Pressable
                      key={value}
                      onPress={() => setRole(value)}
                      className={cn(
                        'p-5 rounded-2xl border-2',
                        active ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white',
                      )}
                    >
                      <View className="flex-row items-center justify-between mb-3">
                        <View
                          className={cn(
                            'w-12 h-12 rounded-xl items-center justify-center',
                            active ? 'bg-indigo-600' : 'bg-slate-100',
                          )}
                        >
                          <Icon size={22} color={active ? colors.white : colors.slate600} />
                        </View>
                        {active && <CheckCircle2 size={20} color={colors.indigo600} />}
                      </View>
                      <Text className="text-lg font-bold text-slate-900 mb-1">{title}</Text>
                      <Text className="text-sm text-slate-500">{blurb}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Button
                label="Continue"
                variant="dark"
                onPress={handleNext}
                disabled={!role}
                icon={<ArrowRight size={18} color={colors.white} />}
                className="mt-7"
              />
            </View>
          )}

          {step === 2 && (
            <View>
              <Text className="text-xl font-bold text-slate-900 mb-1">Personal Details</Text>
              <Text className="text-slate-500 mb-6">Enter your college credentials.</Text>

              <Field
                label="Full Name"
                value={formData.name}
                onChangeText={(name) => setFormData({ ...formData, name })}
                placeholder="e.g. Alex Sharma"
                className="mb-4"
              />
              <Field
                label="College Email"
                value={formData.email}
                onChangeText={(email) => setFormData({ ...formData, email })}
                placeholder="name@college.edu"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                className="mb-4"
              />
              <Field
                label="Password"
                value={formData.password}
                onChangeText={(password) => setFormData({ ...formData, password })}
                placeholder="At least 6 characters"
                secureTextEntry
                className="mb-6"
              />

              <View className="flex-row items-center justify-between gap-3">
                <Pressable onPress={() => setStep(1)} className="px-4 py-3">
                  <Text className="text-slate-600 font-medium">Back</Text>
                </Pressable>
                <Button
                  label="Continue"
                  variant="dark"
                  onPress={handleNext}
                  disabled={!formData.name || !formData.email || formData.password.length < 6}
                  icon={<ArrowRight size={18} color={colors.white} />}
                  className="flex-1"
                />
              </View>
            </View>
          )}

          {step === 3 && (
            <View>
              <Text className="text-xl font-bold text-slate-900 mb-1">Academic Profile</Text>
              <Text className="text-slate-500 mb-6">
                Which department should we file your account under?
              </Text>

              <Text className="text-sm font-medium text-slate-700 mb-2">Department</Text>
              <View className="flex-row flex-wrap gap-2 mb-5">
                {DEPARTMENTS.map((d) => {
                  const active = formData.department === d;
                  return (
                    <Pressable
                      key={d}
                      onPress={() => setFormData({ ...formData, department: d })}
                      className={cn(
                        'px-3 py-2 rounded-xl border',
                        active ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-200',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-xs font-semibold',
                          active ? 'text-white' : 'text-slate-600',
                        )}
                      >
                        {d}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6">
                <Text className="text-sm text-slate-500 leading-relaxed">
                  {role === 'teacher'
                    ? 'Your subjects, cabin location and live status are set up right after signup in the onboarding wizard.'
                    : 'Your interests and preferred consultation times are collected in the onboarding wizard right after signup.'}
                </Text>
              </View>

              <View className="flex-row items-center justify-between gap-3">
                <Pressable onPress={() => setStep(2)} className="px-4 py-3">
                  <Text className="text-slate-600 font-medium">Back</Text>
                </Pressable>
                <Button
                  label={isLoading ? 'Creating account…' : 'Complete Setup'}
                  onPress={handleComplete}
                  disabled={isLoading || !formData.department}
                  className="flex-1"
                />
              </View>
            </View>
          )}
        </View>

        <View className="flex-row justify-center items-center gap-1 mt-7">
          <Text className="text-sm text-slate-600">Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')}>
            <Text className="text-sm text-indigo-600 font-bold">Log in</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
