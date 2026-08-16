// Legacy simple consultation-request flow (public.requests table).
// Kept for API/test parity with the earlier SQLite backend; new code
// should prefer /api/slots + /api/bookings.
const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { todayDateString } = require('../utils/requestHelpers.cjs');
const { requireUuid } = require('../utils/validate.cjs');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { student_email, teacher_id } = req.query;
  if (teacher_id !== undefined && !requireUuid(res, teacher_id, 'teacher_id')) return;
  let query = supabase.from('requests').select('*').order('created_at', { ascending: false });
  if (student_email) query = query.eq('student_email', student_email);
  else if (teacher_id) query = query.eq('teacher_id', teacher_id);
  const { data: requests, error } = await query;
  if (error) throw error;
  res.json({ requests });
}));

router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { student_name, student_email, teacher_id, teacher_name, topic, date, time_slot } = req.body;
  if (!student_name || !student_email || !teacher_id || !topic || !time_slot) {
    return res.status(400).json({ error: 'Missing required booking fields' });
  }
  if (!requireUuid(res, teacher_id, 'teacher_id')) return;
  const { data: request, error } = await supabase
    .from('requests')
    .insert([{
      student_name, student_email, teacher_id,
      teacher_name: teacher_name || 'Faculty Member',
      topic, date: date || todayDateString(), time_slot,
    }])
    .select()
    .single();
  if (error) throw error;
  res.status(201).json({ success: true, request });
}));

router.patch('/:id/status', authenticateToken, asyncHandler(async (req, res) => {
  const { status, teacher_note } = req.body;
  if (!status) return res.status(400).json({ error: 'Status is required' });
  if (!requireUuid(res, req.params.id, 'id')) return;
  const payload = { status };
  if (teacher_note !== undefined) payload.teacher_note = teacher_note;
  const { data: request, error } = await supabase.from('requests').update(payload).eq('id', req.params.id).select().maybeSingle();
  if (error) throw error;
  if (!request) return res.status(404).json({ error: 'Request not found' });
  res.json({ success: true, request });
}));

module.exports = router;
