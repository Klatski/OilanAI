/**
 * Per-user consecutive-days streak tracker.
 *
 * Persisted in localStorage under  oilanai_streak_v1_<userId>.
 *
 * Rules:
 *   - touchStreak(userId) is called whenever the student does a qualifying
 *     action (for now: completing a lesson OR playing a card game).
 *   - First touch ever       → streak = 1
 *   - Same calendar day      → streak unchanged
 *   - Exactly +1 day         → streak += 1
 *   - Gap > 1 day            → streak reset to 1
 */

export interface StreakState {
  /** Current running streak in days. 0 means never touched. */
  current: number;
  /** All-time longest streak. */
  longest: number;
  /** Last day the streak was touched, as "YYYY-MM-DD" (local time). "" if never. */
  lastVisitDate: string;
}

const STORAGE_PREFIX = "oilanai_streak_v1_";

function keyFor(userId: string): string {
  return `${STORAGE_PREFIX}${userId}`;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(fromKey: string, toKey: string): number {
  // Works because both keys are in "YYYY-MM-DD" local format.
  const a = new Date(`${fromKey}T00:00:00`);
  const b = new Date(`${toKey}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const EMPTY: StreakState = { current: 0, longest: 0, lastVisitDate: "" };

export function loadStreak(userId: string | undefined): StreakState {
  if (!userId) return { ...EMPTY };
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<StreakState> | null;
    if (!parsed || typeof parsed !== "object") return { ...EMPTY };
    return {
      current: typeof parsed.current === "number" ? parsed.current : 0,
      longest: typeof parsed.longest === "number" ? parsed.longest : 0,
      lastVisitDate:
        typeof parsed.lastVisitDate === "string" ? parsed.lastVisitDate : "",
    };
  } catch {
    return { ...EMPTY };
  }
}

export function saveStreak(userId: string, state: StreakState): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(state));
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * Register a qualifying action by this user today. Returns the new state.
 */
export function touchStreak(userId: string | undefined): StreakState {
  if (!userId) return { ...EMPTY };
  const today = todayKey();
  const prev = loadStreak(userId);

  if (prev.lastVisitDate === today) {
    // already counted today
    return prev;
  }

  let nextCurrent: number;
  if (!prev.lastVisitDate) {
    nextCurrent = 1;
  } else {
    const gap = dayDiff(prev.lastVisitDate, today);
    if (gap === 1) nextCurrent = prev.current + 1;
    else if (gap <= 0) nextCurrent = Math.max(1, prev.current);
    else nextCurrent = 1;
  }

  const next: StreakState = {
    current: nextCurrent,
    longest: Math.max(prev.longest, nextCurrent),
    lastVisitDate: today,
  };
  saveStreak(userId, next);
  return next;
}

/** True if the user already performed a qualifying action today. */
export function isActiveToday(state: StreakState): boolean {
  return state.lastVisitDate === todayKey();
}

/**
 * "Is the streak still alive?" — true if last visit was today or yesterday.
 * After a 2+ day gap, visually we still show the last number (it will reset
 * to 1 on the next touch).
 */
export function isStreakAlive(state: StreakState): boolean {
  if (!state.lastVisitDate) return false;
  const gap = dayDiff(state.lastVisitDate, todayKey());
  return gap <= 1;
}
