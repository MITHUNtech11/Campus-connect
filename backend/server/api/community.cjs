const express = require('express');
const crypto = require('crypto');
const supabase = require('../database/supabaseClient.cjs');
const { authenticateToken } = require('../middleware/auth.cjs');
const { asyncHandler } = require('../utils/asyncHandler.cjs');
const { requireUuid, firstInvalidString } = require('../utils/validate.cjs');

const router = express.Router();

router.get('/', asyncHandler(async (req, res) => {
  const { data: posts, error } = await supabase
    .from('community')
    .select('*, author:users(id, name, role)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  
  const formattedPosts = (posts || []).map(p => {
    let answers = p.answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        answers = [];
      }
    }
    const mappedAnswers = (Array.isArray(answers) ? answers : []).map(a => ({
      id: a.id,
      author: a.author || a.name || 'Anonymous',
      text: a.text || a.content || '',
      upvotes: a.upvotes || 0,
      role: a.role
    }));
    return { ...p, answers: mappedAnswers };
  });

  res.json({ posts: formattedPosts });
}));

router.post('/', authenticateToken, asyncHandler(async (req, res) => {
  const { subject, question } = req.body;
  const user_id = req.user.id;
  // String-checked, not just truthy: an object subject was previously coerced
  // to '[object Object]'-style JSON and stored as-is.
  if (!user_id || firstInvalidString(req.body, ['subject', 'question'])) {
    return res.status(400).json({ error: 'Missing user_id, subject, or question' });
  }
  const { data: post, error } = await supabase.from('community').insert([{ user_id, subject, question, answers: [] }]).select().single();
  if (error) throw error;
  res.status(201).json({ success: true, post });
}));

router.post('/:id/answer', authenticateToken, asyncHandler(async (req, res) => {
  const { author, text } = req.body;
  if (!requireUuid(res, req.params.id, 'id')) return;
  if (firstInvalidString(req.body, ['author', 'text'])) {
    return res.status(400).json({ error: 'Missing author or text' });
  }
  const { data: post, error: findErr } = await supabase.from('community').select('answers').eq('id', req.params.id).maybeSingle();
  if (findErr) throw findErr;
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const answers = post.answers || [];
  const newAnswer = { id: crypto.randomUUID(), author, text, upvotes: 0 };
  answers.push(newAnswer);

  const { error } = await supabase.from('community').update({ answers }).eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true, answer: newAnswer });
}));

router.post('/:id/upvote', authenticateToken, asyncHandler(async (req, res) => {
  if (!requireUuid(res, req.params.id, 'id')) return;
  const { data: post, error: findErr } = await supabase.from('community').select('upvotes').eq('id', req.params.id).maybeSingle();
  if (findErr) throw findErr;
  if (!post) return res.status(404).json({ error: 'Post not found' });

  const upvotes = (post.upvotes || 0) + 1;
  const { error } = await supabase.from('community').update({ upvotes }).eq('id', req.params.id);
  if (error) throw error;
  res.json({ success: true, upvotes });
}));

module.exports = router;
