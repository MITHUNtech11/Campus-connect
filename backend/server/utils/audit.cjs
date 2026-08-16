const supabase = require('../database/supabaseClient.cjs');

async function logAudit(actor_email, action) {
  try {
    await supabase.from('audit_logs').insert([{ actor_email: actor_email || null, action }]);
  } catch (err) {
    console.error('Audit Log Error:', err.message);
  }
}

module.exports = { logAudit };
