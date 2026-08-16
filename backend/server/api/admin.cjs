const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken, requireRole } = require('../middleware/auth.cjs');
const { logAudit } = require('../utils/audit.cjs');
const { createUserAccount } = require('../utils/accounts.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { requireUuid, isIntInRange, firstInvalidString } = require('../utils/validate.cjs');

const router = express.Router();

const ALLOWED_ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];

// All admin routes require an authenticated admin.
router.use(authenticateToken, requireRole('admin'));

router.get('/users', asyncHandler(async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, email, role, department, reputation_score, no_shows, rating, created_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  res.json({ users });
}));

router.post('/users', asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;
  if (firstInvalidString(req.body, ['name', 'email', 'password', 'role'])) {
    return res.status(400).json({ error: 'Missing required signup fields' });
  }
  if (!ALLOWED_ROLES.includes(role.toUpperCase())) {
    return res.status(400).json({ error: `role must be one of ${ALLOWED_ROLES.join(', ')}` });
  }

  const { user: newUser, conflict } = await createUserAccount({ name, email, password, role, department });
  if (conflict) return res.status(409).json({ error: 'An account with this email already exists' });

  await logAudit(req.user.email, `Admin created ${role} account for ${email}`);
  res.status(201).json({ success: true, user: newUser });
}));

router.patch('/users/:id', asyncHandler(async (req, res) => {
  const { role, department, name, reputation_score } = req.body;
  if (!requireUuid(res, req.params.id, 'id')) return;

  const payload = {};
  if (role !== undefined) {
    // Guarded twice over: a non-string role threw on .toUpperCase(), and a
    // string outside the enum was rejected by the users_role_check constraint.
    if (typeof role !== 'string' || !ALLOWED_ROLES.includes(role.toUpperCase())) {
      return res.status(400).json({ error: `role must be one of ${ALLOWED_ROLES.join(', ')}` });
    }
    payload.role = role.toUpperCase();
  }
  if (department !== undefined) payload.department = department;
  if (name !== undefined) payload.name = name;
  if (reputation_score !== undefined) {
    if (!isIntInRange(reputation_score, 0, 200)) {
      return res.status(400).json({ error: 'reputation_score must be an integer between 0 and 200' });
    }
    payload.reputation_score = reputation_score;
  }

  // .single() errors with "Cannot coerce the result to a single JSON object"
  // when the update matches no row (or the payload is empty) — a 500 for what
  // is really a 400/404.
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ error: 'No updatable fields provided' });
  }

  const { data: user, error } = await supabase
    .from('users')
    .update(payload)
    .eq('id', req.params.id)
    .select('id, name, email, role, department, reputation_score')
    .maybeSingle();
  if (error) throw error;
  if (!user) return res.status(404).json({ error: 'User not found' });

  await logAudit(req.user.email, `Admin updated user ID ${req.params.id}`);
  res.json({ success: true, user });
}));

router.delete('/users/:id', asyncHandler(async (req, res) => {
  if (!requireUuid(res, req.params.id, 'id')) return;
  if (req.params.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot delete your own admin account' });
  }
  const { error } = await supabase.from('users').delete().eq('id', req.params.id);
  if (error) throw error;
  await logAudit(req.user.email, `Admin deleted user ID ${req.params.id}`);
  res.json({ success: true });
}));

router.get('/logs', asyncHandler(async (req, res) => {
  const { data: logs, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  res.json({ logs });
}));

// GET /api/admin/stats — quick dashboard aggregate
router.get('/stats', asyncHandler(async (req, res) => {
  const [{ count: userCount }, { count: bookingCount }, { count: pendingCount }, { count: teacherCount }] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }),
    supabase.from('bookings').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'TEACHER'),
  ]);
  res.json({
    stats: {
      total_users: userCount || 0,
      total_teachers: teacherCount || 0,
      total_bookings: bookingCount || 0,
      pending_bookings: pendingCount || 0,
    },
  });
}));

module.exports = router;
