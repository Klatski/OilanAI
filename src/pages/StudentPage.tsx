import { useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";
import { getSubjectById, SUBJECTS } from "../data/mockSubjects";

export function StudentPage() {
  const { currentUser } = useAuth();
  const { getSubjectProgress } = useProgress();
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);

  if (!subject) {
    return <Navigate to="/student" replace />;
  }

  const progress = getSubjectProgress(currentUser?.id, subject.id);
  const completedIds = new Set(progress.completedLessons);

  const currentLevel = progress.completedLessons.length;
  const totalLessons = subject.lessons.length;

  const xpForNext = 150;
  const xpInLevel = progress.xp % xpForNext;
  const xpPercent = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  const openLesson = (lessonId: number) => {
    navigate(`/student/chat?subject=${subject.id}&lesson=${lessonId}`);
  };

  return (
    <div className="student-page">
      <div className="subject-breadcrumb">
        <Link to="/student" className="subject-breadcrumb__back">
          ← Все предметы
        </Link>
        <div className="subject-breadcrumb__tabs">
          {SUBJECTS.map((s) => (
            <Link
              key={s.id}
              to={`/student/subject/${s.id}`}
              className={`subject-breadcrumb__tab ${
                s.id === subject.id ? "active" : ""
              }`}
              style={
                s.id === subject.id
                  ? ({ "--subject-accent": s.accent } as React.CSSProperties)
                  : undefined
              }
            >
              <span>{s.icon}</span>
              <span className="subject-breadcrumb__tab-name">
                {s.shortName}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <section className="student-hero">
        <motion.div
          className="student-hero__card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="student-hero__greeting">
            <span
              className="student-hero__avatar"
              style={{ background: subject.gradient }}
            >
              {subject.icon}
            </span>
            <div>
              <div className="student-hero__hello">{subject.name}</div>
              <div className="student-hero__sub">{subject.description}</div>
            </div>
          </div>

          <div className="student-hero__stats">
            <div className="stat">
              <div className="stat__value">
                {currentLevel}
                <span className="stat__suffix">/ {totalLessons}</span>
              </div>
              <div className="stat__label">Уроков пройдено</div>
            </div>
            <div className="stat">
              <div className="stat__value">{progress.xp}</div>
              <div className="stat__label">XP по предмету</div>
            </div>
            <div className="stat">
              <div className="stat__value stat__value--accent">
                {Math.round((currentLevel / totalLessons) * 100)}
                <span className="stat__suffix">%</span>
              </div>
              <div className="stat__label">Прогресс</div>
            </div>
          </div>

          <div className="student-hero__xp">
            <div className="student-hero__xp-head">
              <span>Прогресс до следующего уровня XP</span>
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
                style={{ background: subject.gradient }}
              />
            </div>
          </div>
        </motion.div>
      </section>

      <section className="quest-map">
        <div className="quest-map__header">
          <h2>Карта квеста — {subject.name}</h2>
          <p>
            {totalLessons} точек-уровней. Открытые уровни светятся. Следующие
            разблокируются после прохождения текущего.
          </p>
        </div>

        <div className="quest-map__grid">
          {subject.lessons.map((lesson, idx) => {
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
                style={
                  { "--subject-accent": subject.accent } as React.CSSProperties
                }
              >
                <div
                  className="quest-node__icon"
                  style={
                    done || active
                      ? { background: subject.gradient }
                      : undefined
                  }
                >
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
