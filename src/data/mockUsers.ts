import type { User } from "../types";

/**
 * Demo accounts. Class assignments live in `mockClasses.ts` (single source of
 * truth for "who is in which class"). The fields below mirror them so
 * components that have a `User` in hand can read the `classId` directly.
 */
export const MOCK_USERS: User[] = [
  {
    id: "teacher_01",
    role: "teacher",
    name: "Алия Сейткали",
    email: "teacher@demo.com",
    password: "teacher123",
    avatar: "👩‍🏫",
    homeroomClassIds: ["class_5A", "class_7B", "class_11V"],
  },
  {
    id: "student_01",
    role: "student",
    name: "Арман Бекенов",
    email: "student@demo.com",
    password: "student123",
    avatar: "🧑‍💻",
    classId: "class_7B",
  },
  {
    id: "student_02",
    role: "student",
    name: "Дана Жунусова",
    email: "dana@demo.com",
    password: "dana123",
    avatar: "👩‍🎓",
    classId: "class_11V",
  },
  {
    id: "student_03",
    role: "student",
    name: "Тимур Ахметов",
    email: "timur@demo.com",
    password: "timur123",
    avatar: "🧑‍🎓",
    classId: "class_5A",
  },
  {
    id: "student_04",
    role: "student",
    name: "Айгерим Нурова",
    email: "aigerim@demo.com",
    password: "aigerim123",
    avatar: "👩‍💻",
    classId: "class_7B",
  },
];
