import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MOCK_PROGRESS } from "../data/mockProgress";
import { SUBJECTS } from "../data/mockSubjects";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";
import {
  getClassById,
  getClassesForTeacher,
  MOCK_CLASSES,
} from "../data/mockClasses";
import { countTopicsBySubjectGrade } from "../data/topics";
import type { Grade, SchoolClass } from "../types";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function daysSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

interface SubjectStat {
  subjectId: string;
  subjectName: string;
  icon: string;
  accent: string;
  completed: number;
  total: number;
  xp: number;
}

interface EnrichedStudent {
  userId: string;
  name: string;
  avatar: string;
  classId: string;
  xp: number;
  level: number;
  weakTopics: string[];
  lastActive: string;
  promptQuality: number;
  thinkingIndependence: number;
  subjectsStats: SubjectStat[];
  totalCompleted: number;
  liveXp: number;
}

export function TeacherDashboard() {
  const { currentUser } = useAuth();
  const { getUserProgress } = useProgress();

  const teacherClasses = useMemo(
    () => getClassesForTeacher(currentUser?.id) ?? MOCK_CLASSES,
    [currentUser?.id]
  );

  // "all" = aggregate across every class the teacher leads.
  const [selectedClassId, setSelectedClassId] = useState<string>(
    teacherClasses[0]?.id ?? "all"
  );

  const selectedClass: SchoolClass | undefined =
    selectedClassId === "all" ? undefined : getClassById(selectedClassId);

  const studentsInScope = useMemo(() => {
    return MOCK_PROGRESS.filter((s) => {
      if (selectedClassId === "all") {
        return teacherClasses.some((c) => c.studentIds.includes(s.userId));
      }
      return selectedClass?.studentIds.includes(s.userId);
    });
  }, [selectedClass, selectedClassId, teacherClasses]);

  const enrichedStudents = useMemo<EnrichedStudent[]>(() => {
    return studentsInScope.map((s) => {
      const userProgress = getUserProgress(s.userId);
      const studentClass = getClassById(s.classId);
      const grade: Grade | undefined = studentClass?.grade;
      let totalCompleted = 0;
      let liveXp = 0;
      const subjectsStats: SubjectStat[] = SUBJECTS.map((subj) => {
        const p = userProgress[subj.id];
        const xp = p?.xp ?? 0;
        // Count completion only against the student's own grade — that's what
        // a homeroom teacher actually cares about.
        const completed =
          p && grade
            ? p.completedTopics.filter((id) =>
                id.startsWith(`${subj.id}.g${grade}.`)
              ).length
            : 0;
        const total = grade
          ? countTopicsBySubjectGrade(subj.id, grade)
          : 0;
        totalCompleted += completed;
        liveXp += xp;
        return {
          subjectId: subj.id,
          subjectName: subj.shortName,
          icon: subj.icon,
          accent: subj.accent,
          completed,
          total,
          xp,
        };
      });
      return {
        userId: s.userId,
        name: s.name,
        avatar: s.avatar,
        classId: s.classId,
        xp: s.xp,
        level: s.level,
        weakTopics: s.weakTopics,
        lastActive: s.lastActive,
        promptQuality: s.promptQuality,
        thinkingIndependence: s.thinkingIndependence,
        subjectsStats,
        totalCompleted,
        liveXp: Math.max(liveXp, s.xp),
      };
    });
  }, [getUserProgress, studentsInScope]);

  const stats = useMemo(() => {
    const total = enrichedStudents.length;
    const activeToday = enrichedStudents.filter(
      (s) => daysSince(s.lastActive) <= 2
    ).length;
    const avgXp =
      total > 0
        ? Math.round(
            enrichedStudents.reduce((a, s) => a + s.liveXp, 0) / total
          )
        : 0;
    const avgIndependence =
      total > 0
        ? Math.round(
            enrichedStudents.reduce(
              (a, s) => a + s.thinkingIndependence,
              0
            ) / total
          )
        : 0;

    const topicMap = new Map<string, number>();
    enrichedStudents.forEach((s) =>
      s.weakTopics.forEach((t) => topicMap.set(t, (topicMap.get(t) ?? 0) + 1))
    );
    const topProblemTopics = Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, activeToday, avgXp, avgIndependence, topProblemTopics };
  }, [enrichedStudents]);

  const subjectBreakdown = useMemo(() => {
    return SUBJECTS.map((subj) => {
      let totalDone = 0;
      let totalPossible = 0;
      let studentsStarted = 0;
      enrichedStudents.forEach((s) => {
        const stat = s.subjectsStats.find((x) => x.subjectId === subj.id);
        if (stat) {
          totalDone += stat.completed;
          totalPossible += stat.total;
          if (stat.completed > 0) studentsStarted += 1;
        }
      });
      const percent =
        totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0;
      return {
        id: subj.id,
        name: subj.shortName,
        icon: subj.icon,
        accent: subj.accent,
        gradient: subj.gradient,
        percent,
        studentsStarted,
        totalStudents: enrichedStudents.length,
      };
    });
  }, [enrichedStudents]);

  const sorted = useMemo(
    () => [...enrichedStudents].sort((a, b) => b.liveXp - a.liveXp),
    [enrichedStudents]
  );

  const getStatus = (independence: number, promptQuality: number) => {
    const avg = (independence + promptQuality) / 2;
    if (avg >= 80) return { label: "Думает сам", kind: "good" };
    if (avg >= 55) return { label: "Развивается", kind: "mid" };
    return { label: "Зависает на ИИ", kind: "warn" };
  };

  // Identify the weakest student in the current scope, if any — used for the
  // "Рекомендация ИИ-куратора" panel.
  const weakest = useMemo(() => {
    if (sorted.length === 0) return null;
    return [...sorted].sort(
      (a, b) =>
        (a.thinkingIndependence + a.promptQuality) / 2 -
        (b.thinkingIndependence + b.promptQuality) / 2
    )[0];
  }, [sorted]);

  return (
    <div className="teacher-page">
      <motion.div
        className="teacher-hero"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <div className="teacher-hero__hello">
            Добрый день, {currentUser?.name}
          </div>
          <h1 className="teacher-hero__title">
            Пульс класса — <span className="accent">аналитика</span>
          </h1>
          <p className="teacher-hero__sub">
            Ты классный руководитель {teacherClasses.length} классов:{" "}
            {teacherClasses.map((c) => c.name).join(", ")}. Выбери класс,
            чтобы увидеть его пульс — кто думает сам, а кто «зависает» на
            ИИ.
          </p>
        </div>
      </motion.div>

      <section className="class-switcher">
        <button
          type="button"
          onClick={() => setSelectedClassId("all")}
          className={`class-pill ${
            selectedClassId === "all" ? "active" : ""
          }`}
        >
          <span className="class-pill__emoji">🏫</span>
          <div className="class-pill__body">
            <span className="class-pill__name">Все классы</span>
            <span className="class-pill__meta">
              {teacherClasses.reduce(
                (sum, c) => sum + c.studentIds.length,
                0
              )}{" "}
              учеников
            </span>
          </div>
        </button>
        {teacherClasses.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedClassId(c.id)}
            className={`class-pill ${
              selectedClassId === c.id ? "active" : ""
            }`}
            style={
              selectedClassId === c.id
                ? ({ borderColor: c.accent, color: c.accent } as React.CSSProperties)
                : undefined
            }
          >
            <span className="class-pill__emoji">{c.emoji}</span>
            <div className="class-pill__body">
              <span className="class-pill__name">{c.name}</span>
              <span className="class-pill__meta">
                {c.grade} класс · {c.studentIds.length} ученик
                {c.studentIds.length === 1 ? "" : "ов"}
              </span>
            </div>
          </button>
        ))}
      </section>

      <section className="metrics">
        <div className="metric-card">
          <div className="metric-card__label">
            {selectedClass
              ? `Учеников в ${selectedClass.name}`
              : "Всего учеников"}
          </div>
          <div className="metric-card__value">{stats.total}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Активны за 48 часов</div>
          <div className="metric-card__value accent">{stats.activeToday}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Средний XP</div>
          <div className="metric-card__value">{stats.avgXp}</div>
        </div>
        <div className="metric-card">
          <div className="metric-card__label">Средняя самостоятельность</div>
          <div className="metric-card__value accent">
            {stats.avgIndependence}%
          </div>
        </div>
      </section>

      <section className="subjects-breakdown">
        <div className="subjects-breakdown__head">
          <h2>
            Активность по предметам
            {selectedClass && (
              <span
                className="class-chip"
                style={{
                  marginLeft: 12,
                  borderColor: `${selectedClass.accent}66`,
                  color: selectedClass.accent,
                }}
              >
                {selectedClass.emoji} {selectedClass.name}
              </span>
            )}
          </h2>
          <span className="teacher-table-card__meta">
            Среднее прохождение тем своей параллели
          </span>
        </div>
        <div className="subjects-breakdown__grid">
          {subjectBreakdown.map((s, i) => (
            <motion.div
              key={s.id}
              className="subject-stat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="subject-stat__top">
                <div
                  className="subject-stat__icon"
                  style={{ background: s.gradient }}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="subject-stat__name">{s.name}</div>
                  <div className="subject-stat__meta">
                    {s.studentsStarted} из {s.totalStudents} начали
                  </div>
                </div>
                <div className="subject-stat__percent">{s.percent}%</div>
              </div>
              <div className="xp-bar">
                <motion.div
                  className="xp-bar__fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${s.percent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ background: s.gradient }}
                />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="teacher-grid">
        <div className="teacher-table-card">
          <div className="teacher-table-card__head">
            <h2>Рейтинг учеников</h2>
            <span className="teacher-table-card__meta">Сортировка по XP</span>
          </div>
          <div className="teacher-table">
            <div className="teacher-table__head">
              <div>Ученик</div>
              <div>Класс</div>
              <div>XP</div>
              <div>Качество промптов</div>
              <div>Самостоятельность</div>
              <div>Статус</div>
              <div>Активность</div>
            </div>

            {sorted.length === 0 && (
              <div className="teacher-table__empty">
                В этом классе пока нет учеников с прогрессом.
              </div>
            )}

            {sorted.map((s, i) => {
              const status = getStatus(s.thinkingIndependence, s.promptQuality);
              const cls = getClassById(s.classId);
              return (
                <motion.div
                  key={s.userId}
                  className="teacher-table__row"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div className="teacher-table__cell">
                    <span className="teacher-table__avatar">{s.avatar}</span>
                    <div>
                      <div className="teacher-table__name">{s.name}</div>
                      <div className="teacher-table__meta">
                        {s.totalCompleted} тем своей параллели пройдено
                      </div>
                      <div className="teacher-table__subjects">
                        {s.subjectsStats
                          .filter((x) => x.completed > 0)
                          .slice(0, 6)
                          .map((x) => (
                            <span
                              key={x.subjectId}
                              title={`${x.subjectName}: ${x.completed}/${x.total}`}
                              className="teacher-table__subject-chip"
                              style={{ borderColor: `${x.accent}60` }}
                            >
                              {x.icon} {x.completed}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="teacher-table__cell">
                    {cls ? (
                      <span
                        className="class-chip"
                        style={{
                          borderColor: `${cls.accent}66`,
                          color: cls.accent,
                        }}
                      >
                        {cls.emoji} {cls.name}
                      </span>
                    ) : (
                      <span className="teacher-table__cell--muted">—</span>
                    )}
                  </div>
                  <div className="teacher-table__cell">{s.liveXp}</div>
                  <div className="teacher-table__cell">
                    <MiniBar value={s.promptQuality} />
                  </div>
                  <div className="teacher-table__cell">
                    <MiniBar value={s.thinkingIndependence} accent />
                  </div>
                  <div className="teacher-table__cell">
                    <span className={`status status--${status.kind}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="teacher-table__cell teacher-table__cell--muted">
                    {formatDate(s.lastActive)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="side-col">
          <div className="panel">
            <h3 className="panel__title">Проблемные темы</h3>
            <p className="panel__sub">
              {selectedClass
                ? `Топ-3 в ${selectedClass.name}`
                : "Топ-3 по всем твоим классам"}
            </p>
            <ol className="problem-topics">
              {stats.topProblemTopics.length === 0 && (
                <li className="panel__text">Пока нет данных.</li>
              )}
              {stats.topProblemTopics.map(([topic, count], idx) => (
                <li key={topic} className="problem-topic">
                  <span className="problem-topic__rank">#{idx + 1}</span>
                  <span className="problem-topic__name">{topic}</span>
                  <span className="problem-topic__count">
                    {count}{" "}
                    {count === 1
                      ? "ученик"
                      : count < 5
                      ? "ученика"
                      : "учеников"}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="panel">
            <h3 className="panel__title">Рекомендация ИИ-куратора</h3>
            {weakest ? (
              <p className="panel__text">
                Обратите внимание на <b>{weakest.name.split(" ")[0]}</b> (
                {getClassById(weakest.classId)?.name ?? "—"}): низкая
                самостоятельность ({weakest.thinkingIndependence}%) и
                качество промптов ({weakest.promptQuality}%). Вероятно,
                копирует ответы. Рекомендуем индивидуальную беседу и
                «Сократ-тренировку» вручную.
              </p>
            ) : (
              <p className="panel__text">
                В выбранном классе пока недостаточно данных для
                рекомендации.
              </p>
            )}
          </div>

          {selectedClass && (
            <div className="panel">
              <h3 className="panel__title">Кто учится в {selectedClass.name}</h3>
              <ul className="class-roster">
                {selectedClass.studentIds.map((id) => {
                  const m = MOCK_PROGRESS.find((p) => p.userId === id);
                  if (!m) return null;
                  return (
                    <li key={id} className="class-roster__row">
                      <span className="class-roster__avatar">{m.avatar}</span>
                      <span className="class-roster__name">{m.name}</span>
                      <span className="class-roster__xp">{m.xp} XP</span>
                    </li>
                  );
                })}
              </ul>
              {selectedClass.motto && (
                <p className="panel__text panel__text--muted">
                  «{selectedClass.motto}»
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function MiniBar({ value, accent }: { value: number; accent?: boolean }) {
  return (
    <div className="minibar">
      <div className="minibar__track">
        <motion.div
          className={`minibar__fill ${accent ? "accent" : ""}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="minibar__value">{value}%</span>
    </div>
  );
}
