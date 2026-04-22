import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_LESSONS } from "../data/mockLessons";
import { useAuth } from "../context/AuthContext";
import {
  generateReflectionFeedback,
  generateSocraticReply,
} from "../utils/socraticAI";
import type { ChatMessage } from "../types";

type Stage = "barrier" | "chat" | "reflection" | "done";

export function ChatPage() {
  const { currentUser } = useAuth();
  const [params] = useSearchParams();
  const lessonId = Number(params.get("lesson")) || 1;
  const lesson = useMemo(
    () => MOCK_LESSONS.find((l) => l.id === lessonId) ?? MOCK_LESSONS[0],
    [lessonId]
  );

  const [stage, setStage] = useState<Stage>("barrier");
  const [knowledge, setKnowledge] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [reflection, setReflection] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStage("barrier");
    setKnowledge("");
    setMessages([]);
    setInput("");
    setReflection("");
    setFeedback(null);
  }, [lessonId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

  const handleBarrierSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (knowledge.trim().length < 10) return;

    const intro: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      text: `Привет, ${
        currentUser?.name.split(" ")[0] ?? "друг"
      }! Ты написал, что уже знаешь кое-что про «${
        lesson.topic
      }» — это отличная стартовая точка. Я — Дух Знаний, и готовых ответов от меня не жди. Моя задача — вести тебя вопросами, а не решать за тебя.\n\nИтак, по теме «${
        lesson.title
      }»: что именно в этой теме тебе кажется самым запутанным? С чего хочешь начать распутывать клубок?`,
      timestamp: Date.now(),
    };
    setMessages([intro]);
    setStage("chat");
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isThinking) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsThinking(true);

    const turn = messages.filter((m) => m.role === "user").length + 1;

    window.setTimeout(() => {
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        text: generateSocraticReply(text, {
          topic: lesson.topic,
          knowledge,
          turn,
        }),
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, reply]);
      setIsThinking(false);
    }, 900 + Math.random() * 700);
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const submitReflection = (e: FormEvent) => {
    e.preventDefault();
    if (reflection.trim().length < 10) return;
    setFeedback(generateReflectionFeedback(reflection));
    setStage("done");
  };

  const userMessagesCount = messages.filter((m) => m.role === "user").length;
  const canReflect = userMessagesCount >= 3;

  return (
    <div className="chat-page">
      <aside className="chat-side">
        <div className="chat-side__lesson">
          <div className="chat-side__icon">{lesson.icon}</div>
          <div className="chat-side__title">{lesson.title}</div>
          <div className="chat-side__topic">{lesson.topic}</div>
          <p className="chat-side__desc">{lesson.description}</p>
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
                stage === "reflection"
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

        {stage === "chat" && canReflect && (
          <button
            className="btn btn--ghost btn--full"
            onClick={() => setStage("reflection")}
          >
            Перейти к рефлексии →
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
              <div className="barrier__orb" />
              <h2 className="barrier__title">
                Прежде чем заговорить с ИИ —<br />
                <span className="accent">что ты уже знаешь?</span>
              </h2>
              <p className="barrier__sub">
                Тема: <b>{lesson.title}</b>. Напиши своими словами всё, что
                помнишь, даже если это совсем немного. Только после этого ИИ
                активируется.
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
                  className={
                    knowledge.trim().length >= 10 ? "ok" : "pending"
                  }
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
              <div className="chat-window__messages" ref={scrollRef}>
                {messages.map((m) => (
                  <motion.div
                    key={m.id}
                    className={`msg msg--${m.role}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {m.role === "ai" && <div className="msg__orb" />}
                    <div className="msg__bubble">{m.text}</div>
                  </motion.div>
                ))}

                {isThinking && (
                  <div className="msg msg--ai">
                    <div className="msg__orb msg__orb--pulsing" />
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
                      Финальная рефлексия
                    </div>
                    <div className="reflection__sub">
                      Напиши своими словами: что главное ты понял в этой теме?
                    </div>
                    <textarea
                      className="barrier__textarea"
                      placeholder="Я понял, что..."
                      value={reflection}
                      onChange={(e) => setReflection(e.target.value)}
                      rows={5}
                    />
                    <button
                      className="btn btn--primary"
                      type="submit"
                      disabled={reflection.trim().length < 10}
                    >
                      Отправить рефлексию
                    </button>
                  </motion.form>
                )}

                {stage === "done" && feedback && (
                  <motion.div
                    className="reflection__feedback"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="reflection__feedback-title">
                      Фидбэк Духа Знаний
                    </div>
                    <div className="reflection__feedback-text">{feedback}</div>
                    <div className="reflection__feedback-xp">
                      +{40 + Math.min(60, reflection.length)} XP
                    </div>
                  </motion.div>
                )}
              </div>

              {stage === "chat" && (
                <form
                  className="chat-input"
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendMessage();
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
