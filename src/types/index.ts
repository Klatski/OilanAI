export type Role = "student" | "teacher";

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  password: string;
  avatar: string;
}

export interface StudentProgress {
  userId: string;
  name: string;
  avatar: string;
  xp: number;
  level: number;
  completedLessons: number[];
  weakTopics: string[];
  lastActive: string;
  promptQuality: number;
  thinkingIndependence: number;
}

export interface Lesson {
  id: number;
  title: string;
  topic: string;
  description: string;
  icon: string;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  gradient: string;
  description: string;
  lessons: Lesson[];
}

export interface SubjectProgress {
  completedLessons: number[];
  xp: number;
}

export interface UserProgressMap {
  [subjectId: string]: SubjectProgress;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  text: string;
  timestamp: number;
  /** Optional visual marker. "reflection-feedback" renders with a highlighted
   *  "итоговый фидбэк" border so saved sessions can show it distinctly. */
  kind?: "intro" | "reflection-feedback";
}
