import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini
let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (error) {
  console.warn("Failed to initialize Gemini:", error);
}

// --- Dummy Database ---
import { Teacher, Student, Slot, NeedStudentRequest, Review, Doubt } from "./src/types.js";

const db = {
  students: [
    {
      id: "s1",
      name: "Alex Sharma",
      email: "alex@college.edu",
      role: "student",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      hasCompletedOnboarding: true,
      reputationScore: 95,
      department: "Computer Science",
      year: 3,
    }
  ] as Student[],
  teachers: [
    {
      id: "t1",
      name: "Dr. Priya Desai",
      email: "priya.desai@college.edu",
      role: "teacher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya",
      hasCompletedOnboarding: true,
      department: "Computer Science",
      designation: "Associate Professor",
      subjects: ["Database Management Systems", "SQL", "Data Structures"],
      rating: 4.8,
      sentimentScore: 92,
      reviewCount: 45,
      status: "Available",
      location: { block: "Block B", floor: "2nd Floor", room: "Room 204" },
      freeTill: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      signatureAvailable: true,
    },
    {
      id: "t2",
      name: "Prof. Rahul Singh",
      email: "rahul.singh@college.edu",
      role: "teacher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul",
      hasCompletedOnboarding: true,
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Machine Learning", "Artificial Intelligence", "Python"],
      rating: 4.5,
      sentimentScore: 85,
      reviewCount: 30,
      status: "In Class",
      location: { block: "Block A", floor: "1st Floor", room: "Room 101" },
      signatureAvailable: false,
    },
    {
      id: "t3",
      name: "Dr. Anita Roy",
      email: "anita.roy@college.edu",
      role: "teacher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Anita",
      hasCompletedOnboarding: true,
      department: "Mathematics",
      designation: "Professor",
      subjects: ["Discrete Mathematics", "Calculus", "Linear Algebra"],
      rating: 4.9,
      sentimentScore: 98,
      reviewCount: 60,
      status: "Busy",
      location: { block: "Block C", floor: "Ground Floor", room: "Staff Room 3" },
      signatureAvailable: true,
    },
    {
      id: "t4",
      name: "Dr. Vikram Singh",
      email: "vikram.singh@college.edu",
      role: "teacher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Vikram",
      hasCompletedOnboarding: true,
      department: "Physics",
      designation: "Associate Professor",
      subjects: ["Quantum Mechanics", "Electromagnetism"],
      rating: 4.7,
      sentimentScore: 89,
      reviewCount: 22,
      status: "Available",
      location: { block: "Block D", floor: "1st Floor", room: "Lab 4" },
      signatureAvailable: true,
    },
    {
      id: "t5",
      name: "Prof. Sarah Lee",
      email: "sarah.lee@college.edu",
      role: "teacher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      hasCompletedOnboarding: true,
      department: "Computer Science",
      designation: "Assistant Professor",
      subjects: ["Web Development", "React", "Node.js"],
      rating: 4.6,
      sentimentScore: 90,
      reviewCount: 35,
      status: "Busy",
      location: { block: "Block B", floor: "3rd Floor", room: "Room 305" },
      signatureAvailable: false,
    },
    {
      id: "t6",
      name: "Dr. Amit Patel",
      email: "amit.patel@college.edu",
      role: "teacher",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Amit",
      hasCompletedOnboarding: true,
      department: "Electrical Engineering",
      designation: "Professor",
      subjects: ["Circuit Theory", "Digital Electronics"],
      rating: 4.4,
      sentimentScore: 82,
      reviewCount: 18,
      status: "In Class",
      location: { block: "Block C", floor: "2nd Floor", room: "Room 210" },
      signatureAvailable: false,
    }
  ] as Teacher[],
  slots: [
    {
      id: "sl1",
      teacherId: "t1",
      startTime: new Date(Date.now() + 1 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 1.5 * 60 * 60 * 1000).toISOString(),
      topic: "DBMS Normalization Doubts",
      type: "Group",
      examMode: false,
      status: "Open"
    },
    {
      id: "sl2",
      teacherId: "t2",
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
      topic: "Neural Networks Intro",
      type: "1-on-1",
      examMode: true,
      status: "Open"
    },
    {
      id: "sl3",
      teacherId: "t4",
      startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
      topic: "Quantum Physics Q&A",
      type: "Group",
      examMode: true,
      status: "Open"
    },
    {
      id: "sl4",
      teacherId: "t5",
      startTime: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
      topic: "React Hooks Deep Dive",
      type: "1-on-1",
      examMode: false,
      status: "Booked",
      bookedById: "s1"
    },
    {
      id: "sl5",
      teacherId: "t1",
      startTime: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
      topic: "SQL Joins and Queries",
      type: "Group",
      examMode: false,
      status: "Open"
    }
  ] as Slot[],
  requests: [] as NeedStudentRequest[],
  reviews: [] as Review[],
  doubts: [] as Doubt[]
};

