-- ========================================================
-- CampusConnect — Onboarding Preferences Migration
-- Run AFTER supabase_schema.sql and supabase_migrations_backend.sql,
-- in the Supabase SQL Editor.
-- Adds the fields captured by the student/teacher onboarding wizard
-- (frontend/src/pages/Onboarding/*) to public.users.
-- ========================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

-- Shared
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';

-- Student preferences
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS interests TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS learning_goals TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS preferred_times TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS comm_mode TEXT DEFAULT '';

-- Teacher preferences (subjects/location/live-status already live in
-- public.teacher_tags — reused as-is via PATCH /api/faculty/:id/status)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS office_hours TEXT[] DEFAULT '{}';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS max_bookings_per_day INT DEFAULT 5;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS qr_required BOOLEAN DEFAULT FALSE;
