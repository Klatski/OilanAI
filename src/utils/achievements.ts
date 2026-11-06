import type { UserProgressMap } from "../types";
import { listChatSessions, type ChatSession } from "./chatStorage";
import { loadStreak, type StreakState } from "./streakStorage";
import { loadCardGames } from "./activityLog";

/**
 * Achievements & profile stats — computed purely from what the app already
 * stores locally (chat sessions, subject progress, streak, card games).
 *
 * Only the *unlock dates* are persisted separately, under
 *   oilanai_achievements_v1_<userId>  →  { [achievementId]: unixMs }
 * so the profile can say "получено 6 нояб." and the watcher can tell which
 * badges are new (→ toast).
 */

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export interface ActivityStats {
  totalXp: number;
  completedTopics: number;
  completedBySubject: Record<string, number>;
  /** Subjects with at least one completed topic. */
  subjectsCompleted: number;
  sessions: number;
  completedSessions: number;
  userMessages: number;
  /** User messages whose prompt-quality depth ≥ 4. */
  deepQuestions: number;
  /** Completed lessons with ≥ 3 replies and no "just give me the answer". */
  noHintLessons: number;
  /** Completed lessons with independence ≥ 90. */
  honestLessons: number;
  /** Most user messages in a single lesson. */
  longestDialogue: number;
  nightOwl: boolean;
  earlyBird: boolean;
  cardGames: number;
  streak: StreakState;
  /** "YYYY-MM-DD" (local) → number of actions that day. */
  dayCounts: Record<string, number>;
  activeDays: number;
}

/** Same spirit as the local prompt evaluator's "lazy prompt" check. */
const ASKS_FOR_ANSWER =
  /(дай ответ|скажи ответ|какой ответ|реши за меня|реши это|реши мне|просто скажи|подскажи ответ|дай решение|готовый ответ)/i;

export function dayKeyOf(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function collectStats(
  userId: string,
  progress: UserProgressMap
): ActivityStats {
  const sessions: ChatSession[] = listChatSessions(userId);
  const cardGames = loadCardGames(userId);
  const dayCounts: Record<string, number> = {};
  const bump = (ts: number, by = 1) => {
    if (!ts) return;
    const k = dayKeyOf(ts);
    dayCounts[k] = (dayCounts[k] ?? 0) + by;
  };

  let totalXp = 0;
  let completedTopics = 0;
  let subjectsCompleted = 0;
  const completedBySubject: Record<string, number> = {};
  for (const [subjectId, p] of Object.entries(progress)) {
    const n = p?.completedTopics?.length ?? 0;
    totalXp += p?.xp ?? 0;
    completedTopics += n;
    completedBySubject[subjectId] = n;
    if (n > 0) subjectsCompleted++;
  }

  let userMessages = 0;
  let deepQuestions = 0;
  let noHintLessons = 0;
  let honestLessons = 0;
  let longestDialogue = 0;
  let completedSessions = 0;
  let nightOwl = false;
  let earlyBird = false;

  for (const s of sessions) {
    const mine = s.messages.filter((m) => m.role === "user");
    userMessages += mine.length;
    longestDialogue = Math.max(longestDialogue, mine.length);

    for (const m of mine) {
      bump(m.timestamp);
      if ((m.promptQuality?.depth ?? 0) >= 4) deepQuestions++;
      const h = new Date(m.timestamp).getHours();
      if (h >= 23 || h < 5) nightOwl = true;
      if (h >= 5 && h < 8) earlyBird = true;
    }

    if (s.completed) {
      completedSessions++;
      if (mine.length >= 3 && !mine.some((m) => ASKS_FOR_ANSWER.test(m.text))) {
        noHintLessons++;
      }
      if ((s.integrity?.independence ?? 0) >= 90) honestLessons++;
    }
  }

  for (const ts of cardGames) bump(ts, 2);

  return {
    totalXp,
    completedTopics,
    completedBySubject,
    subjectsCompleted,
    sessions: sessions.length,
    completedSessions,
    userMessages,
    deepQuestions,
    noHintLessons,
    honestLessons,
    longestDialogue,
    nightOwl,
    earlyBird,
    cardGames: cardGames.length,
    streak: loadStreak(userId),
    dayCounts,
    activeDays: Object.keys(dayCounts).length,
  };
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

export const XP_PER_LEVEL = 150;

const LEVEL_TITLES = [
  "Новичок",
  "Искатель",
  "Исследователь",
  "Мыслитель",
  "Философ",
  "Мудрец",
  "Архитектор смыслов",
];

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const inLevel = xp % XP_PER_LEVEL;
  return {
    level,
    title: LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((level - 1) / 2))],
    inLevel,
    toNext: XP_PER_LEVEL - inLevel,
    percent: Math.round((inLevel / XP_PER_LEVEL) * 100),
  };
}

// ---------------------------------------------------------------------------
// Achievement catalogue
// ---------------------------------------------------------------------------

export type AchievementTier = "bronze" | "silver" | "gold";

export interface Achievement {
  id: string;
  emoji: string;
  title: string;
  /** How to get it — shown on locked badges too. */
  description: string;
  tier: AchievementTier;
  /** Current / target, used for the progress bar on locked badges. */
  progress: (s: ActivityStats) => [number, number];
}

/** Shorthand for "counter reaches target". */
const count =
  (pick: (s: ActivityStats) => number, target: number) =>
  (s: ActivityStats): [number, number] =>
    [Math.min(pick(s), target), target];
