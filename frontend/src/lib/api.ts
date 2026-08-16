/**
 * Typed client for the CampusConnect backend (backend/server/server.cjs).
 *
 * The backend runs as a separate Express process (default http://localhost:5000)
 * and has permissive CORS, so the browser talks to it directly — the Vite dev
 * server in frontend/server.ts is only a static/HMR host and proxies nothing.
 *
 * Auth model (see backend/server/api/auth.cjs):
 *   - short-lived JWT access token, sent as `Authorization: Bearer <token>`
 *   - opaque refresh token, rotated by POST /api/auth/refresh
 * On a 401 we attempt exactly one refresh, then replay the original request.
 */

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
  SlotCategory,
  TeacherStatus,
  User,
} from '../types';

export const API_URL = (
  (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000'
).replace(/\/$/, '');

// localStorage keys — same `cc_` prefix convention the previous frontend used.
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

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  getUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return normalizeUser(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  save(accessToken: string, refreshToken: string, user: User) {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  saveUser(user: User) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
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

/** DiceBear avatar for an arbitrary seed string (name, id, or a chosen avatar_seed). */
export function avatarFor(nameOrId: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(nameOrId || 'user')}&eyes=default,happy,side,squint,wink&mouth=default,serious,smile,twinkle`;
}

/**
 * The profile picture to actually render for a user: their chosen avatar_seed
 * (see the picker on the Profile page) when they've picked one, otherwise the
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
  const refreshToken = tokenStore.getRefresh();
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
          tokenStore.clear();
          return false;
        }
        const data = await res.json();
        tokenStore.save(data.token, data.refreshToken, normalizeUser(data.user));
        return true;
      } catch {
        return false;
      } finally {
        // Released on the next microtask so concurrent callers share this run.
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
  const token = tokenStore.getAccess();
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(
      `Cannot reach the CampusConnect API at ${API_URL}. Is the backend running (npm start in backend/)?`,
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
    async google(credential: string): Promise<AuthResponse & { isNewUser: boolean }> {
      const res = await request<AuthResponse & { isNewUser: boolean }>('/api/auth/google', {
        method: 'POST',
        body: { credential },
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
      id?: string
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
    ) => request<{ success: boolean }>(`/api/faculty/${teacherId}/status`, { method: 'PATCH', body: input }),
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
      slot_category?: SlotCategory;
    }) => request<{ slot: Slot }>('/api/slots', { method: 'POST', body: input }).then((r) => r.slot),
    remove: (id: string) => request<{ success: boolean }>(`/api/slots/${id}`, { method: 'DELETE' }),
  },

  bookings: {
    list: (params?: { student_id?: string; teacher_id?: string }) => {
      const qs = new URLSearchParams();
      if (params?.student_id) qs.set('student_id', params.student_id);
      if (params?.teacher_id) qs.set('teacher_id', params.teacher_id);
      const suffix = qs.toString() ? `?${qs}` : '';
      return request<{ bookings: Booking[] }>(`/api/bookings${suffix}`).then((r) => r.bookings || []);
    },
    create: (input: {
      teacher_id: string;
      slot_id?: string;
      student_id?: string;
      target_company?: string;
      job_description?: string;
      resume_url?: string;
    }) =>
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
    cancel: (id: string) => request<{ success: boolean }>(`/api/bookings/${id}`, { method: 'DELETE' }),
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
      request<{ posts: CommunityPost[] }>('/api/community', { auth: false }).then((r) => r.posts || []),
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
    }) => request<{ user: AdminUser }>('/api/admin/users', { method: 'POST', body: input }).then((r) => r.user),
    updateUser: (
      id: string,
      input: { role?: string; department?: string; name?: string; reputation_score?: number },
    ) => request<{ user: AdminUser }>(`/api/admin/users/${id}`, { method: 'PATCH', body: input }).then((r) => r.user),
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
