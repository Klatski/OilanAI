import type { Grade, Quarter, StudentProgress } from "../types";
import { buildTopicId } from "./topics";

/**
 * Pre-seeded student progress for the demo.
 *
 * `completedTopics` are stable topic ids (see `topics.ts`). They are seeded
 * for the student's *own* class/parallel — that's the natural pattern in real
 * usage and makes the teacher dashboard look believable.
 */

function ids(
  subjectId: string,
  grade: Grade,
  quarter: Quarter,
  orders: number[]
): string[] {
  return orders.map((o) => buildTopicId(subjectId, grade, quarter, o));
}

export const MOCK_PROGRESS: StudentProgress[] = [
  {
    userId: "student_01",
    name: "Арман Бекенов",
    avatar: "🧑‍💻",
    classId: "class_7B",
    xp: 870,
    level: 7,
    completedTopics: [
      ...ids("math", 7, 1, [1, 2, 3, 4]),
      ...ids("math", 7, 2, [1, 2]),
      ...ids("physics", 7, 1, [1, 2, 3]),
      ...ids("biology", 7, 1, [1, 2]),
    ],
    weakTopics: ["Многочлены", "Сила трения"],
    lastActive: "2026-04-28",
    promptQuality: 82,
    thinkingIndependence: 74,
  },
  {
    userId: "student_02",
    name: "Дана Жунусова",
    avatar: "👩‍🎓",
    classId: "class_11V",
    xp: 1200,
    level: 10,
    completedTopics: [
      ...ids("math", 11, 1, [1, 2, 3, 4]),
      ...ids("math", 11, 2, [1, 2, 3]),
      ...ids("physics", 11, 1, [1, 2, 3, 4]),
      ...ids("chemistry", 11, 1, [1, 2]),
      ...ids("english", 11, 1, [1, 2, 3]),
    ],
    weakTopics: ["Интеграл", "Логарифмы"],
    lastActive: "2026-04-30",
    promptQuality: 95,
    thinkingIndependence: 91,
  },
  {
    userId: "student_03",
    name: "Тимур Ахметов",
    avatar: "🧑‍🎓",
    classId: "class_5A",
    xp: 340,
    level: 3,
    completedTopics: [
      ...ids("math", 5, 1, [1, 2]),
      ...ids("biology", 5, 1, [1]),
      ...ids("english", 5, 1, [1, 2]),
    ],
    weakTopics: ["Деление с остатком", "Present Simple"],
    lastActive: "2026-04-25",
    promptQuality: 45,
    thinkingIndependence: 38,
  },
  {
    userId: "student_04",
    name: "Айгерим Нурова",
    avatar: "👩‍💻",
    classId: "class_7B",
    xp: 650,
    level: 5,
    completedTopics: [
      ...ids("math", 7, 1, [1, 2, 3]),
      ...ids("physics", 7, 1, [1, 2]),
      ...ids("biology", 7, 1, [1, 2, 3]),
      ...ids("english", 7, 1, [1, 2]),
    ],
    weakTopics: ["Формулы сокращённого умножения"],
    lastActive: "2026-04-29",
    promptQuality: 68,
    thinkingIndependence: 62,
  },
];

export function getProgressForStudent(
  userId: string | undefined | null
): StudentProgress | undefined {
  if (!userId) return undefined;
  return MOCK_PROGRESS.find((p) => p.userId === userId);
}
