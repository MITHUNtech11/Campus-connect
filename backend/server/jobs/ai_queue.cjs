const supabase = require('../database/supabaseClient.cjs');

async function processPending() {
  try {
    const { data: jobs, error } = await supabase
      .from('ai_jobs')
      .select('id, type, payload')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);
    if (error) throw error;

    if (jobs && jobs.length) {
      jobs.forEach((job) => console.log('Processing AI job', job.id, job.type));
      await supabase
        .from('ai_jobs')
        .update({ status: 'done', processed_at: new Date().toISOString() })
        .in('id', jobs.map((job) => job.id));
    }
  } catch (err) {
    console.error('ai_queue error', err.message);
  }
}

setInterval(processPending, 10000);

module.exports = { processPending };
