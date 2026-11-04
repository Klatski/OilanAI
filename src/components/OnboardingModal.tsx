import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * First-run explainer for the unusual core mechanic: Barrier → Socratic
 * dialogue → Reflection. OilanAI's whole point ("ИИ не даёт готовых ответов")
 * is non-obvious, so we spell it out once.
 *
 * - Shows automatically on the first visit (flag in localStorage).
 * - Can be re-opened any time via the `oilanai:open-onboarding` window event
 *   (there's a "Как это работает?" link on the subject picker).
 */
const SEEN_KEY = "oilanai:onboarding-seen:v1";

const STEPS = [
  {
    icon: "🧱",
    title: "Барьер знаний",
    text: "Сначала запиши своими словами, что ты уже знаешь по теме. ИИ стартует от твоих мыслей, а не с чистого листа.",
  },
  {
    icon: "💬",
    title: "Сократовский диалог",
    text: "Дух Знаний не выдаёт готовых ответов — он ведёт тебя наводящими вопросами, чтобы ты дошёл до сути сам.",
  },
  {
    icon: "✨",
    title: "Рефлексия",
    text: "В конце ты формулируешь, что понял. Экран «до → после» покажет, как выросло твоё понимание.",
  },
];

export function OnboardingModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* localStorage may be unavailable — just skip auto-open */
    }
    const reopen = () => setOpen(true);
    window.addEventListener("oilanai:open-onboarding", reopen);
    return () =>
      window.removeEventListener("oilanai:open-onboarding", reopen);
  }, []);

  const close = () => {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="onboarding"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="onboarding__card"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Как работает OilanAI"
          >
            <div className="onboarding__orb" />
            <h2 className="onboarding__title">
              Как работает <span className="accent">OilanAI</span>
            </h2>
            <p className="onboarding__lead">
              Это не «спроси у ИИ и спиши». Здесь ты учишься{" "}
              <b>думать вместе с ИИ</b> за три шага:
            </p>

            <div className="onboarding__steps">
              {STEPS.map((s, i) => (
                <div className="onboarding__step" key={s.title}>
                  <div className="onboarding__step-icon">{s.icon}</div>
                  <div className="onboarding__step-body">
                    <div className="onboarding__step-title">
                      <span className="onboarding__step-num">{i + 1}</span>
                      {s.title}
                    </div>
                    <div className="onboarding__step-text">{s.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn--primary btn--full" onClick={close}>
              Понятно, поехали →
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
