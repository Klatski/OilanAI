import { useMemo } from "react";
import { motion } from "framer-motion";
import { MOCK_PROGRESS } from "../data/mockProgress";
import { SUBJECTS } from "../data/mockSubjects";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";

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

export function TeacherDashboard() {
  const { currentUser } = useAuth();
  const { getUserProgress } = useProgress();

  const enrichedStudents = useMemo(() => {
    return MOCK_PROGRESS.map((s) => {
      const userProgress = getUserProgress(s.userId);
      let totalCompleted = 0;
      let liveXp = 0;
      const subjectsStats = SUBJECTS.map((subj) => {
        const p = userProgress[subj.id];
        const completed = p?.completedLessons.length ?? 0;
        const xp = p?.xp ?? 0;
        totalCompleted += completed;
        liveXp += xp;
        return {
          subjectId: subj.id,
          subjectName: subj.shortName,
          icon: subj.icon,
          accent: subj.accent,
          completed,
          total: subj.lessons.length,
          xp,
        };
      });
      return {
        ...s,
        subjectsStats,
        totalCompleted,
        liveXp: Math.max(liveXp, s.xp),
      };
    });
  }, [getUserProgress]);

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
        totalPossible > 0
          ? Math.round((totalDone / totalPossible) * 100)
          : 0;
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
            Показывает, кто думает самостоятельно, а кто «зависает» на ИИ — по
            всем предметам сразу.
          </p>
        </div>
      </motion.div>

      <section className="metrics">
        <div className="metric-card">
          <div className="metric-card__label">Всего учеников</div>
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
          <h2>Активность по предметам</h2>
          <span className="teacher-table-card__meta">
            Среднее прохождение уроков класса
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
              <div>Уровень</div>
              <div>XP</div>
              <div>Качество промптов</div>
              <div>Самостоятельность</div>
              <div>Статус</div>
              <div>Активность</div>
            </div>

            {sorted.map((s, i) => {
              const status = getStatus(s.thinkingIndependence, s.promptQuality);
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
                        {s.totalCompleted} уроков по всем предметам
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
                    <span className="level-pill">{s.level}</span>
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
            <h3 className="panel__title">Проблемные темы класса</h3>
            <p className="panel__sub">Топ-3 тем, где ученики спотыкаются</p>
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
                    {count === 1 ? "ученик" : count < 5 ? "ученика" : "учеников"}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="panel">
            <h3 className="panel__title">Рекомендация ИИ-куратора</h3>
            <p className="panel__text">
              Обратите внимание на <b>Тимура</b>: низкая самостоятельность
              (38%) и слабое качество промптов. Возможно, он копирует ответы.
              Рекомендуем провести индивидуальную беседу и назначить
              «Сократ-тренировку» вручную.
            </p>
          </div>
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
