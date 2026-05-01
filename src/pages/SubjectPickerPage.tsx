import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { SUBJECTS } from "../data/mockSubjects";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";
import { useQuarter } from "../context/QuarterContext";
import { getClassByStudentId } from "../data/mockClasses";
import {
  countTopicsBySubjectGrade,
  countTopicsForQuarter,
  getTopicsBySubjectGrade,
} from "../data/topics";
import type { Quarter } from "../types";

export function SubjectPickerPage() {
  const { currentUser } = useAuth();
  const { getUserProgress } = useProgress();
  const { currentQuarter } = useQuarter();
  const navigate = useNavigate();

  const studentClass = useMemo(
    () => getClassByStudentId(currentUser?.id),
    [currentUser?.id]
  );
  const grade = studentClass?.grade;

  const progressMap = useMemo(
    () => getUserProgress(currentUser?.id),
    [getUserProgress, currentUser]
  );

  const totals = useMemo(() => {
    let totalXp = 0;
    let totalCompletedThisGrade = 0;
    let totalThisGrade = 0;
    SUBJECTS.forEach((s) => {
      const p = progressMap[s.id];
      if (p) totalXp += p.xp;
      if (grade) {
        const gradeTopics = getTopicsBySubjectGrade(s.id, grade).map((t) => t.id);
        totalThisGrade += gradeTopics.length;
        if (p) {
          totalCompletedThisGrade += p.completedTopics.filter((id) =>
            gradeTopics.includes(id)
          ).length;
        }
      }
    });
    return { totalXp, totalCompletedThisGrade, totalThisGrade };
  }, [progressMap, grade]);

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
              {studentClass ? (
                <>
                  Ты в классе{" "}
                  <span
                    className="class-chip class-chip--inline"
                    style={{
                      borderColor: `${studentClass.accent}66`,
                      color: studentClass.accent,
                    }}
                  >
                    {studentClass.emoji} {studentClass.name}
                  </span>{" "}
                  · {currentQuarter} четверть. Выбери предмет, чтобы начать.
                </>
              ) : (
                <>Выбери предмет, в который хочешь погрузиться сегодня.</>
              )}
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
              {totals.totalCompletedThisGrade}
              <span className="stat__suffix">/ {totals.totalThisGrade}</span>
            </div>
            <div className="stat__label">
              {grade ? `Тем ${grade} класса пройдено` : "Уроков пройдено"}
            </div>
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
            completedTopics: [] as string[],
            xp: 0,
          };
          const totalForGrade = grade
            ? countTopicsBySubjectGrade(subject.id, grade)
            : 0;
          const gradeTopicIds = grade
            ? new Set(
                getTopicsBySubjectGrade(subject.id, grade).map((t) => t.id)
              )
            : new Set<string>();
          const doneInGrade = p.completedTopics.filter((id) =>
            gradeTopicIds.has(id)
          ).length;

          const totalInQuarter = grade
            ? countTopicsForQuarter(subject.id, grade, currentQuarter as Quarter)
            : 0;

          const percent =
            totalForGrade > 0 ? Math.round((doneInGrade / totalForGrade) * 100) : 0;
          const subjectAvailable = totalForGrade > 0;

          return (
            <motion.button
              key={subject.id}
              className={`subject-card ${
                !subjectAvailable ? "subject-card--unavailable" : ""
              }`}
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
                {grade && (
                  <div className="subject-card__quarter-tag">
                    {totalInQuarter > 0
                      ? `${totalInQuarter} тем в ${currentQuarter} четв · ${grade} кл`
                      : subjectAvailable
                      ? `Эта четверть пуста (${grade} кл)`
                      : `Не входит в ${grade} класс`}
                  </div>
                )}
              </div>

              <div className="subject-card__footer">
                <div className="subject-card__progress-head">
                  <span>
                    {doneInGrade} / {totalForGrade} тем
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
                {!subjectAvailable
                  ? "Скоро →"
                  : doneInGrade === 0
                  ? "Начать →"
                  : doneInGrade === totalForGrade
                  ? "Пройдено ✓"
                  : "Продолжить →"}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
