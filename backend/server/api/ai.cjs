// AI recommend/sentiment routes — run natively inside the main backend
// process (no separate ai-service, no AI_SERVICE_URL, no extra `npm run
// ai` terminal). A single `npm start` is enough.
//
// /recommend scores teachers against a free-text query using the same
// keyword-bag vectorizer as scripts/ingest_embeddings.cjs, but computes
// each teacher's profile vector live from Supabase (users + teacher_tags)
// on every request instead of reading a precomputed teachers_embeddings
// table. At this scale (a few dozen teachers, 21-word vocabulary) that's
// cheap, and it means recommendations always reflect current subjects/bio
// — a teacher who just finished onboarding shows up immediately, and the
// returned teacher_id is always a real Supabase user id (earlier, when
// this proxied to ai-service's own SQLite copy, recommended teacher_ids
// were legacy SQLite integer ids that matched nothing in the live
// Supabase-backed directory, so results silently rendered as nothing).
const express = require('express');
const supabase = require('../database/supabaseClient.cjs');
const { VOCABULARY, tokenize, vectorize, cosineSimilarity, departmentKeywords } = require('../utils/vectorize.cjs');

const router = express.Router();

router.post('/recommend', async (req, res) => {
  const { topic_text } = req.body;
  if (!topic_text) return res.status(400).json({ error: 'topic_text is required' });

  try {
    const { data: teachers, error } = await supabase
      .from('users')
      .select('id, name, department, bio')
      .eq('role', 'TEACHER');
    if (error) throw error;

    const teacherIds = (teachers || []).map((t) => t.id);
    let tagsByTeacher = {};
    if (teacherIds.length) {
      const { data: tags, error: tagErr } = await supabase
        .from('teacher_tags')
        .select('teacher_id, subjects')
        .in('teacher_id', teacherIds);
      if (tagErr) throw tagErr;
      tagsByTeacher = Object.fromEntries((tags || []).map((t) => [t.teacher_id, t.subjects || []]));
    }

    const queryVector = vectorize(topic_text);
    const queryWords = tokenize(topic_text);

    const recommendations = (teachers || []).map((t) => {
      const subjects = tagsByTeacher[t.id] || [];
      const profileText = [t.name, t.department, subjects.join(' '), t.bio, departmentKeywords(t.department)]
        .filter(Boolean)
        .join(' ');
      const score = cosineSimilarity(queryVector, vectorize(profileText));

      const matchedWords = queryWords.filter((w) => VOCABULARY.includes(w));
      const reason = matchedWords.length > 0
        ? `Expertise in: ${matchedWords.join(', ')}`
        : `Specializes in ${t.department || 'this area'}`;

      return { teacher_id: t.id, score: parseFloat(score.toFixed(3)), reason, slots: [] };
    });

    recommendations.sort((a, b) => b.score - a.score);
    const top = recommendations.filter((r) => r.score > 0).slice(0, 5);

    // No keyword overlap with anyone — still return a short list rather
    // than an empty one so the UI has something to show.
    res.json({ recommendations: top.length > 0 ? top : recommendations.slice(0, 5) });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute recommendations', details: err.message });
  }
});

router.post('/sentiment', (req, res) => {
  const { review_text } = req.body;
  const lower = (review_text || '').toLowerCase();
  const sentiment = lower.includes('good') || lower.includes('great') ? 'positive' : 'neutral';
  const score = sentiment === 'positive' ? 0.9 : 0.5;
  res.json({ sentiment, score });
});

module.exports = router;
