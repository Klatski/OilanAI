import type { ReflectionFeedbackBlocks } from "../../types";

/** Optional classifier hints for analytics / future branching copy. */
export type OfflineOptionTag = "vague" | "asks_answer" | "good_hint";

/**
 * Pedagogical role of an option:
 *  - correct — верный ход мысли, урок идёт дальше;
 *  - wrong   — типичная ошибка, ведёт в ветку-подсказку;
 *  - unsure  — ученик сам признаёт затруднение, тоже ведёт в подсказку;
 *  - neutral — вопрос «о себе» (что сложно, как привык), правильного нет.
 */
export type OfflineOptionKind = "correct" | "wrong" | "unsure" | "neutral";

export interface OfflineTreeOption {
  id: string;
  label: string;
  nextNodeId: string;
  keywords?: string[];
  tag?: OfflineOptionTag;
  kind?: OfflineOptionKind;
}

export interface OfflineTreeNode {
  id: string;
  /** Supports {{firstName}} and {{knowledge}} on the start node. */
  aiText: string;
  /** If absent or empty, this is a terminal mentor message → рефлексия. */
  options?: OfflineTreeOption[];
  /**
   * Set on «объясняющих» узлах (вторая ошибка подряд): короткое имя шага,
   * на котором ученик споткнулся — попадает в блок «Где ты застрял».
   */
  missedFocus?: string;
}

export interface OfflineDialogueTree {
  topicId: string;
  startNodeId: string;
  nodes: Record<string, OfflineTreeNode>;
  reflectionOutcome: ReflectionFeedbackBlocks;
}
