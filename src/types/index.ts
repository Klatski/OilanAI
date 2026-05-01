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

export interface PromptQualityScore {
  /** 1-5 — how concrete and well-formed the question is. */
  clarity: number;
  /** 1-5 — depth of thinking ("why/how" vs "give me the answer"). */
  depth: number;
  /** Short Russian hint (≤ ~100 chars) on how to improve the prompt. */
  hint: string;
  /** Where the score came from. */
  source: "gemini-proxy" | "gemini-direct" | "local";
}

/** Three-block structured final feedback for the reflection stage. */
export interface ReflectionFeedbackBlocks {
  /** "Что ты понял сам" — validation of correct ideas in the dialogue. */
  validation: string;
  /** "Что нужно знать" — formulas, axioms, theorems, names that aren't derivable. */
  mustKnow: string;
  /** "Где ты застрял" — sticky points + clean explanations. */
  struggles: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "ai" | "system";
  text: string;
  timestamp: number;
  /** Optional visual marker. "reflection-feedback" renders with a highlighted
   *  "итоговый фидбэк" border so saved sessions can show it distinctly. */
  kind?: "intro" | "reflection-feedback";
  /** Real-time prompt-quality evaluation attached to user messages. */
  promptQuality?: PromptQualityScore;
  /** When kind === "reflection-feedback", parsed three-block structure. */
  feedbackBlocks?: ReflectionFeedbackBlocks;
}
