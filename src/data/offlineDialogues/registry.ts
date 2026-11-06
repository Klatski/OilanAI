import type { OfflineDialogueTree } from "./types";
import { MATH_G7_OFFLINE_LESSONS, MATH_G7_OFFLINE_SOURCES, type LessonSource } from "./mathG7Top10Trees";
import { buildLessonTree } from "./buildLessonTree";
import { getCustomScenario, listCustomScenarios } from "../../utils/customScenarios";

const BUILT_IN_TREES = new Map<string, OfflineDialogueTree>(
  MATH_G7_OFFLINE_LESSONS.map((t) => [t.topicId, t])
);
const BUILT_IN_SOURCES = new Map<string, LessonSource>(
  MATH_G7_OFFLINE_SOURCES.map((s) => [s.topicId, s])
);

export type ScenarioOrigin = "custom" | "builtin";

/** Сценарий учителя (если есть) перекрывает встроенный. */
export function getOfflineTree(topicId: string): OfflineDialogueTree | undefined {
  const custom = getCustomScenario(topicId);
  if (custom) {
    try {
      return buildLessonTree(custom.topicId, custom.steps, custom.reflection);
    } catch {
      /* битые данные в localStorage — падаем на встроенный */
    }
  }
  return BUILT_IN_TREES.get(topicId);
}

export function hasOfflineTree(topicId: string): boolean {
  return !!getCustomScenario(topicId) || BUILT_IN_TREES.has(topicId);
}

export function scenarioOrigin(topicId: string): ScenarioOrigin | null {
  if (getCustomScenario(topicId)) return "custom";
  if (BUILT_IN_TREES.has(topicId)) return "builtin";
  return null;
}

/** Встроенный исходник темы — чтобы учитель мог начать с готового сценария. */
export function getBuiltInSource(topicId: string): LessonSource | undefined {
  return BUILT_IN_SOURCES.get(topicId);
}

export function offlineTreeTopicIds(): string[] {
  const ids = new Set<string>(BUILT_IN_TREES.keys());
  for (const s of listCustomScenarios()) ids.add(s.topicId);
  return [...ids];
}
