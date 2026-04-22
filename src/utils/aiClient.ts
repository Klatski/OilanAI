import {
  generateReflectionFeedback,
  generateSocraticReply,
  type SocraticContext,
} from "./socraticAI";
import { buildSystemPrompt, type ChatStage } from "./prompts";
import { sanitizeMath } from "./sanitizeMath";
import type { ChatMessage } from "../types";

/**
 * Unified AI client with graceful fallback:
 *   1. Try the serverless proxy `/api/chat` (Vercel/Netlify)
 *   2. Try direct Gemini API call (if VITE_GEMINI_API_KEY is provided)
 *   3. Fall back to local Socratic simulation
 *
 * The chat UI should *never* crash — worst case, we use the local heuristic.
 */

export type AISource = "gemini-proxy" | "gemini-direct" | "local";

export interface AIReplyResult {
  text: string;
  source: AISource;
}

export interface SocraticRequestParams {
  stage: ChatStage;
  subject: string;
  lesson: string;
  topic: string;
  knowledge: string;
  history: ChatMessage[];
  latestUserMessage: string;
}

const GEMINI_OPENAI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const VITE_GEMINI_KEY =
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";
const VITE_GEMINI_MODEL =
  (import.meta.env.VITE_GEMINI_MODEL as string | undefined) ??
  "gemini-flash-latest";

// Fallback chain: if the primary model returns 503 / 429 / 502 / timeout,
// we try the next one. Different models have separate quotas — this saves
// us when the free-tier limit on one model is exhausted.
// Order: primary → fast non-thinking → lite (bigger free quota).
const MODEL_FALLBACK_CHAIN = [
  VITE_GEMINI_MODEL,
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-2.0-flash",
  "gemini-2.5-flash",
].filter((m, i, arr) => arr.indexOf(m) === i); // dedupe

let proxyAvailable: boolean | null = null;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function toOpenAIMessages(history: ChatMessage[]) {
  return history
    .filter((m) => m.role === "user" || m.role === "ai")
    .map((m) => ({
      role: m.role === "ai" ? "assistant" : "user",
      content: m.text,
    }));
}

function maxTokensForStage(stage: ChatStage): number {
  // Gemini 2.5 models are "thinking" models — even with reasoning_effort="none"
  // we want plenty of headroom so the answer never gets truncated mid-sentence.
  switch (stage) {
    case "reflection":
      return 2500;
    case "start":
      return 1500;
    case "explore":
    default:
      return 1200;
  }
}

const REQUEST_TIMEOUT_MS = 12_000;

function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() =>
    clearTimeout(timer)
  );
}

async function tryProxy(
  params: SocraticRequestParams
): Promise<string | null> {
  if (proxyAvailable === false) return null;
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stage: params.stage,
        subject: params.subject,
        lesson: params.lesson,
        topic: params.topic,
        knowledge: params.knowledge,
        messages: toOpenAIMessages(params.history),
      }),
    });

    if (res.status === 404) {
      proxyAvailable = false;
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string; error?: string };
    if (!data?.text) return null;
    proxyAvailable = true;
    return sanitizeMath(data.text.trim());
  } catch {
    proxyAvailable = false;
    return null;
  }
}

async function callGeminiOnce(
  model: string,
  systemPrompt: string,
  params: SocraticRequestParams
): Promise<{ ok: true; text: string } | { ok: false; status: number }> {
  try {
    const res = await fetchWithTimeout(
      GEMINI_OPENAI_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VITE_GEMINI_KEY}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.75,
          max_tokens: maxTokensForStage(params.stage),
          // Disable internal reasoning on Gemini 2.5 thinking-models so
          // the whole token budget goes to the visible reply. Non-thinking
          // models silently ignore this field.
          reasoning_effort: "none",
          messages: [
            { role: "system", content: systemPrompt },
            ...toOpenAIMessages(params.history),
          ],
        }),
      },
      REQUEST_TIMEOUT_MS
    );
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text || !text.trim()) return { ok: false, status: 502 };
    return { ok: true, text: sanitizeMath(text.trim()) };
  } catch {
    // AbortError or network error — treat as transient
    return { ok: false, status: 0 };
  }
}

