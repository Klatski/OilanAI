import type { SchoolClass } from "../types";

/**
 * Demo school: three classes across three different parallels (5, 7, 11).
 * One homeroom teacher (`teacher_01`) leads all three for the demo.
 */
export const MOCK_CLASSES: SchoolClass[] = [
  {
    id: "class_5A",
    name: "5А",
    grade: 5,
    letter: "А",
    homeroomTeacherId: "teacher_01",
    studentIds: ["student_03"], // Тимур
    accent: "#00E5A0",
    emoji: "🌱",
    motto: "Свежий старт средней школы",
  },
  {
    id: "class_7B",
    name: "7Б",
    grade: 7,
    letter: "Б",
    homeroomTeacherId: "teacher_01",
    studentIds: ["student_01", "student_04"], // Арман, Айгерим
    accent: "#6C63FF",
    emoji: "🚀",
    motto: "Ядро параллели — ключевые предметы набирают глубину",
  },
  {
    id: "class_11V",
    name: "11В",
    grade: 11,
    letter: "В",
    homeroomTeacherId: "teacher_01",
    studentIds: ["student_02"], // Дана
    accent: "#EC4899",
    emoji: "🎓",
    motto: "Выпускной класс — финальная подготовка",
  },
];

export function getClassById(
  classId: string | undefined | null
): SchoolClass | undefined {
  if (!classId) return undefined;
  return MOCK_CLASSES.find((c) => c.id === classId);
}

export function getClassByStudentId(
  studentId: string | undefined | null
): SchoolClass | undefined {
  if (!studentId) return undefined;
  return MOCK_CLASSES.find((c) => c.studentIds.includes(studentId));
}

export function getClassesForTeacher(
  teacherId: string | undefined | null
): SchoolClass[] {
  if (!teacherId) return [];
  return MOCK_CLASSES.filter((c) => c.homeroomTeacherId === teacherId);
}
