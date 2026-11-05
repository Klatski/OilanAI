/**
 * Integrity guard — lightweight client-side heuristics that estimate how
 * *independently* a student worked during a Socratic session and translate
 * that into an XP penalty + human-readable flags.
 *
 * This lives entirely on the client, so it can be bypassed (DevTools, manual
 * retyping, autotypers). That's fine: the goal is **friction + a nudge + a
 * signal** — in the spirit of "think WITH the AI, don't extract answers from
 * it" (App's_Architecture.md §1) — not hard anti-cheat security.
 *
 * Everything here is a pure function so it's trivially testable and never
 * touches the network.
 */

import type { ChatMessage } from "../types";

// ---------------------------------------------------------------------------
// Text utilities
// ---------------------------------------------------------------------------

/** Lowercase, drop punctuation, split into word tokens. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Build the set of word n-grams ("shingles") for a token list. */
function wordShingles(tokens: string[], n: number): Set<string> {
  const out = new Set<string>();
  if (tokens.length < n) return out;
  for (let i = 0; i + n <= tokens.length; i++) {
    out.add(tokens.slice(i, i + n).join(" "));
  }
  return out;
}

/**
 * Fraction of `text`'s word-shingles that also appear in any of `sources`.
 * The classic cheap plagiarism signal: copied phrases share long shingles,
 * independent paraphrase does not. Falls back to word-containment for texts
 * too short to shingle.
 */
export function copyOverlap(text: string, sources: string[], n = 3): number {
  const t = tokenize(text);
  if (t.length === 0) return 0;

  if (t.length < n) {
    const srcWords = new Set(sources.flatMap(tokenize));
    if (srcWords.size === 0) return 0;
    const hit = t.filter((w) => srcWords.has(w)).length;
    return hit / t.length;
  }

  const srcShingles = new Set<string>();
  for (const s of sources) {
    wordShingles(tokenize(s), n).forEach((sh) => srcShingles.add(sh));
  }
  if (srcShingles.size === 0) return 0;

  const textShingles = [...wordShingles(t, n)];
  if (textShingles.length === 0) return 0;
  const hit = textShingles.filter((sh) => srcShingles.has(sh)).length;
  return hit / textShingles.length;
}

/**
 * Detect formatting typical of pasted LLM output: bullet / numbered lists,
 * bold, headings, tables. Students writing "своими словами" in a plain
 * textarea almost never produce this.
 */
export function hasHeavyMarkdown(text: string): boolean {
  let categories = 0;
  if (/^\s*[-*•]\s+\S/m.test(text)) categories++; // bullet list
  if (/^\s*\d+[.)]\s+\S/m.test(text)) categories++; // numbered list
  if (/\*\*[^*]+\*\*|__[^_]+__/.test(text)) categories++; // bold
  if (/^#{1,6}\s+\S/m.test(text)) categories++; // heading
  const table = /\|.*\|/.test(text) && /\|?\s*:?-{2,}/.test(text); // md table
  if (table) return true;
  return categories >= 2;
}

/**
 * Suspicion (0..1) that `text` is far more polished / externally-authored than
 * the student's own `baseline` writing (their "what I know" barrier).
 */
export function styleJumpScore(baseline: string, text: string): number {
  if (!text.trim()) return 0;
  let score = 0;

  // Heavy markdown in the answer but not in the baseline → strong signal.
  if (hasHeavyMarkdown(text) && !hasHeavyMarkdown(baseline)) score += 0.6;

  // Dramatic length jump over the baseline.
  const ratio = text.trim().length / Math.max(40, baseline.trim().length);
  if (ratio > 5 && text.trim().length > 400) {
    score += Math.min(0.4, (ratio - 5) * 0.08 + 0.2);
  }

  return Math.min(1, score);
}

/**
 * Does the character count appear impossible to have been *typed* in the
 * elapsed time? Conservative threshold (~22 chars/sec sustained over 40+
 * chars) so normal fast typists don't trip it.
 */
export function typingLooksAutomated(
  charCount: number,
  elapsedMs: number
): boolean {
  if (charCount < 40) return false;
  if (elapsedMs <= 0) return true;
  const charsPerSec = charCount / (elapsedMs / 1000);
  return charsPerSec > 22;
}

