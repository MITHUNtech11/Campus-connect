import { Link, NavLink } from 'react-router-dom';
import { Megaphone, LogOut, ChevronDown, ShieldCheck, User as UserIcon } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { avatarSrc } from '../lib/api';
import type { Role, User } from '../types';

interface NavItem {
  to: string;
  label: string;
  roles?: Role[];
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Dashboard' },
  { to: '/placement', label: 'Placement Portal' },
  { to: '/announcements', label: 'Announcements' },
  { to: '/community', label: 'Community' },
  { to: '/map', label: 'Campus Map' },
  { to: '/profile', label: 'Profile' },
  { to: '/admin', label: 'Admin', roles: ['admin'] },
];

export default function Navigation({
  currentUser,
  onLogout,
}: {
  currentUser: User;
  onLogout: () => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const items = NAV_ITEMS.filter((i) => !i.roles || i.roles.includes(currentUser.role));

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                C
              </div>
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-600">
                CampusConnect
              </span>
            </Link>

            <div className="hidden sm:ml-8 sm:flex sm:space-x-1 overflow-x-auto">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    cn(
                      'px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                      isActive
                        ? 'text-indigo-700 bg-indigo-50'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/announcements"
              className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
              title="Announcements"
            >
              <Megaphone className="w-5 h-5" />
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full border border-slate-200 hover:border-slate-300 transition-colors bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <img
                  src={avatarSrc(currentUser)}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full bg-slate-100"
                />
                <div className="hidden md:block text-left pr-2">
                  <p className="text-sm font-medium text-slate-700 leading-none truncate max-w-[10rem]">
                    {currentUser.name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{currentUser.role}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl shadow-lg bg-white ring-1 ring-black/5 py-1 origin-top-right">
                  <div className="px-4 py-3 border-b border-slate-100">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {currentUser.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate">{currentUser.email}</p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      Reputation {currentUser.reputation_score}
                      {currentUser.department && ` • ${currentUser.department}`}
                    </div>
                  </div>

                  {/* Mobile nav mirror */}
                  <div className="sm:hidden border-b border-slate-100 py-1">
                    {items.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>

                  <Link
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-100"
                  >
                    <UserIcon className="w-4 h-4 text-slate-400" /> View Profile
                  </Link>

                  <button
                    onClick={() => {
                      onLogout();
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
