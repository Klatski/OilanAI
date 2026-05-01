import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { MOCK_PROGRESS } from "../data/mockProgress";
import { SUBJECTS } from "../data/mockSubjects";
import { getTopicById } from "../data/topics";
import type { SubjectProgress, UserProgressMap } from "../types";

/**
 * Per-user per-subject progress, persisted in localStorage.
 *
 * v2 schema (post school-structure refactor):
 *   - `completedTopics: string[]` — stable topic ids (e.g. "math.g7.q2.t3"
 *       или "math.g7.q2.system-two-linear-equations"),
 *     replacing the old numeric `completedLessons`.
 *
 * Old v1 keys are ignored; demo progress for each user is re-seeded from
 * MOCK_PROGRESS so the dashboard stays believable on first launch.
 */

interface ProgressStore {
  [userId: string]: UserProgressMap;
}

const STORAGE_KEY = "subjectProgress_v2";

const EMPTY_SUBJECT_PROGRESS: SubjectProgress = {
  completedTopics: [],
  xp: 0,
};

function loadStore(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed as ProgressStore;
    return {};
  } catch {
    return {};
  }
}

function saveStore(store: ProgressStore) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota / private mode errors */
  }
}

function seedUser(userId: string): UserProgressMap {
  const base: UserProgressMap = {};
  SUBJECTS.forEach((s) => {
    base[s.id] = { completedTopics: [], xp: 0 };
  });

  const mock = MOCK_PROGRESS.find((m) => m.userId === userId);
  if (mock) {
    // Group seeded topics by their subject so we can reflect xp / completion
    // per-subject just like the live progress does.
    const xpPerCompletion = mock.completedTopics.length
      ? Math.round(mock.xp / mock.completedTopics.length)
      : 0;
    for (const topicId of mock.completedTopics) {
      const t = getTopicById(topicId);
      if (!t) continue;
      const slot = base[t.subjectId] ?? { completedTopics: [], xp: 0 };
      if (!slot.completedTopics.includes(topicId)) {
        slot.completedTopics.push(topicId);
        slot.xp += xpPerCompletion;
      }
      base[t.subjectId] = slot;
    }
  }
  return base;
}

interface ProgressContextValue {
  getSubjectProgress: (
    userId: string | undefined,
    subjectId: string
  ) => SubjectProgress;
  getUserProgress: (userId: string | undefined) => UserProgressMap;
  /**
   * Mark one Topic (by stable id) as completed. The topic id encodes its
   * subject, so callers don't need to pass it separately.
   */
  completeTopic: (
    userId: string,
    topicId: string,
    xpGain?: number
  ) => void;
  resetSubject: (userId: string, subjectId: string) => void;
  /** Has this user completed the given topic? */
  hasCompletedTopic: (
    userId: string | undefined,
    topicId: string
  ) => boolean;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined
);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ProgressStore>(() => loadStore());

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const ensureUser = useCallback((userId: string) => {
    setStore((prev) => {
      if (prev[userId]) return prev;
      return { ...prev, [userId]: seedUser(userId) };
    });
  }, []);

  const getUserProgress = useCallback(
    (userId: string | undefined): UserProgressMap => {
      if (!userId) return {};
      const existing = store[userId];
      if (existing) return existing;
      const seeded = seedUser(userId);
      queueMicrotask(() => ensureUser(userId));
      return seeded;
    },
    [store, ensureUser]
  );

  const getSubjectProgress = useCallback(
    (userId: string | undefined, subjectId: string): SubjectProgress => {
      const user = getUserProgress(userId);
      return user[subjectId] ?? { ...EMPTY_SUBJECT_PROGRESS };
    },
    [getUserProgress]
  );

  const completeTopic = useCallback(
    (userId: string, topicId: string, xpGain = 60) => {
      if (!userId || !topicId) return;
      const topic = getTopicById(topicId);
      if (!topic) return;
      setStore((prev) => {
        const user = prev[userId] ?? seedUser(userId);
        const subj = user[topic.subjectId] ?? { ...EMPTY_SUBJECT_PROGRESS };
        const alreadyDone = subj.completedTopics.includes(topicId);
        const nextSubj: SubjectProgress = {
          completedTopics: alreadyDone
            ? subj.completedTopics
            : [...subj.completedTopics, topicId],
          xp: alreadyDone ? subj.xp : subj.xp + xpGain,
        };
        return {
          ...prev,
          [userId]: { ...user, [topic.subjectId]: nextSubj },
        };
      });
    },
    []
  );

  const hasCompletedTopic = useCallback(
    (userId: string | undefined, topicId: string): boolean => {
      if (!userId || !topicId) return false;
      const topic = getTopicById(topicId);
      if (!topic) return false;
      const user = getUserProgress(userId);
      return user[topic.subjectId]?.completedTopics.includes(topicId) ?? false;
    },
    [getUserProgress]
  );

  const resetSubject = useCallback((userId: string, subjectId: string) => {
    if (!userId || !subjectId) return;
    setStore((prev) => {
      const user = prev[userId] ?? seedUser(userId);
      return {
        ...prev,
        [userId]: {
          ...user,
          [subjectId]: { ...EMPTY_SUBJECT_PROGRESS },
        },
      };
    });
  }, []);

  const value = useMemo<ProgressContextValue>(
    () => ({
      getSubjectProgress,
      getUserProgress,
      completeTopic,
      resetSubject,
      hasCompletedTopic,
    }),
    [
      getSubjectProgress,
      getUserProgress,
      completeTopic,
      resetSubject,
      hasCompletedTopic,
    ]
  );

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress(): ProgressContextValue {
  const ctx = useContext(ProgressContext);
  if (!ctx)
    throw new Error("useProgress must be used inside ProgressProvider");
  return ctx;
}
