const bcrypt = require('bcryptjs');
const supabase = require('../database/supabaseClient.cjs');
const { PUBLIC_USER_FIELDS } = require('./userFields.cjs');

// Creates a new users row after checking the email is free. Shared by
// POST /api/auth/register (self-signup) and POST /api/admin/users
// (admin-created accounts) so the two can't drift on hashing/defaults.
// Returns `{ user }` on success or `{ conflict: true }` if the email is
// already registered — callers translate that into their own 409 response.
async function createUserAccount({ name, email, password, role, department }) {
  const normalizedEmail = email.toLowerCase();
  const { data: existing } = await supabase.from('users').select('id').eq('email', normalizedEmail).maybeSingle();
  if (existing) return { conflict: true };

  const { data: user, error } = await supabase
    .from('users')
    .insert([{
      name,
      email: normalizedEmail,
      password: bcrypt.hashSync(password, 10),
      role: role.toUpperCase(),
      department: department || 'General',
    }])
    .select(PUBLIC_USER_FIELDS)
    .single();
  if (error) throw error;
  return { user };
}

module.exports = { createUserAccount };
