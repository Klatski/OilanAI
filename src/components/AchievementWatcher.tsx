import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { syncUnlocks, type Achievement } from "../utils/achievements";
import { useActivityStats } from "../utils/useActivityStats";

const TOAST_MS = 5000;
const SPARKS = ["✨", "⭐", "🎉", "✨", "💫", "⭐", "🎊", "✨"];

/**
 * Invisible app-wide watcher (students only): whenever activity stats change
 * it records newly earned achievements and pops a celebratory toast for each,
 * one at a time. Clicking the toast opens the profile.
 */
export function AchievementWatcher() {
  const { currentUser } = useAuth();
  const userId = currentUser?.role === "student" ? currentUser.id : undefined;
  const stats = useActivityStats(userId);
  const [queue, setQueue] = useState<Achievement[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (!userId || !stats) return;
    const fresh = syncUnlocks(userId, stats);
    if (fresh.length) setQueue((q) => [...q, ...fresh]);
  }, [userId, stats]);

  // Different account → drop the previous user's pending toasts.
  useEffect(() => setQueue([]), [userId]);

  const current = queue[0];

  useEffect(() => {
    if (!current) return;
    const t = window.setTimeout(() => setQueue((q) => q.slice(1)), TOAST_MS);
    return () => window.clearTimeout(t);
  }, [current]);

  return (
    <AnimatePresence>
      {current && (
        <motion.button
          key={current.id}
          type="button"
          className={`ach-toast ach-toast--${current.tier}`}
          initial={{ opacity: 0, y: 40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
          onClick={() => {
            setQueue((q) => q.slice(1));
            navigate("/student/profile");
          }}
          aria-live="polite"
        >
          <span className="ach-toast__sparks" aria-hidden>
            {SPARKS.map((s, i) => (
              <motion.span
                key={i}
                className="ach-toast__spark"
                initial={{ opacity: 1, x: 0, y: 0, scale: 0.6 }}
                animate={{
                  opacity: 0,
                  x: Math.cos((i / SPARKS.length) * Math.PI * 2) * 70,
                  y: Math.sin((i / SPARKS.length) * Math.PI * 2) * 50 - 20,
                  scale: 1.2,
                }}
                transition={{ duration: 1.1, ease: "easeOut", delay: 0.15 }}
              >
                {s}
              </motion.span>
            ))}
          </span>
          <motion.span
            className="ach-toast__emoji"
            initial={{ rotate: -25, scale: 0.4 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.1 }}
          >
            {current.emoji}
          </motion.span>
          <span className="ach-toast__text">
            <span className="ach-toast__label">Новое достижение</span>
            <span className="ach-toast__title">{current.title}</span>
            <span className="ach-toast__desc">{current.description}</span>
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
