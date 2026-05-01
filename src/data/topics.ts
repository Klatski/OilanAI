import type { Grade, Quarter, Topic } from "../types";
import { ALL_GRADES, ALL_QUARTERS } from "../types";
import { CURRICULUM, type TopicSeed } from "./curriculum";

/**
 * Flatten the nested CURRICULUM table into a single Topic[] with stable ids
 * shaped like `${subjectId}.g${grade}.q${quarter}.t${order}` или
 * `${subjectId}.g${grade}.q${quarter}.${lessonSlug}` при заданном slug в сиде.
 *
 * The id MUST be deterministic across reloads — it's used as:
 *   - URL parameter on the chat page,
 *   - chatStorage key,
 *   - progress key (`completedTopics`).
 *
 * Removing or reordering items in `curriculum.ts` will therefore invalidate
 * progress for those slots — that's intentional for the demo.
 */

export function buildTopicId(
  subjectId: string,
  grade: Grade,
  quarter: Quarter,
  order: number,
  lessonSlug?: string | null
): string {
  const slug = lessonSlug?.trim().replace(/[^a-z0-9-]/gi, "") ?? "";
  if (slug.length > 0) {
    return `${subjectId}.g${grade}.q${quarter}.${slug}`;
  }
  return `${subjectId}.g${grade}.q${quarter}.t${order}`;
}

function expandSeed(
  seed: TopicSeed,
  subjectId: string,
  grade: Grade,
  quarter: Quarter,
  order: number
): Topic {
  const rawSlug = seed.lessonSlug?.trim() ?? "";
  const slugSegment =
    rawSlug.length > 0
      ? rawSlug.replace(/[^a-z0-9-]/gi, "").toLowerCase()
      : "";
  const lessonSlug = slugSegment || `t${order}`;

  const learningGoal =
    seed.learningGoal?.trim() || seed.description || "";
  const prerequisites =
    seed.prerequisites?.trim() ||
    "Опирайся на то, что уже проходили в этом классе по предмету.";
  const barrierHintExample =
    seed.barrierHintExample?.trim() ||
    "Я знаю, что… (напиши по-честному, даже если пока немного).";

  return {
    id: buildTopicId(subjectId, grade, quarter, order, slugSegment || null),
    subjectId,
    grade,
    quarter,
    title: seed.title,
    description: seed.description,
    icon: seed.icon,
    order,
    lessonSlug,
    programBasis: seed.programBasis?.trim() || "",
    curriculumModule: seed.curriculumModule?.trim() || undefined,
    learningGoal,
    prerequisites,
    barrierHintExample,
    contentStatus: seed.contentStatus ?? "ready",
  };
}

const ALL_TOPICS: Topic[] = (() => {
  const out: Topic[] = [];
  for (const subjectId of Object.keys(CURRICULUM)) {
    const gradeMap = CURRICULUM[subjectId];
    for (const grade of ALL_GRADES) {
      const quarterMap = gradeMap[grade];
      if (!quarterMap) continue;
      for (const quarter of ALL_QUARTERS) {
        const seeds = quarterMap[quarter];
        if (!seeds) continue;
        seeds.forEach((seed, idx) => {
          out.push(expandSeed(seed, subjectId, grade, quarter, idx + 1));
        });
      }
    }
  }
  return out;
})();

const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t] as const));

export function getAllTopics(): Topic[] {
  return ALL_TOPICS;
}

export function getTopicById(id: string | undefined | null): Topic | undefined {
  if (!id) return undefined;
  return TOPIC_BY_ID.get(id);
}

export function getTopicsBySubject(subjectId: string): Topic[] {
  return ALL_TOPICS.filter((t) => t.subjectId === subjectId);
}

export function getTopicsBySubjectGrade(
  subjectId: string,
  grade: Grade
): Topic[] {
  return ALL_TOPICS.filter(
    (t) => t.subjectId === subjectId && t.grade === grade
  );
}

export function getTopicsBySubjectGradeQuarter(
  subjectId: string,
  grade: Grade,
  quarter: Quarter
): Topic[] {
  return ALL_TOPICS.filter(
    (t) =>
      t.subjectId === subjectId && t.grade === grade && t.quarter === quarter
  ).sort((a, b) => a.order - b.order);
}

/** Topics for a (subject, grade) grouped by quarter, in order. */
export function getTopicsBySubjectGradeGroupedByQuarter(
  subjectId: string,
  grade: Grade
): Record<Quarter, Topic[]> {
  const out = { 1: [], 2: [], 3: [], 4: [] } as Record<Quarter, Topic[]>;
  for (const t of getTopicsBySubjectGrade(subjectId, grade)) {
    out[t.quarter].push(t);
  }
  for (const q of ALL_QUARTERS) {
    out[q].sort((a, b) => a.order - b.order);
  }
  return out;
}

/** Total topic count for a (subject, grade). Useful for progress bars. */
export function countTopicsBySubjectGrade(
  subjectId: string,
  grade: Grade
): number {
  return getTopicsBySubjectGrade(subjectId, grade).length;
}

/** Total topic count for a single quarter — used by the StudentPage hero. */
export function countTopicsForQuarter(
  subjectId: string,
  grade: Grade,
  quarter: Quarter
): number {
  return getTopicsBySubjectGradeQuarter(subjectId, grade, quarter).length;
}
