// Populates public.teachers_embeddings from current Supabase teacher
// profiles. NOT required for /api/ai/recommend to work — that route
// computes profile vectors live on every request (see
// server/api/ai.cjs) so results always reflect current data without
// needing this to have been run. This script exists for the placeholder
// teachers_embeddings table (see supabase_schema.sql, "placeholder for
// pgvector") in case you swap the live vectorizer for a precomputed/real
// embedding model later — kept working, not load-bearing.
//
// Run with: npm run ingest  (from backend/)
const supabase = require('../server/database/supabaseClient.cjs');
const { vectorize, departmentKeywords } = require('../server/utils/vectorize.cjs');

async function run() {
  console.log('Starting ingestion of teacher embeddings into Supabase...');

  const { data: teachers, error } = await supabase.from('users').select('id, name, department, bio').eq('role', 'TEACHER');
  if (error) {
    console.error('Failed to fetch teachers from Supabase:', error.message);
    process.exitCode = 1;
    return;
  }
  console.log(`Found ${teachers.length} teachers in Supabase.`);

  const teacherIds = teachers.map((t) => t.id);
  let tagsByTeacher = {};
  if (teacherIds.length) {
    const { data: tags, error: tagErr } = await supabase.from('teacher_tags').select('teacher_id, subjects').in('teacher_id', teacherIds);
    if (tagErr) console.warn('Fetching teacher_tags subjects warning:', tagErr.message);
    tagsByTeacher = Object.fromEntries((tags || []).map((t) => [t.teacher_id, t.subjects || []]));
  }

  const { error: delErr } = await supabase.from('teachers_embeddings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) console.warn('Clearing existing embeddings warning:', delErr.message);

  for (const t of teachers) {
    const subjects = tagsByTeacher[t.id] || [];
    const profileText = [t.name, t.department, subjects.join(' '), t.bio, departmentKeywords(t.department)]
      .filter(Boolean)
      .join(' ');
    const embedding = vectorize(profileText);

    const { error: insErr } = await supabase.from('teachers_embeddings').insert([{
      teacher_id: t.id,
      embedding,
      metadata: { name: t.name, department: t.department },
    }]);
    if (insErr) {
      console.error(`Failed to ingest embedding for ${t.name}:`, insErr.message);
      continue;
    }
    console.log(`Ingested embedding for ${t.name}`);
  }

  console.log('Embeddings ingestion completed.');
}

run();
