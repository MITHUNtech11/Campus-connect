export type Role = 'student' | 'teacher' | 'alumni';

export interface User {
  id: string;
  name: string;
  email?: string;
  role: Role;
  avatar: string;
  hasCompletedOnboarding?: boolean;
}

export interface Student extends User {
  role: 'student';
  reputationScore: number;
  department: string;
  year: number;
}

export interface Teacher extends User {
  role: 'teacher';
  department: string;
  designation: string;
  subjects: string[];
  rating: number;
  sentimentScore: number; // -1 to 1 or 0-100
  reviewCount: number;
  
  // Real-time status
  status: 'Available' | 'Busy' | 'In Class' | 'Offline';
  location: {
    block: string;
    floor: string;
    room: string;
  } | null;
  freeTill?: string; // ISO datetime
  signatureAvailable: boolean;
}

export interface Slot {
  id: string;
  teacherId: string;
  startTime: string; // ISO datetime
  endTime: string;
  topic: string;
  type: '1-on-1' | 'Group';
  examMode: boolean; // Is this an emergency exam slot?
  bookedById?: string; // Student ID if booked
  status: 'Open' | 'Booked' | 'Completed' | 'Cancelled';
}

export interface NeedStudentRequest {
  id: string;
  teacherId: string;
  title: string;
  description: string;
  type: 'Research' | 'Teaching Assistant' | 'Survey' | 'Event';
  slotsAvailable: number;
  appliedStudentIds: string[];
  createdAt: string;
}

export interface Review {
  id: string;
  teacherId: string;
  studentId: string;
  rating: number;
  comment: string;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  createdAt: string;
}

export interface Doubt {
  id: string;
  studentId: string;
  topic: string;
  content: string;
  upvotes: number;
  answers: Answer[];
  createdAt: string;
}

export interface Answer {
  id: string;
  authorId: string; // Student or Teacher
  content: string;
  upvotes: number;
  isAccepted: boolean;
  createdAt: string;
}
