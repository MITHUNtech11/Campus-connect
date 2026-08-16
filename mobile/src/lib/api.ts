/**
 * Typed client for the CampusConnect backend (backend/server/server.cjs).
 *
 * This is a port of frontend/src/lib/api.ts. Same endpoints, same response
 * unwrapping, same `normalizeUser`, same "one refresh then replay" behaviour on
 * a 401. Two deliberate differences, both forced by React Native:
 *
 *   1. STORAGE IS ASYNC. The web client reads `localStorage` synchronously;
 *      here `tokenStore` is backed by AsyncStorage and every getter returns a
 *      Promise. A small in-memory mirror is kept so the hot path (attaching the
 *      Authorization header to each request) doesn't hit the disk every time —
 *      it is populated on the first read and updated by save()/clear().
 *   2. THE BASE URL IS A LAN ADDRESS, not localhost. A phone running Expo Go
 *      resolves `localhost` to itself, not to the dev machine, so the default
 *      points at the dev machine's LAN IP. Override it with EXPO_PUBLIC_API_URL
 *      in mobile/.env — see mobile/.env.example.
 *
 * Auth model (see backend/server/api/auth.cjs):
 *   - short-lived JWT access token, sent as `Authorization: Bearer <token>`
 *   - opaque refresh token, rotated by POST /api/auth/refresh
 *
 * CORS is not a factor here: React Native's fetch sends no browser `Origin`
 * header, and backend/server/server.cjs explicitly allows origin-less requests
 * (the same path curl and the test runners take).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  AdminStats,
  AdminUser,
  AiRecommendation,
  Announcement,
  AuditLog,
  Booking,
  BookingStatus,
  CommunityAnswer,
  CommunityPost,
  CopilotReply,
  Faculty,
  Rating,
  Role,
  Slot,
  TeacherStatus,
  User,
} from '../types';

/**
 * Change this by editing mobile/.env (EXPO_PUBLIC_API_URL), not by editing this
 * line. Expo inlines any EXPO_PUBLIC_*-prefixed variable into the client bundle
 * at build time; a restart of `npx expo start` picks up a change.
 */
export const API_URL = (
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) || 'http://192.168.29.217:5000'
).replace(/\/$/, '');

// AsyncStorage keys — same `cc_` prefix convention the web client uses.
const TOKEN_KEY = 'cc_token';
const REFRESH_KEY = 'cc_refresh';
const USER_KEY = 'cc_user';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

// ---------------------------------------------------------------- storage

/**
 * In-memory mirror of the persisted session. `null` means "known to be absent";
 * `undefined` means "not read from AsyncStorage yet".
 */
let memAccess: string | null | undefined;
let memRefresh: string | null | undefined;

export const tokenStore = {
  async getAccess(): Promise<string | null> {
    if (memAccess === undefined) memAccess = await AsyncStorage.getItem(TOKEN_KEY);
    return memAccess;
  },
  async getRefresh(): Promise<string | null> {
    if (memRefresh === undefined) memRefresh = await AsyncStorage.getItem(REFRESH_KEY);
    return memRefresh;
  },
  async getUser(): Promise<User | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return normalizeUser(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  async save(accessToken: string, refreshToken: string, user: User): Promise<void> {
    memAccess = accessToken;
    memRefresh = refreshToken;
    await AsyncStorage.multiSet([
      [TOKEN_KEY, accessToken],
      [REFRESH_KEY, refreshToken],
      [USER_KEY, JSON.stringify(user)],
    ]);
  },
  async saveUser(user: User): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clear(): Promise<void> {
    memAccess = null;
    memRefresh = null;
    await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, USER_KEY]);
  },
};

/**
 * The backend stores roles uppercase ('STUDENT'); the UI switches on
 * lowercase. Normalise at the single point every user object enters the app.
 */
export function normalizeUser(raw: any): User {
  return {
    ...raw,
    role: String(raw?.role || 'student').toLowerCase() as Role,
  } as User;
}

/**
 * DiceBear avatar for an arbitrary seed string (name, id, or a chosen avatar_seed).
 *
 * The web client requests the `/svg` variant; React Native's <Image> cannot
 * decode SVG, so this asks DiceBear for the PNG rendering of the same seed.
 * Same avatar, a format <Image> can actually draw.
 */
export function avatarFor(nameOrId: string): string {
  return `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(nameOrId || 'user')}&eyes=default,happy,side,squint,wink&mouth=default,serious,smile,twinkle`;
}

/**
 * The profile picture to actually render for a user: their chosen avatar_seed
 * (see the picker on ProfileScreen) when they've picked one, otherwise the
 * same name-derived avatar every account has always had.
 */
export function avatarSrc(entity: { avatar_seed?: string | null; name: string }): string {
  return avatarFor(entity.avatar_seed || entity.name);
}

// ---------------------------------------------------------------- fetching

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  /** Internal: prevents infinite refresh recursion. */
  _retried?: boolean;
};

