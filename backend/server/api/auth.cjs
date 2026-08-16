const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { signAccessToken, generateRefreshToken, hashToken } = require('../utils/tokens.cjs');
const { logAudit } = require('../utils/audit.cjs');
const { PUBLIC_USER_FIELDS, SELF_USER_FIELDS } = require('../utils/userFields.cjs');
const { createUserAccount } = require('../utils/accounts.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const {
  requireUuid, isNonEmptyString, firstInvalidString, isIntInRange, isOptionalStringArray,
} = require('../utils/validate.cjs');

const router = express.Router();

function stripPassword(user) {
  if (!user) return user;
  const { password, ...rest } = user;
  return rest;
}

async function issueTokens(user) {
  const accessToken = signAccessToken(user);
  const { raw, hash, expiresAt } = generateRefreshToken();
  const { error } = await supabase.from('refresh_tokens').insert([
    { user_id: user.id, token_hash: hash, expires_at: expiresAt.toISOString() },
  ]);
  if (error) throw error;
  return { accessToken, refreshToken: raw };
}

// ----------------------------------------------------
// POST /api/auth/register
// ----------------------------------------------------
router.post('/register', asyncHandler(async (req, res) => {
  const { name, email, password, role, department } = req.body;
  // Each must be a *string* — a non-string role/email previously reached
  // `.toLowerCase()` and threw a TypeError, surfacing as a 500.
  const invalid = firstInvalidString(req.body, ['name', 'email', 'password', 'role']);
  if (invalid) {
    return res.status(400).json({ error: 'Name, email, password, and role are required' });
  }
  const allowedRoles = ['student', 'teacher', 'admin'];
  if (!allowedRoles.includes(role.toLowerCase())) {
    return res.status(400).json({ error: 'Role must be one of student, teacher, admin' });
  }

  const { user: newUser, conflict } = await createUserAccount({ name, email, password, role, department });
  if (conflict) return res.status(409).json({ error: 'An account with this email already exists' });

  await logAudit(email, `New ${role} Registered: ${name}`);

  const { accessToken, refreshToken } = await issueTokens(newUser);
  res.status(201).json({ success: true, token: accessToken, refreshToken, user: newUser });
}));

// ----------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  // Must be strings: a numeric/object email previously threw on .toLowerCase().
  if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
    return res.status(400).json({ error: 'Email and password are required' });
  }
  if (role !== undefined && typeof role !== 'string') {
    return res.status(400).json({ error: 'role must be a string' });
  }

  const { data: user, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase()).maybeSingle();
  if (error) throw error;
  if (!user || !user.password) return res.status(401).json({ error: 'Invalid email or password' });

  const isMatch = bcrypt.compareSync(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid email or password' });

  if (role && user.role.toUpperCase() !== role.toUpperCase()) {
    return res.status(403).json({ error: `Account exists but role is ${user.role}, not ${role}` });
  }

  await logAudit(email, `User Logged In as ${user.role}`);

  const { accessToken, refreshToken } = await issueTokens(user);
  res.json({ success: true, token: accessToken, refreshToken, user: stripPassword(user) });
}));

// ----------------------------------------------------
// POST /api/auth/refresh  { refreshToken }
// Rotates the refresh token: old one is deleted, a new pair issued.
// ----------------------------------------------------
router.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'refreshToken is required' });

  const hash = hashToken(refreshToken);
  const { data: row, error } = await supabase.from('refresh_tokens').select('*').eq('token_hash', hash).maybeSingle();
  if (error) throw error;
  if (!row) return res.status(401).json({ error: 'Invalid refresh token' });
  if (new Date(row.expires_at) < new Date()) {
    await supabase.from('refresh_tokens').delete().eq('id', row.id);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const { data: user, error: userErr } = await supabase.from('users').select(PUBLIC_USER_FIELDS).eq('id', row.user_id).maybeSingle();
  if (userErr || !user) return res.status(401).json({ error: 'User no longer exists' });

  // Rotate: delete old, issue new
  await supabase.from('refresh_tokens').delete().eq('id', row.id);
  const { accessToken, refreshToken: newRefreshToken } = await issueTokens(user);

  res.json({ success: true, token: accessToken, refreshToken: newRefreshToken, user });
}));

