// Single source of truth for public.slots.slot_category, mirroring the
// chk_slot_category CHECK constraint (supabase_migrations_placement.sql).
// Shared by the slots API (validates on create) and the teacher seed script
// (picks a random category per generated slot) so the allow-list can't drift.
const SLOT_CATEGORIES = ['Academic', 'Mock Interview', 'Resume Review', 'Career Guidance'];

module.exports = { SLOT_CATEGORIES };
