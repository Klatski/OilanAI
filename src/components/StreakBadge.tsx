import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  isActiveToday,
  isStreakAlive,
  loadStreak,
  type StreakState,
} from "../utils/streakStorage";

/**
 * Flame badge with the current streak count.
 *
 *   • Hot (orange glow)   — user did a qualifying action TODAY
 *   • Warm (no glow)      — last action was yesterday, streak alive but not active today
 *   • Cold (grey)         — gap > 1 day (streak effectively broken; shown until next touch)
 *
 * Listens to the `oilanai:streak-changed` custom event so lesson completion
 * (or card game completion) instantly refreshes the badge.
 */
export function StreakBadge() {
  const { currentUser } = useAuth();
  const [state, setState] = useState<StreakState>(() =>
    loadStreak(currentUser?.id)
  );

  useEffect(() => {
    setState(loadStreak(currentUser?.id));
  }, [currentUser?.id]);

  useEffect(() => {
    const refresh = () => setState(loadStreak(currentUser?.id));
    window.addEventListener("oilanai:streak-changed", refresh);
    // Also refresh when the user comes back to the tab (they might have
    // completed something in another tab).
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("oilanai:streak-changed", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [currentUser?.id]);

  if (!currentUser) return null;
  if (state.current === 0) {
    return (
      <div
        className="streak-badge streak-badge--empty"
        title="Заверши первый урок или сыграй в карточки, чтобы зажечь огонёк!"
      >
        <span className="streak-badge__flame">🔥</span>
        <span className="streak-badge__days">0</span>
      </div>
    );
  }

  const today = isActiveToday(state);
  const alive = isStreakAlive(state);
  const variant = today ? "hot" : alive ? "warm" : "cold";

  const title = today
    ? `Ты сегодня уже учился — серия ${state.current} ${plural(state.current)} подряд!`
    : alive
    ? `Твоя серия: ${state.current} ${plural(state.current)}. Сделай что-нибудь сегодня, чтобы не потерять её!`
    : `Серия прервана. В последний раз — ${state.current} ${plural(state.current)}. Вернись в любой урок, чтобы начать новую!`;

  return (
    <div
      className={`streak-badge streak-badge--${variant}`}
      title={title}
      aria-label={title}
    >
      <span className="streak-badge__flame">🔥</span>
      <span className="streak-badge__days">{state.current}</span>
    </div>
  );
}

function plural(n: number): string {
  // Russian days: 1 день, 2-4 дня, 5-20 дней, 21 день...
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "день";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "дня";
  return "дней";
}
