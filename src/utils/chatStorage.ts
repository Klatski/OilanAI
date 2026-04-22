import type { AISource } from "./aiClient";
import type { ChatMessage } from "../types";

/**
 * Persistent chat history per user × subject × lesson.
 *
 * Stored in localStorage under keys like:
 *   oilanai_chat_v1_<userId>_<subjectId>_<lessonId>
 *
 * A session keeps the barrier, the whole dialogue, reflection, feedback and
 * XP — so the student can leave any time and continue the Socratic dialogue
 * later, even after the lesson was completed.
 */

export interface ChatSession {
  userId: string;
  subjectId: string;
  lessonId: number;

  /** Student's answer to the "What I already know" barrier. */
  knowledge: string;

  /** Full dialogue (including the initial AI intro and any reflection feedback
   *  that we decide to render as a message). */
  messages: ChatMessage[];

  /** Reflection text (if student finished reflecting). */
  reflection: string;

  /** AI-generated feedback on the reflection (if any). */
  feedback: string;

  /** XP awarded for FIRST completion. Persisted for UI display;
   *  additional XP is NOT given on re-entry. */
  xpGained: number;

  /** True once reflection has been submitted at least once. */
  completed: boolean;

  /** Last known AI source for the sidebar badge. */
  aiSource: AISource | null;

  /** Unix ms of last update. */
  updatedAt: number;
}

const STORAGE_PREFIX = "oilanai_chat_v1_";

function keyFor(userId: string, subjectId: string, lessonId: number): string {
  return `${STORAGE_PREFIX}${userId}_${subjectId}_${lessonId}`;
}

export function loadChatSession(
  userId: string | undefined,
  subjectId: string,
  lessonId: number
): ChatSession | null {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId, subjectId, lessonId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatSession | null;
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveChatSession(session: ChatSession): void {
  if (!session.userId) return;
  try {
    const payload: ChatSession = { ...session, updatedAt: Date.now() };
    localStorage.setItem(
      keyFor(session.userId, session.subjectId, session.lessonId),
      JSON.stringify(payload)
    );
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export function resetChatSession(
  userId: string | undefined,
  subjectId: string,
  lessonId: number
): void {
  if (!userId) return;
  try {
    localStorage.removeItem(keyFor(userId, subjectId, lessonId));
  } catch {
    /* ignore */
  }
}

/** Lightweight probe — has the student started this lesson before? */
export function hasChatSession(
  userId: string | undefined,
  subjectId: string,
  lessonId: number
): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(keyFor(userId, subjectId, lessonId)) !== null;
  } catch {
    return false;
  }
}
