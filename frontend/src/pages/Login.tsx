import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { GraduationCap, Briefcase, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import type { Role } from '../types';
import ErrorBanner from '../components/ErrorBanner';
import PasswordInput from '../components/PasswordInput';

const ROLES: { value: Role; label: string; icon: typeof GraduationCap }[] = [
  { value: 'student', label: 'Student', icon: GraduationCap },
  { value: 'teacher', label: 'Teacher', icon: Briefcase },
  { value: 'admin', label: 'Admin', icon: ShieldCheck },
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, googleLogin } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Optional: the backend cross-checks it and 403s on a mismatch, so leaving
  // it unset simply logs in with whatever role the account actually has.
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initGoogle = () => {
      const google = (window as any).google;
      if (!google?.accounts?.id) return;
      google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder-id.apps.googleusercontent.com',
        callback: async (response: any) => {
          setIsLoading(true);
          setError(null);
          try {
            await googleLogin(response.credential);
            const from = (location.state as { from?: string } | null)?.from;
            navigate(from && from !== '/login' ? from : '/', { replace: true });
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Google sign-in failed');
          } finally {
            setIsLoading(false);
          }
        }
      });
      const container = document.getElementById('google-signin-btn');
      if (container) {
        google.accounts.id.renderButton(
          container,
          { theme: 'outline', size: 'large', width: '380' }
        );
      }
    };

    // The GSI <script> (frontend/index.html) is async/defer, so it may still be
    // loading when this effect runs — hook its `load` event instead of polling
    // window.google on an interval. If it already finished (e.g. cached), init now.
    if ((window as any).google?.accounts?.id) {
      initGoogle();
      return;
    }
    const script = document.getElementById('google-gsi-script');
    script?.addEventListener('load', initGoogle);
    return () => script?.removeEventListener('load', initGoogle);
  }, [googleLogin, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await login(email.trim(), password, role ?? undefined);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from !== '/login' ? from : '/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Side: Branding */}
        <div className="md:w-5/12 bg-indigo-600 p-8 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-50"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-12">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 font-bold text-xl shadow-lg">
                C
              </div>
              <span className="text-2xl font-bold tracking-tight">CampusConnect</span>
            </div>

            <h1 className="text-3xl font-bold mb-4 leading-tight">Your Smart Campus Ecosystem.</h1>
            <p className="text-indigo-100 text-lg">
              Find available faculty, book consultation slots, and keep up with campus announcements.
            </p>
          </div>

          <div className="relative z-10 mt-12 bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/20">
            <p className="text-sm font-medium">
              Signed in sessions are secured with short-lived access tokens and rotating refresh
              tokens.
            </p>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 mb-8">
              Enter your college credentials to access your dashboard.
            </p>

            {error && <ErrorBanner message={error} className="mb-6" />}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sign in as <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(role === value ? null : value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 text-xs font-semibold transition-all',
                        role === value
                          ? 'border-indigo-600 bg-indigo-50/60 text-indigo-700'
                          : 'border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-50',
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">College Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="animate-pulse">Authenticating…</span> : 'Sign In'}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-slate-500">Or continue with</span>
              </div>
            </div>

            <div className="w-full flex flex-col items-center gap-2">
              <div id="google-signin-btn"></div>
              {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <p className="text-[11px] text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-center max-w-sm">
                  ⚠️ <strong>Google Sign-In is not configured.</strong> Set <code>VITE_GOOGLE_CLIENT_ID</code> in <code>frontend/.env</code> to enable.
                </p>
              )}
            </div>

            <p className="mt-6 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-600 font-bold hover:underline">
                Apply for access
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
