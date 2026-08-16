const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { requireUuid, firstInvalidString } = require('../utils/validate.cjs');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { data: announcements, error } = await supabase
    .from('announcements')
    .select('*, author:users(id, name, role)')
    .order('pinned', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  res.json({ announcements });
}));

router.post('/', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const posted_by = req.user.id;
  if (!posted_by || firstInvalidString(req.body, ['title', 'content'])) {
    return res.status(400).json({ error: 'Missing posted_by, title, or content' });
  }
  const { data: announcement, error } = await supabase.from('announcements').insert([{ posted_by, title, content }]).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, announcement });
}));

router.patch('/:id/pin', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  if (!requireUuid(res, req.params.id, 'id')) return;
  const { data: current, error: findErr } = await supabase.from('announcements').select('pinned').eq('id', req.params.id).maybeSingle();
  if (findErr) throw findErr;
  if (!current) return res.status(404).json({ error: 'Announcement not found' });
  const { data: announcement, error } = await supabase.from('announcements').update({ pinned: !current.pinned }).eq('id', req.params.id).select().single();
  if (error) throw error;
  res.json({ success: true, announcement });
}));

router.delete('/:id', authenticateToken, requireRole('teacher', 'admin'), asyncHandler(async (req, res) => {
  if (!requireUuid(res, req.params.id, 'id')) return;
  const { error } = await supabase.from('announcements').delete().eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true });
}));

module.exports = router;
