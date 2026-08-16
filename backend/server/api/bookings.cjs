const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { logAudit } = require('../utils/audit.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { resolveActorId, denyIfNotOwner } = require('../utils/requestHelpers.cjs');
const { incrementNoShows } = require('../utils/reputation.cjs');
const { requireUuid, isUuid } = require('../utils/validate.cjs');

const router = express.Router();

// Booking lifecycle states, mirroring the bookings_status_check constraint.
const VALID_BOOKING_STATUSES = ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];

// POST /api/bookings — student books a slot (or a free-form slot_info)
router.post('/', authenticateToken, requireRole('student', 'admin'), asyncHandler(async (req, res) => {
  const { teacher_id, slot_info, slot_id, target_company, job_description, resume_url } = req.body;
  const student_id = resolveActorId(req, 'STUDENT', 'student_id');
  if (!student_id || !teacher_id) return res.status(400).json({ error: 'student_id and teacher_id required' });
  if (!requireUuid(res, student_id, 'student_id')) return;
  if (!requireUuid(res, teacher_id, 'teacher_id')) return;
  if (slot_id !== undefined && slot_id !== null && !requireUuid(res, slot_id, 'slot_id')) return;

  // 1. Reserve the slot first (if given) with an optimistic guard so two
  //    students can't win the same open slot.
  if (slot_id) {
    const { data: slot, error: slotErr } = await supabase.from('slots').select('is_booked').eq('id', slot_id).maybeSingle();
    if (slotErr) throw slotErr;
    if (!slot) return res.status(404).json({ error: 'Requested consultation slot does not exist' });
    if (slot.is_booked) return res.status(409).json({ error: 'Requested consultation slot is already booked' });

    const { data: reserved, error: reserveErr } = await supabase
      .from('slots')
      .update({ is_booked: true })
      .eq('id', slot_id)
      .eq('is_booked', false)
      .select('id')
      .maybeSingle();
    if (reserveErr) throw reserveErr;
    if (!reserved) return res.status(409).json({ error: 'Requested consultation slot was just booked by someone else' });
  }

  // 2. Insert the booking. If this fails, release the slot we just reserved.
  const { data: booking, error } = await supabase
    .from('bookings')
    .insert([{ 
      student_id, 
      teacher_id, 
      slot_id: slot_id || null, 
      status: 'PENDING',
      target_company: target_company || null,
      job_description: job_description || null,
      resume_url: resume_url || null
    }])
    .select()
    .single();
  if (error) {
    if (slot_id) await supabase.from('slots').update({ is_booked: false }).eq('id', slot_id);
    throw error;
  }

  const { data: student } = await supabase.from('users').select('email').eq('id', student_id).maybeSingle();
  await logAudit(student?.email, `Created booking request ID ${booking.id} with Teacher ID ${teacher_id}`);

  res.status(201).json({ success: true, booking: { ...booking, slot_info: slot_info || null } });
}));

// GET /api/bookings?student_id=&teacher_id=
router.get('/', authenticateToken, asyncHandler(async (req, res) => {
  const { student_id, teacher_id } = req.query;
  if (student_id !== undefined && !requireUuid(res, student_id, 'student_id')) return;
  if (teacher_id !== undefined && !requireUuid(res, teacher_id, 'teacher_id')) return;
  let query = supabase
    .from('bookings')
    .select('*, student:users!student_id(id, name, email), slot:slots(*)')
    .order('created_at', { ascending: false });
  if (student_id) query = query.eq('student_id', student_id);
  else if (teacher_id) query = query.eq('teacher_id', teacher_id);
  else if (req.user.role === 'STUDENT') query = query.eq('student_id', req.user.id);
  else if (req.user.role === 'TEACHER') query = query.eq('teacher_id', req.user.id);
  const { data: bookings, error } = await query;
  if (error) throw error;
  res.json({ bookings });
}));

// PATCH /api/bookings/:id/status — teacher accepts/declines/cancels
router.patch('/:id/status', authenticateToken, requireRole('teacher', 'admin', 'student'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });
  if (!requireUuid(res, id, 'id')) return;
  if (typeof status !== 'string' || !VALID_BOOKING_STATUSES.includes(status.toUpperCase())) {
    return res.status(400).json({ error: `status must be one of ${VALID_BOOKING_STATUSES.join(', ')}` });
  }

  const { data: booking, error: findErr } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  if (findErr) throw findErr;
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const upperStatus = status.toUpperCase();
  const { data: updated, error } = await supabase.from('bookings').update({ status: upperStatus }).eq('id', id).select().single();
  if (error) throw error;

  const releaseSlot = ['CANCELLED', 'DECLINED', 'NO_SHOW'].includes(upperStatus) && booking.slot_id
    ? supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id)
    : null;
  const teacherLookup = supabase.from('users').select('email').eq('id', booking.teacher_id).maybeSingle();
  const [, { data: teacher }] = await Promise.all([releaseSlot, teacherLookup]);
  await logAudit(teacher?.email, `Updated booking ID ${id} status to ${upperStatus}`);

  res.json({ success: true, booking: updated });
}));

// POST /api/bookings/:id/no_show
router.post('/:id/no_show', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!requireUuid(res, id, 'id')) return;
  const { data: booking, error: findErr } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  if (findErr) throw findErr;
  if (!booking) return res.status(404).json({ error: 'Booking not found' });

  const { error } = await supabase.from('bookings').update({ no_show: true, status: 'NO_SHOW' }).eq('id', id);
  if (error) throw error;

  const [, , { data: teacher }] = await Promise.all([
    booking.slot_id ? supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id) : null,
    incrementNoShows(booking.student_id),
    supabase.from('users').select('email').eq('id', booking.teacher_id).maybeSingle(),
  ]);
  await logAudit(teacher?.email, `Marked Student ID ${booking.student_id} as NO-SHOW for booking ID ${id}`);

  res.json({ success: true, booking_id: id });
}));

// DELETE /api/bookings/:id — cancel + release slot
router.delete('/:id', authenticateToken, asyncHandler(async (req, res) => {
  const id = req.params.id;
  // Without this a non-UUID id made the lookup below error out; the error was
  // discarded (only `data` is destructured), so the route reported success for
  // a delete that never happened.
  if (!requireUuid(res, id, 'id')) return;
  const { data: booking } = await supabase.from('bookings').select('*').eq('id', id).maybeSingle();
  if (booking) {
    if (denyIfNotOwner(req, res, 'STUDENT', booking.student_id, 'Students may only cancel their own bookings')) return;
    if (booking.slot_id) {
      await supabase.from('slots').update({ is_booked: false }).eq('id', booking.slot_id);
    }
    await supabase.from('bookings').delete().eq('id', id);
    await logAudit(req.user.email, `Cancelled and deleted booking ID ${id}`);
  }
  res.json({ success: true });
}));

module.exports = router;
