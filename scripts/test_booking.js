(async ()=>{
  try {
    const fetch = global.fetch;
    const base = 'http://localhost:5000';

    console.log('Fetching admin users...');
    let u = await (await fetch(base + '/api/admin/users')).json();
    console.log('Users before:', JSON.stringify(u.users.slice(0,5), null, 2));

    console.log('Creating booking...');
    let create = await (await fetch(base + '/api/bookings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ student_id: 1, teacher_id: 3, slot_info: { subject: 'DBMS', time: '14:00', date: '2026-08-12' } })
    })).json();
    console.log('Create response:', JSON.stringify(create, null, 2));

    const bookingId = create.booking.id;
    console.log('Marking booking as no-show for id', bookingId);
    let noshow = await (await fetch(`${base}/api/bookings/${bookingId}/no_show`, { method: 'POST', headers: {'Content-Type':'application/json'} })).json();
    console.log('No-show response:', JSON.stringify(noshow, null, 2));

    console.log('Running reputation worker script...');
    const cp = await import('child_process');
    const path = await import('path');
    // Resolve relative to this script's own location (not the caller's
    // CWD) — this file moved to the top-level scripts/ folder during the
    // backend/frontend split, so a plain 'server/jobs/...' path only
    // worked if you happened to run this from inside backend/.
    const workerPath = path.join(__dirname, '..', 'backend', 'server', 'jobs', 'reputation_worker.cjs');
    cp.execSync(`node "${workerPath}"`, { stdio: 'inherit' });

    console.log('Fetching admin users after update...');
    let u2 = await (await fetch(base + '/api/admin/users')).json();
    console.log('Users after:', JSON.stringify(u2.users.slice(0,5), null, 2));
  } catch (err) {
    console.error('Test script error', err);
    process.exit(1);
  }
})();
