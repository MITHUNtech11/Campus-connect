/**
 * Types mirroring the CampusConnect backend (backend/server/**) which is
 * backed by Supabase Postgres. Field names match the actual table columns
 * (snake_case) as returned by the REST API — see supabase_schema.sql,
 * supabase_migrations_backend.sql and backend/server/utils/userFields.cjs.
 *
 * The one deliberate deviation: `role` is normalised to lowercase in the
 * frontend (the backend stores/returns 'STUDENT' | 'TEACHER' | 'ADMIN' and
 * compares case-insensitively), because the UI switches on it everywhere.
 */

export type Role = 'student' | 'teacher' | 'admin';

/** Live presence values allowed by public.teacher_tags.status CHECK constraint. */
export type TeacherStatus = 'Available' | 'Busy' | 'In Class' | 'Offline';

/** public.bookings.status CHECK constraint. */
export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'NO_SHOW';

/**
 * public.slots.slot_category CHECK constraint (chk_slot_category, added by
 * supabase_migrations_placement.sql). Mirrors backend/server/utils/slotCategories.cjs —
 * the single source of truth both TeacherDashboard's slot form and
 * PlacementPortal's filters/badges are built from.
 */
export const SLOT_CATEGORIES = ['Academic', 'Mock Interview', 'Resume Review', 'Career Guidance'] as const;
export type SlotCategory = (typeof SLOT_CATEGORIES)[number];

/**
 * public.users as exposed by PUBLIC_USER_FIELDS / SELF_USER_FIELDS.
 * Onboarding + preference columns are optional because only the "self"
 * endpoints (/api/auth/login, /api/onboarding/me) return them.
 */
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  department: string | null;
  reputation_score: number;
  no_shows: number;
  onboarding_completed: boolean;
  created_at: string;

  /** Cached average rating, teachers only (supabase_migrations_backend.sql). */
  rating?: number;

  /**
   * DiceBear seed the user picked for their profile picture
   * (supabase_migrations_avatar.sql). Null/absent means "no custom pick yet" —
   * avatarFor() falls back to seeding on the user's name, same as before this
   * column existed.
   */
  avatar_seed?: string | null;

  // Onboarding / preference columns
  bio?: string;
  interests?: string[];
  learning_goals?: string;
  preferred_times?: string[];
  comm_mode?: string;
  office_hours?: string[];
  max_bookings_per_day?: number;

  /**
   * Teacher-only presence columns (public.teacher_tags), present when this
   * User came back merged with faculty data (e.g. GET /api/auth/profile/:id
   * for a teacher). Absent for students/admins.
   */
  cabin_block?: string | null;
  cabin_room?: string | null;
  status?: TeacherStatus;
  status_note?: string | null;
  subjects?: string[];
}

/** GET /api/faculty item — public.users (role=TEACHER) merged with public.teacher_tags. */
export interface Faculty {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  reputation_score: number;
  bio: string | null;
  office_hours: string[] | null;
  cabin_block: string | null;
  cabin_room: string | null;
  status: TeacherStatus;
  /** teacher_tags.free_till — free-form "free till 3 PM" note; null when unset. */
  status_note: string | null;
  subjects: string[];
  /** Not returned by /api/faculty; merged in client-side from /api/ratings. */
  rating?: number;
  avatar_seed?: string | null;
}

/** public.slots */
export interface Slot {
  id: string;
  teacher_id: string;
  subject: string;
  topic: string;
  duration: number;
  type: string;
  /** DATE column, 'YYYY-MM-DD'. */
  date: string;
  /** Free-form TEXT column, e.g. '14:30'. */
  time: string;
  is_booked: boolean;
  created_at: string;
  /** Defaults to 'Academic' at the DB level; placement-prep slots use the other values. */
  slot_category?: SlotCategory;
}

/** public.bookings */
export interface Booking {
  id: string;
  student_id: string;
  teacher_id: string;
  slot_id: string | null;
  status: BookingStatus;
  no_show: boolean;
  created_at: string;
  student?: {
    id: string;
    name: string;
    email: string;
  };
  slot?: Slot | null;
  /** Placement-prep booking details (supabase_migrations_placement.sql), null for Academic bookings. */
  target_company?: string | null;
  job_description?: string | null;
  resume_url?: string | null;
}

/** public.ratings */
export interface Rating {
  id: string;
  student_id: string;
  teacher_id: string;
  stars: number;
  review: string | null;
  sentiment: string;
  sentiment_score: number;
  created_at: string;
}

/** Element of public.community.answers (JSONB array). */
export interface CommunityAnswer {
  id: string;
  author: string;
  text: string;
  upvotes: number;
  role?: string;
}

/** public.community */
export interface CommunityPost {
  id: string;
  user_id: string;
  subject: string;
  question: string;
  answers: CommunityAnswer[];
  upvotes: number;
  solved: boolean;
  created_at: string;
  author?: {
    id: string;
    name: string;
    role: string;
  };
}

/** public.announcements */
export interface Announcement {
  id: string;
  posted_by: string | null;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author?: {
    id: string;
    name: string;
    role: string;
  };
}

/** GET /api/admin/users row (includes the cached `rating` column). */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  reputation_score: number;
  no_shows: number;
  rating: number | null;
  created_at: string;
}

/** public.audit_logs, via GET /api/admin/logs */
export interface AuditLog {
  id: string;
  actor_email: string | null;
  action: string;
  created_at: string;
}

/** GET /api/admin/stats */
export interface AdminStats {
  total_users: number;
  total_teachers: number;
  total_bookings: number;
  pending_bookings: number;
}

/** POST /api/ai/recommend item. */
export interface AiRecommendation {
  teacher_id: string;
  score: number;
  reason: string;
  slots: unknown[];
}

/**
 * POST /api/copilot/ask response — real retrieval over live Supabase data
 * (backend/server/api/copilot.cjs), no third-party LLM. `data` carries the
 * raw retrieved rows the templated `reply` was built from, so the UI can
 * render them as grounding rather than trusting the prose alone.
 */
export interface CopilotReply {
  reply: string;
  intent: 'availability' | 'office_hours' | 'announcements' | 'activity' | 'slots' | 'fallback';
  data: Record<string, unknown>[];
}

// ----------------------------------------------------------------------
// Purely frontend UI-state types (no backend counterpart)
// ----------------------------------------------------------------------

/** Aggregated per-block mentor counts derived client-side from /api/faculty. */
export interface BlockActivity {
  block: string;
  total: number;
  available: number;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: User;
}
