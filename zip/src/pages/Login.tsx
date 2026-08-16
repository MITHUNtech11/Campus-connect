import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User } from '../types';
import { GraduationCap, Briefcase, ArrowRight, BookOpen } from 'lucide-react';
import { cn } from '../lib/utils';

interface LoginProps {
  onLogin: (user: User) => void;
  dummyUsers: User[];
}

export default function Login({ onLogin, dummyUsers }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      onLogin(data);
      navigate('/');
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Side: Branding / Info */}
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
              Connect with mentors, find emergency slots, and navigate your college life with AI.
            </p>
          </div>
          
          <div className="relative z-10 mt-12 bg-white/10 p-6 rounded-2xl backdrop-blur-sm border border-white/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex -space-x-3">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=A" className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-white" alt="" />
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=B" className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-white" alt="" />
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=C" className="w-10 h-10 rounded-full border-2 border-indigo-600 bg-white" alt="" />
              </div>
              <p className="text-sm font-medium">Join 5,000+ students and faculty.</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div className="md:w-7/12 p-8 md:p-12 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500 mb-8">Enter your college credentials to access your dashboard.</p>
            
            <form onSubmit={handleLogin} className="space-y-5">
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
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-slate-700">Password</label>
                  <a href="#" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">Forgot password?</a>
                </div>
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full py-3.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 disabled:opacity-70 flex justify-center items-center gap-2"
              >
                {isLoading ? <span className="animate-pulse">Authenticating...</span> : 'Sign In'}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-indigo-600 font-bold hover:underline">Apply for access</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
