import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ALL_QUARTERS, type Quarter } from "../types";

/**
 * "Current quarter" derived from the calendar — Kazakhstani / post-Soviet
 * school calendar:
 *
 *   Q1: September – October        (months 8, 9)
 *   Q2: November – December        (months 10, 11)
 *   Q3: January  – March           (months 0, 1, 2)
 *   Q4: April    – May             (months 3, 4)
 *   summer break (June – August)   → returns Q1 (preparing for the new year)
 *
 * The quarter is NOT user-switchable — the source of truth is real time.
 * `StudentPage` keeps a separate local state for browsing other quarters.
 */

export function getQuarterForDate(d: Date = new Date()): Quarter {
  const m = d.getMonth(); // 0..11
  if (m === 8 || m === 9) return 1;
  if (m === 10 || m === 11) return 2;
  if (m === 0 || m === 1 || m === 2) return 3;
  if (m === 3 || m === 4) return 4;
  // June, July, August → school is on summer break; default to Q1.
  return 1;
}

/** Whether the current calendar date falls inside a school quarter. */
export function isOnSummerBreak(d: Date = new Date()): boolean {
  const m = d.getMonth();
  return m === 5 || m === 6 || m === 7;
}

interface QuarterContextValue {
  /** The "current" academic quarter, computed from today's date. */
  currentQuarter: Quarter;
  /** True if calendar is on summer break (June–August). */
  onSummerBreak: boolean;
  /** Allowed quarters for browsing selectors. */
  allQuarters: Quarter[];
}

const QuarterContext = createContext<QuarterContextValue | undefined>(undefined);

export function QuarterProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState<Date>(() => new Date());

  // Re-evaluate every hour — covers the rare case where a tab stays open
  // across a month/quarter boundary. Cheap and avoids a stale UI label.
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo<QuarterContextValue>(
    () => ({
      currentQuarter: getQuarterForDate(now),
      onSummerBreak: isOnSummerBreak(now),
      allQuarters: ALL_QUARTERS,
    }),
    [now]
  );

  return (
    <QuarterContext.Provider value={value}>{children}</QuarterContext.Provider>
  );
}

export function useQuarter(): QuarterContextValue {
  const ctx = useContext(QuarterContext);
  if (!ctx) throw new Error("useQuarter must be used inside QuarterProvider");
  return ctx;
}
