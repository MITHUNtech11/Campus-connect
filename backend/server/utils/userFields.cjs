// Columns safe to return to the client for a user record. Extend this
// (rather than hand-rolling a second field list) whenever a new
// public-facing column is added to public.users.
const PUBLIC_USER_FIELDS = 'id, name, email, role, department, reputation_score, no_shows, onboarding_completed, created_at, avatar_seed';

// Same as PUBLIC_USER_FIELDS, plus the onboarding preference columns —
// used by endpoints that return the caller's own full record
// (e.g. PATCH /api/onboarding/me).
const SELF_USER_FIELDS = `${PUBLIC_USER_FIELDS}, bio, interests, learning_goals, preferred_times, comm_mode, office_hours, max_bookings_per_day`;

module.exports = { PUBLIC_USER_FIELDS, SELF_USER_FIELDS };
