import type { ReflectionFeedbackBlocks } from "../../types";
import type { OfflineDialogueTree, OfflineTreeNode, OfflineTreeOption } from "./types";

export interface LinearSegment {
  text: string;
  choices: Array<{ label: string; keywords?: string[] }>;
}

/**
 * Простой линейный сценарий: на каждом шаге несколько кнопок, все ведут к одному
 * следующему узлу (надёжно для оффлайна). Последний сегмент с choices: [] —
 * финальный узел перед рефлексией.
 */
export function buildLinearOfflineTree(
  topicId: string,
  segments: LinearSegment[],
  reflectionOutcome: ReflectionFeedbackBlocks
): OfflineDialogueTree {
  const nodes: Record<string, OfflineTreeNode> = {};
  const ids = segments.map((_, i) => `n${i}`);

  segments.forEach((seg, i) => {
    const id = ids[i];
    const isLast = i === segments.length - 1;
    let options: OfflineTreeOption[] | undefined;

    if (!isLast && seg.choices.length > 0) {
      const nextId = ids[i + 1];
      options = seg.choices.map((c, j) => ({
        id: `${id}_c${j}`,
        label: c.label,
        nextNodeId: nextId,
        keywords: c.keywords,
      }));
    }

    nodes[id] = {
      id,
      aiText: seg.text,
      options,
    };
  });

  return {
    topicId,
    startNodeId: ids[0],
    nodes,
    reflectionOutcome,
  };
}
