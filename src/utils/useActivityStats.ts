import { useEffect, useMemo, useState } from "react";
import { useProgress } from "../context/ProgressContext";
import { collectStats, type ActivityStats } from "./achievements";

/** Events after which stats may have changed. */
const EVENTS = [
  "oilanai:streak-changed",
  "oilanai:chat-saved",
  "oilanai:achievements-changed",
];

/**
 * Live ActivityStats for a user. Recomputes when subject progress changes or
 * when chat / streak / card-game activity is reported (debounced — chat
 * sessions are saved on every message).
 */
export function useActivityStats(userId: string | undefined): ActivityStats | null {
  const { getUserProgress } = useProgress();
  const progress = useMemo(() => getUserProgress(userId), [getUserProgress, userId]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let timer: number | undefined;
    const bump = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setTick((t) => t + 1), 600);
    };
    EVENTS.forEach((e) => window.addEventListener(e, bump));
    document.addEventListener("visibilitychange", bump);
    return () => {
      window.clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, bump));
      document.removeEventListener("visibilitychange", bump);
    };
  }, []);

  return useMemo(
    () => (userId ? collectStats(userId, progress) : null),
    [userId, progress, tick]
  );
}
