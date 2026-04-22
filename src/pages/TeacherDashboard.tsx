import { useMemo } from "react";
import { motion } from "framer-motion";
import { MOCK_PROGRESS } from "../data/mockProgress";
import { useAuth } from "../context/AuthContext";

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

  const stats = useMemo(() => {
    const total = MOCK_PROGRESS.length;
    const activeToday = MOCK_PROGRESS.filter(
      (s) => daysSince(s.lastActive) <= 2
    ).length;
    const avgXp = Math.round(
      MOCK_PROGRESS.reduce((a, s) => a + s.xp, 0) / total
    );
    const avgIndependence = Math.round(
      MOCK_PROGRESS.reduce((a, s) => a + s.thinkingIndependence, 0) / total
    );

    const topicMap = new Map<string, number>();
    MOCK_PROGRESS.forEach((s) =>
      s.weakTopics.forEach((t) => topicMap.set(t, (topicMap.get(t) ?? 0) + 1))
    );
    const topProblemTopics = Array.from(topicMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    return { total, activeToday, avgXp, avgIndependence, topProblemTopics };
  }, []);

  const sorted = useMemo(
    () => [...MOCK_PROGRESS].sort((a, b) => b.xp - a.xp),
    []
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
            Показывает, кто думает самостоятельно, а кто «зависает» на ИИ.
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

      <section className="teacher-grid">
        <div className="teacher-table-card">
          <div className="teacher-table-card__head">
            <h2>Рейтинг учеников</h2>
            <span className="teacher-table-card__meta">
              Сортировка по XP
            </span>
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
                        {s.completedLessons.length} уроков пройдено
                      </div>
                    </div>
                  </div>
                  <div className="teacher-table__cell">
                    <span className="level-pill">{s.level}</span>
                  </div>
                  <div className="teacher-table__cell">{s.xp}</div>
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
              Рекомендуем провести индивидуальную беседу и поставить уровень
              «Сократ-тренировка» вручную.
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
