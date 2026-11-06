import type { LessonSource } from "../data/offlineDialogues/mathG7Top10Trees";
import type { LessonStep } from "../data/offlineDialogues/buildLessonTree";

/**
 * Сценарии уроков, которые учитель написал (или отредактировал) в редакторе.
 *
 * Хранятся в localStorage этого браузера — реального бэкенда в прототипе нет.
 * Чтобы перенести сценарии на устройства учеников, есть экспорт/импорт JSON.
 * Сценарий учителя для темы перекрывает встроенный.
 */

export interface CustomScenario extends LessonSource {
  /** Имя учителя, который сохранил сценарий. */
  author?: string;
  updatedAt: number;
}

const STORAGE_KEY = "oilanai_custom_scenarios_v1";
const EXPORT_FORMAT = "oilanai-scenarios";

type Store = Record<string, CustomScenario>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // quota / private mode — the editor shows this message
    throw new Error("Не удалось сохранить: хранилище браузера недоступно или переполнено.");
  }
  window.dispatchEvent(new Event("oilanai-scenarios-changed"));
}

export function listCustomScenarios(): CustomScenario[] {
  return Object.values(readStore()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getCustomScenario(topicId: string): CustomScenario | undefined {
  return readStore()[topicId];
}

export function saveCustomScenario(scenario: Omit<CustomScenario, "updatedAt">): CustomScenario {
  const store = readStore();
  const saved: CustomScenario = { ...scenario, updatedAt: Date.now() };
  store[scenario.topicId] = saved;
  writeStore(store);
  return saved;
}

export function deleteCustomScenario(topicId: string): void {
  const store = readStore();
  delete store[topicId];
  writeStore(store);
}

// ---------------------------------------------------------------- validation

export interface ScenarioIssue {
  /** Индекс шага (null — сценарий целиком / рефлексия). */
  step: number | null;
  message: string;
}

const blank = (s: string | undefined) => !s || s.trim().length === 0;

/** Ошибки, которые не дадут сохранить сценарий: ученик бы застрял или увидел пустоту. */
export function validateScenario(steps: LessonStep[], reflection: LessonSource["reflection"]): ScenarioIssue[] {
  const issues: ScenarioIssue[] = [];
  const questions = steps.slice(0, -1);
  const final = steps[steps.length - 1];

  if (questions.length === 0) {
    issues.push({ step: null, message: "Добавьте хотя бы один вопрос." });
  }
  if (!final || blank(final.text)) {
    issues.push({ step: null, message: "Заполните финальную реплику перед рефлексией." });
  }

  questions.forEach((st, i) => {
    if (blank(st.text)) issues.push({ step: i, message: "Пустой текст вопроса." });
    if (st.choices.length < 2) issues.push({ step: i, message: "Нужно минимум два варианта ответа." });
    st.choices.forEach((c, j) => {
      if (blank(c.label)) issues.push({ step: i, message: `Пустой вариант ответа №${j + 1}.` });
      if (c.kind === "wrong" && blank(c.feedback)) {
        issues.push({
          step: i,
          message: `Для ошибки «${c.label || `№${j + 1}`}» напишите наводящий вопрос.`,
        });
      }
    });
    const graded = st.choices.some((c) => c.kind === "correct");
    const hasMistakes = st.choices.some((c) => c.kind === "wrong" || c.kind === "unsure");
    if (!graded && hasMistakes) {
      issues.push({ step: i, message: "Есть варианты-ошибки, но не отмечен верный ответ." });
    }
    if (graded && blank(st.explain)) {
      issues.push({ step: i, message: "Напишите разбор — он показывается после второй ошибки." });
    }
  });

  if (blank(reflection.validation) || blank(reflection.mustKnow) || blank(reflection.struggles)) {
    issues.push({ step: null, message: "Заполните все три блока итога для рефлексии." });
  }
  return issues;
}

// ---------------------------------------------------------- export / import

export function exportScenariosJson(scenarios: CustomScenario[]): string {
  return JSON.stringify({ format: EXPORT_FORMAT, version: 1, scenarios }, null, 2);
}

/** Возвращает число импортированных сценариев; бросает Error с понятным текстом. */
export function importScenariosJson(json: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("Файл не похож на JSON.");
  }
  const data = parsed as { format?: string; scenarios?: unknown };
  if (data?.format !== EXPORT_FORMAT || !Array.isArray(data.scenarios)) {
    throw new Error("Это не файл сценариев OilanAI.");
  }
  const store = readStore();
  let count = 0;
  for (const raw of data.scenarios as CustomScenario[]) {
    if (
      !raw ||
      typeof raw.topicId !== "string" ||
      !Array.isArray(raw.steps) ||
      !raw.reflection ||
      validateScenario(raw.steps, raw.reflection).length > 0
    ) {
      continue;
    }
    store[raw.topicId] = { ...raw, updatedAt: raw.updatedAt ?? Date.now() };
    count++;
  }
  if (count === 0) throw new Error("В файле нет корректных сценариев.");
  writeStore(store);
  return count;
}
