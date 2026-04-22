import type { User } from "../types";

export const MOCK_USERS: User[] = [
  {
    id: "teacher_01",
    role: "teacher",
    name: "Алия Сейткали",
    email: "teacher@demo.com",
    password: "teacher123",
    avatar: "👩‍🏫",
  },
  {
    id: "student_01",
    role: "student",
    name: "Арман Бекенов",
    email: "student@demo.com",
    password: "student123",
    avatar: "🧑‍💻",
  },
  {
    id: "student_02",
    role: "student",
    name: "Дана Жунусова",
    email: "dana@demo.com",
    password: "dana123",
    avatar: "👩‍🎓",
  },
  {
    id: "student_03",
    role: "student",
    name: "Тимур Ахметов",
    email: "timur@demo.com",
    password: "timur123",
    avatar: "🧑‍🎓",
  },
  {
    id: "student_04",
    role: "student",
    name: "Айгерим Нурова",
    email: "aigerim@demo.com",
    password: "aigerim123",
    avatar: "👩‍💻",
  },
];
