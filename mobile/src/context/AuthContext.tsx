/**
 * Real authentication against the CampusConnect Express backend.
 *
 * Port of frontend/src/context/AuthContext.tsx. Same flow — register / login /
 * logout / refresh / rehydrate-on-load — with one structural change forced by
 * AsyncStorage: the web version seeds `useState` synchronously from
 * localStorage, which is impossible here. Instead the provider starts at
 * `user = null, loading = true`, then in one effect reads the cached user out of
 * AsyncStorage (so the UI can paint immediately on a warm start) and confirms it
 * against GET /api/auth/me before flipping `loading` off.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api, { tokenStore } from '../lib/api';
import type { Role, User } from '../types';

interface AuthContextValue {
  user: User | null;
  /** True until the initial /api/auth/me rehydration settles. */
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, role?: Role) => Promise<User>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    department?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  /** Merge a fresh user record into context + AsyncStorage (onboarding, profile edits). */
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((next: User) => {
    setUserState(next);
    // Persisting is fire-and-forget: context is the source of truth for the
    // running app, AsyncStorage only matters for the next cold start.
    void tokenStore.saveUser(next);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await api.auth.me();
    setUser(fresh);
  }, [setUser]);

  // Rehydrate: paint the cached user, then confirm the token is still valid.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await tokenStore.getAccess();
      if (!token) {
        if (!cancelled) setLoading(false);
        return;
      }

      const cached = await tokenStore.getUser();
      if (cached && !cancelled) setUserState(cached);

      try {
        const fresh = await api.auth.me();
        if (!cancelled) setUser(fresh);
      } catch {
        // Expired/revoked session, or the backend is unreachable — log out.
        await tokenStore.clear();
        if (!cancelled) setUserState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setUser]);

  const login = useCallback(async (email: string, password: string, role?: Role) => {
    const res = await api.auth.login({ email, password, role });
    await tokenStore.save(res.token, res.refreshToken, res.user);
    setUserState(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: {
      name: string;
      email: string;
      password: string;
      role: Role;
      department?: string;
    }) => {
      const res = await api.auth.register(input);
      await tokenStore.save(res.token, res.refreshToken, res.user);
      setUserState(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = await tokenStore.getRefresh();
    try {
      await api.auth.logout(refreshToken);
    } catch {
      // Revoking server-side is best-effort; always clear locally.
    }
    await tokenStore.clear();
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      register,
      logout,
      setUser,
      refreshUser,
    }),
    [user, loading, login, register, logout, setUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
