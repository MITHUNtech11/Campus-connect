import { Link } from 'react-router-dom';
import { User } from '../types';
import { BookOpen, Map, Users, Bell, ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

interface NavigationProps {
  currentUser: User;
  users: User[];
  onUserSwitch: (user: User) => void;
  onLogout: () => void;
}

export default function Navigation({ currentUser, users, onUserSwitch, onLogout }: NavigationProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                C
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                CampusConnect
              </span>
            </Link>
            
            <div className="hidden sm:ml-8 sm:flex sm:space-x-4">
              <Link to="/" className="text-slate-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                Dashboard
              </Link>
              <Link to="/community" className="text-slate-500 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                Community
              </Link>
              <Link to="/map" className="text-slate-500 hover:text-slate-900 px-3 py-2 rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                Campus Map
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2 text-slate-400 hover:text-slate-500 rounded-full hover:bg-slate-100 transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-8 h-8 rounded-full bg-slate-100"
                />
                <div className="hidden md:block text-left pr-2">
                  <p className="text-sm font-medium text-slate-700 leading-none">{currentUser.name}</p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{currentUser.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white ring-1 ring-black ring-opacity-5 py-1 focus:outline-none origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm">Demo Mode</p>
                    <p className="text-xs text-slate-500 truncate">Switch User Role</p>
                  </div>
                  {users.map(u => (
                    <button
                      key={u.id}
                      onClick={() => { onUserSwitch(u); setDropdownOpen(false); }}
                      className={`w-full text-left px-4 py-2 text-sm ${currentUser.id === u.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'} flex items-center gap-2`}
                    >
                      <img src={u.avatar} alt="" className="w-6 h-6 rounded-full" />
                      <div>
                        <span className="block truncate">{u.name}</span>
                        <span className="text-xs opacity-75 capitalize">{u.role}</span>
                      </div>
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1">
                    <button
                      onClick={() => { onLogout(); setDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
