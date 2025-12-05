export interface UserProfile {
  name: string;
  college: string;
  age: number | string;
  email: string;
  phone: string;
  targetAttendance: number; // Percentage e.g. 75
}

export interface AttendanceRecord {
  id: string;
  date: string; // ISO string for storage
  status: 'present' | 'absent' | 'cancelled';
}

export interface StudyTopic {
  id: string;
  name: string;
  isCompleted: boolean;
}

export interface StudyLog {
  id: string;
  subjectId: string;
  topicId?: string;
  description: string;
  needsFollowUp: boolean;
  followUpDate?: string; // Added for scheduling revisions
  timestamp: string;
}

export interface ClassSchedule {
  day: string; // e.g. "Monday"
  time: string; // e.g. "10:00 AM - 11:00 AM"
}

export interface Subject {
  id: string;
  name: string;
  totalLectures: number;
  attendedLectures: number;
  schedule: ClassSchedule[]; // Updated from string[] to object array
  history: AttendanceRecord[];
  topics: StudyTopic[]; // Added for study tracker
}

export type AppView = 'ONBOARDING' | 'SUBJECT_SETUP' | 'STUDY_SETUP' | 'DASHBOARD';

export interface ExtractedSubject {
  name: string;
  total?: number;
  attended?: number;
  schedule?: ClassSchedule[];
}

export interface TimetableExtractionResult {
  subjects: ExtractedSubject[];
  scheduleSummary?: string;
}