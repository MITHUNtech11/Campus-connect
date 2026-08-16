const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { denyIfNotOwner } = require('../utils/requestHelpers.cjs');
const { requireUuid, isOptionalStringArray } = require('../utils/validate.cjs');

const router = express.Router();

// Mirrors the TeacherStatus union in frontend/src/types.ts.
const TEACHER_STATUSES = ['Available', 'Busy', 'In Class', 'Offline'];

// GET /api/faculty — teacher directory merged with live status (teacher_tags)
router.get('/', asyncHandler(async (req, res) => {
  const { data: teachers, error } = await supabase
    .from('users')
    .select('id, name, email, role, department, reputation_score, bio, office_hours, avatar_seed')
    .eq('role', 'TEACHER')
    .order('name', { ascending: true });
  if (error) throw error;

  const teacherIds = teachers.map(t => t.id);
  let tags = [];
  if (teacherIds.length) {
    const { data: tagRows, error: tagErr } = await supabase.from('teacher_tags').select('*').in('teacher_id', teacherIds);
    if (tagErr) throw tagErr;
    tags = tagRows;
  }
  const tagByTeacher = Object.fromEntries(tags.map(t => [t.teacher_id, t]));

  const faculty = teachers.map(t => {
    const tag = tagByTeacher[t.id] || {};
    return {
      ...t,
      cabin_block: tag.block || null,
      cabin_room: tag.room || null,
      status: tag.status || 'Offline',
      status_note: tag.free_till || '',
      subjects: tag.subjects || [],
    };
  });

  res.json({ faculty });
}));

// PATCH /api/faculty/:id/status — upsert live status (teacher_tags)
router.patch('/:id/status', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const teacherId = req.params.id;
  const { status, status_note, cabin_block, cabin_room, subjects } = req.body;

  if (!requireUuid(res, teacherId, 'id')) return;
  // subjects is a text[] column — a scalar produced a driver-level
  // "expected JSON array" error surfacing as a 500.
  if (!isOptionalStringArray(subjects)) {
    return res.status(400).json({ error: 'subjects must be an array of strings' });
  }
  if (status !== undefined && !TEACHER_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${TEACHER_STATUSES.join(', ')}` });
  }

  if (denyIfNotOwner(req, res, 'TEACHER', teacherId, 'Teachers may only update their own status')) return;

  const { data: existing } = await supabase.from('teacher_tags').select('id').eq('teacher_id', teacherId).maybeSingle();
  const payload = {
    teacher_id: teacherId,
    status: status || undefined,
    free_till: status_note ?? undefined,
    block: cabin_block ?? undefined,
    room: cabin_room ?? undefined,
    location: cabin_block && cabin_room ? `${cabin_block} - ${cabin_room}` : undefined,
    subjects: subjects ?? undefined,
  };
  Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

  let result;
  if (existing) {
    const { data, error } = await supabase.from('teacher_tags').update(payload).eq('id', existing.id).select().single();
    if (error) throw error;
    result = data;
  } else {
    const { data, error } = await supabase.from('teacher_tags').insert([{
      location: '', block: '', room: '', status: 'Available', ...payload,
    }]).select().single();
    if (error) throw error;
    result = data;
  }

  const { data: teacher } = await supabase.from('users').select('id, name, email, role, department').eq('id', teacherId).maybeSingle();
  res.json({
    success: true,
    teacher: {
      ...teacher,
      cabin_block: result.block,
      cabin_room: result.room,
      status: result.status,
      status_note: result.free_till,
    },
  });
}));

module.exports = router;
