// Campus Copilot — real retrieval over live Supabase data, zero LLM.
//
// The original prototype frontend had an "AI Copilot" chat drawer that
// looked like RAG but wasn't: it had no network call at all, just four
// hardcoded canned replies picked by keyword substring match. This route is
// the real version of that idea, built the same way /api/ai/recommend
// already works — genuine queries against current data, no external model,
// no API key. "Generation" here means composing a template string from real
// retrieved rows, not neural text generation; the `data` field on the
// response carries those raw rows back so the frontend can render them as
// grounding/citations rather than trusting the prose alone.
const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { isNonEmptyString } = require('../utils/validate.cjs');
const { VOCABULARY, tokenize, vectorize, cosineSimilarity, departmentKeywords } = require('../utils/vectorize.cjs');

const router = express.Router();

const DEPARTMENTS = ['Computer Science', 'Electronics', 'Physics & Math', 'Mechanical Eng'];

function findDepartment(lower) {
  return DEPARTMENTS.find((d) => lower.includes(d.toLowerCase())) || null;
}

// Loose match against whatever a teacher actually typed into cabin_block —
// there's no fixed enum (see frontend MapHeatmap.tsx), so this is a
// substring match against known named blocks plus anything already in use.
async function findBlock(lower) {
  const KNOWN_BLOCKS = ['Circular Block', 'Rectangular Block', 'AHS Block', 'SAIL Library', 'SSPE Block'];
  const named = KNOWN_BLOCKS.find((b) => lower.includes(b.toLowerCase()));
  if (named) return named;
  const match = lower.match(/block\s+([a-z0-9]+)/i);
  return match ? match[0] : null;
}