let refreshInFlight: Promise<boolean> | null = null;

/** Rotates the refresh token. Returns true when a new access token was stored. */
async function refreshTokens(): Promise<boolean> {
  const refreshToken = await tokenStore.getRefresh();
  if (!refreshToken) return false;

  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) {
          await tokenStore.clear();
          return false;
        }
        const data = await res.json();
        await tokenStore.save(data.token, data.refreshToken, normalizeUser(data.user));
        return true;
      } catch {
        return false;
      } finally {
        // Released on the next tick so concurrent callers share this run.
        setTimeout(() => {
          refreshInFlight = null;
        }, 0);
      }
    })();
  }
  return refreshInFlight;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true, _retried = false } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const token = auth ? await tokenStore.getAccess() : null;
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      `Cannot reach the CampusConnect API at ${API_URL}. Is the backend running, and is this phone on the same Wi-Fi as the dev machine?`,
      0,
    );
  }

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await refreshTokens();
    if (refreshed) return request<T>(path, { ...options, _retried: true });
  }

  const text = await res.text();
  const data = text ? safeJson(text) : null;

  if (!res.ok) {
    const message =
      (data && (data.error || data.message)) || `Request failed with status ${res.status}`;
    throw new ApiError(message, res.status);
  }
  return data as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

// ---------------------------------------------------------------- endpoints

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken: string;
  user: User;
}

