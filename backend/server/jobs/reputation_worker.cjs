const supabase = require('../database/supabaseClient.cjs');
const { incrementNoShows } = require('../utils/reputation.cjs');

function parseSlotEnd(date, timeRange) {
  if (!date || !timeRange) return null;
  const endTimeStr = timeRange.includes('-') ? timeRange.split('-')[1].trim() : timeRange;
  const end = new Date(`${date} ${endTimeStr}`);
  return isNaN(end.getTime()) ? null : end;
}

async function detectNoShows() {
  try {
    const { data: activeBookings, error } = await supabase.from('bookings').select('*').in('status', ['PENDING', 'ACCEPTED']);
    if (error) throw error;

    // Batch-fetch every referenced slot in one query instead of one
    // query per booking.
    const slotIds = [...new Set((activeBookings || []).filter(b => b.slot_id).map(b => b.slot_id))];
    let slotsById = {};
    if (slotIds.length) {
      const { data: slotRows } = await supabase.from('slots').select('id, date, time').in('id', slotIds);
      slotsById = Object.fromEntries((slotRows || []).map(s => [s.id, s]));
    }

    const now = new Date();
    let detectedCount = 0;

    for (const b of activeBookings || []) {
      const slot = b.slot_id ? slotsById[b.slot_id] : null;
      const slotEnd = slot ? parseSlotEnd(slot.date, slot.time) : null;
      if (!slotEnd) continue;

      const graceDeadline = new Date(slotEnd.getTime() + 15 * 60 * 1000);
      if (now <= graceDeadline) continue;

      await supabase.from('bookings').update({ status: 'NO_SHOW', no_show: true }).eq('id', b.id);
      const student = await incrementNoShows(b.student_id);
      if (b.slot_id) await supabase.from('slots').update({ is_booked: false }).eq('id', b.slot_id);

      await supabase.from('audit_logs').insert([{
        actor_email: student?.email || 'student@college.edu',
        action: `Auto-detected NO-SHOW for booking ID ${b.id} (slot ended ${slot?.date} ${slot?.time})`,
      }]);
      detectedCount++;
    }

    if (detectedCount > 0) console.log(`Reputation worker: auto-detected ${detectedCount} new student no-shows.`);
  } catch (err) {
    console.error('No-show detection error in reputation worker:', err.message);
  }
}

async function recalcReputation() {
  try {
    const { data: users, error } = await supabase.from('users').select('id, no_shows').not('id', 'is', null);
    if (error) throw error;

    // Batch-fetch every referenced rating in one query instead of one
    // query per user.
    const userIds = (users || []).map(u => u.id);
    const ratingsByStudent = {};
    if (userIds.length) {
      const { data: ratings } = await supabase.from('ratings').select('student_id, stars').in('student_id', userIds);
      for (const r of ratings || []) {
        (ratingsByStudent[r.student_id] ||= []).push(r.stars);
      }
    }

    for (const u of users || []) {
      let score = 100;
      score -= (u.no_shows || 0) * 10;

      (ratingsByStudent[u.id] || []).forEach((stars) => {
        if (stars >= 4) score += 1;
        if (stars <= 2) score -= 1;
      });

      score = Math.max(0, Math.min(200, score));
      await supabase.from('users').update({ reputation_score: score }).eq('id', u.id);
    }
    console.log('Reputation worker: recalculated reputations for', (users || []).length, 'users');
  } catch (err) {
    console.error('Reputation worker error', err.message);
  }
}

async function runCycle() {
  await detectNoShows();
  await recalcReputation();
}

runCycle();
setInterval(runCycle, 1000 * 60 * 60);

module.exports = { runCycle };
