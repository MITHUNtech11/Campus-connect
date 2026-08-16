/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute, { FullPageSpinner } from './components/ProtectedRoute';
import Navigation from './components/Navigation';
import Copilot from './components/Copilot';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Announcements from './pages/Announcements';
import MapHeatmap from './pages/MapHeatmap';
import Community from './pages/Community';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import Unauthorized from './pages/Unauthorized';
import Profile from './pages/Profile';
import PlacementPortal from './pages/PlacementPortal';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </Router>
  );
}

/** Role-appropriate landing page for "/" — the app has three dashboards now. */
function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  // The onboarding modal covers the screen until this is true — skip
  // mounting the dashboard (and its data fetch) underneath it until then.
  if (!user.onboarding_completed) return null;
  if (user.role === 'admin') return <AdminDashboard user={user} />;
  if (user.role === 'teacher') return <TeacherDashboard user={user} />;
  return <StudentDashboard user={user} />;
}

function Shell() {
  const { user, loading, logout, refreshUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <FullPageSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {user && <Navigation currentUser={user} onLogout={handleLogout} />}

      {/* onboarding_completed comes straight from public.users. */}
      {user && !user.onboarding_completed && (
        <Onboarding user={user} onComplete={() => refreshUser()} />
      )}

      {user && user.onboarding_completed && <Copilot />}

      <main className={user ? 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' : ''}>
        <Routes>
          {/* Public auth routes */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/signup" element={!user ? <Signup /> : <Navigate to="/" replace />} />

          {/* Authenticated routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardRouter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/placement"
            element={
              <ProtectedRoute>
                {user ? <PlacementPortal user={user} /> : null}
              </ProtectedRoute>
            }
          />
          <Route
            path="/announcements"
            element={
              <ProtectedRoute>
                {user ? <Announcements user={user} /> : null}
              </ProtectedRoute>
            }
          />
          <Route
            path="/community"
            element={
              <ProtectedRoute>{user ? <Community user={user} /> : null}</ProtectedRoute>
            }
          />
          <Route
            path="/map"
            element={
              <ProtectedRoute>
                <MapHeatmap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin-only */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                {user ? <AdminDashboard user={user} /> : null}
              </ProtectedRoute>
            }
          />

          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
