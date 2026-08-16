/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import Navigation from './components/Navigation';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import MapHeatmap from './pages/MapHeatmap';
import Community from './pages/Community';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Onboarding from './pages/Onboarding';
import { User } from './types';

// Dummy current users for prototype switching
const dummyUsers: User[] = [
  { id: 's1', name: 'Alex Sharma', role: 'student', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex' },
  { id: 't1', name: 'Dr. Priya Desai', role: 'teacher', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya' }
];

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const handleLogout = () => {
    setCurrentUser(null);
  };

  return (
    <Router>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
        {currentUser && (
          <Navigation 
            currentUser={currentUser} 
            users={dummyUsers} 
            onUserSwitch={setCurrentUser}
            onLogout={handleLogout}
          />
        )}

        {currentUser && !currentUser.hasCompletedOnboarding && (
          <Onboarding user={currentUser} onComplete={() => setCurrentUser({...currentUser, hasCompletedOnboarding: true})} />
        )}
        
        <main className={currentUser ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" : ""}>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={!currentUser ? <Login onLogin={setCurrentUser} dummyUsers={dummyUsers} /> : <Navigate to="/" replace />} />
            <Route path="/signup" element={!currentUser ? <Signup onLogin={setCurrentUser} /> : <Navigate to="/" replace />} />

            {/* Protected Routes */}
            <Route 
              path="/" 
              element={
                currentUser ? (
                  currentUser.role === 'student' ? <StudentDashboard user={currentUser} /> : <TeacherDashboard user={currentUser} />
                ) : <Navigate to="/login" replace />
              } 
            />
            <Route path="/map" element={currentUser ? <MapHeatmap /> : <Navigate to="/login" replace />} />
            <Route path="/community" element={currentUser ? <Community user={currentUser} /> : <Navigate to="/login" replace />} />
            
            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
