import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";
import { useQuarter } from "../context/QuarterContext";
import { getSubjectById, SUBJECTS } from "../data/mockSubjects";
import { getClassByStudentId } from "../data/mockClasses";
import {
  countTopicsBySubjectGrade,
  getTopicsBySubjectGradeGroupedByQuarter,
} from "../data/topics";
import {
  ALL_GRADES,
  ALL_QUARTERS,
  type Grade,
  type Quarter,
  type Topic,
} from "../types";

export function StudentPage() {
  const { currentUser } = useAuth();
  const { getSubjectProgress } = useProgress();
  const { currentQuarter } = useQuarter();
  const navigate = useNavigate();
  const { subjectId } = useParams();

  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);
  const studentClass = useMemo(
    () => getClassByStudentId(currentUser?.id),
    [currentUser?.id]
  );
  const ownGrade: Grade | undefined = studentClass?.grade;

  // The student can browse other parallels out of curiosity (free unlock).
  // Default view is their own parallel; the selector lets them peek at
  // 5/7/11 (the only ones with content in the demo) or any other.
  const [browseGrade, setBrowseGrade] = useState<Grade>(
    ownGrade ?? (5 as Grade)
  );

  const [activeQuarter, setActiveQuarter] = useState<Quarter>(
    currentQuarter as Quarter
  );

  if (!subject) {
    return <Navigate to="/student" replace />;
  }

  const progress = getSubjectProgress(currentUser?.id, subject.id);
  const completedIds = new Set(progress.completedTopics);

  const topicsByQuarter = getTopicsBySubjectGradeGroupedByQuarter(
    subject.id,
    browseGrade
  );

  const totalTopicsInGrade = countTopicsBySubjectGrade(subject.id, browseGrade);
  const completedInGrade = Array.from(completedIds).filter((id) =>
    id.startsWith(`${subject.id}.g${browseGrade}.`)
  ).length;

  const currentLevel = completedIds.size; // total per subject across all grades
  const xpForNext = 150;
  const xpInLevel = progress.xp % xpForNext;
  const xpPercent = Math.min(100, Math.round((xpInLevel / xpForNext) * 100));

  const isOwnGrade = browseGrade === ownGrade;
  const isCurrentQuarter = activeQuarter === currentQuarter;

  const openTopic = (topic: Topic) => {
    navigate(`/student/chat?topic=${encodeURIComponent(topic.id)}`);
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
              <div className="student-hero__hello">
                {subject.name}
                {studentClass && (
                  <span
                    className="class-chip"
                    style={{
                      borderColor: `${studentClass.accent}66`,
                      color: studentClass.accent,
                      marginLeft: 12,
                    }}
                  >
                    {studentClass.emoji} {studentClass.name}
                  </span>
                )}
              </div>
              <div className="student-hero__sub">{subject.description}</div>
            </div>
          </div>

          <div className="student-hero__stats">
            <div className="stat">
              <div className="stat__value">
                {completedInGrade}
                <span className="stat__suffix">/ {totalTopicsInGrade}</span>
              </div>
              <div className="stat__label">
                Тем {browseGrade} класса пройдено
              </div>
            </div>
            <div className="stat">
              <div className="stat__value">{progress.xp}</div>
              <div className="stat__label">XP по предмету</div>
            </div>
            <div className="stat">
              <div className="stat__value stat__value--accent">
                {totalTopicsInGrade > 0
                  ? Math.round((completedInGrade / totalTopicsInGrade) * 100)
                  : 0}
                <span className="stat__suffix">%</span>
              </div>
              <div className="stat__label">Прогресс параллели</div>
            </div>
          </div>

          <div className="student-hero__xp">
            <div className="student-hero__xp-head">
              <span>Прогресс до следующего уровня XP</span>
              <span>
                {xpInLevel} / {xpForNext} XP · уровень {currentLevel}
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

          <div className="student-hero__actions">
            <Link
              to={`/student/subject/${subject.id}/game`}
              className="hero-cta"
              style={
                { "--subject-accent": subject.accent } as React.CSSProperties
              }
            >
              <span className="hero-cta__icon">🎴</span>
              <span className="hero-cta__body">
                <span className="hero-cta__title">
                  Мини-игра: карточки-пары
                </span>
                <span className="hero-cta__sub">
                  Без интернета. Соедини термины и определения на время.
                </span>
              </span>
              <span className="hero-cta__arrow">→</span>
            </Link>
          </div>
        </motion.div>
      </section>

      <section className="quest-map">
        <div className="quest-map__header">
          <div className="quest-map__title-row">
            <h2>
              Карта тем — {subject.name}
              {studentClass && (
                <span className="quest-map__class-tag">
                  {studentClass.name}
                </span>
              )}
            </h2>
            <p>
              Темы своего класса и текущей четверти подсвечены — это твоя
              основная программа. Остальные четверти и параллели открыты для
              любопытства, но не обязательны.
            </p>
          </div>

          <div className="quest-map__controls">
            <div className="grade-switch">
              <span className="grade-switch__label">Параллель:</span>
              {ALL_GRADES.map((g) => {
                const has = countTopicsBySubjectGrade(subject.id, g) > 0;
                const isOwn = g === ownGrade;
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setBrowseGrade(g)}
                    disabled={!has}
                    title={
                      !has
                        ? `По этой параллели ${subject.name.toLowerCase()} в демо нет`
                        : isOwn
                        ? "Твой класс"
                        : "Заглянуть из любопытства"
                    }
                    className={`grade-switch__btn ${
                      browseGrade === g ? "active" : ""
                    } ${isOwn ? "own" : ""} ${!has ? "empty" : ""}`}
                  >
                    {g}
                    {isOwn && <span className="grade-switch__star">★</span>}
                  </button>
                );
              })}
            </div>

            <div className="quarter-switch quarter-switch--inline">
              <span className="quarter-switch__label">Четверть:</span>
              {ALL_QUARTERS.map((q) => {
                const isCurrent = q === currentQuarter;
                const isActive = q === activeQuarter;
                const hasTopics = topicsByQuarter[q].length > 0;
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setActiveQuarter(q)}
                    disabled={!hasTopics && false}
                    title={
                      isCurrent ? "Текущая четверть" : "Заглянуть в эту четверть"
                    }
                    className={`quarter-switch__btn ${
                      isActive ? "active" : ""
                    } ${isCurrent ? "current" : ""} ${
                      !hasTopics ? "empty" : ""
                    }`}
                  >
                    {q}
                    {isCurrent && (
                      <span className="quarter-switch__star">●</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {!isOwnGrade && (
            <div className="quest-map__notice">
              ⓘ Ты смотришь темы <b>{browseGrade} класса</b>, а сам
              учишься в <b>{ownGrade ?? "—"} классе</b>. Это нормально —
              можно зайти ради любопытства, но прогресс по этой
              параллели не обязателен.
            </div>
          )}

          {isOwnGrade && !isCurrentQuarter && (
            <div className="quest-map__notice quest-map__notice--soft">
              ⓘ Это <b>{activeQuarter} четверть</b>, а у тебя сейчас{" "}
              <b>{currentQuarter} четверть</b>. Можешь повторить или
              забежать вперёд.
            </div>
          )}
        </div>

        <div className="quest-map__grid">
          {topicsByQuarter[activeQuarter].length === 0 && (
            <div className="quest-map__empty">
              По <b>{subject.name.toLowerCase()}</b> в {browseGrade} классе,{" "}
              {activeQuarter} четверти тем пока нет.
              {!isOwnGrade && (
                <>
                  {" "}
                  Загляни в{" "}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => ownGrade && setBrowseGrade(ownGrade)}
                  >
                    свою параллель
                  </button>
                  .
                </>
              )}
            </div>
          )}

          {topicsByQuarter[activeQuarter].map((topic, idx) => {
            const done = completedIds.has(topic.id);
            const isPrimary = isOwnGrade && isCurrentQuarter;
            const isForeign = !isOwnGrade;

            return (
              <motion.button
                key={topic.id}
                className={`quest-node ${done ? "done" : ""} unlocked ${
                  isPrimary ? "primary" : ""
                } ${isForeign ? "foreign" : ""}${
                  topic.contentStatus === "in_development"
                    ? " quest-node--has-wip"
                    : ""
                }`}
                onClick={() => openTopic(topic)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                whileHover={{ y: -4, scale: 1.02 }}
                style={
                  { "--subject-accent": subject.accent } as React.CSSProperties
                }
              >
                <div
                  className="quest-node__icon"
                  style={
                    done || isPrimary
                      ? { background: subject.gradient }
                      : undefined
                  }
                >
                  {topic.icon}
                </div>
                <div className="quest-node__body">
                  <div className="quest-node__num">
                    <span className="quest-node__idx">Тема {topic.order}</span>
                    <span className="quest-node__grade-pill">
                      {topic.grade} кл · {topic.quarter} четв
                    </span>
                  </div>
                  {topic.curriculumModule ? (
                    <div
                      className="quest-node__module"
                      title={topic.curriculumModule}
                    >
                      {topic.curriculumModule}
                    </div>
                  ) : null}
                  <div className="quest-node__title" title={topic.title}>
                    {topic.title}
                  </div>
                  <div
                    className="quest-node__topic"
                    title={[topic.description, topic.learningGoal]
                      .filter(Boolean)
                      .join("\n\n")}
                  >
                    {topic.description}
                  </div>
                </div>
                {done && <div className="quest-node__badge">Пройдено</div>}
                {topic.contentStatus === "in_development" && (
                  <div className="quest-node__wip-tag">в разработке</div>
                )}
                {isForeign && !done && (
                  <div className="quest-node__foreign-tag">не твой класс</div>
                )}
                {isPrimary && !done && <div className="quest-node__pulse" />}
              </motion.button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