// ----------------------------------------------------
// POST /api/auth/logout  { refreshToken }
// ----------------------------------------------------
router.post('/logout', asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    const hash = hashToken(refreshToken);
    await supabase.from('refresh_tokens').delete().eq('token_hash', hash);
  }
  res.json({ success: true });
}));

// ----------------------------------------------------
// GET /api/auth/me
// ----------------------------------------------------
router.get('/me', authenticateToken, asyncHandler(async (req, res) => {
  const { data: user, error } = await supabase.from('users').select(SELF_USER_FIELDS).eq('id', req.user.id).maybeSingle();
  if (error) throw error;
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
}));

// ----------------------------------------------------
// GET /api/auth/profile/:id (and fallback GET /api/auth/profile)
// ----------------------------------------------------
router.get('/profile/:id?', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id || req.user.id;
  if (!requireUuid(res, targetId, 'id')) return;
  const { data: user, error } = await supabase
    .from('users')
    .select(SELF_USER_FIELDS)
    .eq('id', targetId)
    .maybeSingle();
  if (error) throw error;
  if (!user) return res.status(404).json({ error: 'User not found' });

  let profile = { ...user };
  if (user.role.toUpperCase() === 'TEACHER') {
    const { data: tag, error: tagErr } = await supabase
      .from('teacher_tags')
      .select('*')
      .eq('teacher_id', targetId)
      .maybeSingle();
    if (tagErr) throw tagErr;

    // Fetch ratings to calculate average stars
    const { data: ratings, error: rateErr } = await supabase
      .from('ratings')
      .select('stars')
      .eq('teacher_id', targetId);
    if (rateErr) throw rateErr;

    const avgStars = ratings && ratings.length
      ? Number((ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1))
      : 0;

    profile = {
      ...profile,
      cabin_block: tag?.block || null,
      cabin_room: tag?.room || null,
      status: tag?.status || 'Offline',
      status_note: tag?.free_till || '',
      subjects: tag?.subjects || [],
      rating: avgStars,
    };
  }

  res.json({ success: true, user: profile });
}));

