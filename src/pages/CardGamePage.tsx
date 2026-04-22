import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getCardGameForSubject } from "../data/mockCardGames";
import { getSubjectById } from "../data/mockSubjects";
import { useAuth } from "../context/AuthContext";
import { touchStreak } from "../utils/streakStorage";
import type { CardPair } from "../data/mockCardGames";

type Side = "term" | "def";

interface SelectedCard {
  side: Side;
  id: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function formatTime(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function CardGamePage() {
  const { subjectId } = useParams();
  const { currentUser } = useAuth();
  const subject = useMemo(() => getSubjectById(subjectId), [subjectId]);
  const game = useMemo(() => getCardGameForSubject(subjectId), [subjectId]);

  // Shuffle once per game-start (resets when user clicks "Заново")
  const [gameKey, setGameKey] = useState(0);
  const [terms, defs] = useMemo(() => {
    if (!game) return [[], []] as [CardPair[], CardPair[]];
    return [shuffle(game.pairs), shuffle(game.pairs)];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameKey]);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<SelectedCard | null>(null);
  const [wrong, setWrong] = useState<{ term?: string; def?: string } | null>(
    null
  );
  const [moves, setMoves] = useState(0);
  const [errors, setErrors] = useState(0);
  const [startedAt] = useState<number>(() => Date.now());
  const [endedAt, setEndedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const wrongTimer = useRef<number | null>(null);

  // tick the timer while the game is active
  useEffect(() => {
    if (endedAt !== null) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [endedAt]);

  const totalPairs = game?.pairs.length ?? 0;
  const allMatched = totalPairs > 0 && matched.size === totalPairs;

  // On win: record completion time, touch streak, fire event
  useEffect(() => {
    if (!allMatched || endedAt !== null) return;
    setEndedAt(Date.now());
    if (currentUser?.id) {
      touchStreak(currentUser.id);
      window.dispatchEvent(new CustomEvent("oilanai:streak-changed"));
    }
  }, [allMatched, endedAt, currentUser?.id]);

  const handleClick = useCallback(
    (side: Side, id: string) => {
      if (matched.has(id)) return;
      if (wrong) return; // input locked while showing error
      if (endedAt !== null) return;

      // deselect if clicking the same already-selected card
      if (selected && selected.side === side && selected.id === id) {
        setSelected(null);
        return;
      }

      // clicked another card on the same side → just update selection
      if (!selected || selected.side === side) {
        setSelected({ side, id });
        return;
      }

      // one card selected on each side → evaluate
      setMoves((m) => m + 1);
      if (selected.id === id) {
        // match!
        setMatched((prev) => {
          const next = new Set(prev);
          next.add(id);
          return next;
        });
        setSelected(null);
      } else {
        const termId = side === "term" ? id : selected.id;
        const defId = side === "def" ? id : selected.id;
        setWrong({ term: termId, def: defId });
        setErrors((e) => e + 1);
        if (wrongTimer.current) window.clearTimeout(wrongTimer.current);
        wrongTimer.current = window.setTimeout(() => {
          setWrong(null);
          setSelected(null);
        }, 650);
      }
    },
    [matched, selected, wrong, endedAt]
  );

  const restart = () => {
    setMatched(new Set());
    setSelected(null);
    setWrong(null);
    setMoves(0);
    setErrors(0);
    setEndedAt(null);
    setNow(Date.now());
    setGameKey((k) => k + 1);
  };

  if (!subject || !game) {
    return <Navigate to="/student" replace />;
  }

  const elapsed = (endedAt ?? now) - startedAt;
  const accentStyle = {
    "--subject-accent": subject.accent,
    "--subject-gradient": subject.gradient,
  } as React.CSSProperties;

  return (
    <div className="card-game-page" style={accentStyle}>
      <div className="card-game-page__top">
        <Link
          to={`/student/subject/${subject.id}`}
          className="card-game-page__back"
        >
          ← {subject.name}
        </Link>
        <div className="card-game-page__stats">
          <div className="card-game-stat">
            <span className="card-game-stat__label">Время</span>
            <span className="card-game-stat__value">{formatTime(elapsed)}</span>
          </div>
          <div className="card-game-stat">
            <span className="card-game-stat__label">Пары</span>
            <span className="card-game-stat__value">
              {matched.size}/{totalPairs}
            </span>
          </div>
          <div className="card-game-stat">
            <span className="card-game-stat__label">Попыток</span>
            <span className="card-game-stat__value">{moves}</span>
          </div>
          <button
            type="button"
            className="card-game-page__restart"
            onClick={restart}
          >
            ↻ Заново
          </button>
        </div>
      </div>

      <header className="card-game-page__header">
        <span className="card-game-page__icon">{subject.icon}</span>
        <div>
          <h1 className="card-game-page__title">{game.title}</h1>
          <p className="card-game-page__subtitle">{game.subtitle}</p>
        </div>
      </header>

      <div className="card-game-board">
        <div className="card-game-col">
          <div className="card-game-col__label">Понятие</div>
          {terms.map((p, idx) => {
            const isMatched = matched.has(p.id);
            const isSelected =
              selected?.side === "term" && selected.id === p.id;
            const isWrong = wrong?.term === p.id;
            return (
              <motion.button
                key={`t-${p.id}-${gameKey}`}
                type="button"
                disabled={isMatched}
                onClick={() => handleClick("term", p.id)}
                className={`card-tile card-tile--term ${
                  isMatched ? "is-matched" : ""
                } ${isSelected ? "is-selected" : ""} ${
                  isWrong ? "is-wrong" : ""
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{
                  opacity: isMatched ? 0.35 : 1,
                  x: 0,
                  scale: isSelected ? 1.03 : 1,
                }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
              >
                <span className="card-tile__dot" />
                <span className="card-tile__text">{p.term}</span>
              </motion.button>
            );
          })}
        </div>

        <div className="card-game-col">
          <div className="card-game-col__label">Соответствие</div>
          {defs.map((p, idx) => {
            const isMatched = matched.has(p.id);
            const isSelected =
              selected?.side === "def" && selected.id === p.id;
            const isWrong = wrong?.def === p.id;
            return (
              <motion.button
                key={`d-${p.id}-${gameKey}`}
                type="button"
                disabled={isMatched}
                onClick={() => handleClick("def", p.id)}
                className={`card-tile card-tile--def ${
                  isMatched ? "is-matched" : ""
                } ${isSelected ? "is-selected" : ""} ${
                  isWrong ? "is-wrong" : ""
                }`}
                initial={{ opacity: 0, x: 20 }}
                animate={{
                  opacity: isMatched ? 0.35 : 1,
                  x: 0,
                  scale: isSelected ? 1.03 : 1,
                }}
                transition={{ duration: 0.3, delay: idx * 0.04 }}
              >
                <span className="card-tile__text">{p.definition}</span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {endedAt !== null && (
          <motion.div
            className="card-game-win"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="card-game-win__card"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{ background: subject.gradient }}
            >
              <div className="card-game-win__emoji">🏆</div>
              <h2>Все пары собраны!</h2>
              <p>
                {game.pairs.length} пар · {formatTime(elapsed)} · {moves}{" "}
                попыт{moves === 1 ? "ка" : moves < 5 ? "ки" : "ок"} ·{" "}
                {errors} ошиб{errors === 1 ? "ка" : errors < 5 ? "ки" : "ок"}
              </p>
              <p className="card-game-win__streak">
                Огонёк серии засчитан за сегодня 🔥
              </p>
              <div className="card-game-win__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  onClick={restart}
                >
                  Сыграть ещё раз
                </button>
                <Link
                  to={`/student/subject/${subject.id}`}
                  className="btn btn--ghost"
                >
                  К урокам
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
