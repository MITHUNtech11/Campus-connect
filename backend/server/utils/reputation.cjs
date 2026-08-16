const supabase = require('../database/supabaseClient.cjs');

// Increments a student's no_shows count. Used both by the immediate
// POST /api/bookings/:id/no_show route and by the background reputation
// worker's automatic no-show detection, so the two stay in sync on how
// the counter is read-then-written. Returns the pre-update student row.
async function incrementNoShows(studentId) {
  const { data: student } = await supabase.from('users').select('no_shows, email').eq('id', studentId).maybeSingle();
  await supabase.from('users').update({ no_shows: (student?.no_shows || 0) + 1 }).eq('id', studentId);
  return student;
}

module.exports = { incrementNoShows };
