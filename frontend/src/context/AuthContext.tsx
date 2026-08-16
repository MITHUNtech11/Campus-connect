/**
 * Real authentication against the CampusConnect Express backend.
 *
 * Replaces the prototype's hardcoded `dummyUsers` array. Session state is
 * `{ accessToken, refreshToken, user }` persisted in localStorage under the
 * cc_token / cc_refresh / cc_user keys, and rehydrated on load by calling
 * GET /api/auth/me (so a revoked or expired session is detected up front
 * rather than on the first data fetch).
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
  googleLogin: (credential: string) => Promise<User>;
  register: (input: {
    name: string;
    email: string;
    password: string;
    role: Role;
    department?: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  /** Merge a fresh user record into context + localStorage (onboarding, profile edits). */
  setUser: (user: User) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => tokenStore.getUser());
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((next: User) => {
    tokenStore.saveUser(next);
    setUserState(next);
  }, []);

  const refreshUser = useCallback(async () => {
    const fresh = await api.auth.me();
    setUser(fresh);
  }, [setUser]);

  // Rehydrate: if a token exists, confirm it's still valid server-side.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tokenStore.getAccess()) {
        setLoading(false);
        return;
      }
      try {
        const fresh = await api.auth.me();
        if (!cancelled) setUser(fresh);
      } catch {
        // Expired/revoked session, or the backend is down — drop to logged out.
        tokenStore.clear();
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
    tokenStore.save(res.token, res.refreshToken, res.user);
    setUserState(res.user);
    return res.user;
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const res = await api.auth.google(credential);
    tokenStore.save(res.token, res.refreshToken, res.user);
    setUserState(res.user);
    return res.user;
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; role: Role; department?: string }) => {
      const res = await api.auth.register(input);
      tokenStore.save(res.token, res.refreshToken, res.user);
      setUserState(res.user);
      return res.user;
    },
    [],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.getRefresh();
    try {
      await api.auth.logout(refreshToken);
    } catch {
      // Revoking server-side is best-effort; always clear locally.
    }
    tokenStore.clear();
    setUserState(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      googleLogin,
      register,
      logout,
      setUser,
      refreshUser,
    }),
    [user, loading, login, googleLogin, register, logout, setUser, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
