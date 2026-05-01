import type { AISource } from "./aiClient";
import type { ChatMessage } from "../types";

/**
 * Persistent chat history per user × topic.
 *
 * Stored in localStorage under keys like:
 *   oilanai_chat_v2_<userId>_<topicId>
 *
 * v2 schema (post school-structure refactor):
 *   - keyed by topicId (string) instead of subjectId+lessonId(number).
 *
 * A session keeps the barrier, the whole dialogue, reflection, feedback and
 * XP — so the student can leave any time and continue the Socratic dialogue
 * later, even after the topic was completed.
 */

export interface ChatSession {
  userId: string;
  topicId: string;

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

const STORAGE_PREFIX = "oilanai_chat_v2_";

function keyFor(userId: string, topicId: string): string {
  return `${STORAGE_PREFIX}${userId}_${topicId}`;
}

export function loadChatSession(
  userId: string | undefined,
  topicId: string
): ChatSession | null {
  if (!userId || !topicId) return null;
  try {
    const raw = localStorage.getItem(keyFor(userId, topicId));
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
  if (!session.userId || !session.topicId) return;
  try {
    const payload: ChatSession = { ...session, updatedAt: Date.now() };
    localStorage.setItem(
      keyFor(session.userId, session.topicId),
      JSON.stringify(payload)
    );
  } catch {
    /* quota / private mode — silently ignore */
  }
}

export function resetChatSession(
  userId: string | undefined,
  topicId: string
): void {
  if (!userId || !topicId) return;
  try {
    localStorage.removeItem(keyFor(userId, topicId));
  } catch {
    /* ignore */
  }
}

/** Lightweight probe — has the student started this topic before? */
export function hasChatSession(
  userId: string | undefined,
  topicId: string
): boolean {
  if (!userId || !topicId) return false;
  try {
    return localStorage.getItem(keyFor(userId, topicId)) !== null;
  } catch {
    return false;
  }
}