export const api = {
  health: () => request<{ status: string }>('/api/health', { auth: false }),

  auth: {
    async register(input: {
      name: string;
      email: string;
      password: string;
      role: Role;
      department?: string;
    }): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: input,
        auth: false,
      });
      return { ...res, user: normalizeUser(res.user) };
    },
    async login(input: { email: string; password: string; role?: Role }): Promise<AuthResponse> {
      const res = await request<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
      });
      return { ...res, user: normalizeUser(res.user) };
    },
    async me(): Promise<User> {
      const { user } = await request<{ user: User }>('/api/auth/me');
      return normalizeUser(user);
    },
    logout: (refreshToken: string | null) =>
      request<{ success: boolean }>('/api/auth/logout', {
        method: 'POST',
        body: { refreshToken },
        auth: false,
      }),
    async updateProfile(
      input: {
        name?: string;
        department?: string;
        bio?: string;
        interests?: string[];
        learning_goals?: string;
        preferred_times?: string[];
        comm_mode?: string;
        office_hours?: string[];
        max_bookings_per_day?: number;
        avatar_seed?: string;
        cabin_block?: string;
        cabin_room?: string;
        status?: TeacherStatus;
        status_note?: string;
        subjects?: string[];
      },
      id?: string,
    ): Promise<User> {
      const { user } = await request<{ user: User }>(`/api/auth/profile${id ? '/' + id : ''}`, {
        method: 'PATCH',
        body: input,
      });
      return normalizeUser(user);
    },
    async getProfile(id?: string): Promise<User> {
      const { user } = await request<{ user: User }>(`/api/auth/profile${id ? '/' + id : ''}`);
      return normalizeUser(user);
    },
    changePassword: (input: { currentPassword: string; newPassword: string }) =>
      request<{ success: boolean }>('/api/auth/change-password', { method: 'POST', body: input }),
  },

  faculty: {
    list: () =>
      request<{ faculty: Faculty[] }>('/api/faculty', { auth: false }).then((r) => r.faculty || []),
    updateStatus: (
      teacherId: string,
      input: {
        status?: TeacherStatus;
        status_note?: string;
        cabin_block?: string;
        cabin_room?: string;
        subjects?: string[];
      },
    ) =>
      request<{ success: boolean }>(`/api/faculty/${teacherId}/status`, {
        method: 'PATCH',
        body: input,
      }),
  },

  slots: {
    list: (teacherId?: string) =>
      request<{ slots: Slot[] }>(
        `/api/slots${teacherId ? `?teacher_id=${encodeURIComponent(teacherId)}` : ''}`,
        { auth: false },
      ).then((r) => r.slots || []),
    create: (input: {
      teacher_id?: string;
      subject: string;
      topic: string;
      duration?: number;
      type?: string;
      date?: string;
      time: string;
    }) => request<{ slot: Slot }>('/api/slots', { method: 'POST', body: input }).then((r) => r.slot),
    remove: (id: string) => request<{ success: boolean }>(`/api/slots/${id}`, { method: 'DELETE' }),
  },

  bookings: {
    list: (params?: { student_id?: string; teacher_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.student_id) qs.set('student_id', params.student_id);
      if (params?.teacher_id) qs.set('teacher_id', params.teacher_id);
      const suffix = qs.toString() ? `?${qs}` : '';
      return request<{ bookings: Booking[] }>(`/api/bookings${suffix}`).then(
        (r) => r.bookings || [],
      );
    },
    create: (input: { teacher_id: string; slot_id?: string; student_id?: string }) =>
      request<{ booking: Booking }>('/api/bookings', { method: 'POST', body: input }).then(
        (r) => r.booking,
      ),
    setStatus: (id: string, status: BookingStatus) =>
      request<{ booking: Booking }>(`/api/bookings/${id}/status`, {
        method: 'PATCH',
        body: { status },
      }).then((r) => r.booking),
    markNoShow: (id: string) =>
      request<{ success: boolean }>(`/api/bookings/${id}/no_show`, { method: 'POST' }),
    cancel: (id: string) =>
      request<{ success: boolean }>(`/api/bookings/${id}`, { method: 'DELETE' }),
  },

  ratings: {
    forTeacher: (teacherId: string) =>
      request<{ ratings: Rating[] }>(`/api/ratings/${teacherId}`, { auth: false }).then(
        (r) => r.ratings || [],
      ),
    create: (input: {
      teacher_id: string;
      stars: number;
      review?: string;
      sentiment?: string;
      sentiment_score?: number;
    }) => request<{ success: boolean }>('/api/ratings', { method: 'POST', body: input }),
  },

  community: {
    list: () =>
      request<{ posts: CommunityPost[] }>('/api/community', { auth: false }).then(
        (r) => r.posts || [],
      ),
    create: (input: { subject: string; question: string }) =>
      request<{ post: CommunityPost }>('/api/community', { method: 'POST', body: input }).then(
        (r) => r.post,
      ),
    answer: (id: string, input: { author: string; text: string }) =>
      request<{ answer: CommunityAnswer }>(`/api/community/${id}/answer`, {
        method: 'POST',
        body: input,
      }).then((r) => r.answer),
    upvote: (id: string) =>
      request<{ upvotes: number }>(`/api/community/${id}/upvote`, { method: 'POST' }).then(
        (r) => r.upvotes,
      ),
  },

  announcements: {
    list: () =>
      request<{ announcements: Announcement[] }>('/api/announcements', { auth: false }).then(
        (r) => r.announcements || [],
      ),
    create: (input: { title: string; content: string }) =>
      request<{ announcement: Announcement }>('/api/announcements', {
        method: 'POST',
        body: input,
      }).then((r) => r.announcement),
    togglePin: (id: string) =>
      request<{ announcement: Announcement }>(`/api/announcements/${id}/pin`, {
        method: 'PATCH',
      }).then((r) => r.announcement),
    remove: (id: string) =>
      request<{ success: boolean }>(`/api/announcements/${id}`, { method: 'DELETE' }),
  },

  admin: {
    users: () => request<{ users: AdminUser[] }>('/api/admin/users').then((r) => r.users || []),
    createUser: (input: {
      name: string;
      email: string;
      password: string;
      role: Role;
      department?: string;
    }) =>
      request<{ user: AdminUser }>('/api/admin/users', { method: 'POST', body: input }).then(
        (r) => r.user,
      ),
    updateUser: (
      id: string,
      input: { role?: string; department?: string; name?: string; reputation_score?: number },
    ) =>
      request<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: 'PATCH', body: input }).then(
        (r) => r.user,
      ),
    deleteUser: (id: string) =>
      request<{ success: boolean }>(`/api/admin/users/${id}`, { method: 'DELETE' }),
    logs: () => request<{ logs: AuditLog[] }>('/api/admin/logs').then((r) => r.logs || []),
    stats: () => request<{ stats: AdminStats }>('/api/admin/stats').then((r) => r.stats),
  },

  onboarding: {
    async complete(input: {
      bio?: string;
      interests?: string[];
      learning_goals?: string;
      preferred_times?: string[];
      comm_mode?: string;
      office_hours?: string[];
      max_bookings_per_day?: number;
    }): Promise<User> {
      const { user } = await request<{ user: User }>('/api/onboarding/me', {
        method: 'PATCH',
        body: input,
      });
      return normalizeUser(user);
    },
  },



  /**
   * The backend's own AI system (backend/server/api/ai.cjs) — a keyword-bag
   * vectorizer over live Supabase teacher profiles. There is no Gemini/LLM
   * involvement anywhere in this app.
   */
  ai: {
    recommend: (topic_text: string) =>
      request<{ recommendations: AiRecommendation[] }>('/api/ai/recommend', {
        method: 'POST',
        body: { topic_text },
        auth: false,
      }).then((r) => r.recommendations || []),
    sentiment: (review_text: string) =>
      request<{ sentiment: string; score: number }>('/api/ai/sentiment', {
        method: 'POST',
        body: { review_text },
        auth: false,
      }),
  },

  /**
   * Real retrieval over live Supabase data (backend/server/api/copilot.cjs)
   * — availability, office hours, announcements, campus activity, open
   * slots. No third-party LLM; the reply is templated from `data`, the raw
   * rows retrieved for the question.
   */
  copilot: {
    ask: (message: string) =>
      request<CopilotReply>('/api/copilot/ask', {
        method: 'POST',
        body: { message },
        auth: false,
      }),
  },
};

export default api;
