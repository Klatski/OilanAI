import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SUBJECTS } from "../data/mockSubjects";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";

export function SubjectPickerPage() {
  const { currentUser } = useAuth();
  const { getUserProgress } = useProgress();
  const navigate = useNavigate();

  const progressMap = useMemo(
    () => getUserProgress(currentUser?.id),
    [getUserProgress, currentUser]
  );

  const totals = useMemo(() => {
    let totalXp = 0;
    let totalCompleted = 0;
    let totalLessons = 0;
    SUBJECTS.forEach((s) => {
      const p = progressMap[s.id];
      if (p) {
        totalXp += p.xp;
        totalCompleted += p.completedLessons.length;
      }
      totalLessons += s.lessons.length;
    });
    return { totalXp, totalCompleted, totalLessons };
  }, [progressMap]);

  return (
    <div className="subject-picker">
      <motion.section
        className="subject-picker__hero"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="subject-picker__greeting">
          <span className="student-hero__avatar">
            {currentUser?.avatar ?? "🎓"}
          </span>
          <div>
            <div className="student-hero__hello">
              Привет, {currentUser?.name?.split(" ")[0] ?? "друг"}!
            </div>
            <div className="student-hero__sub">
              Выбери предмет, в который хочешь погрузиться сегодня.
            </div>
          </div>
        </div>

        <div className="subject-picker__totals">
          <div className="stat">
            <div className="stat__value">{totals.totalXp}</div>
            <div className="stat__label">Всего XP</div>
          </div>
          <div className="stat">
            <div className="stat__value stat__value--accent">
              {totals.totalCompleted}
              <span className="stat__suffix">/ {totals.totalLessons}</span>
            </div>
            <div className="stat__label">Уроков пройдено</div>
          </div>
          <div className="stat">
            <div className="stat__value">{SUBJECTS.length}</div>
            <div className="stat__label">Предметов</div>
          </div>
        </div>
      </motion.section>

      <div className="subject-picker__grid">
        {SUBJECTS.map((subject, idx) => {
          const p = progressMap[subject.id] ?? {
            completedLessons: [],
            xp: 0,
          };
          const total = subject.lessons.length;
          const done = p.completedLessons.length;
          const percent = total > 0 ? Math.round((done / total) * 100) : 0;

          return (
            <motion.button
              key={subject.id}
              className="subject-card"
              onClick={() => navigate(`/student/subject/${subject.id}`)}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              whileHover={{ y: -4, scale: 1.01 }}
              style={{ "--subject-accent": subject.accent } as React.CSSProperties}
            >
              <div
                className="subject-card__glow"
                style={{ background: subject.gradient }}
              />

              <div className="subject-card__icon-wrap">
                <div
                  className="subject-card__icon"
                  style={{ background: subject.gradient }}
                >
                  {subject.icon}
                </div>
              </div>

              <div className="subject-card__body">
                <div className="subject-card__name">{subject.name}</div>
                <div className="subject-card__desc">{subject.description}</div>
              </div>

              <div className="subject-card__footer">
                <div className="subject-card__progress-head">
                  <span>
                    {done} / {total} уроков
                  </span>
                  <span className="subject-card__xp">{p.xp} XP</span>
                </div>
                <div className="xp-bar">
                  <motion.div
                    className="xp-bar__fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${percent}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    style={{ background: subject.gradient }}
                  />
                </div>
              </div>

              <div className="subject-card__cta">
                {done === 0 ? "Начать →" : done === total ? "Пройдено ✓" : "Продолжить →"}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
