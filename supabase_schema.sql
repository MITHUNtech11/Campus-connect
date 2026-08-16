-- ========================================================
-- CampusConnect Supabase Complete Database Schema & Seed Data
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- ========================================================

-- Enable UUID Extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'TEACHER', 'STUDENT')),
    department TEXT DEFAULT 'General',
    reputation_score INT DEFAULT 100,
    no_shows INT DEFAULT 0,
    -- Onboarding wizard fields (see supabase_migrations_onboarding.sql for
    -- the migration that adds these to an already-provisioned database).
    onboarding_completed BOOLEAN DEFAULT FALSE,
    bio TEXT DEFAULT '',
    interests TEXT[] DEFAULT '{}',
    learning_goals TEXT DEFAULT '',
    preferred_times TEXT[] DEFAULT '{}',
    comm_mode TEXT DEFAULT '',
    office_hours TEXT[] DEFAULT '{}',
    max_bookings_per_day INT DEFAULT 5,
    qr_required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. TEACHER TAGS TABLE
CREATE TABLE IF NOT EXISTS public.teacher_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    location TEXT NOT NULL,
    block TEXT NOT NULL,
    room TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('Available', 'Busy', 'In Class', 'Offline')),
    free_till TEXT,
    signature_available BOOLEAN DEFAULT TRUE,
    subjects TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. SLOTS TABLE
CREATE TABLE IF NOT EXISTS public.slots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    topic TEXT NOT NULL,
    duration INT DEFAULT 30,
    type TEXT DEFAULT '1-on-1 Consultation',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TEXT NOT NULL,
    is_booked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    slot_id UUID REFERENCES public.slots(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'COMPLETED', 'NO_SHOW')),
    no_show BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. RATINGS TABLE
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    review TEXT,
    sentiment TEXT DEFAULT 'Positive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. COMMUNITY TABLE
CREATE TABLE IF NOT EXISTS public.community (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    question TEXT NOT NULL,
    answers JSONB DEFAULT '[]'::jsonb,
    upvotes INT DEFAULT 0,
    solved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. ANNOUNCEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    posted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ENABLE ROW LEVEL SECURITY (RLS) FOR ALL TABLES
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- PERMISSIVE RLS POLICIES FOR PUBLIC ANON KEY DEMO ACCESS
CREATE POLICY "Allow public read access to users" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow public insert/update to users" ON public.users FOR ALL USING (true);

CREATE POLICY "Allow public read access to teacher_tags" ON public.teacher_tags FOR SELECT USING (true);
CREATE POLICY "Allow public all access to teacher_tags" ON public.teacher_tags FOR ALL USING (true);

CREATE POLICY "Allow public read access to slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Allow public all access to slots" ON public.slots FOR ALL USING (true);

CREATE POLICY "Allow public read access to bookings" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Allow public all access to bookings" ON public.bookings FOR ALL USING (true);

CREATE POLICY "Allow public read access to ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Allow public all access to ratings" ON public.ratings FOR ALL USING (true);

CREATE POLICY "Allow public read access to community" ON public.community FOR SELECT USING (true);
CREATE POLICY "Allow public all access to community" ON public.community FOR ALL USING (true);

CREATE POLICY "Allow public read access to announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Allow public all access to announcements" ON public.announcements FOR ALL USING (true);

-- ENABLE REALTIME ON TABLES
ALTER PUBLICATION supabase_realtime ADD TABLE public.teacher_tags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community;

-- SEED INITIAL MOCK DATA FOR CAMPUSCONNECT DEMO
INSERT INTO public.users (id, name, email, role, department, reputation_score) VALUES
    ('11111111-1111-1111-1111-111111111111', 'Admin Master', 'admin@college.edu', 'ADMIN', 'Administration', 100),
    ('22222222-2222-2222-2222-222222222222', 'Dr. Vikram Sharma', 'vikram.sharma@college.edu', 'TEACHER', 'Computer Science', 98),
    ('33333333-3333-3333-3333-333333333333', 'Prof. Meera Nair', 'meera.nair@college.edu', 'TEACHER', 'Electronics', 95),
    ('44444444-4444-4444-4444-444444444444', 'Ananya Rao', 'ananya.rao@college.edu', 'STUDENT', 'Computer Science', 100)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.teacher_tags (teacher_id, location, block, room, status, free_till, signature_available, subjects) VALUES
    ('22222222-2222-2222-2222-222222222222', 'Block C - Room 304', 'Block C', '304', 'Available', '01:30 PM', true, ARRAY['Data Structures', 'Algorithms']),
    ('33333333-3333-3333-3333-333333333333', 'Block B - Lab 102', 'Block B', '102', 'Busy', '03:00 PM', false, ARRAY['Digital Electronics', 'VLSI Design'])
ON CONFLICT DO NOTHING;

INSERT INTO public.announcements (posted_by, title, content, pinned) VALUES
    ('11111111-1111-1111-1111-111111111111', '📢 Mid-Term Exam Mode Activated', 'Library hours are extended to 11 PM daily. Quiet study suites are now open.', true),
    ('22222222-2222-2222-2222-222222222222', '⚡ Extra Doubt Clearing Session', 'Algorithms doubt session will be conducted today in Room 304 at 4 PM.', false)
ON CONFLICT DO NOTHING;

-- ========================================================
-- Additional tables for QR check-in, AI jobs and attendance
-- ========================================================

-- 8. ATTENDANCE TABLE
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    block TEXT,
    floor TEXT,
    room TEXT,
    device_id TEXT,
    wifi_ssid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. QR NONCES TABLE (to prevent replay)
CREATE TABLE IF NOT EXISTS public.qr_nonces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. TEACHER EMBEDDINGS (placeholder for pgvector)
CREATE TABLE IF NOT EXISTS public.teachers_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    embedding REAL[],
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. AI JOBS QUEUE
CREATE TABLE IF NOT EXISTS public.ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    payload JSONB,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Add sentiment_score column to ratings for numeric score
ALTER TABLE public.ratings ADD COLUMN IF NOT EXISTS sentiment_score REAL DEFAULT 0.0;

-- Expose new tables in realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_jobs;

