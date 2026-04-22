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

### Шаг 1 — получить API-ключ

1. Заходишь на [aistudio.google.com/apikey](https://aistudio.google.com/apikey) (логин через Google-аккаунт)
2. Нажимаешь **Create API key** → **Create API key in new project**
3. Копируешь ключ (начинается с `AIzaSy...`)

### Шаг 2 — выбрать способ подключения

В приложении встроены **три режима** с автоматическим фолбэком:

```
1. Serverless-прокси /api/chat  (production-way, ключ в безопасности)
   ↓ если не развёрнут
2. Прямой вызов из браузера     (быстрый dev/demo, ключ публичный)
   ↓ если ключ не задан
3. Локальная симуляция           (работает всегда, офлайн)
```

В чате есть индикатор «Движок ИИ», показывающий текущий источник.

---

### Режим A: быстрый запуск локально (ключ в браузере)

Подходит для разработки и демо. **НЕ для публичного хостинга** — ключ будет видно в DevTools.

1. Создай файл `.env` в корне проекта:
   ```
   VITE_GEMINI_API_KEY=AIzaSy_твой_ключ_здесь
   ```
2. Перезапусти `npm run dev`
3. Зайди в чат — в сайдбаре будет бейдж «Gemini (прямой)» ✅

---

### Режим B: безопасный деплой на Vercel (рекомендуется)

Ключ хранится на сервере, в браузер не попадает. Ровно как описано в архитектурном документе (раздел 3.2 «Умный Прокси-слой»).

1. Залей код в GitHub:
   ```bash
   git init
   git add .
   git commit -m "init"
   git remote add origin https://github.com/ТВОЙ_НИК/oilan-ai.git
   git push -u origin main
   ```
2. Зайди на [vercel.com](https://vercel.com) → **Import Project** → выбери репо
3. В **Settings → Environment Variables** добавь:
   ```
   GEMINI_API_KEY = AIzaSy_твой_ключ_здесь
   ```
   (опционально: `GEMINI_MODEL = gemini-2.5-flash`)
4. Жми **Deploy** — через 30 секунд получишь ссылку
5. В чате бейдж «Gemini (прокси)» ✅

Vercel сам подтянет `api/chat.ts` как serverless-функцию — никакой дополнительной настройки не нужно.

---

### Режим C: деплой на Netlify

Аналогично:

1. [app.netlify.com](https://app.netlify.com) → **Add new site → Import from Git**
2. **Site settings → Environment variables** → добавь `GEMINI_API_KEY`
3. Файлы `netlify.toml` и `netlify/functions/chat.ts` уже настроены — функция будет доступна по `/api/chat` через redirect.

---

### Доступные модели Gemini

Меняются через переменную `GEMINI_MODEL` (или `VITE_GEMINI_MODEL`):

| Модель              | Когда использовать                                |
| ------------------- | ------------------------------------------------- |
| `gemini-2.5-flash`  | **Default.** Быстрая, качественная, большой free tier |
| `gemini-2.0-flash`  | Стабильная проверенная версия                     |
| `gemini-2.5-pro`    | Максимальное качество (меньший free tier)         |
| `gemini-1.5-flash`  | Самая быстрая, для простых задач                  |

Актуальный список: [ai.google.dev/gemini-api/docs/models](https://ai.google.dev/gemini-api/docs/models)

---

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

6 предметов со своими наборами уроков, цветами и градиентами:

- 📐 **Математика** — 15 уроков
- ⚛️ **Физика** — 12 уроков
- 🧪 **Химия** — 10 уроков
- 🏛️ **История** — 12 уроков (включая историю Казахстана)
- 🧬 **Биология** — 10 уроков
- 🌍 **Английский** — 12 уроков

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
