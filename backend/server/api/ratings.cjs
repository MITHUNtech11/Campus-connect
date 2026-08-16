const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { resolveActorId } = require('../utils/requestHelpers.cjs');
const { requireUuid, isIntInRange } = require('../utils/validate.cjs');

const router = express.Router();

router.post('/', authenticateToken, requireRole('student', 'admin'), asyncHandler(async (req, res) => {
  const { teacher_id, stars, review, sentiment, sentiment_score } = req.body;
  const student_id = resolveActorId(req, 'STUDENT', 'student_id');
  if (!student_id || !teacher_id || stars === undefined) {
    return res.status(400).json({ error: 'Missing student_id, teacher_id, or stars' });
  }
  if (!requireUuid(res, student_id, 'student_id')) return;
  if (!requireUuid(res, teacher_id, 'teacher_id')) return;
  // Mirrors the ratings_stars_check constraint, which otherwise rejects the
  // insert at the driver level and surfaces as a 500.
  if (!isIntInRange(stars, 1, 5)) {
    return res.status(400).json({ error: 'stars must be an integer between 1 and 5' });
  }

  const { error } = await supabase.from('ratings').insert([{
    student_id, teacher_id, stars,
    review: review || '',
    sentiment: sentiment || 'Positive',
    sentiment_score: sentiment_score || 0.0,
  }]);
  if (error) throw error;

  // Recalculate the teacher's average rating.
  const { data: allRatings } = await supabase.from('ratings').select('stars').eq('teacher_id', teacher_id);
  if (allRatings && allRatings.length) {
    const avg = Math.round((allRatings.reduce((s, r) => s + r.stars, 0) / allRatings.length) * 10) / 10;
    await supabase.from('users').update({ rating: avg }).eq('id', teacher_id);
  }

  res.status(201).json({ success: true });
}));

router.get('/:teacher_id', asyncHandler(async (req, res) => {
  if (!requireUuid(res, req.params.teacher_id, 'teacher_id')) return;
  const { data: ratings, error } = await supabase.from('ratings').select('*').eq('teacher_id', req.params.teacher_id).order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ ratings });
}));

module.exports = router;
