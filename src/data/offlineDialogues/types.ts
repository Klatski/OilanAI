import type { ReflectionFeedbackBlocks } from "../../types";

/** Optional classifier hints for analytics / future branching copy. */
export type OfflineOptionTag = "vague" | "asks_answer" | "good_hint";

export interface OfflineTreeOption {
  id: string;
  label: string;
  nextNodeId: string;
  keywords?: string[];
  tag?: OfflineOptionTag;
}

export interface OfflineTreeNode {
  id: string;
  /** Supports {{firstName}} and {{knowledge}} on the start node. */
  aiText: string;
  /** If absent or empty, this is a terminal mentor message → рефлексия. */
  options?: OfflineTreeOption[];
}

export interface OfflineDialogueTree {
  topicId: string;
  startNodeId: string;
  nodes: Record<string, OfflineTreeNode>;
  reflectionOutcome: ReflectionFeedbackBlocks;
}