// --- API Endpoints ---

// Auth Endpoints
app.post("/api/login", (req, res) => {
  const { email } = req.body;
  const user = [...db.students, ...db.teachers].find(u => u.email === email);
  if (user) {
    res.json(user);
  } else {
    // For prototype, if email not found, mock a successful login as student 1 to avoid blockers
    const mockUser = db.students[0];
    res.json(mockUser);
  }
});

app.post("/api/signup", (req, res) => {
  const { role, name, email, department, year, designation, subjects } = req.body;
  const isStudent = role === 'student';
  
  const newUser = isStudent ? {
    id: `s_\${Date.now()}`,
    name,
    email,
    role: 'student',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=\${name}`,
    hasCompletedOnboarding: false,
    reputationScore: 100,
    department,
    year: parseInt(year) || 1,
  } as Student : {
    id: `t_\${Date.now()}`,
    name,
    email,
    role: 'teacher',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=\${name}`,
    hasCompletedOnboarding: false,
    department,
    designation,
    subjects: subjects ? subjects.split(',').map((s: string) => s.trim()) : [],
    rating: 5.0,
    sentimentScore: 100,
    reviewCount: 0,
    status: 'Offline',
    location: null,
    signatureAvailable: false
  } as Teacher;

  if (isStudent) {
    db.students.push(newUser as Student);
  } else {
    db.teachers.push(newUser as Teacher);
  }
  
  res.json(newUser);
});

app.post("/api/users/:id/onboard", (req, res) => {
  const id = req.params.id;
  let user = [...db.students, ...db.teachers].find(u => u.id === id);
  if (user) {
    user.hasCompletedOnboarding = true;
    res.json(user);
  } else {
    res.status(404).json({ error: "Not found" });
  }
});

// Get all teachers
app.get("/api/teachers", (req, res) => {
  res.json(db.teachers);
});

// Get a single teacher
app.get("/api/teachers/:id", (req, res) => {
  const teacher = db.teachers.find(t => t.id === req.params.id);
  if (teacher) res.json(teacher);
  else res.status(404).json({ error: "Not found" });
});

// Update teacher status (Check-in)
app.post("/api/teachers/:id/checkin", (req, res) => {
  const { location, status, signatureAvailable } = req.body;
  const index = db.teachers.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    db.teachers[index] = { ...db.teachers[index], location, status, signatureAvailable };
    res.json(db.teachers[index]);
  } else {
    res.status(404).json({ error: "Teacher not found" });
  }
});

// Update teacher status ONLY
app.patch("/api/teachers/:id/status", (req, res) => {
  const { status } = req.body;
  const index = db.teachers.findIndex(t => t.id === req.params.id);
  if (index !== -1) {
    db.teachers[index].status = status;
    res.json(db.teachers[index]);
  } else {
    res.status(404).json({ error: "Teacher not found" });
  }
});

