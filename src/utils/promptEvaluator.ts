/**
 * Real-time prompt-quality evaluator.
 *
 * After each student message in the Socratic dialogue, we fire a lightweight
 * call to Gemini that returns a structured JSON evaluation:
 *   - clarity (1-5): is the question concrete and well-formed?
 *   - depth   (1-5): does it ask "why / how" instead of "what / give me"?
 *   - hint    : short Russian advice on how to improve the prompt next time.
 *
 * The evaluator never blocks the main chat — it runs in parallel and updates
 * the message in place. If the network or AI fails, we silently fall back to a
 * tiny local heuristic so the indicator never crashes the UI.
 *
 * Output is small (`max_tokens: 220`) and uses a separate "prompt-eval" stage
 * understood by the serverless proxy in `api/chat.ts` /
 * `netlify/functions/chat.ts`.
 */

export interface PromptScore {
  clarity: number; // 1-5
  depth: number; // 1-5
  hint: string; // ≤ ~100 symbols, RU
  source: "gemini-proxy" | "gemini-direct" | "local";
}

const VITE_GEMINI_KEY =
  (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ?? "";

const GEMINI_OPENAI_ENDPOINT =
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

const REQUEST_TIMEOUT_MS = 9_000;

let proxyAvailable: boolean | null = null;

interface EvalContext {
  subject: string;
  lesson: string;
  topic: string;
}

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

/** Strip ```json fences and any prose around the JSON object. */
function extractJson(text: string): string | null {
  const cleaned = text
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  const first = cleaned.indexOf("{");
  const last = cleaned.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return cleaned.slice(first, last + 1);
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : parseFloat(String(n));
  if (!Number.isFinite(v)) return 3;
  return Math.max(1, Math.min(5, Math.round(v)));
}

function parseScore(raw: string): Omit<PromptScore, "source"> | null {
  const json = extractJson(raw);
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as {
      clarity?: number;
      depth?: number;
      hint?: string;
    };
    if (parsed === null || typeof parsed !== "object") return null;
    return {
      clarity: clampScore(parsed.clarity),
      depth: clampScore(parsed.depth),
      hint:
        typeof parsed.hint === "string" && parsed.hint.trim()
          ? parsed.hint.trim().slice(0, 200)
          : "",
    };
  } catch {
    return null;
  }
}

async function tryProxy(
  message: string,
  ctx: EvalContext
): Promise<Omit<PromptScore, "source"> | null> {
  if (proxyAvailable === false) return null;
  try {
    const res = await fetchWithTimeout(
      "/api/chat",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: "prompt-eval",
          subject: ctx.subject,
          lesson: ctx.lesson,
          topic: ctx.topic,
          messages: [{ role: "user", content: message }],
        }),
      },
      REQUEST_TIMEOUT_MS
    );
    if (res.status === 404) {
      proxyAvailable = false;
      return null;
    }
    if (!res.ok) return null;
    const data = (await res.json()) as { text?: string };
    if (!data?.text) return null;
    proxyAvailable = true;
    return parseScore(data.text);
  } catch {
    return null;
  }
}

const EVAL_SYSTEM_PROMPT = `Ты — оценщик учебных вопросов в платформе OilanAI.
Перед тобой одно сообщение ученика, написанное во время сократовского диалога с ИИ-наставником.
Оцени КАЧЕСТВО ВОПРОСА (промпта) ученика по двум осям:
- "clarity" (1-5): насколько вопрос конкретный, понятный, с контекстом, а не размытый.
- "depth"   (1-5): глубина мышления — задаёт ли ученик "почему / как / что если" вместо "что это / дай ответ / реши за меня".

Дополнительно дай "hint" — одно короткое предложение на русском (макс. 90 символов), как ученику улучшить такой вопрос в следующий раз. Тон дружелюбный, конкретный, без воды.

Важно: если ученик просит готовый ответ или решение ("дай ответ", "реши", "что это") — depth должен быть низким (1-2).
Если вопрос содержит свою гипотезу, попытку рассуждения, проверку — depth высокий (4-5).

ОТВЕЧАЙ ТОЛЬКО ОДНИМ JSON-объектом в формате:
{"clarity":<1-5>,"depth":<1-5>,"hint":"<подсказка>"}
Никакого Markdown, кодовых блоков, объяснений — только сам JSON.`;

