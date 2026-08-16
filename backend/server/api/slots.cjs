const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { resolveActorId, todayDateString, denyIfNotOwner } = require('../utils/requestHelpers.cjs');
const { requireUuid, isIntInRange } = require('../utils/validate.cjs');
const { SLOT_CATEGORIES } = require('../utils/slotCategories.cjs');

const router = express.Router();

// GET /api/slots?teacher_id=
router.get('/', asyncHandler(async (req, res) => {
  const { teacher_id } = req.query;
  if (teacher_id !== undefined && !requireUuid(res, teacher_id, 'teacher_id')) return;
  let query = supabase.from('slots').select('*').order('created_at', { ascending: false });
  if (teacher_id) query = query.eq('teacher_id', teacher_id);
  const { data: slots, error } = await query;
  if (error) throw error;
  res.json({ slots });
}));

// POST /api/slots — teacher/admin creates an open consultation slot
router.post('/', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const { teacher_id, subject, topic, duration, type, date, time, slot_category } = req.body;
  const effectiveTeacherId = resolveActorId(req, 'TEACHER', 'teacher_id');
  if (!effectiveTeacherId || !subject || !topic || !time) {
    return res.status(400).json({ error: 'Missing required slot fields' });
  }
  if (!requireUuid(res, effectiveTeacherId, 'teacher_id')) return;
  // duration is an integer column — 'abc' used to fail inside the driver (500).
  if (duration !== undefined && !isIntInRange(duration, 1, 1440)) {
    return res.status(400).json({ error: 'duration must be an integer number of minutes between 1 and 1440' });
  }

  const finalCategory = SLOT_CATEGORIES.includes(slot_category) ? slot_category : 'Academic';

  const { data: slot, error } = await supabase
    .from('slots')
    .insert([{
      teacher_id: effectiveTeacherId,
      subject,
      topic,
      duration: duration || 30,
      type: type || '1-on-1 Consultation',
      date: date || todayDateString(),
      time,
      is_booked: false,
      slot_category: finalCategory,
    }])
    .select()
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, slot });
}));

// DELETE /api/slots/:id — teacher/admin removes an unbooked slot
router.delete('/:id', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  if (!requireUuid(res, req.params.id, 'id')) return;
  const { data: slot } = await supabase.from('slots').select('*').eq('id', req.params.id).maybeSingle();
  if (!slot) return res.status(404).json({ error: 'Slot not found' });
  if (denyIfNotOwner(req, res, 'TEACHER', slot.teacher_id, 'Teachers may only delete their own slots')) return;
  if (slot.is_booked) return res.status(409).json({ error: 'Cannot delete a booked slot' });

  const { error } = await supabase.from('slots').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true });
}));

module.exports = router;
