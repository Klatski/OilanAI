# OilanAI — Архитектор Смыслов

> **Oilan** (каз. «ойлан») — *думай*. Платформа учит ученика думать **вместе** с ИИ, а не получать готовые ответы.

Веб-приложение для учеников и учителей, которое учит осознанно работать с ИИ через сократовский метод: ИИ не даёт готовых ответов, а ведёт ученика через наводящие вопросы.

Построено на основе документа `App's_Architecture.md`.

## Стек

- **React 18** + **TypeScript** + **Vite**
- **React Router v6** — роутинг
- **Framer Motion** — анимации
- **Context API** — стейт (Auth + Progress)
- **Google Gemini API** (OpenAI-совместимый endpoint) — настоящий ИИ-наставник
- Мок-авторизация через `localStorage`
- Прогресс по предметам — в `localStorage` (per-user per-subject)

## Запуск

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run preview
```

Без настройки Gemini приложение работает — будет использоваться локальная сократовская эвристика. Но с Gemini ИИ становится настоящим наставником.

---

## Подключение Gemini (настоящий ИИ)

Google Gemini — доступный глобально, с щедрым бесплатным tier-ом (1500 запросов/день для `gemini-2.5-flash`). Используется OpenAI-совместимый endpoint Google AI Studio.


## Демо-аккаунты

| Роль    | Email              | Пароль       |
| ------- | ------------------ | ------------ |
| Учитель | teacher@demo.com   | teacher123   |
| Ученик  | student@demo.com   | student123   |
| Ученик  | dana@demo.com      | dana123      |
| Ученик  | timur@demo.com     | timur123     |
| Ученик  | aigerim@demo.com   | aigerim123   |

На экране входа можно кликнуть по демо-карточке — поля заполнятся автоматически.

## Переключение между аккаунтами

В правом верхнем углу — аватар текущего пользователя. Клик открывает меню со всеми демо-аккаунтами — одним кликом переключаешься без повторного ввода пароля.

## Маршруты

| URL                                  | Доступ         | Описание                      |
| ------------------------------------ | -------------- | ----------------------------- |
| `/login`                             | публичный      | Авторизация                   |
| `/student`                           | `student`      | Выбор предмета                |
| `/student/subject/:subjectId`        | `student`      | Карта квеста по предмету      |
| `/student/chat?subject=X&lesson=Y`   | `student`      | Сократовский чат              |
| `/teacher`                           | `teacher`      | Аналитический дашборд         |
| `/api/chat`                          | serverless     | Прокси к Groq (в проде)       |

## Предметы

6 предметов со своими наборами уроков, цветами и градиентами

Прогресс хранится per-user per-subject, сохраняется между сессиями.

## Структура проекта

```
├── api/
│   └── chat.ts                 # Vercel serverless proxy для Groq
├── netlify/functions/
│   └── chat.ts                 # Netlify-версия того же
├── src/
│   ├── components/
│   │   ├── AccountSwitcher.tsx
│   │   ├── Header.tsx
│   │   └── ProtectedRoute.tsx
│   ├── context/
│   │   ├── AuthContext.tsx
│   │   └── ProgressContext.tsx
│   ├── data/
│   │   ├── mockUsers.ts
│   │   ├── mockProgress.ts
│   │   └── mockSubjects.ts
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── SubjectPickerPage.tsx
│   │   ├── StudentPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── TeacherDashboard.tsx
│   ├── utils/
│   │   ├── aiClient.ts         # Gemini + фолбэк на локальную эвристику
│   │   └── socraticAI.ts       # локальная эвристика (fallback)
│   └── styles/index.css
├── vercel.json
├── netlify.toml
└── .env.example
```

## Как это работает (AI flow)

1. Ученик пишет сообщение в чат
2. `ChatPage` вызывает `askSocraticAI({ subject, lesson, topic, knowledge, history })`
3. `aiClient.ts` пробует:
   - **POST `/api/chat`** → если есть serverless-функция с ключом
   - **POST на `generativelanguage.googleapis.com`** напрямую → если задан `VITE_GEMINI_API_KEY`
   - **Локальная эвристика** → если нет ни того, ни другого
4. Возвращается `{ text, source }` — текст ответа и откуда он пришёл
5. Индикатор «Движок ИИ» в сайдбаре показывает текущий источник в реальном времени

## Дизайн-система

Следует гайдлайнам документа:

- Фон: `#0D1117` / `#1A1D2E`
- Акценты: градиент `#6C63FF → #00D4FF`
- Успех: `#00E5A0`
- Магия: `#A855F7 → #EC4899`
- Ошибки: мягкий `#F97316` (не агрессивный красный)
- Шрифт Inter, скруглённые формы, неоновые свечения
