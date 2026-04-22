import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { MOCK_LESSONS } from "../data/mockLessons";
import { MOCK_PROGRESS } from "../data/mockProgress";

export function StudentPage() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const progress = useMemo(
    () => MOCK_PROGRESS.find((p) => p.userId === currentUser?.id),
    [currentUser]
  );

  const completedIds = new Set(progress?.completedLessons ?? []);
  const currentLevel = progress?.level ?? 1;

  const xpForNext = currentLevel * 150;
  const currentXp = progress?.xp ?? 0;
  const xpInLevel = currentXp % xpForNext;
  const xpPercent = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  const openLesson = (id: number) => {
    navigate(`/student/chat?lesson=${id}`);
  };

  return (
    <div className="student-page">
      <section className="student-hero">
        <motion.div
          className="student-hero__card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="student-hero__greeting">
            <span className="student-hero__avatar">{currentUser?.avatar}</span>
            <div>
              <div className="student-hero__hello">
                Привет, {currentUser?.name.split(" ")[0]}!
              </div>
              <div className="student-hero__sub">
                Готов подумать самостоятельно сегодня?
              </div>
            </div>
          </div>

          <div className="student-hero__stats">
            <div className="stat">
              <div className="stat__value">
                {progress?.level ?? 1}
                <span className="stat__suffix">ур.</span>
              </div>
              <div className="stat__label">Уровень</div>
            </div>
            <div className="stat">
              <div className="stat__value">{progress?.xp ?? 0}</div>
              <div className="stat__label">XP</div>
            </div>
            <div className="stat">
              <div className="stat__value">
                {progress?.promptQuality ?? 0}
                <span className="stat__suffix">%</span>
              </div>
              <div className="stat__label">Качество промптов</div>
            </div>
            <div className="stat">
              <div className="stat__value stat__value--accent">
                {progress?.thinkingIndependence ?? 0}
                <span className="stat__suffix">%</span>
              </div>
              <div className="stat__label">Самостоятельность</div>
            </div>
          </div>

          <div className="student-hero__xp">
            <div className="student-hero__xp-head">
              <span>Прогресс до следующего уровня</span>
              <span>
                {xpInLevel} / {xpForNext} XP
              </span>
            </div>
            <div className="xp-bar">
              <motion.div
                className="xp-bar__fill"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="quest-map">
        <div className="quest-map__header">
          <h2>Карта Прогрессивного Квеста</h2>
          <p>15 точек-уровней. Светящиеся — открыты. Закрытые — под туманом.</p>
        </div>

        <div className="quest-map__grid">
          {MOCK_LESSONS.map((lesson, idx) => {
            const done = completedIds.has(lesson.id);
            const unlocked = lesson.id <= currentLevel + 1;
            const active = lesson.id === currentLevel + 1 && !done;

            return (
              <motion.button
                key={lesson.id}
                className={`quest-node ${done ? "done" : ""} ${
                  unlocked ? "unlocked" : "locked"
                } ${active ? "active" : ""}`}
                disabled={!unlocked}
                onClick={() => openLesson(lesson.id)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                whileHover={unlocked ? { y: -4, scale: 1.02 } : {}}
              >
                <div className="quest-node__icon">
                  {unlocked ? lesson.icon : "🔒"}
                </div>
                <div className="quest-node__body">
                  <div className="quest-node__num">Уровень {lesson.id}</div>
                  <div className="quest-node__title">{lesson.title}</div>
                  <div className="quest-node__topic">{lesson.topic}</div>
                </div>
                {done && <div className="quest-node__badge">Пройдено</div>}
                {active && <div className="quest-node__pulse" />}
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