async function tryGeminiDirect(
  message: string,
  ctx: EvalContext
): Promise<Omit<PromptScore, "source"> | null> {
  if (!VITE_GEMINI_KEY) return null;
  try {
    const userPrompt = `Контекст урока: предмет "${ctx.subject}", тема "${ctx.lesson}" (${ctx.topic}).
Сообщение ученика для оценки:
«${message}»`;

    const res = await fetchWithTimeout(
      GEMINI_OPENAI_ENDPOINT,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${VITE_GEMINI_KEY}`,
        },
        body: JSON.stringify({
          model: "gemini-flash-lite-latest",
          temperature: 0.2,
          max_tokens: 220,
          reasoning_effort: "none",
          messages: [
            { role: "system", content: EVAL_SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
        }),
      },
      REQUEST_TIMEOUT_MS
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    return parseScore(text);
  } catch {
    return null;
  }
}

/** Tiny RU heuristic — used only when both proxy and direct call fail. */
function localHeuristic(message: string): Omit<PromptScore, "source"> {
  const text = message.trim().toLowerCase();
  const len = text.length;

  let clarity = 3;
  let depth = 3;

  if (len < 12) clarity = 1;
  else if (len < 30) clarity = 2;
  else if (len < 80) clarity = 3;
  else if (len < 200) clarity = 4;
  else clarity = 5;

  // Depth markers
  const lazy = /(дай ответ|реши за меня|реши это|что это|просто скажи|подскажи ответ)/.test(text);
  const curious =
    /(почему|зачем|как именно|как это работает|а если|что будет, если|правда ли|можно ли|откуда)/.test(
      text
    );
  const hypothesis = /(я думаю|мне кажется|возможно|по моему|похоже что)/.test(
    text
  );

  if (lazy) depth = 1;
  if (curious) depth = Math.max(depth, 4);
  if (hypothesis) depth = Math.max(depth, 4);
  if (curious && hypothesis) depth = 5;

  let hint = "";
  if (depth <= 2) {
    hint = "Попробуй спросить «почему» или «что если» вместо «дай ответ».";
  } else if (clarity <= 2) {
    hint = "Добавь контекст: о какой части темы идёт речь.";
  } else if (depth >= 4 && clarity >= 4) {
    hint = "Отличный вопрос — точный и с собственной гипотезой.";
  } else {
    hint = "Хорошо, но можно ещё конкретнее или с попыткой рассуждения.";
  }

  return { clarity, depth, hint };
}

/**
 * Public entry: evaluate one student prompt.
 * Always resolves (never throws) — falls back to the local heuristic.
 */
export async function evaluatePrompt(
  message: string,
  ctx: EvalContext
): Promise<PromptScore> {
  const trimmed = message.trim();
  if (!trimmed) {
    return { ...localHeuristic(""), source: "local" };
  }

  const proxy = await tryProxy(trimmed, ctx);
  if (proxy) return { ...proxy, source: "gemini-proxy" };

  const direct = await tryGeminiDirect(trimmed, ctx);
  if (direct) return { ...direct, source: "gemini-direct" };

  return { ...localHeuristic(trimmed), source: "local" };
}

export type PromptTier = "weak" | "ok" | "good";

/** Bucket avg score into UI tiers (red / yellow / green dot). */
export function tierFromScore(score: PromptScore): PromptTier {
  const avg = (score.clarity + score.depth) / 2;
  if (avg < 2.5) return "weak";
  if (avg < 4) return "ok";
  return "good";
}
