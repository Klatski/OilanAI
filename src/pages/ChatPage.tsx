import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { getLessonById, getSubjectById, SUBJECTS } from "../data/mockSubjects";
import { useAuth } from "../context/AuthContext";
import { useProgress } from "../context/ProgressContext";
import {
  askIntroMessage,
  askSocraticReply,
  askStructuredReflectionFeedback,
  getSourceLabel,
  type AISource,
} from "../utils/aiClient";
import {
  loadChatSession,
  resetChatSession,
  saveChatSession,
  type ChatSession,
} from "../utils/chatStorage";
import { touchStreak } from "../utils/streakStorage";
import {
  evaluatePrompt,
  tierFromScore,
  type PromptTier,
} from "../utils/promptEvaluator";
import type {
  ChatMessage,
  PromptQualityScore,
  ReflectionFeedbackBlocks,
} from "../types";

type Stage = "barrier" | "chat" | "reflection" | "done";

// ---------------------------------------------------------------------------
// Adaptive XP calculation
// ---------------------------------------------------------------------------
// XP is awarded once per lesson on first completion. The student gets MORE
// XP when the session shows real growth:
//   - many on-topic user messages (engagement)
//   - reflection that's noticeably longer / richer than the initial barrier
//     (growth from "what I knew" → "what I now understand")
//   - high average prompt-quality across the dialogue (good thinking, not
//     "give me the answer")
//
// The numbers are tuned so a minimum-effort run (3 short messages, lazy
// reflection, weak prompts) gets ~40 XP, while a strong session lands
// ~120-140 XP. Cap is 150.
// ---------------------------------------------------------------------------
function computeAdaptiveXp(args: {
  knowledge: string;
  reflection: string;
  messages: ChatMessage[];
}): number {
  const BASE = 40;

  const userMessages = args.messages.filter((m) => m.role === "user");
  const userMsgCount = userMessages.length;
  const messageBonus = Math.min(30, userMsgCount * 4);

  const knowledgeLen = args.knowledge.trim().length;
  const reflectionLen = args.reflection.trim().length;
  // Growth ratio rewards going beyond the starting knowledge — anchored at 1.0
  // when reflection matches starting length, capped at 2.5x.
  const growthRatio = Math.max(
    0.5,
    Math.min(2.5, reflectionLen / Math.max(40, knowledgeLen))
  );
  const growthBonus = Math.round((growthRatio - 1) * 28);

  const scoredMessages = userMessages.filter((m) => m.promptQuality);
  let qualityBonus = 0;
  if (scoredMessages.length > 0) {
    const avg =
      scoredMessages.reduce(
        (sum, m) =>
          sum +
          ((m.promptQuality?.clarity ?? 3) + (m.promptQuality?.depth ?? 3)) / 2,
        0
      ) / scoredMessages.length;
    // avg is 1..5. Map to -10..+30:
    qualityBonus = Math.round((avg - 2.5) * 12);
  }

  const total = BASE + messageBonus + growthBonus + qualityBonus;
  return Math.max(20, Math.min(150, total));
}