// ----------------------------------------------------
// PATCH /api/auth/profile/:id (and fallback PATCH /api/auth/profile)
// Updates the profile for the target user (or current user). Admins can update anyone's.
// ----------------------------------------------------
router.patch('/profile/:id?', authenticateToken, asyncHandler(async (req, res) => {
  const targetId = req.params.id || req.user.id;
  if (!requireUuid(res, targetId, 'id')) return;
  const isAdmin = req.user.role.toUpperCase() === 'ADMIN';

  if (targetId !== req.user.id && !isAdmin) {
    return res.status(403).json({ error: 'You are not authorized to update this profile' });
  }

  const { data: targetUser, error: findUserErr } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', targetId)
    .maybeSingle();
  if (findUserErr) throw findUserErr;
  if (!targetUser) return res.status(404).json({ error: 'User not found' });

  const {
    name, department, bio, interests, learning_goals, preferred_times,
    comm_mode, office_hours, max_bookings_per_day, avatar_seed,
    // Teacher-specific fields
    cabin_block, cabin_room, status, status_note, subjects
  } = req.body;

  // Type-check the columns whose Postgres type is stricter than "text": a
  // string sent for a text[] column ("malformed array literal") or a
  // non-numeric max_bookings_per_day ("invalid input syntax for type integer")
  // both used to fail inside the driver and surface as a 500.
  for (const [field, value] of Object.entries({ interests, preferred_times, office_hours, subjects })) {
    if (!isOptionalStringArray(value)) {
      return res.status(400).json({ error: `${field} must be an array of strings` });
    }
  }
  if (max_bookings_per_day !== undefined && !isIntInRange(max_bookings_per_day, 0, 100)) {
    return res.status(400).json({ error: 'max_bookings_per_day must be an integer between 0 and 100' });
  }

  if (avatar_seed !== undefined && !isNonEmptyString(avatar_seed)) {
    return res.status(400).json({ error: 'avatar_seed must be a non-empty string' });
  }

  const userPayload = {};
  if (name !== undefined) userPayload.name = name;
  if (department !== undefined) userPayload.department = department;
  if (bio !== undefined) userPayload.bio = bio;
  if (interests !== undefined) userPayload.interests = interests;
  if (learning_goals !== undefined) userPayload.learning_goals = learning_goals;
  if (preferred_times !== undefined) userPayload.preferred_times = preferred_times;
  if (comm_mode !== undefined) userPayload.comm_mode = comm_mode;
  if (office_hours !== undefined) userPayload.office_hours = office_hours;
  if (max_bookings_per_day !== undefined) userPayload.max_bookings_per_day = max_bookings_per_day;

  if (avatar_seed !== undefined) userPayload.avatar_seed = avatar_seed.trim().slice(0, 200);

  if (targetUser.role.toUpperCase() === 'TEACHER') {
    const tagPayload = {};
    if (cabin_block !== undefined) tagPayload.block = cabin_block;
    if (cabin_room !== undefined) tagPayload.room = cabin_room;
    if (cabin_block !== undefined || cabin_room !== undefined) {
      const currentBlock = cabin_block !== undefined ? cabin_block : '';
      const currentRoom = cabin_room !== undefined ? cabin_room : '';
      tagPayload.location = currentBlock && currentRoom ? `${currentBlock} - ${currentRoom}` : '';
    }
    if (status !== undefined) tagPayload.status = status;
    if (status_note !== undefined) tagPayload.free_till = status_note;
    if (subjects !== undefined) tagPayload.subjects = subjects;

    if (Object.keys(tagPayload).length > 0) {
      const { data: existingTag } = await supabase
        .from('teacher_tags')
        .select('id')
        .eq('teacher_id', targetId)
        .maybeSingle();

      if (existingTag) {
        await supabase.from('teacher_tags').update(tagPayload).eq('id', existingTag.id);
      } else {
        await supabase.from('teacher_tags').insert([{
          teacher_id: targetId,
          location: '', block: '', room: '', status: 'Available', ...tagPayload
        }]);
      }
    }
  }

  let updatedUser;
  if (Object.keys(userPayload).length > 0) {
    const { data: updUser, error: updErr } = await supabase
      .from('users')
      .update(userPayload)
      .eq('id', targetId)
      .select(SELF_USER_FIELDS)
      .single();
    if (updErr) throw updErr;
    updatedUser = updUser;
  } else {
    const { data: existingUser } = await supabase
      .from('users')
      .select(SELF_USER_FIELDS)
      .eq('id', targetId)
      .single();
    updatedUser = existingUser;
  }

  if (targetUser.role.toUpperCase() === 'TEACHER') {
    const { data: finalTag } = await supabase
      .from('teacher_tags')
      .select('*')
      .eq('teacher_id', targetId)
      .maybeSingle();
    updatedUser = {
      ...updatedUser,
      cabin_block: finalTag?.block || null,
      cabin_room: finalTag?.room || null,
      status: finalTag?.status || 'Offline',
      status_note: finalTag?.free_till || '',
      subjects: finalTag?.subjects || [],
    };
  }

  await logAudit(req.user.email, `Updated profile for user ID ${targetId}`);
  res.json({ success: true, user: updatedUser });
}));

// ----------------------------------------------------
// POST /api/auth/change-password  { currentPassword, newPassword }
// ----------------------------------------------------
router.post('/change-password', authenticateToken, asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'newPassword must be at least 6 characters' });

  const { data: user, error } = await supabase.from('users').select('id, email, password').eq('id', req.user.id).maybeSingle();
  if (error) throw error;
  if (!user || !bcrypt.compareSync(currentPassword, user.password || '')) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  const { error: updErr } = await supabase.from('users').update({ password: hashed }).eq('id', user.id);
  if (updErr) throw updErr;

  // Revoke all existing refresh tokens on password change
  await supabase.from('refresh_tokens').delete().eq('user_id', user.id);
  await logAudit(user.email, 'Changed password');

  res.json({ success: true });
}));