// ---------------------------------------------------------------------------
// Session-level assessment
// ---------------------------------------------------------------------------

export interface IntegritySignals {
  /** # of dialogue messages that were (mostly) pasted. */
  pastedMessageCount: number;
  /** # of dialogue messages that appeared faster than humanly typable. */
  fastTypedCount: number;
  /** Length-weighted paste ratio across all user dialogue messages (0..1). */
  avgPasteRatio: number;
  /** Reflection was (mostly) pasted. */
  reflectionPasted: boolean;
  /** How much the reflection echoes the AI's own replies (0..1). */
  reflectionEcho: number;
  /** Reflection looks externally-authored vs the barrier baseline (0..1). */
  styleJump: number;
  /** Reflection submitted implausibly fast after opening the reflection step. */
  quickReflection: boolean;
  /** Derived independence score, 0..100 (higher = worked more on their own). */
  independence: number;
  /** Human-readable Russian reasons, shown to the student / teacher. */
  flags: string[];
}

export interface AnalyzeArgs {
  knowledge: string;
  reflection: string;
  messages: ChatMessage[];
  /** Paste ratio of the reflection textarea (0..1). */
  reflectionPasteRatio: number;
  /** Ms between opening the reflection step and submitting it. */
  reflectionThinkMs: number;
  /** The barrier itself was pasted → its baseline is unreliable. */
  barrierPasted: boolean;
}

export function analyzeSession(args: AnalyzeArgs): IntegritySignals {
  const userMessages = args.messages.filter((m) => m.role === "user");
  const aiTexts = args.messages
    .filter((m) => m.role === "ai")
    .map((m) => m.text);

  const pastedMessageCount = userMessages.filter((m) => m.pasted).length;
  const fastTypedCount = userMessages.filter((m) => m.typedTooFast).length;

  let weightedPaste = 0;
  let totalLen = 0;
  for (const m of userMessages) {
    const len = m.text.length;
    weightedPaste += (m.pasteRatio ?? 0) * len;
    totalLen += len;
  }
  const avgPasteRatio = totalLen > 0 ? weightedPaste / totalLen : 0;

  const reflectionPasted = args.reflectionPasteRatio > 0.6;
  const reflectionEcho = copyOverlap(args.reflection, aiTexts);
  const styleJump = args.barrierPasted
    ? 0
    : styleJumpScore(args.knowledge, args.reflection);
  const quickReflection =
    args.reflectionThinkMs > 0 &&
    args.reflectionThinkMs < 6000 &&
    args.reflection.trim().length > 250;

  const flags: string[] = [];
  if (pastedMessageCount > 0)
    flags.push(
      `вставлен текст в диалоге (${pastedMessageCount} сообщ.)`
    );
  if (fastTypedCount > 0)
    flags.push("сообщение появилось быстрее, чем его можно напечатать");
  if (reflectionPasted) flags.push("рефлексия вставлена целиком");
  if (reflectionEcho > 0.5)
    flags.push("рефлексия почти дословно повторяет слова наставника");
  if (styleJump > 0.4)
    flags.push("стиль рефлексии резко отличается от твоего барьера знаний");
  if (quickReflection) flags.push("рефлексия отправлена слишком быстро");

  let independence = 100;
  independence -= avgPasteRatio * 40;
  independence -= reflectionPasted ? 25 : 0;
  independence -= reflectionEcho > 0.5 ? reflectionEcho * 30 : 0;
  independence -= styleJump * 20;
  independence -= Math.min(15, fastTypedCount * 5);
  independence -= quickReflection ? 10 : 0;
  independence = Math.max(0, Math.min(100, Math.round(independence)));

  return {
    pastedMessageCount,
    fastTypedCount,
    avgPasteRatio,
    reflectionPasted,
    reflectionEcho,
    styleJump,
    quickReflection,
    independence,
    flags,
  };
}

/** XP points to subtract from the adaptive award, given the signals. */
export function xpPenaltyFromSignals(s: IntegritySignals): number {
  return Math.max(0, Math.min(90, Math.round((100 - s.independence) * 0.7)));
}

/** Is a single pasted chat message big enough to warrant an inline nudge? */
export function isNudgeWorthyPaste(pasteRatio: number, length: number): boolean {
  return pasteRatio >= 0.85 && length >= 60;
}
