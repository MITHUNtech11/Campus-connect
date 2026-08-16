const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const supabase = require('../server/database/supabaseClient.cjs');
const { SLOT_CATEGORIES } = require('../server/utils/slotCategories.cjs');

// Generate a random UUID
function uuid() {
  return crypto.randomUUID();
}

async function seed() {
  console.log('Starting Supabase Database Seeding...');
  
  // 1. Create Mock Students
  const students = [
    { id: '44444444-4444-4444-4444-444444444444', name: 'Ananya Rao', email: 'ananya.rao@college.edu' }, // Exists in base seed
    { id: uuid(), name: 'Aniket Mehta', email: 'aniket.mehta@college.edu' },
    { id: uuid(), name: 'Shreya Ghoshal', email: 'shreya.g@college.edu' },
    { id: uuid(), name: 'Rahul Dravid', email: 'rahul.d@college.edu' }
  ];

  console.log('Seeding students...');
  for (const s of students) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', s.email).maybeSingle();
    if (!existing) {
      const passwordHash = bcrypt.hashSync('password123', 10);
      await supabase.from('users').insert([{
        id: s.id,
        name: s.name,
        email: s.email,
        password: passwordHash,
        role: 'STUDENT',
        department: 'Computer Science',
        reputation_score: 100,
        onboarding_completed: true
      }]);
    } else {
      s.id = existing.id; // Map back existing ID if already there
    }
  }

  // 2. Mock Teachers
  const teachers = [
    {
      id: '22222222-2222-2222-2222-222222222222', // Exists in base seed
      name: 'Dr. Vikram Sharma',
      email: 'vikram.sharma@college.edu',
      department: 'Computer Science',
      subjects: ['Data Structures', 'Algorithms'],
      block: 'Circular Block',
      room: '304',
      status: 'Available'
    },
    {
      id: '33333333-3333-3333-3333-333333333333', // Exists in base seed
      name: 'Prof. Meera Nair',
      email: 'meera.nair@college.edu',
      department: 'Electronics',
      subjects: ['Digital Electronics', 'VLSI Design'],
      block: 'Rectangular Block',
      room: '102',
      status: 'Busy'
    },
    {
      id: uuid(),
      name: 'Dr. Priya Desai',
      email: 'priya.desai@college.edu',
      department: 'Computer Science',
      subjects: ['Database Systems', 'SQL Optimization'],
      block: 'Circular Block',
      room: '402',
      status: 'Available'
    },
    {
      id: uuid(),
      name: 'Dr. Amit Patel',
      email: 'amit.patel@college.edu',
      department: 'Computer Science',
      subjects: ['Algorithms', 'Complexity Theory'],
      block: 'Circular Block',
      room: '405',
      status: 'Busy'
    },
    {
      id: uuid(),
      name: 'Prof. Rajesh Kumar',
      email: 'rajesh.kumar@college.edu',
      department: 'Electronics',
      subjects: ['Digital Circuits', 'VLSI Design'],
      block: 'Rectangular Block',
      room: '201',
      status: 'In Class'
    },
    {
      id: uuid(),
      name: 'Dr. Sneha Reddy',
      email: 'sneha.reddy@college.edu',
      department: 'Computer Science',
      subjects: ['React Native', 'Mobile Dev'],
      block: 'Circular Block',
      room: '303',
      status: 'Available'
    },
    {
      id: uuid(),
      name: 'Prof. Rohan Sen',
      email: 'rohan.sen@college.edu',
      department: 'Physics & Math',
      subjects: ['Linear Algebra', 'Calculus'],
      block: 'AHS Block',
      room: '104',
      status: 'Available'
    },
    {
      id: uuid(),
      name: 'Dr. Kavita Rao',
      email: 'kavita.rao@college.edu',
      department: 'Mechanical Eng',
      subjects: ['Fluid Mechanics', 'Thermodynamics'],
      block: 'SSPE Block',
      room: '102',
      status: 'Offline'
    },
    {
      id: uuid(),
      name: 'Prof. Sanjay Gupta',
      email: 'sanjay.gupta@college.edu',
      department: 'Computer Science',
      subjects: ['Machine Learning', 'Python'],
      block: 'Circular Block',
      room: '501',
      status: 'Available'
    },
    {
      id: uuid(),
      name: 'Dr. Neha Sharma',
      email: 'neha.sharma@college.edu',
      department: 'Electronics',
      subjects: ['Signal Processing', 'Microcontrollers'],
      block: 'Rectangular Block',
      room: '302',
      status: 'Available'
    },
    {
      id: uuid(),
      name: 'Prof. Arun Verma',
      email: 'arun.verma@college.edu',
      department: 'Mechanical Eng',
      subjects: ['Solid Mechanics', 'CAD Modeling'],
      block: 'SSPE Block',
      room: '203',
      status: 'Busy'
    },
    {
      id: uuid(),
      name: 'Dr. Divya Nair',
      email: 'divya.nair@college.edu',
      department: 'Physics & Math',
      subjects: ['Quantum Mechanics', 'Differential Equations'],
      block: 'AHS Block',
      room: '205',
      status: 'In Class'
    }
  ];

  console.log('Seeding teachers...');
  for (const t of teachers) {
    const { data: existing } = await supabase.from('users').select('id').eq('email', t.email).maybeSingle();
    if (!existing) {
      const passwordHash = bcrypt.hashSync('password123', 10);
      const { data: user, error: userErr } = await supabase.from('users').insert([{
        id: t.id,
        name: t.name,
        email: t.email,
        password: passwordHash,
        role: 'TEACHER',
        department: t.department,
        reputation_score: 95,
        onboarding_completed: true
      }]).select().single();
      if (userErr) throw userErr;
    } else {
      t.id = existing.id; // Map back existing ID if already there
    }

    // Upsert teacher tags
    const { data: existingTag } = await supabase.from('teacher_tags').select('id').eq('teacher_id', t.id).maybeSingle();
    if (!existingTag) {
      await supabase.from('teacher_tags').insert([{
        teacher_id: t.id,
        location: `${t.block} - Room ${t.room}`,
        block: t.block,
        room: t.room,
        status: t.status,
        subjects: t.subjects,
        free_till: '04:00 PM'
      }]);
    } else {
      await supabase.from('teacher_tags').update({
        status: t.status,
        subjects: t.subjects,
        location: `${t.block} - Room ${t.room}`,
        block: t.block,
        room: t.room
      }).eq('teacher_id', t.id);
    }
  }

  // 3. Create consultation slots for teachers
  console.log('Seeding slots and bookings...');
  const slotCategories = SLOT_CATEGORIES;
  const subjects = [
    'System Design Mock', 'Resume Critique', 'Leetcode Practice', 
    'Placement Strategy', 'Database Joins', 'React Hooks', 
    'Calculus doubts', 'VLSI Design doubts'
  ];

  // Helper to get random item
  const random = arr => arr[Math.floor(Math.random() * arr.length)];

  // Clean old slots to prevent duplication issues in multiple seeds
  // Keep base slots if needed, but for mock data richness we can just add fresh ones.
  const today = new Date();

  for (const t of teachers) {
    // Generate 5 slots per teacher spread over current month and last month
    for (let i = 0; i < 5; i++) {
      const slotDate = new Date();
      // Generate slots in a range of -15 days to +5 days
      slotDate.setDate(today.getDate() - 10 + i * 4);
      
      const dateString = slotDate.toISOString().split('T')[0];
      const category = random(slotCategories);
      const isBooked = Math.random() > 0.3; // 70% chance of being booked

      const { data: slot, error: slotErr } = await supabase.from('slots').insert([{
        teacher_id: t.id,
        subject: random(subjects),
        topic: category === 'Academic' ? 'Subject doubts' : `Placement prep for ${category}`,
        duration: random([30, 45, 60]),
        type: random(['1-on-1 Consultation', 'Group Session']),
        date: dateString,
        time: `${10 + (i % 4)}:00 AM`,
        is_booked: isBooked,
        slot_category: category
      }]).select().single();

      if (slotErr) {
        console.error('Error inserting slot:', slotErr);
        continue;
      }

      if (isBooked && slot) {
        // Create matching Booking
        const student = random(students);
        const bookingStatus = slotDate < today ? random(['COMPLETED', 'NO_SHOW']) : random(['PENDING', 'ACCEPTED']);
        
        const { data: booking, error: bookingErr } = await supabase.from('bookings').insert([{
          student_id: student.id,
          teacher_id: t.id,
          slot_id: slot.id,
          status: bookingStatus,
          target_company: category !== 'Academic' ? random(['Google', 'Microsoft', 'Amazon', 'Meta', 'Netflix']) : null,
          job_description: category !== 'Academic' ? 'Standard software developer role prep' : null,
          resume_url: category !== 'Academic' ? 'https://drive.google.com/mock-resume.pdf' : null
        }]).select().single();

        if (bookingErr) {
          console.error('Error booking:', bookingErr);
          continue;
        }

        // If completed, add a review
        if (bookingStatus === 'COMPLETED' && booking) {
          const stars = random([4, 5, 5, 4, 3]); // weight higher
          const reviewText = stars >= 4 
            ? random(['Excellent mock prep, really helped building confidence!', 'Very thorough review of my resume. Highly recommended.', 'Guided me on critical design patterns, great tutor.'])
            : random(['Good guidance, but could have spent more time on optimization.', 'Average doubt solving session.']);
          
          await supabase.from('ratings').insert([{
            student_id: student.id,
            teacher_id: t.id,
            stars,
            review: reviewText,
            sentiment: stars >= 4 ? 'Positive' : 'Neutral',
            sentiment_score: stars >= 4 ? 0.9 : 0.5
          }]);
        }
      }
    }
  }

  // 4. Seed Announcements
  console.log('Seeding Announcements...');
  const announcementsMock = [
    {
      title: '📢 Placement Season Registration Open for Batch of 2027',
      content: 'All final year students must register on the CampusConnect Placement Portal by August 20th. Please upload your latest resume link in your profile. First mock interview schedules will be released next Monday. Check back for updates.',
      pinned: true
    },
    {
      title: '⚡ Mid-Term Exam Schedule & Quiet Zones Active',
      content: 'Mid-term examinations start from August 25th. The university library will remain open until 11:30 PM daily. Quiet study zones are now activated in Blocks B and C. Quiet policies are strictly enforced.',
      pinned: true
    },
    {
      title: '🚀 Joint CS & Electronics Robotics Workshop (SIH RoboCup Prep)',
      content: 'A joint robotics coding and hardware tuning bootcamp is scheduled for Saturday morning in Lab 102 (Rectangular Block). Open to all engineering students. Bring your laptops.',
      pinned: false
    },
    {
      title: '🎓 Guest Lecture: Scalable Microservice Architecture at Netflix',
      content: 'We are excited to host Dr. Sanjay Patel, ex-Principal Engineer at Netflix, for a session on scalable cloud architectures. Venue: Main Auditorium, Friday at 2:00 PM.',
      pinned: false
    }
  ];

  // We can pick a teacher to post these
  const posterId = teachers[0].id;
  
  // Clean old announcements
  await supabase.from('announcements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const a of announcementsMock) {
    await supabase.from('announcements').insert([{
      posted_by: posterId,
      title: a.title,
      content: a.content,
      pinned: a.pinned
    }]);
  }

  // 5. Seed Community Posts
  console.log('Seeding Community Discussions...');
  const communityMock = [
    {
      user_id: students[0].id,
      subject: 'Cannot resolve double-free error in C++ custom vector destructor',
      question: 'I am getting a core dump double-free or corruption error in my custom vector destructor. Can someone explain why this happens? My code performs standard array deallocations.',
      upvotes: 14,
      solved: true,
      answers: [
        {
          id: uuid(),
          author: teachers[0].name,
          role: 'TEACHER',
          text: 'This usually happens when you perform a shallow copy of an object holding dynamically allocated memory. Make sure to implement a proper Copy Constructor and Copy Assignment Operator (Rule of Three) or disable copy operations completely.',
          upvotes: 0
        },
        {
          id: uuid(),
          author: students[2].name,
          role: 'STUDENT',
          text: 'Check if you are passing the vector into a function parameter by value instead of by reference `const Vector&`! Passing by value invokes the default shallow copy constructor, which frees the pointer twice when function terminates.',
          upvotes: 0
        }
      ]
    },
    {
      user_id: students[1].id,
      subject: 'Difference between SQL joins vs subqueries performance in Postgres',
      question: 'Is it always better to write a JOIN instead of a subquery in PostgreSQL? I noticed a query takes 1.2s with a subquery but 0.1s with join on a 100k row dataset.',
      upvotes: 11,
      solved: true,
      answers: [
        {
          id: uuid(),
          author: teachers[2].name,
          role: 'TEACHER',
          text: 'Postgres query planner optimizes both, but subqueries (especially correlated ones) can sometimes force nested loop sequential scans. JOINs allow hash joins or merge joins. Check your EXPLAIN ANALYZE plan to see where the bottleneck is.',
          upvotes: 0
        },
        {
          id: uuid(),
          author: students[0].name,
          role: 'STUDENT',
          text: 'I tried this on our project database (about 50k rows) and the join was indeed much faster. The explain plan showed that the subquery was triggering a nested loop scan for every row!',
          upvotes: 0
        }
      ]
    },
    {
      user_id: students[2].id,
      subject: 'Best packages to set up Tailwind (NativeWind) in Expo Go SDK 54',
      question: 'We are building our semester project in React Native (Expo) and want to use Tailwind for styling. Are there any recommended configuration guides for SDK 54?',
      upvotes: 7,
      solved: false,
      answers: [
        {
          id: uuid(),
          author: teachers[5].name,
          role: 'TEACHER',
          text: 'NativeWind v4 is the current standard. Make sure your tailwind.config file specifies content paths correctly and your babel config matches. For Expo SDK 54, follow the step-by-step setup guides on nativewind.dev.',
          upvotes: 0
        },
        {
          id: uuid(),
          author: students[3].name,
          role: 'STUDENT',
          text: 'Make sure you use tailwindcss@3.3.0 or similar compatible version, as NativeWind v4 can be picky with Tailwind v4 if you are on Expo 54. We got it working after downgrading the tailwindcss package version.',
          upvotes: 0
        }
      ]
    },
    {
      user_id: students[3].id,
      subject: 'Microsoft Internship 2026 eligibility criteria details?',
      question: 'Does the Microsoft internship require a minimum CGPA of 8.0, or is it open to 7.5+ as well? When is the code assessment window?',
      upvotes: 19,
      solved: true,
      answers: [
        {
          id: uuid(),
          author: 'Placement Team (Admin)',
          role: 'ADMIN',
          text: 'Microsoft requires 8.0+ CGPA with no active backlogs. The internal screening test is scheduled for next Friday at 10 AM in the computer lab. Keep your profiles updated.',
          upvotes: 0
        }
      ]
    }
  ];

  // Clean old community posts
  await supabase.from('community').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const c of communityMock) {
    await supabase.from('community').insert([{
      user_id: c.user_id,
      subject: c.subject,
      question: c.question,
      upvotes: c.upvotes,
      solved: c.solved,
      answers: c.answers
    }]);
  }

  console.log('Database seeded successfully with 10+ teachers, rich stats, real announcements, and community posts!');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
});