// ----------------------------------------------------
// POST /api/auth/forgot-password  { email }
// In the absence of a transactional email provider, the reset link is
// logged server-side. Wire up an email service (Resend, SendGrid, ...)
// in production and send `resetUrl` there instead of logging it.
// ----------------------------------------------------
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!isNonEmptyString(email)) return res.status(400).json({ error: 'email is required' });

  const { data: user } = await supabase.from('users').select('id, email').eq('email', email.toLowerCase()).maybeSingle();
  // Always respond 200 regardless of whether the account exists, to
  // avoid leaking which emails are registered.
  if (user) {
    const raw = crypto.randomBytes(32).toString('hex');
    const hash = hashToken(raw);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    await supabase.from('password_reset_tokens').insert([
      { user_id: user.id, token_hash: hash, expires_at: expiresAt.toISOString() },
    ]);
    const resetUrl = `${req.headers.origin || 'http://localhost:5173'}/reset-password?token=${raw}`;
    console.log(`[password-reset] ${user.email} -> ${resetUrl}`);
    await logAudit(user.email, 'Requested password reset');
    if (process.env.NODE_ENV !== 'production') {
      // Convenience for local dev/testing only — never do this in prod.
      return res.json({ success: true, message: 'Reset link generated', devToken: raw });
    }
  }
  res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
}));

// ----------------------------------------------------
// POST /api/auth/reset-password  { token, newPassword }
// ----------------------------------------------------
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ error: 'token and newPassword are required' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'newPassword must be at least 6 characters' });

  const hash = hashToken(token);
  const { data: row, error } = await supabase.from('password_reset_tokens').select('*').eq('token_hash', hash).eq('used', false).maybeSingle();
  if (error) throw error;
  if (!row || new Date(row.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Reset token is invalid or expired' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  await supabase.from('users').update({ password: hashedPassword }).eq('id', row.user_id);
  await supabase.from('password_reset_tokens').update({ used: true }).eq('id', row.id);
  await supabase.from('refresh_tokens').delete().eq('user_id', row.user_id);

  res.json({ success: true, message: 'Password has been reset. Please log in again.' });
}));

// ----------------------------------------------------
// POST /api/auth/google  { credential }
// ----------------------------------------------------
router.post('/google', asyncHandler(async (req, res) => {
  const { credential } = req.body;
  if (!isNonEmptyString(credential)) {
    return res.status(400).json({ error: 'credential is required' });
  }

  // 1. Verify token with Google's tokeninfo API
  const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`;
  let payload;
  try {
    const response = await fetch(verifyUrl);
    if (!response.ok) {
      return res.status(400).json({ error: 'Invalid Google credential token' });
    }
    payload = await response.json();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify Google token', details: err.message });
  }

  const { email, name, sub } = payload;
  if (!email) {
    return res.status(400).json({ error: 'Email not provided by Google account' });
  }

  const normalizedEmail = email.toLowerCase();

  // 2. Check if user already exists
  let { data: user, error } = await supabase.from('users').select('*').eq('email', normalizedEmail).maybeSingle();
  if (error) throw error;

  let isNewUser = false;
  if (!user) {
    // 3. User does not exist, auto-register them
    isNewUser = true;
    let role = 'STUDENT';
    if (normalizedEmail.includes('teacher') || normalizedEmail.includes('faculty') || normalizedEmail.endsWith('@faculty.university.edu') || normalizedEmail.endsWith('@teacher.university.edu')) {
      role = 'TEACHER';
    } else if (normalizedEmail.includes('admin') || normalizedEmail.endsWith('@admin.university.edu')) {
      role = 'ADMIN';
    }

    const randomPassword = crypto.randomBytes(32).toString('hex');
    const { user: newUser, conflict } = await createUserAccount({
      name: name || email.split('@')[0],
      email: normalizedEmail,
      password: randomPassword,
      role: role.toLowerCase(),
      department: 'General',
    });

    if (conflict) {
      return res.status(409).json({ error: 'User registration conflict' });
    }
    user = newUser;
  }

  // Ensure google_id is linked if not already
  if (!user.google_id) {
    await supabase.from('users').update({ google_id: sub }).eq('id', user.id);
    user.google_id = sub;
  }

  await logAudit(normalizedEmail, `User Logged In via Google SSO (New: ${isNewUser})`);

  const { accessToken, refreshToken } = await issueTokens(user);
  res.json({
    success: true,
    token: accessToken,
    refreshToken,
    user: stripPassword(user),
    isNewUser
  });
}));

module.exports = router;