async function tryGeminiDirect(
  params: SocraticRequestParams
): Promise<string | null> {
  if (!VITE_GEMINI_KEY) return null;

  const systemPrompt = buildSystemPrompt(params.stage, {
    subject: params.subject,
    lesson: params.lesson,
    topic: params.topic,
    knowledge: params.knowledge,
  });

  // Walk through the fallback chain.
  //   - 429 (quota / rate-limit)  → IMMEDIATELY move to next model (its quota is separate)
  //   - 503 / 502 / network error → retry once with small backoff, then next model
  //   - other errors (401, 400…)  → stop
  for (const model of MODEL_FALLBACK_CHAIN) {
    let attempts = 0;
    while (attempts < 2) {
      attempts++;
      const result = await callGeminiOnce(model, systemPrompt, params);
      if (result.ok) {
        if (model !== VITE_GEMINI_MODEL || attempts > 1) {
          console.info(
            `[OilanAI] Gemini answered via ${model}` +
              (attempts > 1 ? ` (attempt ${attempts})` : " (fallback model)")
          );
        }
        return result.text;
      }

      if (result.status === 429) {
        // quota exhausted on this model — don't retry here, jump to next model
        console.warn(
          `[OilanAI] ${model}: quota / rate-limit exhausted, trying next model…`
        );
        break;
      }

      const canRetry =
        (result.status === 503 ||
          result.status === 502 ||
          result.status === 0) &&
        attempts < 2;
      if (!canRetry) {
        if (result.status !== 503 && result.status !== 502 && result.status !== 0) {
          console.warn(
            `[OilanAI] ${model}: hard failure (${result.status}), stopping`
          );
          return null;
        }
        break;
      }
      await sleep(600 + Math.random() * 400);
    }
  }
  return null;
}

function localFallback(
  params: SocraticRequestParams
): string {
  if (params.stage === "reflection") {
    return generateReflectionFeedback(params.latestUserMessage);
  }
  if (params.stage === "start") {
    return `Привет! Ты написал, что уже знаешь кое-что по теме «${params.lesson}» — это отличный старт 💡 Расскажи, что именно в этой теме кажется тебе самым запутанным, и с чего ты хочешь начать распутывать клубок?`;
  }
  const ctx: SocraticContext = {
    topic: `${params.subject}: ${params.lesson}`,
    knowledge: params.knowledge,
    turn: params.history.filter((m) => m.role === "user").length + 1,
  };
  return generateSocraticReply(params.latestUserMessage, ctx);
}

export async function askAI(
  params: SocraticRequestParams
): Promise<AIReplyResult> {
  const proxyReply = await tryProxy(params);
  if (proxyReply) return { text: proxyReply, source: "gemini-proxy" };

  const directReply = await tryGeminiDirect(params);
  if (directReply) return { text: directReply, source: "gemini-direct" };

  return { text: localFallback(params), source: "local" };
}

// --- Convenience wrappers for clarity at call sites --------------------------

export function askIntroMessage(
  params: Omit<SocraticRequestParams, "stage" | "history" | "latestUserMessage">
): Promise<AIReplyResult> {
  const userSeed = `Моя тема урока — «${params.lesson}» (${params.topic}).
Вот что я уже знаю по этой теме:
«${params.knowledge}»`;

  return askAI({
    ...params,
    stage: "start",
    latestUserMessage: userSeed,
    history: [
      {
        id: "intro-seed",
        role: "user",
        text: userSeed,
        timestamp: Date.now(),
      },
    ],
  });
}

export function askSocraticReply(
  params: Omit<SocraticRequestParams, "stage">
): Promise<AIReplyResult> {
  return askAI({ ...params, stage: "explore" });
}

export function askReflectionFeedback(
  reflection: string,
  dialogueHistory: ChatMessage[],
  params: Omit<SocraticRequestParams, "stage" | "history" | "latestUserMessage">
): Promise<AIReplyResult> {
  const userSeed = `Я закончил урок. Вот моя финальная рефлексия по теме «${params.lesson}»:

«${reflection}»

Пересмотри весь наш диалог выше. Сначала — найди в моей рефлексии конкретные правильные мысли и похвали меня за них. Затем — закрой те вопросы, которые я задавал тебе во время урока напрямую («дай ответ / объясни / как решить»), на которые ты тогда отвечал только подсказкой. Теперь можно прямо. Потом мягко дополни пробелы и дай чёткое итоговое объяснение темы простыми словами.`;

  return askAI({
    ...params,
    stage: "reflection",
    latestUserMessage: userSeed,
    // Pass the full dialogue so the AI can spot "open" questions the student
    // raised during `explore` that were intentionally left unanswered.
    history: [
      ...dialogueHistory,
      {
        id: "reflection-seed",
        role: "user",
        text: userSeed,
        timestamp: Date.now(),
      },
    ],
  });
}

export function getSourceLabel(source: AISource): string {
  switch (source) {
    case "gemini-proxy":
      return "Gemini (прокси)";
    case "gemini-direct":
      return "Gemini (прямой)";
    case "local":
      return "локальная симуляция";
  }
}