const flag =
  (pick: (s: ActivityStats) => boolean) =>
  (s: ActivityStats): [number, number] =>
    [pick(s) ? 1 : 0, 1];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-step",
    emoji: "🌱",
    title: "Первый шаг",
    description: "Пройди свою первую тему до конца.",
    tier: "bronze",
    progress: count((s) => s.completedTopics, 1),
  },
  {
    id: "first-reflection",
    emoji: "🪞",
    title: "Первая рефлексия",
    description: "Напиши рефлексию «я понял, что…» и получи итоговый разбор.",
    tier: "bronze",
    progress: count((s) => s.completedSessions, 1),
  },
  {
    id: "deep-question",
    emoji: "🔍",
    title: "Глубокий вопрос",
    description: "Задай наставнику вопрос с глубиной 4+ («почему», «что если»).",
    tier: "bronze",
    progress: count((s) => s.deepQuestions, 1),
  },
  {
    id: "card-player",
    emoji: "🃏",
    title: "Игрок",
    description: "Собери все пары в карточной игре.",
    tier: "bronze",
    progress: count((s) => s.cardGames, 1),
  },
  {
    id: "streak-3",
    emoji: "🔥",
    title: "Огонёк",
    description: "Занимайся 3 дня подряд.",
    tier: "bronze",
    progress: count((s) => s.streak.longest, 3),
  },
  {
    id: "no-hints",
    emoji: "🧗",
    title: "Без подсказок",
    description: "Пройди урок, ни разу не попросив готовый ответ.",
    tier: "silver",
    progress: count((s) => s.noHintLessons, 1),
  },
  {
    id: "honest",
    emoji: "🛡️",
    title: "Честный путь",
    description: "Заверши урок с независимостью мышления 90+.",
    tier: "silver",
    progress: count((s) => s.honestLessons, 1),
  },
  {
    id: "long-talk",
    emoji: "💬",
    title: "Долгий разговор",
    description: "Обменяйся с наставником 15 репликами в одном уроке.",
    tier: "silver",
    progress: count((s) => s.longestDialogue, 15),
  },
  {
    id: "math-5",
    emoji: "📐",
    title: "Пять тем по математике",
    description: "Пройди 5 тем по математике.",
    tier: "silver",
    progress: count((s) => s.completedBySubject.math ?? 0, 5),
  },
  {
    id: "polymath",
    emoji: "🧭",
    title: "Эрудит",
    description: "Пройди хотя бы по одной теме в 3 разных предметах.",
    tier: "silver",
    progress: count((s) => s.subjectsCompleted, 3),
  },
  {
    id: "night-owl",
    emoji: "🦉",
    title: "Ночная сова",
    description: "Позанимайся после 23:00. (Но не забывай спать!)",
    tier: "bronze",
    progress: flag((s) => s.nightOwl),
  },
  {
    id: "early-bird",
    emoji: "🐦",
    title: "Ранняя пташка",
    description: "Позанимайся до 8 утра.",
    tier: "bronze",
    progress: flag((s) => s.earlyBird),
  },
  {
    id: "thinker",
    emoji: "🧠",
    title: "Мыслитель",
    description: "Задай 10 глубоких вопросов.",
    tier: "gold",
    progress: count((s) => s.deepQuestions, 10),
  },
  {
    id: "streak-7",
    emoji: "📅",
    title: "Неделя без пропусков",
    description: "Занимайся 7 дней подряд.",
    tier: "gold",
    progress: count((s) => s.streak.longest, 7),
  },
  {
    id: "xp-1000",
    emoji: "💎",
    title: "Тысячник",
    description: "Набери 1000 XP.",
    tier: "gold",
    progress: count((s) => s.totalXp, 1000),
  },
];

export function isEarned(a: Achievement, s: ActivityStats): boolean {
  const [cur, target] = a.progress(s);
  return cur >= target;
}

// ---------------------------------------------------------------------------
// Unlock dates
// ---------------------------------------------------------------------------

const UNLOCK_PREFIX = "oilanai_achievements_v1_";

export type UnlockMap = Record<string, number>;

export function loadUnlocks(userId: string): UnlockMap | null {
  try {
    const raw = localStorage.getItem(UNLOCK_PREFIX + userId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as UnlockMap) : null;
  } catch {
    return null;
  }
}

function saveUnlocks(userId: string, map: UnlockMap): void {
  try {
    localStorage.setItem(UNLOCK_PREFIX + userId, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/**
 * Record newly earned achievements and return them (for the toast).
 * On the very first sync for a user everything already earned (e.g. demo
 * progress) is recorded silently — no flood of toasts on first launch.
 */
export function syncUnlocks(userId: string, stats: ActivityStats): Achievement[] {
  const stored = loadUnlocks(userId);
  const map: UnlockMap = { ...(stored ?? {}) };
  const fresh: Achievement[] = [];
  const now = Date.now();
  for (const a of ACHIEVEMENTS) {
    if (map[a.id] || !isEarned(a, stats)) continue;
    map[a.id] = now;
    fresh.push(a);
  }
  if (fresh.length || !stored) saveUnlocks(userId, map);
  if (!stored) return [];
  if (fresh.length) {
    window.dispatchEvent(new CustomEvent("oilanai:achievements-changed"));
  }
  return fresh;
}