// AI Teacher Recommendation based on query
app.post("/api/recommend", async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  // Very basic non-AI fallback
  let recommendedTeacherId = db.teachers[0].id; 
  let explanation = "Based on their overall high rating and general availability.";

  if (ai) {
    try {
      const prompt = `
      You are an AI assistant for a college platform. 
      A student has asked: "${query}"
      
      Here is the list of available teachers in JSON format:
      ${JSON.stringify(db.teachers, null, 2)}
      
      Analyze the student's query and match it with the best teacher based on their 'subjects', 'rating', 'sentimentScore', and 'status'.
      Return a JSON object with exactly two keys:
      {
        "teacherId": "the_id_of_the_best_teacher",
        "explanation": "A short, 1-sentence friendly explanation of why this teacher is recommended for the student."
      }
      Do not include markdown blocks, just the JSON string.
      `;
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      
      const text = response.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        recommendedTeacherId = result.teacherId;
        explanation = result.explanation;
      }
    } catch (e) {
      console.error("AI matching failed, using fallback.", e);
    }
  }
  
  const teacher = db.teachers.find(t => t.id === recommendedTeacherId) || db.teachers[0];
  res.json({ teacher, explanation });
});


// Get slots
app.get("/api/slots", (req, res) => {
  const { teacherId } = req.query;
  let slots = db.slots;
  if (teacherId) {
    slots = slots.filter(s => s.teacherId === teacherId);
  }
  res.json(slots);
});

app.post("/api/slots", (req, res) => {
  const { teacherId, startTime, endTime, topic, type, examMode } = req.body;
  const newSlot: Slot = {
    id: `sl_\${Date.now()}`,
    teacherId,
    startTime,
    endTime,
    topic,
    type,
    examMode,
    status: 'Open'
  };
  db.slots.push(newSlot);
  res.json(newSlot);
});

// Book a slot
app.post("/api/slots/:id/book", (req, res) => {
  const { studentId } = req.body;
  const index = db.slots.findIndex(s => s.id === req.params.id);
  if (index !== -1 && db.slots[index].status === "Open") {
    db.slots[index] = { ...db.slots[index], status: "Booked", bookedById: studentId };
    res.json(db.slots[index]);
  } else {
    res.status(400).json({ error: "Slot not available" });
  }
});

// Submit a review and run sentiment analysis
app.get("/api/reviews", (req, res) => {
  const teacherId = req.query.teacherId as string;
  if (teacherId) {
    res.json(db.reviews.filter(r => r.teacherId === teacherId));
  } else {
    res.json(db.reviews);
  }
});

app.post("/api/reviews", async (req, res) => {
  const { teacherId, studentId, rating, comment } = req.body;
  
  let sentiment: 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
  
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze the sentiment of this student review for a teacher: "${comment}". Return exactly one word: Positive, Neutral, or Negative.`
      });
      const result = (response.text || "Neutral").trim();
      if (["Positive", "Neutral", "Negative"].includes(result)) {
        sentiment = result as any;
      }
    } catch(e) {
      console.error("Sentiment analysis failed", e);
    }
  }

  const review: Review = {
    id: `rev_${Date.now()}`,
    teacherId,
    studentId,
    rating,
    comment,
    sentiment,
    createdAt: new Date().toISOString()
  };
  
  db.reviews.push(review);
  
  // Update teacher stats
  const teacher = db.teachers.find(t => t.id === teacherId);
  if (teacher) {
    teacher.reviewCount += 1;
    teacher.rating = Number(((teacher.rating * (teacher.reviewCount - 1) + rating) / teacher.reviewCount).toFixed(1));
    // Simple sentiment score update
    const sentimentValue = sentiment === 'Positive' ? 100 : sentiment === 'Negative' ? 0 : 50;
    teacher.sentimentScore = Math.round((teacher.sentimentScore * (teacher.reviewCount - 1) + sentimentValue) / teacher.reviewCount);
  }

  res.json(review);
});

// Get heatmap data
app.get("/api/map", (req, res) => {
  // Aggregate teachers by block
  const blockCounts: Record<string, number> = {};
  db.teachers.forEach(t => {
    if (t.location && t.location.block) {
      blockCounts[t.location.block] = (blockCounts[t.location.block] || 0) + 1;
    }
  });
  res.json(blockCounts);
});


// --- Vite Middleware setup for full-stack ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