export function ChatPage() {
  const { currentUser } = useAuth();
  const { completeLesson, getSubjectProgress } = useProgress();
  const [params] = useSearchParams();

  const subjectParam = params.get("subject") ?? "math";
  const lessonParam = Number(params.get("lesson")) || 1;

  const subject = useMemo(
    () => getSubjectById(subjectParam) ?? SUBJECTS[0],
    [subjectParam]
  );
  const lesson = useMemo(
    () => getLessonById(subject.id, lessonParam) ?? subject.lessons[0],
    [subject, lessonParam]
  );

  const [stage, setStage] = useState<Stage>("barrier");
  const [knowledge, setKnowledge] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [reflection, setReflection] = useState("");
  const [xpGained, setXpGained] = useState(0);
  const [aiSource, setAiSource] = useState<AISource | null>(null);
  const [completed, setCompleted] = useState(false);
  const [restoredBanner, setRestoredBanner] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Hydrate state from localStorage every time the user/lesson changes.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    hydratedRef.current = false;
    const session = loadChatSession(currentUser?.id, subject.id, lesson.id);

    if (session && session.knowledge) {
      setKnowledge(session.knowledge);
      setMessages(session.messages ?? []);
      setReflection(session.reflection ?? "");
      setXpGained(session.xpGained ?? 0);
      setCompleted(session.completed ?? false);
      setAiSource(session.aiSource ?? null);
      setStage("chat");
      setRestoredBanner(true);
      const t = setTimeout(() => setRestoredBanner(false), 3500);
      hydratedRef.current = true;
      return () => clearTimeout(t);
    }

    setStage("barrier");
    setKnowledge("");
    setMessages([]);
    setInput("");
    setReflection("");
    setXpGained(0);
    setAiSource(null);
    setCompleted(false);
    setRestoredBanner(false);
    hydratedRef.current = true;
  }, [lesson.id, subject.id, currentUser?.id]);

  // ---------------------------------------------------------------------------
  // Persist session after any meaningful change. We only save once hydrated
  // to avoid clobbering storage with empty initial state.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hydratedRef.current || !currentUser?.id) return;
    if (stage === "barrier" || !knowledge) return;

    const next: ChatSession = {
      userId: currentUser.id,
      subjectId: subject.id,
      lessonId: lesson.id,
      knowledge,
      messages,
      reflection,
      feedback: "",
      xpGained,
      completed,
      aiSource,
      updatedAt: Date.now(),
    };
    saveChatSession(next);
  }, [
    messages,
    knowledge,
    reflection,
    xpGained,
    completed,
    aiSource,
    stage,
    subject.id,
    lesson.id,
    currentUser?.id,
  ]);

  // ---------------------------------------------------------------------------
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking, stage]);

  if (!subject || !lesson) {
    return <Navigate to="/student" replace />;
  }

  const lessonAlreadyCompleted = currentUser?.id
    ? getSubjectProgress(currentUser.id, subject.id).completedLessons.includes(
        lesson.id
      )
    : false;

  const handleBarrierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (knowledge.trim().length < 10 || isThinking) return;

    setStage("chat");
    setIsThinking(true);

    const firstName = currentUser?.name?.split(" ")[0] ?? "друг";
    const localIntro = `Привет, ${firstName}! Ты написал, что уже знаешь кое-что про «${subject.name}» — это отличная стартовая точка. Я — Дух Знаний, и готовых ответов от меня не жди. Моя задача — вести тебя вопросами, а не решать за тебя.\n\nИтак, по теме «${lesson.title}» (${lesson.topic}): что именно тебе кажется самым запутанным? С чего хочешь начать распутывать клубок?`;

    try {
      const intro = await askIntroMessage({
        subject: subject.name,
        lesson: lesson.title,
        topic: lesson.topic,
        knowledge,
      });
      setAiSource(intro.source);
      const introMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: intro.text,
        timestamp: Date.now(),
        kind: "intro",
      };
      setMessages([introMsg]);
    } catch {
      const introMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: localIntro,
        timestamp: Date.now(),
        kind: "intro",
      };
      setMessages([introMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text,
      timestamp: Date.now(),
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setIsThinking(true);

    // Evaluate the prompt quality in parallel with the main reply.
    // We never block the dialogue on this — the badge just fades in when ready.
    void evaluatePrompt(text, {
      subject: subject.name,
      lesson: lesson.title,
      topic: lesson.topic,
    }).then((score) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsgId
            ? {
                ...m,
                promptQuality: {
                  clarity: score.clarity,
                  depth: score.depth,
                  hint: score.hint,
                  source: score.source,
                },
              }
            : m
        )
      );
    });

    try {
      const reply = await askSocraticReply({
        subject: subject.name,
        lesson: lesson.title,
        topic: lesson.topic,
        knowledge,
        history: nextHistory,
        latestUserMessage: text,
      });

      setAiSource(reply.source);
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: reply.text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: "Хм, похоже связь со мной пропала на секунду. Попробуй переформулировать вопрос ещё раз 🌊",
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const submitReflection = async (e: FormEvent) => {
    e.preventDefault();
    if (reflection.trim().length < 10) return;

    const wasAlreadyCompleted = lessonAlreadyCompleted || completed;
    const xp = wasAlreadyCompleted
      ? 0
      : computeAdaptiveXp({
          knowledge,
          reflection,
          messages,
        });

    // Show celebratory "done" view only on first-time completion.
    if (!wasAlreadyCompleted) {
      setXpGained(xp);
      setStage("done");
    }
    setIsThinking(true);

    let feedbackText: string;
    let feedbackBlocks: ReflectionFeedbackBlocks | undefined;
    try {
      const result = await askStructuredReflectionFeedback(
        reflection,
        messages,
        {
          subject: subject.name,
          lesson: lesson.title,
          topic: lesson.topic,
          knowledge,
        }
      );
      setAiSource(result.source);
      feedbackText = result.text;
      feedbackBlocks = result.blocks;
    } catch {
      feedbackText =
        "Отличная работа над рефлексией! Продолжай в том же духе — ты растёшь.";
      feedbackBlocks = {
        validation:
          "Ты прошёл диалог до конца и сформулировал свою рефлексию — это шаг роста.",
        mustKnow:
          "В этой теме главное — само мышление, ключевых формул-аксиом нет.",
        struggles:
          "Связь с ИИ-наставником сейчас прервалась, но твой прогресс сохранён.",
      };
    }

    const feedbackMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      text: feedbackText,
      timestamp: Date.now(),
      kind: "reflection-feedback",
      feedbackBlocks,
    };
    setMessages((prev) => [...prev, feedbackMsg]);
    setIsThinking(false);
    setCompleted(true);

    if (!wasAlreadyCompleted && currentUser?.id) {
      try {
        completeLesson(currentUser.id, subject.id, lesson.id, xp);
        touchStreak(currentUser.id);
        // dispatch an app-wide event so the header streak badge
        // updates immediately without a reload
        window.dispatchEvent(new CustomEvent("oilanai:streak-changed"));
      } catch {
        /* never crash */
      }
    }

    if (wasAlreadyCompleted) {
      // Already done — stay in chat, don't spam "done" celebration again.
      setStage("chat");
      setReflection("");
    }
  };

  const resumeDialogue = () => {
    setStage("chat");
  };

  const startOver = () => {
    if (
      !window.confirm(
        "Начать урок с нуля? Вся история чата в этом уроке будет удалена. Прогресс по предмету (XP и пройденные уроки) сохранится."
      )
    ) {
      return;
    }
    resetChatSession(currentUser?.id, subject.id, lesson.id);
    hydratedRef.current = false;
    setStage("barrier");
    setKnowledge("");
    setMessages([]);
    setInput("");
    setReflection("");
    setXpGained(0);
    setCompleted(false);
    setAiSource(null);
    setRestoredBanner(false);
    // re-enable persistence on next tick
    setTimeout(() => {
      hydratedRef.current = true;
    }, 0);
  };

  const userMessagesCount = messages.filter((m) => m.role === "user").length;
  const canReflect = userMessagesCount >= 3;
  const isCompletedView = completed || lessonAlreadyCompleted;

  return (
    <div
      className="chat-page"
      style={{ "--subject-accent": subject.accent } as React.CSSProperties}
    >
      <aside className="chat-side">
        <Link to={`/student/subject/${subject.id}`} className="chat-side__back">
          ← {subject.name}
        </Link>

        <div
          className="chat-side__lesson"
          style={{
            background: `linear-gradient(180deg, ${subject.accent}18 0%, transparent 100%)`,
            borderColor: `${subject.accent}40`,
          }}
        >
          <div className="chat-side__icon">{lesson.icon}</div>
          <div className="chat-side__title">{lesson.title}</div>
          <div className="chat-side__topic" style={{ color: subject.accent }}>
            {subject.name} · {lesson.topic}
          </div>
          <p className="chat-side__desc">{lesson.description}</p>

          {isCompletedView && (
            <div
              className="chat-side__done-pill"
              style={{ borderColor: `${subject.accent}80` }}
            >
              ✓ Урок пройден
            </div>
          )}
        </div>

        <div className="chat-side__block">
          <div className="chat-side__block-title">Движок ИИ</div>
          <AiSourceBadge source={aiSource} />
        </div>

        <div className="chat-side__block">
          <div className="chat-side__block-title">Твой барьер знаний</div>
          {knowledge ? (
            <div className="chat-side__knowledge">"{knowledge}"</div>
          ) : (
            <div className="chat-side__empty">Ещё не заполнен</div>
          )}
        </div>

        <div className="chat-side__block">
          <div className="chat-side__block-title">Шаги урока</div>
          <ul className="chat-side__steps">
            <li className={stage !== "barrier" ? "done" : "active"}>
              1. Барьер «Что я знаю»
            </li>
            <li
              className={
                stage === "chat"
                  ? "active"
                  : stage === "barrier"
                  ? ""
                  : "done"
              }
            >
              2. Сократовский диалог
            </li>
            <li
              className={
                isCompletedView
                  ? "done"
                  : stage === "reflection"
                  ? "active"
                  : stage === "done"
                  ? "done"
                  : ""
              }
            >
              3. Рефлексия
            </li>
          </ul>
        </div>

        {stage === "chat" && canReflect && !isCompletedView && (
          <button
            className="btn btn--ghost btn--full"
            onClick={() => setStage("reflection")}
          >
            Перейти к рефлексии →
          </button>
        )}

        {stage === "chat" && isCompletedView && canReflect && (
          <button
            className="btn btn--ghost btn--full"
            onClick={() => setStage("reflection")}
            title="Опыт повторно не начисляется"
          >
            Написать новую рефлексию
          </button>
        )}

        {stage !== "barrier" && (
          <button
            className="btn btn--danger-ghost btn--full"
            onClick={startOver}
          >
            Начать заново
          </button>
        )}
      </aside>

      <main className="chat-main">
        <AnimatePresence mode="wait">
          {stage === "barrier" && (
            <motion.form
              key="barrier"
              className="barrier"
              onSubmit={handleBarrierSubmit}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="barrier__orb"
                style={{ background: subject.gradient }}
              />
              <h2 className="barrier__title">
                Прежде чем заговорить с ИИ —<br />
                <span className="accent">что ты уже знаешь?</span>
              </h2>
              <p className="barrier__sub">
                Предмет: <b>{subject.name}</b> · Тема: <b>{lesson.title}</b>.
                Напиши своими словами всё, что помнишь, даже если это совсем
                немного. Только после этого ИИ активируется.
              </p>
              <textarea
                className="barrier__textarea"
                placeholder="Я знаю, что..."
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                rows={6}
              />
              <div className="barrier__meta">
                <span
                  className={knowledge.trim().length >= 10 ? "ok" : "pending"}
                >
                  {knowledge.trim().length} / 10+ символов
                </span>
                <button
                  className="btn btn--primary"
                  type="submit"
                  disabled={knowledge.trim().length < 10}
                >
                  Активировать ИИ ✨
                </button>
              </div>
            </motion.form>
          )}

          {(stage === "chat" ||
            stage === "reflection" ||
            stage === "done") && (
            <motion.div
              key="chat"
              className="chat-window"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {isCompletedView && stage !== "done" && (
                <div
                  className="chat-banner chat-banner--done"
                  style={{
                    borderColor: `${subject.accent}66`,
                    background: `linear-gradient(90deg, ${subject.accent}14 0%, transparent 80%)`,
                  }}
                >
                  <span className="chat-banner__icon">✓</span>
                  <span className="chat-banner__text">
                    <b>Урок пройден.</b> История сохранена — можешь продолжить
                    диалог или перечитать переписку. Опыт повторно не
                    начисляется.
                  </span>
                </div>
              )}

              {restoredBanner && (
                <motion.div
                  className="chat-banner chat-banner--restored"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  <span className="chat-banner__icon">⏱</span>
                  <span className="chat-banner__text">
                    Восстановлена предыдущая сессия. Продолжай с того места, где
                    остановился.
                  </span>
                </motion.div>
              )}

              <div className="chat-window__messages" ref={scrollRef}>
                {messages.map((m) => {
                  if (m.kind === "reflection-feedback") {
                    return (
                      <ReflectionFeedbackBubble
                        key={m.id}
                        message={m}
                        accent={subject.accent}
                        gradient={subject.gradient}
                      />
                    );
                  }
                  return (
                    <motion.div
                      key={m.id}
                      className={`msg msg--${m.role}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      {m.role === "ai" && (
                        <div
                          className="msg__orb"
                          style={{ background: subject.gradient }}
                        />
                      )}
                      <div
                        className="msg__bubble"
                        style={
                          m.role === "user"
                            ? { background: subject.gradient }
                            : undefined
                        }
                      >
                        {m.text}
                        {m.role === "user" && m.promptQuality && (
                          <PromptQualityBadge score={m.promptQuality} />
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {isThinking && (
                  <div className="msg msg--ai">
                    <div
                      className="msg__orb msg__orb--pulsing"
                      style={{ background: subject.gradient }}
                    />
                    <div className="msg__bubble msg__bubble--typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                )}

                {stage === "reflection" && (
                  <motion.form
                    className="reflection"
                    onSubmit={submitReflection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="reflection__title">
                      {isCompletedView
                        ? "Новая рефлексия"
                        : "Финальная рефлексия"}
                    </div>
                    <div className="reflection__sub">
                      {isCompletedView
                        ? "Можешь сформулировать новое понимание. Опыт повторно не начисляется."
                        : "Напиши своими словами: что главное ты понял в этой теме?"}
                    </div>
                    <textarea
                      className="barrier__textarea"
                      placeholder="Я понял, что..."
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      rows={5}
                    />
                    <div className="reflection__actions">
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => setStage("chat")}
                      >
                        Назад в диалог
                      </button>
                      <button
                        className="btn btn--primary"
                        type="submit"
                        disabled={reflection.trim().length < 10 || isThinking}
                      >
                        Отправить рефлексию
                      </button>
                    </div>
                  </motion.form>
                )}

                {stage === "done" && (
                  <motion.div
                    className="reflection__feedback"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="reflection__feedback-title">
                      Фидбэк Духа Знаний
                    </div>
                    <div className="reflection__feedback-xp">
                      +{xpGained} XP · урок засчитан ✓
                    </div>
                    <div className="reflection__feedback-actions">
                      <button
                        className="btn btn--ghost"
                        onClick={resumeDialogue}
                      >
                        ← Продолжить диалог
                      </button>
                      <Link
                        to={`/student/subject/${subject.id}`}
                        className="btn btn--ghost"
                      >
                        Вернуться на карту
                      </Link>
                      <Link to="/student" className="btn btn--primary">
                        К выбору предмета →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </div>

              {stage === "chat" && (
                <form
                  className="chat-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void sendMessage();
                  }}
                >
                  <textarea
                    className="chat-input__field"
                    placeholder="Напиши свою мысль... (Enter — отправить, Shift+Enter — новая строка)"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    rows={2}
                  />
                  <button
                    type="submit"
                    className="btn btn--primary chat-input__send"
                    disabled={!input.trim() || isThinking}
                  >
                    Отправить
                  </button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function AiSourceBadge({ source }: { source: AISource | null }) {
  if (!source) {
    return <div className="ai-badge ai-badge--pending">ожидаем первого ответа…</div>;
  }
  const cls =
    source === "local"
      ? "ai-badge ai-badge--local"
      : "ai-badge ai-badge--live";
  const dot = source === "local" ? "◇" : "●";
  return (
    <div className={cls}>
      <span className="ai-badge__dot">{dot}</span>
      {getSourceLabel(source)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Subtle prompt-quality indicator on user messages.
// Shown as a small colored dot inside the bubble. Click reveals the hint.
// Designed to NEVER push the bubble's main text around — sits in a small
// footer row.
// ---------------------------------------------------------------------------
function PromptQualityBadge({ score }: { score: PromptQualityScore }) {
  const [expanded, setExpanded] = useState(false);
  const tier = tierFromScore(score);
  const labels: Record<PromptTier, string> = {
    weak: "Слабый промпт",
    ok: "Можно лучше",
    good: "Сильный промпт",
  };

  return (
    <div className={`prompt-eval prompt-eval--${tier}`}>
      <button
        type="button"
        className="prompt-eval__chip"
        onClick={() => setExpanded((v) => !v)}
        title="Оценка качества твоего промпта"
        aria-expanded={expanded}
      >
        <span className="prompt-eval__dot" />
        <span className="prompt-eval__label">{labels[tier]}</span>
        <span className="prompt-eval__score">
          {score.clarity}+{score.depth}/10
        </span>
      </button>
      <AnimatePresence>
        {expanded && score.hint && (
          <motion.div
            className="prompt-eval__hint"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="prompt-eval__hint-row">
              <span>Ясность</span>
              <span className="prompt-eval__hint-bar">
                <span style={{ width: `${(score.clarity / 5) * 100}%` }} />
              </span>
              <span className="prompt-eval__hint-num">{score.clarity}/5</span>
            </div>
            <div className="prompt-eval__hint-row">
              <span>Глубина</span>
              <span className="prompt-eval__hint-bar">
                <span style={{ width: `${(score.depth / 5) * 100}%` }} />
              </span>
              <span className="prompt-eval__hint-num">{score.depth}/5</span>
            </div>
            <div className="prompt-eval__hint-text">{score.hint}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Three-block structured final feedback bubble.
// Renders the AI's reflection answer as three side-by-side cards instead of
// one long blob:
//   1. Что ты понял сам   (validation)
//   2. Что нужно знать    (must-know facts the Socratic method can't derive)
//   3. Где ты застрял     (struggles + clean explanations)
// Falls back gracefully when the model didn't follow the format.
// ---------------------------------------------------------------------------
function ReflectionFeedbackBubble(props: {
  message: ChatMessage;
  accent: string;
  gradient: string;
}) {
  const { message, accent, gradient } = props;
  const blocks: ReflectionFeedbackBlocks =
    message.feedbackBlocks ?? {
      validation: "",
      mustKnow: "",
      struggles: message.text,
    };

  return (
    <motion.div
      className="msg msg--ai msg--reflection-feedback"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="msg__orb" style={{ background: gradient }} />
      <div className="feedback-cards">
        <div
          className="feedback-cards__tag"
          style={{ color: accent, borderColor: `${accent}66` }}
        >
          итоговый фидбэк Духа Знаний
        </div>

        <div className="feedback-cards__grid">
          <article
            className="feedback-card feedback-card--validation"
            style={{ borderColor: "rgba(0, 229, 160, 0.35)" }}
          >
            <div className="feedback-card__head">
              <span className="feedback-card__icon">✓</span>
              <span className="feedback-card__title">
                Что ты понял сам
              </span>
            </div>
            <div className="feedback-card__body">
              {blocks.validation || "—"}
            </div>
          </article>

          <article
            className="feedback-card feedback-card--must-know"
            style={{ borderColor: `${accent}55` }}
          >
            <div className="feedback-card__head">
              <span
                className="feedback-card__icon"
                style={{ color: accent }}
              >
                📌
              </span>
              <span className="feedback-card__title">
                Что нужно знать
              </span>
            </div>
            <div className="feedback-card__body feedback-card__body--list">
              {blocks.mustKnow || "—"}
            </div>
          </article>

          <article
            className="feedback-card feedback-card--struggles"
            style={{ borderColor: "rgba(168, 85, 247, 0.4)" }}
          >
            <div className="feedback-card__head">
              <span className="feedback-card__icon">🧩</span>
              <span className="feedback-card__title">
                Где ты застрял
              </span>
            </div>
            <div className="feedback-card__body">
              {blocks.struggles || "—"}
            </div>
          </article>
        </div>
      </div>
    </motion.div>
  );
}