// Same users+teacher_tags join as GET /api/faculty, kept local so this
// route has no cross-router dependency.
async function loadFaculty() {
  const { data: teachers, error } = await supabase
    .from('users')
    .select('id, name, email, department, bio, office_hours')
    .eq('role', 'TEACHER')
    .order('name', { ascending: true });
  if (error) throw error;

  const teacherIds = teachers.map((t) => t.id);
  let tags = [];
  if (teacherIds.length) {
    const { data: tagRows, error: tagErr } = await supabase.from('teacher_tags').select('*').in('teacher_id', teacherIds);
    if (tagErr) throw tagErr;
    tags = tagRows;
  }
  const tagByTeacher = Object.fromEntries(tags.map((t) => [t.teacher_id, t]));

  return teachers.map((t) => {
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
}

router.post('/ask', async (req, res) => {
  const { message } = req.body || {};
  if (!isNonEmptyString(message)) return res.status(400).json({ error: 'message is required' });
  const lower = message.toLowerCase();

  try {
    // 1. Availability — "who's free / available [in <department|block>]"
    if (/\b(free|available|who\s*is)\b/.test(lower)) {
      const dept = findDepartment(lower);
      const block = await findBlock(lower);
      const faculty = await loadFaculty();
      const matches = faculty.filter((f) => {
        if (f.status !== 'Available') return false;
        if (dept && f.department !== dept) return false;
        if (block && f.cabin_block !== block) return false;
        return true;
      });

      const scope = dept ? ` in ${dept}` : block ? ` in ${block}` : '';
      const reply = matches.length
        ? `${matches.length} teacher${matches.length > 1 ? 's are' : ' is'} available${scope} right now: ${matches
            .map((m) => `${m.name}${m.cabin_block ? ` (${m.cabin_block}${m.cabin_room ? ` · ${m.cabin_room}` : ''})` : ''}`)
            .join(', ')}.`
        : `No teachers are currently marked Available${scope}. Try a different department or block.`;
      return res.json({ reply, intent: 'availability', data: matches });
    }

    // 2. Office hours / location
    if (/\b(office hours?|where is|cabin|which room)\b/.test(lower)) {
      const faculty = await loadFaculty();
      const nameMatch = faculty.filter((f) => lower.includes(f.name.toLowerCase()));
      const dept = findDepartment(lower);
      const results = nameMatch.length ? nameMatch : dept ? faculty.filter((f) => f.department === dept) : faculty.filter((f) => f.cabin_block);

      const reply = results.length
        ? results
            .slice(0, 5)
            .map((f) => {
              const location = f.cabin_block ? `${f.cabin_block}${f.cabin_room ? ` · ${f.cabin_room}` : ''}` : 'location not checked in';
              const hours = f.office_hours && f.office_hours.length ? `, office hours: ${f.office_hours.join(', ')}` : '';
              return `${f.name} — ${location}${hours}`;
            })
            .join('. ')
        : `I couldn't find a matching teacher. Try naming them directly, e.g. "office hours for Dr. Priya Desai".`;
      return res.json({ reply, intent: 'office_hours', data: results.slice(0, 5) });
    }

    // 3. Announcements
    if (/\b(announcements?|notices?|what'?s new|news)\b/.test(lower)) {
      const { data: announcements, error } = await supabase
        .from('announcements')
        .select('id, title, content, pinned, created_at, author:users(id, name, role)')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);
      if (error) throw error;

      const reply = announcements.length
        ? `Latest announcements: ${announcements.map((a) => `"${a.title}"${a.pinned ? ' (pinned)' : ''}`).join('; ')}.`
        : 'There are no announcements posted yet.';
      return res.json({ reply, intent: 'announcements', data: announcements });
    }

    // 4. Campus activity / busiest block
    if (/\b(busy|busiest|traffic|peak|activity)\b/.test(lower)) {
      const faculty = await loadFaculty();
      const byBlock = new Map();
      for (const f of faculty) {
        if (!f.cabin_block) continue;
        const entry = byBlock.get(f.cabin_block) || { block: f.cabin_block, total: 0, available: 0 };
        entry.total += 1;
        if (f.status === 'Available') entry.available += 1;
        byBlock.set(f.cabin_block, entry);
      }
      const ranked = [...byBlock.values()].sort((a, b) => b.total - a.total);

      const reply = ranked.length
        ? `Busiest blocks right now: ${ranked
            .slice(0, 3)
            .map((r) => `${r.block} (${r.total} checked in, ${r.available} available)`)
            .join(', ')}.`
        : 'No faculty have checked in to a block yet, so there is no activity to report.';
      return res.json({ reply, intent: 'activity', data: ranked.slice(0, 5) });
    }

    // 5. Open slots for a subject
    if (/\b(book|booking|slots?|consultations?)\b/.test(lower)) {
      const words = tokenize(lower);
      const subjectWord = words.find((w) => VOCABULARY.includes(w));
      let query = supabase.from('slots').select('*').eq('is_booked', false).order('date', { ascending: true });
      if (subjectWord) query = query.ilike('subject', `%${subjectWord}%`);
      const { data: slots, error } = await query.limit(5);
      if (error) throw error;

      const reply = slots.length
        ? `${slots.length} open slot${slots.length > 1 ? 's' : ''}${subjectWord ? ` for ${subjectWord}` : ''}: ${slots
            .map((s) => `${s.subject} — ${s.topic} (${s.date} at ${s.time})`)
            .join('; ')}.`
        : `No open slots found${subjectWord ? ` for ${subjectWord}` : ''} right now.`;
      return res.json({ reply, intent: 'slots', data: slots });
    }

    // 6. Fallback — same live cosine-similarity ranker as /api/ai/recommend,
    // so an unrecognized question still points at the most relevant mentor
    // instead of a generic "I don't understand."
    const { data: teachers, error } = await supabase.from('users').select('id, name, department, bio').eq('role', 'TEACHER');
    if (error) throw error;
    const teacherIds = teachers.map((t) => t.id);
    let tagsByTeacher = {};
    if (teacherIds.length) {
      const { data: tags, error: tagErr } = await supabase.from('teacher_tags').select('teacher_id, subjects').in('teacher_id', teacherIds);
      if (tagErr) throw tagErr;
      tagsByTeacher = Object.fromEntries((tags || []).map((t) => [t.teacher_id, t.subjects || []]));
    }
    const queryVector = vectorize(message);
    const ranked = teachers
      .map((t) => {
        const subjects = tagsByTeacher[t.id] || [];
        const profileText = [t.name, t.department, subjects.join(' '), t.bio, departmentKeywords(t.department)].filter(Boolean).join(' ');
        return { ...t, score: cosineSimilarity(queryVector, vectorize(profileText)) };
      })
      .sort((a, b) => b.score - a.score)
      .filter((t) => t.score > 0)
      .slice(0, 3);

    const reply = ranked.length
      ? `I couldn't match that to a specific answer, but this might help: ${ranked.map((t) => `${t.name} (${t.department})`).join(', ')}.`
      : `I couldn't find anything relevant to that yet. Try asking about faculty availability, office hours, announcements, campus activity, or open slots.`;
    res.json({ reply, intent: 'fallback', data: ranked });
  } catch (err) {
    res.status(500).json({ error: 'Copilot could not process that request', details: err.message });
  } finally {
    // Best-effort observability log — reuses the existing stub job-queue
    // table. Never blocks or fails the response above.
    supabase
      .from('ai_jobs')
      .insert([{ type: 'copilot_query', payload: { message }, status: 'done', processed_at: new Date().toISOString() }])
      .then(() => {})
      .catch(() => {});
  }
});

module.exports = router;
