-- ========================================================
-- CampusConnect — Backend API Migration
-- Run AFTER supabase_schema.sql, in the Supabase SQL Editor.
-- Adds everything the Express backend needs to run entirely
-- off Supabase Postgres (custom auth, live status, refresh
-- tokens, password resets) instead of local SQLite.
-- ========================================================

-- 1. Auth: password hash lives on public.users (backend does its own
--    bcrypt + JWT auth; this is independent of Supabase Auth's
--    auth.users, which the frontend may still use directly).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password TEXT;
-- Cached average rating (recalculated by /api/ratings whenever a new rating comes in).
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS rating REAL DEFAULT 0.0;

-- 2. Refresh tokens (one row per issued refresh token; deleted on
--    logout / rotation so they can be revoked server-side).
CREATE TABLE IF NOT EXISTS public.refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON public.refresh_tokens(user_id);

-- 3. Password reset tokens.
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_reset_user ON public.password_reset_tokens(user_id);

-- 4. Audit logs (mirrors the SQLite audit_logs table used by the
--    Express backend for admin/security visibility).
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_email TEXT,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. requests table (legacy simple consultation-request flow, kept
--    for API parity with the old SQLite backend / appium tests).
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_email TEXT NOT NULL,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_name TEXT,
    topic TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    teacher_note TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: service-role key used by the backend bypasses RLS entirely,
-- but keep these tables covered for defense-in-depth if the anon
-- key is ever pointed at them directly.
ALTER TABLE public.refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- No public policies are created for these four tables on purpose —
-- only the backend's service-role key may touch them.

-- 6. Helpful index for login lookups.
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
