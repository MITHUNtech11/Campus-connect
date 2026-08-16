// Server-side Supabase client. Uses the service_role key so the backend
// can read/write freely and enforce its own authorization logic in the
// route handlers/middleware instead of relying on Postgres RLS.
//
// NEVER import this file (or leak SUPABASE_SERVICE_ROLE_KEY) into any
// code that ships to the browser.
try {
  process.loadEnvFile(require('path').join(__dirname, '..', '..', '.env'));
} catch (e) {
  // .env not present (e.g. in CI) or already loaded — fall back to
  // whatever is already in process.env.
}

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    '[supabaseClient] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n' +
    '  Copy backend/.env.example to backend/.env and fill in your Supabase project credentials\n' +
    '  (Project Settings -> API -> service_role secret).'
  );
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_SERVICE_ROLE_KEY || '', {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = supabase;
