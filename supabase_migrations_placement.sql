-- ========================================================
-- CampusConnect — Placement Portal and Analytics Migration
-- Run in the Supabase SQL Editor.
-- ========================================================

-- 1. Add slot_category to slots table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'slots' 
          AND column_name = 'slot_category'
    ) THEN
        ALTER TABLE public.slots ADD COLUMN slot_category TEXT DEFAULT 'Academic';
        ALTER TABLE public.slots ADD CONSTRAINT chk_slot_category CHECK (slot_category IN ('Academic', 'Mock Interview', 'Resume Review', 'Career Guidance'));
    END IF;
END $$;

-- 2. Add placement preparation details to bookings table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'bookings' 
          AND column_name = 'target_company'
    ) THEN
        ALTER TABLE public.bookings ADD COLUMN target_company TEXT DEFAULT NULL;
        ALTER TABLE public.bookings ADD COLUMN job_description TEXT DEFAULT NULL;
        ALTER TABLE public.bookings ADD COLUMN resume_url TEXT DEFAULT NULL;
    END IF;
END $$;
