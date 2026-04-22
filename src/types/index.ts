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

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  text: string;
  timestamp: number;
}
