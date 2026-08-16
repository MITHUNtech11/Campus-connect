-- ========================================================
-- CampusConnect — Editable Profile Picture Migration
-- Run AFTER supabase_schema.sql and the other supabase_migrations_*.sql
-- files, in the Supabase SQL Editor.
--
-- Every profile picture is a DiceBear avatar generated from a "seed" string
-- (see avatarFor() in frontend/src/lib/api.ts and mobile/src/lib/api.ts).
-- Until now that seed was always the user's name, so the picture looked
-- "randomly assigned" and had no way to be changed. avatar_seed lets a user
-- pick a different seed (one of the recommended alternates shown on the
-- profile page) and persist it. NULL preserves today's behaviour exactly —
-- every existing account keeps its current name-derived avatar.
-- ========================================================

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_seed TEXT;
