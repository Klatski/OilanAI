import type { OfflineDialogueTree } from "./types";
import { MATH_G7_OFFLINE_LESSONS } from "./mathG7Top10Trees";

const BY_TOPIC_ID = new Map<string, OfflineDialogueTree>(
  MATH_G7_OFFLINE_LESSONS.map((t) => [t.topicId, t])
);

export function getOfflineTree(topicId: string): OfflineDialogueTree | undefined {
  return BY_TOPIC_ID.get(topicId);
}

export function hasOfflineTree(topicId: string): boolean {
  return BY_TOPIC_ID.has(topicId);
}

export function offlineTreeTopicIds(): string[] {
  return [...BY_TOPIC_ID.keys()];
}
