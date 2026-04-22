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
import type { SubjectProgress, UserProgressMap } from "../types";

/**
 * Per-user per-subject progress, persisted in localStorage.
 * Seeded from MOCK_PROGRESS for the `math` subject the first time a user logs in.
 */

interface ProgressStore {
  [userId: string]: UserProgressMap;
}

const STORAGE_KEY = "subjectProgress_v1";

const EMPTY_SUBJECT_PROGRESS: SubjectProgress = {
  completedLessons: [],
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
    base[s.id] = { ...EMPTY_SUBJECT_PROGRESS, completedLessons: [] };
  });

  const mock = MOCK_PROGRESS.find((m) => m.userId === userId);
  if (mock) {
    base["math"] = {
      completedLessons: [...mock.completedLessons],
      xp: mock.xp,
    };
  }
  return base;
}

interface ProgressContextValue {
  getSubjectProgress: (
    userId: string | undefined,
    subjectId: string
  ) => SubjectProgress;
  getUserProgress: (userId: string | undefined) => UserProgressMap;
  completeLesson: (
    userId: string,
    subjectId: string,
    lessonId: number,
    xpGain?: number
  ) => void;
  resetSubject: (userId: string, subjectId: string) => void;
}

const ProgressContext = createContext<ProgressContextValue | undefined>(
  undefined
);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ProgressStore>(() => loadStore());

  useEffect(() => {
    saveStore(store);
  }, [store]);

  const ensureUser = useCallback(
    (userId: string) => {
      setStore((prev) => {
        if (prev[userId]) return prev;
        return { ...prev, [userId]: seedUser(userId) };
      });
    },
    []
  );

  const getUserProgress = useCallback(
    (userId: string | undefined): UserProgressMap => {
      if (!userId) return {};
      const existing = store[userId];
      if (existing) return existing;
      const seeded = seedUser(userId);
      // schedule async seed so state stays consistent
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

  const completeLesson = useCallback(
    (userId: string, subjectId: string, lessonId: number, xpGain = 60) => {
      if (!userId || !subjectId || !lessonId) return;
      setStore((prev) => {
        const user = prev[userId] ?? seedUser(userId);
        const subj = user[subjectId] ?? { ...EMPTY_SUBJECT_PROGRESS };
        const alreadyDone = subj.completedLessons.includes(lessonId);
        const nextSubj: SubjectProgress = {
          completedLessons: alreadyDone
            ? subj.completedLessons
            : [...subj.completedLessons, lessonId].sort((a, b) => a - b),
          xp: alreadyDone ? subj.xp : subj.xp + xpGain,
        };
        return {
          ...prev,
          [userId]: { ...user, [subjectId]: nextSubj },
        };
      });
    },
    []
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
      completeLesson,
      resetSubject,
    }),
    [getSubjectProgress, getUserProgress, completeLesson, resetSubject]
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
