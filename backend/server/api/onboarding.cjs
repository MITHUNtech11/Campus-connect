const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { logAudit } = require('../utils/audit.cjs');
const { SELF_USER_FIELDS } = require('../utils/userFields.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');

const router = express.Router();

// ----------------------------------------------------
// PATCH /api/onboarding/me
// Saves the preferences collected by the onboarding wizard (student or
// teacher — whichever fields are present in the body) and marks the
// account as onboarded. Teacher subjects/office location/live status are
// a separate concern handled by PATCH /api/faculty/:id/status, which
// already owns public.teacher_tags — the wizard calls both.
// ----------------------------------------------------
router.patch('/me', authenticateToken, asyncHandler(async (req, res) => {
  const {
    bio, interests, learning_goals, preferred_times, comm_mode,
    office_hours, max_bookings_per_day,
  } = req.body;

  const payload = { onboarding_completed: true };
  if (bio !== undefined) payload.bio = bio;
  if (interests !== undefined) payload.interests = interests;
  if (learning_goals !== undefined) payload.learning_goals = learning_goals;
  if (preferred_times !== undefined) payload.preferred_times = preferred_times;
  if (comm_mode !== undefined) payload.comm_mode = comm_mode;
  if (office_hours !== undefined) payload.office_hours = office_hours;
  if (max_bookings_per_day !== undefined) payload.max_bookings_per_day = max_bookings_per_day;

  const { data: user, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', req.user.id)
    .select(SELF_USER_FIELDS)
    .single();
  if (error) throw error;

  await logAudit(req.user.email, 'Completed onboarding preferences');
  res.json({ success: true, user });
}));

module.exports = router;
