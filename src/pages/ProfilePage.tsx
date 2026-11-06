import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";
import { SUBJECTS } from "../data/mockSubjects";
import { getClassByStudentId } from "../data/mockClasses";
import { countTopicsBySubjectGrade } from "../data/topics";
import { SubjectGlyph } from "../components/SubjectGlyph";
import {
  ACHIEVEMENTS,
  dayKeyOf,
  isEarned,
  levelInfo,
  loadUnlocks,
  type ActivityStats,
  type UnlockMap,
} from "../utils/achievements";
import { useActivityStats } from "../utils/useActivityStats";

const HEATMAP_WEEKS = 26;
const MONTHS = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

export function ProfilePage() {
  const { currentUser } = useAuth();
  const userId = currentUser?.id;
  const stats = useActivityStats(userId);
  const unlocks = useUnlocks(userId);
  const studentClass = useMemo(() => getClassByStudentId(userId), [userId]);
  const { getUserProgress } = useProgress();
  const progress = useMemo(() => getUserProgress(userId), [getUserProgress, userId]);

  if (!currentUser || !stats) return null;

  const lvl = levelInfo(stats.totalXp);
  const earnedCount = ACHIEVEMENTS.filter((a) => isEarned(a, stats)).length;

  // Earned first (newest on top), then locked by how close they are.
  const sorted = [...ACHIEVEMENTS].sort((a, b) => {
    const ea = isEarned(a, stats);
    const eb = isEarned(b, stats);
    if (ea !== eb) return ea ? -1 : 1;
    if (ea) return (unlocks[b.id] ?? 0) - (unlocks[a.id] ?? 0);
    const [ca, ta] = a.progress(stats);
    const [cb, tb] = b.progress(stats);
    return cb / tb - ca / ta;
  });

  return (
    <div className="profile">
      {/* ---------- Hero ---------- */}
      <section className="profile__hero">
        <div className="profile__avatar">{currentUser.avatar}</div>
        <div className="profile__who">
          <h1 className="profile__name">{currentUser.name}</h1>
          <div className="profile__meta">
            {studentClass && (
              <span style={{ color: studentClass.accent }}>
                {studentClass.emoji} {studentClass.name}
              </span>
            )}
            <span className="profile__rank">
              Уровень {lvl.level} · {lvl.title}
            </span>
          </div>
          <div className="profile__xpbar" title={`${lvl.inLevel} / 150 XP`}>
            <motion.div
              className="profile__xpfill"
              initial={{ width: 0 }}
              animate={{ width: `${lvl.percent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="profile__xpnote">
            Ещё {lvl.toNext} XP до уровня {lvl.level + 1}
          </div>
        </div>
      </section>

      {/* ---------- Stat tiles ---------- */}
      <section className="profile__stats">
        <StatTile value={stats.totalXp} label="всего XP" />
        <StatTile value={stats.completedTopics} label="тем пройдено" />
        <StatTile
          value={`${stats.streak.current} / ${stats.streak.longest}`}
          label="серия / рекорд"
        />
        <StatTile value={stats.deepQuestions} label="глубоких вопросов" />
        <StatTile value={`${earnedCount} / ${ACHIEVEMENTS.length}`} label="достижений" />
      </section>

      {/* ---------- Achievements ---------- */}
      <section className="profile__section">
        <h2 className="profile__h2">Достижения</h2>
        <div className="ach-grid">
          {sorted.map((a, i) => {
            const earned = isEarned(a, stats);
            const [cur, target] = a.progress(stats);
            const at = unlocks[a.id];
            return (
              <motion.div
                key={a.id}
                className={`ach ach--${a.tier} ${earned ? "ach--earned" : "ach--locked"}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                title={a.description}
              >
                <div className="ach__emoji">{a.emoji}</div>
                <div className="ach__title">{a.title}</div>
                <div className="ach__desc">{a.description}</div>
                {earned ? (
                  <div className="ach__date">
                    {at ? `получено ${formatDate(at)}` : "получено"}
                  </div>
                ) : target > 1 ? (
                  <div className="ach__progress">
                    <div className="ach__bar">
                      <div
                        className="ach__barfill"
                        style={{ width: `${(cur / target) * 100}%` }}
                      />
                    </div>
                    <span>
                      {cur} / {target}
                    </span>
                  </div>
                ) : (
                  <div className="ach__date">ещё не получено</div>
                )}
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ---------- Heatmap ---------- */}
      <section className="profile__section">
        <h2 className="profile__h2">Активность</h2>
        <Heatmap stats={stats} />
      </section>

      {/* ---------- Subjects ---------- */}
      {studentClass && (
        <section className="profile__section">
          <h2 className="profile__h2">Предметы · {studentClass.grade} класс</h2>
          <div className="profile__subjects">
            {SUBJECTS.map((s) => {
              const total = countTopicsBySubjectGrade(s.id, studentClass.grade);
              const done = (progress[s.id]?.completedTopics ?? []).filter((id) =>
                id.startsWith(`${s.id}.g${studentClass.grade}.`)
              ).length;
              const pct = total ? Math.min(100, Math.round((done / total) * 100)) : 0;
              return (
                <div className="profile__subject" key={s.id}>
                  <span className="profile__subject-icon" style={{ color: s.accent }}>
                    <SubjectGlyph subjectId={s.id} size={20} />
                  </span>
                  <span className="profile__subject-name">{s.shortName}</span>
                  <div className="profile__subject-bar">
                    <div
                      className="profile__subject-fill"
                      style={{ width: `${pct}%`, background: s.gradient }}
                    />
                  </div>
                  <span className="profile__subject-count">
                    {done}
                    {total ? ` / ${total}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function StatTile({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="profile__stat">
      <div className="profile__stat-value">{value}</div>
      <div className="profile__stat-label">{label}</div>
    </div>
  );
}

/** GitHub-style activity grid: columns = weeks (Mon..Sun), last 26 weeks. */
function Heatmap({ stats }: { stats: ActivityStats }) {
  const { weeks, monthLabels, total } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mondayOffset = (today.getDay() + 6) % 7; // 0 = Monday
    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset - (HEATMAP_WEEKS - 1) * 7);

    const weeks: Array<Array<{ key: string; count: number; future: boolean; date: Date }>> = [];
    const monthLabels: string[] = [];
    let total = 0;
    let prevMonth = -1;
    for (let w = 0; w < HEATMAP_WEEKS; w++) {
      const col = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const key = dayKeyOf(date);
        const future = date > today;
        const count = future ? 0 : stats.dayCounts[key] ?? 0;
        total += count;
        col.push({ key, count, future, date });
      }
      const month = col[0].date.getMonth();
      monthLabels.push(month !== prevMonth ? MONTHS[month] : "");
      prevMonth = month;
      weeks.push(col);
    }
    return { weeks, monthLabels, total };
  }, [stats.dayCounts]);

  const activeInRange = weeks.flat().filter((c) => c.count > 0).length;

  return (
    <div className="heatmap">
      <div className="heatmap__scroll">
        <div className="heatmap__months">
          {monthLabels.map((m, i) => (
            <span key={i}>{m}</span>
          ))}
        </div>
        <div className="heatmap__body">
          <div className="heatmap__days">
            <span>пн</span>
            <span />
            <span>ср</span>
            <span />
            <span>пт</span>
            <span />
            <span />
          </div>
          <div className="heatmap__grid">
            {weeks.map((col, i) => (
              <div className="heatmap__col" key={i}>
                {col.map((c) => (
                  <span
                    key={c.key}
                    className={`heatmap__cell heatmap__cell--${c.future ? "future" : heatLevel(c.count)}`}
                    title={c.future ? "" : `${formatDate(c.date.getTime())}: ${c.count} ${actionsWord(c.count)}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap__footer">
        <span>
          {activeInRange} {daysWord(activeInRange)} с занятиями · {total} {actionsWord(total)} за полгода
        </span>
        <span className="heatmap__legend">
          меньше
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className={`heatmap__cell heatmap__cell--${l}`} />
          ))}
          больше
        </span>
      </div>
    </div>
  );
}

function heatLevel(n: number): number {
  if (n <= 0) return 0;
  if (n <= 2) return 1;
  if (n <= 5) return 2;
  if (n <= 9) return 3;
  return 4;
}

/** Re-reads unlock dates whenever achievements change. */
function useUnlocks(userId: string | undefined): UnlockMap {
  const read = () => (userId ? loadUnlocks(userId) ?? {} : {});
  const [map, setMap] = useState<UnlockMap>(read);
  useEffect(() => {
    setMap(read());
    const h = () => setMap(read());
    window.addEventListener("oilanai:achievements-changed", h);
    return () => window.removeEventListener("oilanai:achievements-changed", h);
  }, [userId]);
  return map;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}
const actionsWord = (n: number) => plural(n, "действие", "действия", "действий");
const daysWord = (n: number) => plural(n, "день", "дня", "дней");
