-- ========================================================
-- CampusConnect — Performance Indexes Migration
-- Run AFTER supabase_schema.sql, supabase_migrations_backend.sql, and
-- supabase_migrations_onboarding.sql, in the Supabase SQL Editor.
--
-- Postgres does not automatically index foreign key columns (only
-- primary keys and UNIQUE constraints get one for free), so every
-- filtered/sorted lookup below was doing a sequential scan. Each index
-- here targets an exact .eq()/.in()/.order() pattern found in
-- backend/server/api/*.cjs and backend/server/jobs/*.cjs — see the
-- comment above each for where it's used.
-- ========================================================

-- users — role lookups (GET /api/faculty, POST /api/ai/recommend,
-- GET /api/admin/stats's teacher count).
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- teacher_tags — joined onto the teacher roster by teacher_id on every
-- faculty directory load (GET /api/faculty) and QR check-in
-- (POST /api/qr/verify, PATCH /api/faculty/:id/status).
CREATE INDEX IF NOT EXISTS idx_teacher_tags_teacher_id ON public.teacher_tags(teacher_id);

-- slots — GET /api/slots?teacher_id=, sorted by created_at.
CREATE INDEX IF NOT EXISTS idx_slots_teacher_id ON public.slots(teacher_id);
CREATE INDEX IF NOT EXISTS idx_slots_created_at ON public.slots(created_at DESC);

-- bookings — GET /api/bookings always filters by student_id or
-- teacher_id and sorts by created_at DESC; a composite index covers
-- the filter and the sort in a single index scan. status is scanned in
-- bulk separately by the hourly reputation worker and admin stats.
CREATE INDEX IF NOT EXISTS idx_bookings_student_created ON public.bookings(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_teacher_created ON public.bookings(teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- ratings — GET /api/ratings/:teacher_id and the average-rating
-- recalculation on every new rating; student_id is scanned in bulk by
-- the hourly reputation worker.
CREATE INDEX IF NOT EXISTS idx_ratings_teacher_id ON public.ratings(teacher_id);
CREATE INDEX IF NOT EXISTS idx_ratings_student_id ON public.ratings(student_id);

-- community — GET /api/community post feed sort.
CREATE INDEX IF NOT EXISTS idx_community_created_at ON public.community(created_at DESC);

-- announcements — GET /api/announcements always orders by
-- (pinned DESC, created_at DESC); one composite index covers it exactly.
CREATE INDEX IF NOT EXISTS idx_announcements_pinned_created ON public.announcements(pinned DESC, created_at DESC);

-- audit_logs — GET /api/admin/logs sort.
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- qr_nonces — every QR scan verification looks the nonce up by its raw
-- token string, not by id — this was a full table scan on every
-- check-in (POST /api/qr/verify).
CREATE INDEX IF NOT EXISTS idx_qr_nonces_token ON public.qr_nonces(token);

-- ai_jobs — the background queue worker polls
-- WHERE status='pending' ORDER BY created_at every 10 seconds, forever.
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status_created ON public.ai_jobs(status, created_at);

-- requests (legacy consultation-request flow) — filtered by either
-- student_email or teacher_id.
CREATE INDEX IF NOT EXISTS idx_requests_teacher_id ON public.requests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_requests_student_email ON public.requests(student_email);

-- refresh_tokens / password_reset_tokens — both are actually looked up
-- by token_hash (POST /api/auth/refresh, /api/auth/reset-password), not
-- user_id. The existing idx_*_user indexes from
-- supabase_migrations_backend.sql don't help these lookups at all —
-- this was the most-hit missing index in the app: every silent access-
-- token refresh (frontend/src/supabase.js's apiFetch, on every 401)
-- scanned the whole refresh_tokens table.
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON public.refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON public.password_reset_tokens(token_hash);
