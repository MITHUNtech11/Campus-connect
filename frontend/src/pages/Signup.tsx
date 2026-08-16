import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  GraduationCap,
  Briefcase,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import ErrorBanner from '../components/ErrorBanner';
import PasswordInput from '../components/PasswordInput';

const ROLE_CARDS: { value: Role; title: string; blurb: string; icon: typeof GraduationCap }[] = [
  {
    value: 'student',
    title: 'Student',
    blurb: 'Find mentors, book consultation slots, and build your reputation score.',
    icon: GraduationCap,
  },
  {
    value: 'teacher',
    title: 'Teacher',
    blurb: 'Publish consultation slots, broadcast live availability, post announcements.',
    icon: Briefcase,
  },
  {
    value: 'admin',
    title: 'Admin',
    blurb: 'Manage accounts, review the audit trail, and monitor campus-wide activity.',
    icon: ShieldCheck,
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

export default function Signup() {
  const navigate = useNavigate();
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // New accounts land with onboarding_completed = false, so App.tsx will
      // immediately surface the onboarding wizard over the dashboard.
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
              C
            </div>
            <span className="text-2xl font-bold tracking-tight text-slate-900">CampusConnect</span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900">Setup your account</h2>
          <p className="text-slate-500 mt-2">Join the smart campus network in 3 easy steps.</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-slate-200 -translate-y-1/2 rounded-full"></div>
          <div
            className="absolute top-1/2 left-0 h-1 bg-indigo-600 -translate-y-1/2 rounded-full transition-all duration-500 ease-in-out"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
          <div className="relative flex justify-between z-10">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-4 border-slate-50',
                  step >= i ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500',
                )}
              >
                {step > i ? <CheckCircle2 className="w-5 h-5" /> : i}
              </div>
            ))}
          </div>
        </div>

        {error && <ErrorBanner message={error} className="mb-6" />}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* STEP 1: ROLE SELECTION */}
          {step === 1 && (
            <div className="p-8 md:p-12 animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">I am a...</h3>
              <p className="text-slate-500 mb-8">
                Select your role on campus to customize your experience.
              </p>

              <div className="grid md:grid-cols-3 gap-4">
                {ROLE_CARDS.map(({ value, title, blurb, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => setRole(value)}
                    className={cn(
                      'p-6 rounded-2xl border-2 text-left transition-all relative overflow-hidden',
                      role === value
                        ? 'border-indigo-600 bg-indigo-50/50'
                        : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50',
                    )}
                  >
                    <div
                      className={cn(
                        'w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-colors',
                        role === value ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600',
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-1">{title}</h4>
                    <p className="text-sm text-slate-500">{blurb}</p>
                    {role === value && (
                      <CheckCircle2 className="absolute top-6 right-6 text-indigo-600 w-5 h-5" />
                    )}
                  </button>
                ))}
              </div>

              <div className="mt-10 flex justify-end">
                <button
                  onClick={handleNext}
                  disabled={!role}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: CREDENTIALS */}
          {step === 2 && (
            <div className="p-8 md:p-12 animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Personal Details</h3>
              <p className="text-slate-500 mb-8">Enter your college credentials.</p>

              <div className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Alex Sharma"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    College Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@college.edu"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <PasswordInput
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="At least 6 characters"
                  />
                </div>
              </div>

              <div className="mt-10 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  disabled={
                    !formData.name || !formData.email || formData.password.length < 6
                  }
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  Continue <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: DEPARTMENT */}
          {step === 3 && (
            <div className="p-8 md:p-12 animate-in slide-in-from-right-8 duration-300">
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Academic Profile</h3>
              <p className="text-slate-500 mb-8">
                Which department should we file your account under?
              </p>

              <form onSubmit={handleComplete} className="space-y-5 max-w-lg">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all bg-white"
                  >
                    <option value="">Select Department</option>
                    {DEPARTMENTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="text-sm text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-4">
                  {role === 'teacher'
                    ? 'Your subjects, cabin location and live status are set up right after signup in the onboarding wizard.'
                    : 'Your interests and preferred consultation times are collected in the onboarding wizard right after signup.'}
                </p>

                <div className="mt-10 flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-6 py-3 text-slate-600 hover:text-slate-900 font-medium transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || !formData.department}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-70 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <span className="animate-pulse">Creating account…</span>
                    ) : (
                      'Complete Setup'
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 font-bold hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
