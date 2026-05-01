export type Role = "student" | "teacher";

/** School parallels we model in OilanAI demo (5-11). */
export type Grade = 5 | 6 | 7 | 8 | 9 | 10 | 11;
/** Academic quarters in the Kazakhstani / post-Soviet school system. */
export type Quarter = 1 | 2 | 3 | 4;

export const ALL_GRADES: Grade[] = [5, 6, 7, 8, 9, 10, 11];
export const ALL_QUARTERS: Quarter[] = [1, 2, 3, 4];

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  password: string;
  avatar: string;
  /** Only for students — id of the SchoolClass they belong to. */
  classId?: string;
  /** Only for teachers — class ids they are homeroom teacher for. */
  homeroomClassIds?: string[];
}

/** A school class like 7Б, 5А, 11В — bound to one parallel (grade). */
export interface SchoolClass {
  id: string;
  /** Display name like "7Б". */
  name: string;
  grade: Grade;
  /** Class letter — "А" | "Б" | "В" | … */
  letter: string;
  /** Homeroom teacher id (классный руководитель). */
  homeroomTeacherId: string;
  /** Students in this class. */
  studentIds: string[];
  /** Accent color for class badge / UI tint. */
  accent: string;
  /** Decorative emoji. */
  emoji: string;
  /** Short tagline shown in the teacher dashboard. */
  motto?: string;
}

/** Whether the scenario is fully authored or awaiting content. */
export type TopicContentStatus = "ready" | "in_development";

/**
 * A topic — the new "atomic learning unit", bound to a (subject, grade, quarter).
 * Replaces the old flat per-subject `Lesson`.
 *
 * Stable string id, e.g. "math.g7.q2.linear-equations", is used as:
 *   - URL parameter,
 *   - chatStorage key,
 *   - progress key (completedTopics).
 */
export interface Topic {
  id: string;
  subjectId: string;
  grade: Grade;
  quarter: Quarter;
  title: string;
  description: string;
  icon: string;
  /** Order inside (subject, grade, quarter) — 1-based. */
  order: number;
  /** Human-readable slug segment (without subject/grade/quarter prefix). */
  lessonSlug: string;
  /** Гос / НИШ / др. — что показываем ученику и передаём в промпт. */
  programBasis: string;
  /** Крупный модуль типовой программы: алгебра, геометрия… */
  curriculumModule?: string;
  /** Ожидаемый результат: что ученик должен уметь после темы. */
  learningGoal: string;
  /** Что освежить до разговора с наставником. */
  prerequisites: string;
  /** Пример начала барьера «Я знаю, что…». */
  barrierHintExample: string;
  contentStatus: TopicContentStatus;
}

export interface Subject {
  id: string;
  name: string;
  shortName: string;
  icon: string;
  accent: string;
  gradient: string;
  description: string;
}

export interface SubjectProgress {
  /** Stable topic ids the student has completed in this subject. */
  completedTopics: string[];
  xp: number;
}

export interface UserProgressMap {
  [subjectId: string]: SubjectProgress;
}

export interface StudentProgress {
  userId: string;
  name: string;
  avatar: string;
  /** Class id — used by the teacher dashboard to filter / group. */
  classId: string;
  xp: number;
  level: number;
  /** Pre-seeded completed topic ids (across all subjects). */
  completedTopics: string[];
  weakTopics: string[];
  lastActive: string;
  promptQuality: number;
  thinkingIndependence: number;
}

export interface PromptQualityScore {
  /** 1-5 — how concrete and well-formed the question is. */
  clarity: number;
  /** 1-5 — depth of thinking ("why/how" vs "give me the answer"). */
  depth: number;
  /** Short Russian hint (≤ ~100 chars) on how to improve the prompt. */
  hint: string;
  /** Where the score came from. */
  source: "gemini-proxy" | "gemini-direct" | "local" | "offline";
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

/** Pretty Russian label for a quarter ("1 четверть" etc.). */
export function quarterLabel(q: Quarter): string {
  return `${q} четверть`;
}

/** Pretty Russian label for a grade ("7 класс"). */
export function gradeLabel(g: Grade): string {
  return `${g} класс`;
}
