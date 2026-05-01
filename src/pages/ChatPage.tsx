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
import { getSubjectById } from "../data/mockSubjects";
import { getTopicById } from "../data/topics";
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
  type OfflineBranchSnapshot,
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
  Topic,
} from "../types";
import { getOfflineTree, hasOfflineTree } from "../data/offlineDialogues/registry";
import {
  readForceOffline,
  shouldUseOfflineLesson,
  writeForceOffline,
} from "../utils/offlineMode";
import {
  getNode,
  matchOfflineOption,
  nodeIsTerminal,
  renderOfflineTemplate,
} from "../utils/offlineDialogueEngine";
import type { OfflineTreeOption } from "../data/offlineDialogues/types";

function topicStructuralLabel(t: Topic): string {
  const bits = [`${t.grade} класс`, `${t.quarter} четверть`];
  if (t.curriculumModule) bits.push(t.curriculumModule);
  return bits.join(" · ");
}

function aiLessonParams(subjectName: string, lesson: Topic) {
  return {
    subject: subjectName,
    lesson: lesson.title,
    topic: topicStructuralLabel(lesson),
    grade: lesson.grade,
    quarter: lesson.quarter,
    programBasis: lesson.programBasis.trim() || undefined,
    curriculumModule: lesson.curriculumModule,
    learningGoal: lesson.learningGoal,
    prerequisites: lesson.prerequisites,
  };
}

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
  const { completeTopic, hasCompletedTopic } = useProgress();
  const [params] = useSearchParams();

  // We accept ?topic=<topicId> as the canonical URL.
  // Legacy `?subject=&lesson=` URLs no longer resolve to anything (we did a
  // hard schema migration); they redirect back to the picker below.
  const topicParam = params.get("topic") ?? "";

  const topic = useMemo(() => getTopicById(topicParam), [topicParam]);
  const subject = useMemo(
    () => (topic ? getSubjectById(topic.subjectId) : undefined),
    [topic]
  );

  // `lesson` was the old name — we keep the local alias so the rest of the
  // file stays readable. It's actually the current Topic now.
  const lesson = topic;

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

  const [netOnline, setNetOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [forceOffline, setForceOffline] = useState(() => readForceOffline());
  const [offlineLocked, setOfflineLocked] = useState(false);
  const [offlineBranch, setOfflineBranch] =
    useState<OfflineBranchSnapshot | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const up = () => setNetOnline(true);
    const down = () => setNetOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  const offlineTree = useMemo(
    () => (lesson ? getOfflineTree(lesson.id) : undefined),
    [lesson?.id]
  );

  const wantsOfflineLesson = shouldUseOfflineLesson(netOnline, forceOffline);
  const offlineBlockedNoScenario =
    !!lesson && wantsOfflineLesson && !hasOfflineTree(lesson.id);

  // ---------------------------------------------------------------------------
  // Hydrate state from localStorage every time the user/topic changes.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    hydratedRef.current = false;
    if (!lesson) {
      return;
    }
    const session = loadChatSession(currentUser?.id, lesson.id);

    if (session && session.knowledge) {
      setKnowledge(session.knowledge);
      setMessages(session.messages ?? []);
      setReflection(session.reflection ?? "");
      setXpGained(session.xpGained ?? 0);
      setCompleted(session.completed ?? false);
      setAiSource(session.aiSource ?? null);
      setOfflineLocked(session.offlineLocked ?? false);
      setOfflineBranch(session.offlineBranch ?? null);
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
    setOfflineLocked(false);
    setOfflineBranch(null);
    setCompleted(false);
    setRestoredBanner(false);
    hydratedRef.current = true;
  }, [lesson?.id, currentUser?.id]);

  // ---------------------------------------------------------------------------
  // Persist session after any meaningful change. We only save once hydrated
  // to avoid clobbering storage with empty initial state.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!hydratedRef.current || !currentUser?.id || !lesson) return;
    if (stage === "barrier" || !knowledge) return;

    const next: ChatSession = {
      userId: currentUser.id,
      topicId: lesson.id,
      knowledge,
      messages,
      reflection,
      feedback: "",
      xpGained,
      completed,
      aiSource,
      offlineLocked,
      offlineBranch,
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
    offlineLocked,
    offlineBranch,
    stage,
    lesson?.id,
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

  const lessonAlreadyCompleted = hasCompletedTopic(currentUser?.id, lesson.id);

  const runOfflineAdvance = (userVisible: string, chosen: OfflineTreeOption) => {
    if (!offlineTree || !offlineBranch || offlineBranch.atTerminal) return;

    const userMsgId = crypto.randomUUID();
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      text: userVisible,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    void evaluatePrompt(
      userVisible,
      {
        subject: subject.name,
        lesson: lesson.title,
        topic: topicStructuralLabel(lesson),
        programBasis: lesson.programBasis.trim() || undefined,
        learningGoal: lesson.learningGoal,
      },
      { offlineOnly: true }
    ).then((score) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === userMsgId
            ? {
                ...m,
                promptQuality: {
                  clarity: score.clarity,
                  depth: score.depth,
                  hint: score.hint,
                  source: score.source as PromptQualityScore["source"],
                },
              }
            : m
        )
      );
    });

    const nextNode = getNode(offlineTree, chosen.nextNodeId);
    if (!nextNode) return;

    const fn = currentUser?.name?.split(" ")[0] ?? "друг";
    const aiText = renderOfflineTemplate(nextNode.aiText, {
      firstName: fn,
      knowledge,
    });
    const aiMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      text: aiText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setOfflineBranch((prev) => {
      if (!prev || prev.atTerminal) return prev;
      return {
        nodeId: nextNode.id,
        turns: prev.turns + 1,
        atTerminal: nodeIsTerminal(nextNode),
      };
    });
    setAiSource("offline");
  };

  const handleBarrierSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (knowledge.trim().length < 10 || isThinking) return;
    if (offlineBlockedNoScenario) return;

    setStage("chat");
    setIsThinking(true);

    const firstName = currentUser?.name?.split(" ")[0] ?? "друг";
    const structLabel = topicStructuralLabel(lesson);
    const localIntro = `Привет, ${firstName}! Ты написал, что уже знаешь кое-что про «${subject.name}» — это отличная стартовая точка. Я — Дух Знаний, и готовых ответов от меня не жди. Моя задача — вести тебя вопросами, а не решать за тебя.\n\nИтак, по теме «${lesson.title}» (${structLabel}): что именно тебе кажется самым запутанным? С чего хочешь начать распутывать клубок?`;

    const startOfflineTree =
      offlineTree && shouldUseOfflineLesson(netOnline, forceOffline);

    if (startOfflineTree) {
      setOfflineLocked(true);
      setAiSource("offline");
      const introRaw = offlineTree.nodes[offlineTree.startNodeId].aiText;
      const introText = renderOfflineTemplate(introRaw, {
        firstName,
        knowledge,
      });
      const startNode = offlineTree.nodes[offlineTree.startNodeId];
      setOfflineBranch({
        nodeId: offlineTree.startNodeId,
        turns: 0,
        atTerminal: nodeIsTerminal(startNode),
      });
      const introMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: introText,
        timestamp: Date.now(),
        kind: "intro",
      };
      setMessages([introMsg]);
      setIsThinking(false);
      return;
    }

    try {
      const intro = await askIntroMessage({
        ...aiLessonParams(subject.name, lesson),
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

    if (
      offlineLocked &&
      offlineBranch &&
      offlineTree &&
      !offlineBranch.atTerminal
    ) {
      const node = getNode(offlineTree, offlineBranch.nodeId);
      if (!node?.options?.length) return;

      const chosen = matchOfflineOption(node.options, text);
      runOfflineAdvance(text, chosen);
      return;
    }

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
      topic: topicStructuralLabel(lesson),
      programBasis: lesson.programBasis.trim() || undefined,
      learningGoal: lesson.learningGoal,
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
        ...aiLessonParams(subject.name, lesson),
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

  const pickOfflineOption = (opt: OfflineTreeOption) => {
    if (isThinking) return;
    if (!offlineLocked || !offlineBranch || !offlineTree || offlineBranch.atTerminal)
      return;
    const node = getNode(offlineTree, offlineBranch.nodeId);
    if (!node?.options?.some((o) => o.id === opt.id)) return;
    runOfflineAdvance(opt.label, opt);
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

    if (offlineLocked && offlineTree) {
      const blocks = offlineTree.reflectionOutcome;
      feedbackBlocks = blocks;
      feedbackText =
        "Оффлайн: итог по теме собран из заготовленных блоков (без генеративного ИИ).";
      setAiSource("offline");
    } else if (offlineLocked) {
      feedbackBlocks = {
        validation:
          "Ты завершил(а) оффлайн-сценарий и написал(а) рефлексию — это ценный шаг.",
        mustKnow:
          "Итог по теме лучше уточнить с учителем: дерево диалога для этого урока не найдено в приложении.",
        struggles:
          "Если видишь это сообщение, возможно, тема устарела или данные сессии не совпадают с контентом.",
      };
      feedbackText =
        "Оффлайн-режим без привязки к дереву темы — показан запасной статический итог.";
      setAiSource("offline");
    } else {
      try {
        const result = await askStructuredReflectionFeedback(
          reflection,
          messages,
          {
            ...aiLessonParams(subject.name, lesson),
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
        completeTopic(currentUser.id, lesson.id, xp);
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
    resetChatSession(currentUser?.id, lesson.id);
    hydratedRef.current = false;
    setStage("barrier");
    setKnowledge("");
    setMessages([]);
    setInput("");
    setReflection("");
    setXpGained(0);
    setCompleted(false);
    setAiSource(null);
    setOfflineLocked(false);
    setOfflineBranch(null);
    setRestoredBanner(false);
    // re-enable persistence on next tick
    setTimeout(() => {
      hydratedRef.current = true;
    }, 0);
  };

  const userMessagesCount = messages.filter((m) => m.role === "user").length;
  const offlineCanReflect =
    !!offlineLocked &&
    !!offlineBranch &&
    (offlineBranch.atTerminal || offlineBranch.turns >= 5);
  const canReflect = offlineLocked ? offlineCanReflect : userMessagesCount >= 3;

  const offlineChoiceOptions =
    offlineLocked &&
    offlineBranch &&
    !offlineBranch.atTerminal &&
    offlineTree &&
    stage === "chat"
      ? getNode(offlineTree, offlineBranch.nodeId)?.options
      : undefined;

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
            {subject.name} · {topicStructuralLabel(lesson)}
          </div>
          <p className="chat-side__desc chat-side__desc--clamp">
            {lesson.description}
          </p>
          <details className="lesson-fold chat-side__lesson-fold">
            <summary>Подробнее о теме</summary>
            <div className="lesson-fold__inner">
              {lesson.programBasis.trim() ? (
                <section className="lesson-fold__section">
                  <h4>Программа</h4>
                  <p>{lesson.programBasis}</p>
                </section>
              ) : null}
              <section className="lesson-fold__section">
                <h4>Цель</h4>
                <p>{lesson.learningGoal}</p>
              </section>
              <section className="lesson-fold__section">
                <h4>Вспомнить</h4>
                <p>{lesson.prerequisites}</p>
              </section>
            </div>
          </details>

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
          <div className="chat-side__block-title">Оффлайн</div>
          <label className="chat-side__offline-toggle">
            <input
              type="checkbox"
              checked={forceOffline}
              onChange={(e) => {
                const v = e.target.checked;
                setForceOffline(v);
                writeForceOffline(v);
              }}
            />
            <span>Только оффлайн-сценарий</span>
          </label>
          <div
            className={`chat-side__net chat-side__net--${
              netOnline ? "on" : "off"
            }`}
          >
            Сеть: {netOnline ? "онлайн" : "оффлайн"}
          </div>
          {offlineTree ? (
            <p className="chat-side__offline-hint">
              Для этой темы есть оффлайн-сценарий (в бандле приложения).
            </p>
          ) : (
            <p className="chat-side__offline-hint chat-side__offline-hint--warn">
              Оффлайн-сценарий для этой темы не подключён.
            </p>
          )}
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
              {lesson.contentStatus === "in_development" && (
                <div className="barrier__status-banner barrier__status-banner--wip">
                  Тема в статусе «в разработке» — можно проходить, формулировки
                  уточним с методистом.
                </div>
              )}
              {wantsOfflineLesson && offlineTree ? (
                <div className="barrier__status-banner barrier__status-banner--offline-info">
                  Офлайн: сценарий урока — без живого ИИ и без школьных серверов,
                  только заготовленный диалог.
                </div>
              ) : null}
              {offlineBlockedNoScenario ? (
                <div className="barrier__status-banner barrier__status-banner--offline-block">
                  Для этой темы нет оффлайн-сценария. Включите интернет или
                  выберите тему из топ-списка математики 7 класса с деревом
                  диалога.
                </div>
              ) : null}
              <h2 className="barrier__title">
                Прежде чем заговорить с ИИ —<br />
                <span className="accent">что ты уже знаешь?</span>
              </h2>
              <p className="barrier__context">
                {subject.name}
                <span className="barrier__context-sep"> · </span>
                {lesson.title}
              </p>
              <p className="barrier__sub">
                Запиши своими словами, что уже понимаешь по теме (от 10
                символов) — затем активируется наставник.
              </p>
              <details className="lesson-fold barrier__lesson-fold">
                <summary>Подсказки к теме</summary>
                <div className="lesson-fold__inner">
                  {lesson.programBasis.trim() ? (
                    <section className="lesson-fold__section">
                      <h4>Программа</h4>
                      <p>{lesson.programBasis}</p>
                    </section>
                  ) : null}
                  <section className="lesson-fold__section">
                    <h4>Цель</h4>
                    <p>{lesson.learningGoal}</p>
                  </section>
                  <section className="lesson-fold__section">
                    <h4>Вспомнить</h4>
                    <p>{lesson.prerequisites}</p>
                  </section>
                  <section className="lesson-fold__section lesson-fold__section--hint">
                    <h4>Пример начала</h4>
                    <p>{lesson.barrierHintExample}</p>
                  </section>
                </div>
              </details>
              <textarea
                className="barrier__textarea"
                placeholder="Я знаю, что…"
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
                  disabled={
                    knowledge.trim().length < 10 || offlineBlockedNoScenario
                  }
                >
                  {wantsOfflineLesson && offlineTree
                    ? "Начать оффлайн-сценарий →"
                    : "Активировать ИИ ✨"}
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

              {offlineLocked && (
                <motion.div
                  className="chat-banner chat-banner--offline-lesson"
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span className="chat-banner__icon">◇</span>
                  <span className="chat-banner__text">
                    <b>Офлайн: сценарий урока.</b> Ответы наставника заранее
                    записаны; сеть и генеративный ИИ не используются.
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

              {stage === "chat" &&
                (!offlineLocked || !offlineBranch?.atTerminal) && (
                  <>
                    {offlineChoiceOptions && offlineChoiceOptions.length > 0 ? (
                      <div className="offline-option-panel">
                        <div className="offline-option-panel__title">
                          Выбери ответ или напиши свой вариант в поле ниже
                        </div>
                        <div className="offline-option-panel__grid">
                          {offlineChoiceOptions.map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              className="btn btn--ghost offline-option-btn"
                              disabled={isThinking}
                              onClick={() => pickOfflineOption(opt)}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <form
                      className="chat-input"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void sendMessage();
                      }}
                    >
                      <textarea
                        className="chat-input__field"
                        placeholder={
                          offlineLocked
                            ? "Свой ответ… Ключевые слова помогут подобрать ветку (или выбери кнопку)."
                            : "Напиши свою мысль... (Enter — отправить, Shift+Enter — новая строка)"
                        }
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
                  </>
                )}

              {stage === "chat" &&
              offlineLocked &&
              offlineBranch?.atTerminal ? (
                <div className="offline-terminal-hint">
                  <p>
                    Сценарий диалога завершён. Нажми в боковой панели{" "}
                    <b>«Перейти к рефлексии»</b>.
                  </p>
                </div>
              ) : null}
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
  if (source === "offline") {
    return (
      <div className="ai-badge ai-badge--offline">
        <span className="ai-badge__dot">◇</span>
        {getSourceLabel(source)}
      </div>
    );
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
