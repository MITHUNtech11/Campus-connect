// Shared keyword-bag vectorizer used by both the live /api/ai/recommend
// route and the optional scripts/ingest_embeddings.cjs maintenance script,
// so the two never drift out of sync on vocabulary or math.
//
// This is intentionally simple (21-word bag-of-words + cosine similarity,
// no external ML dependency) — good enough to rank teacher profiles against
// a free-text query without needing a model server. Swap in a real
// embedding model later by replacing vectorize() below; callers only see
// vectors + cosineSimilarity(), not how they're produced.
const VOCABULARY = [
  'algorithms', 'data structures', 'databases', 'operating systems', 'networks',
  'electronics', 'vlsi', 'signal processing', 'microprocessors',
  'physics', 'math', 'calculus', 'algebra',
  'mechanical', 'thermodynamics', 'robotics', 'cad',
  'ai', 'machine learning', 'data science', 'programming',
];

function tokenize(text) {
  return (text || '').toLowerCase().split(/[^a-zA-Z0-9]/).filter(Boolean);
}

function vectorize(text) {
  const words = tokenize(text);
  const vector = Array(VOCABULARY.length).fill(0.0);
  words.forEach((w) => {
    const idx = VOCABULARY.indexOf(w);
    if (idx !== -1) vector[idx] += 1.0;
  });

  const length = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  if (length > 0) {
    for (let i = 0; i < vector.length; i++) vector[i] = vector[i] / length;
  }
  return vector;
}

function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Department -> extra keyword text, so a teacher with no subjects/bio filled
// in yet still gets a reasonable profile vector.
function departmentKeywords(department) {
  switch (department) {
    case 'Computer Science':
      return 'algorithms data structures programming databases ai machine learning data science';
    case 'Electronics':
      return 'electronics vlsi microprocessors signal processing';
    case 'Physics & Math':
      return 'physics math calculus algebra';
    case 'Mechanical Eng':
      return 'mechanical thermodynamics robotics cad';
    default:
      return 'general consultation';
  }
}

module.exports = { VOCABULARY, tokenize, vectorize, cosineSimilarity, departmentKeywords };
