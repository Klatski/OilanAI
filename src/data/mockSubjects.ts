import type { Subject } from "../types";

/**
 * Subjects are now pure categories — their topics live in `curriculum.ts` /
 * `topics.ts` and are filtered by (subjectId, grade, quarter) at render time.
 */
export const SUBJECTS: Subject[] = [
  {
    id: "math",
    name: "Математика",
    shortName: "Математика",
    icon: "📐",
    accent: "#6C63FF",
    gradient: "linear-gradient(135deg, #6C63FF 0%, #00D4FF 100%)",
    description:
      "Язык, на котором написана Вселенная. От переменных до интегралов.",
  },
  {
    id: "physics",
    name: "Физика",
    shortName: "Физика",
    icon: "⚛️",
    accent: "#00D4FF",
    gradient: "linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)",
    description: "Как устроен мир: от падающего яблока до чёрных дыр.",
  },
  {
    id: "chemistry",
    name: "Химия",
    shortName: "Химия",
    icon: "🧪",
    accent: "#00E5A0",
    gradient: "linear-gradient(135deg, #00E5A0 0%, #00D4FF 100%)",
    description:
      "Из чего сделано всё вокруг — и как оно превращается друг в друга.",
  },
  {
    id: "history",
    name: "История",
    shortName: "История",
    icon: "🏛️",
    accent: "#F97316",
    gradient: "linear-gradient(135deg, #F97316 0%, #EC4899 100%)",
    description:
      "Не даты, а причины и следствия. Почему мир стал таким, как есть.",
  },
  {
    id: "biology",
    name: "Биология",
    shortName: "Биология",
    icon: "🧬",
    accent: "#A855F7",
    gradient: "linear-gradient(135deg, #A855F7 0%, #00E5A0 100%)",
    description: "Как работает жизнь — от клетки до экосистемы планеты.",
  },
  {
    id: "english",
    name: "Английский",
    shortName: "English",
    icon: "🌍",
    accent: "#EC4899",
    gradient: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
    description:
      "Глобальный язык. Учись не зубрить, а думать по-английски.",
  },
];

export function getSubjectById(id: string | undefined | null): Subject | undefined {
  if (!id) return undefined;
  return SUBJECTS.find((s) => s.id === id);
}
