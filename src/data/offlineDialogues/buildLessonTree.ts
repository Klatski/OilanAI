import type { ReflectionFeedbackBlocks } from "../../types";
import type {
  OfflineDialogueTree,
  OfflineOptionKind,
  OfflineTreeNode,
  OfflineTreeOption,
} from "./types";

/**
 * Сценарий урока для оффлайна с реакцией на ошибки.
 *
 * Каждый шаг — вопрос наставника и варианты ответа. Для «проверочного» шага
 * (есть вариант kind: "correct") строится маленькая ветка исправления:
 *
 *   вопрос ──верно──────────────────────────────▶ следующий шаг
 *     │
 *     ├─ ошибка ─▶ наводящий вопрос (feedback этой ошибки) ─┬─верно─▶ следующий шаг
 *     │                                                     └─снова мимо─▶ разбор
 *     └─ «не уверен» ─▶ подсказка (hint) ───────────────────┬─верно─▶ следующий шаг
 *                                                           └─снова мимо─▶ разбор
 *   разбор (explain) ──«понятно, идём дальше»──▶ следующий шаг
 *
 * Так ученик не может «прокликать» урок неверными ответами, но и не застревает:
 * после второй ошибки наставник объясняет сам и возвращает на основной путь.
 *
 * Шаги без верного ответа (вопросы «о себе») ведут прямо к следующему шагу.
 * Последний шаг с choices: [] — финальная реплика перед рефлексией.
 */

export interface StepChoice {
  label: string;
  /** По умолчанию "neutral". */
  kind?: OfflineOptionKind;
  /** Для kind: "wrong" — наводящий вопрос/контрпример, без готового ответа. */
  feedback?: string;
  keywords?: string[];
}

export interface LessonStep {
  text: string;
  choices: StepChoice[];
  /** Короткое имя шага для блока «Где ты застрял» (например, «деление степеней»). */
  focus?: string;
  /** Подсказка для варианта «не уверен(а)». */
  hint?: string;
  /** Разбор после второй ошибки — здесь уже можно объяснить прямо. */
  explain?: string;
}

const UNSURE_KEYWORDS = [
  "не знаю",
  "не понимаю",
  "не уверен",
  "другое",
  "не могу",
  "путаюсь",
  "своими",
];

const ESCAPE_LABEL = "Всё ещё сомневаюсь — покажи разбор";
const MOVE_ON_LABEL = "Понятно, идём дальше";

const ACK_FIRST_TRY = [
  "Верно.",
  "Да, именно так.",
  "Точно — хорошая мысль.",
  "Верно, и это не случайное попадание.",
];
const ACK_AFTER_HINT = [
  "Вот, теперь сходится.",
  "Да! Видишь — ты дошёл(ла) до этого сам(а).",
  "Именно. Подсказка была лишь толчком, вывод — твой.",
];

/** Небольшой детерминированный хеш — порядок кнопок стабилен между перезагрузками. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Перемешивание, чтобы верный ответ не стоял всегда первым. */
function shuffled<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let h = hash(seed);
  for (let i = out.length - 1; i > 0; i--) {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    const j = h % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pickBy<T>(arr: T[], seed: string): T {
  return arr[hash(seed) % arr.length];
}

/** Вариант «не уверен(а)» всегда последним: на него падает свободный ввод без совпадений. */
function orderOptions(options: OfflineTreeOption[], seed: string): OfflineTreeOption[] {
  const unsure = options.filter((o) => o.kind === "unsure");
  const rest = options.filter((o) => o.kind !== "unsure");
  return [...shuffled(rest, seed), ...unsure];
}

export function buildLessonTree(
  topicId: string,
  steps: LessonStep[],
  reflectionOutcome: ReflectionFeedbackBlocks
): OfflineDialogueTree {
  const nodes: Record<string, OfflineTreeNode> = {};
  const mainId = (i: number) => `n${i}`;

  steps.forEach((step, i) => {
    const id = mainId(i);
    const isLast = i === steps.length - 1;

    if (isLast || step.choices.length === 0) {
      nodes[id] = { id, aiText: step.text };
      return;
    }

    const nextId = mainId(i + 1);
    const graded = step.choices.some((c) => c.kind === "correct");

    if (!graded) {
      nodes[id] = {
        id,
        aiText: step.text,
        options: orderOptions(
          step.choices.map((c, j) => ({
            id: `${id}_c${j}`,
            label: c.label,
            nextNodeId: nextId,
            keywords: c.keywords,
            kind: c.kind ?? "neutral",
          })),
          `${topicId}:${id}`
        ),
      };
      return;
    }

    const explainId = `${id}_x`;
    const hintId = `${id}_h`;
    const focus = step.focus;
    // У каждого проверочного шага должен быть «не уверен(а)»: на него падает
    // свободный ввод без совпадений — лучше подсказка, чем случайная ветка.
    const choices: StepChoice[] = step.choices.some((c) => c.kind === "unsure")
      ? step.choices
      : [...step.choices, { label: "Не уверен(а) — дай подсказку", kind: "unsure" }];

    // Варианты повторной попытки: всё, кроме уже выбранной ошибки и «не уверен»,
    // плюс выход «покажи разбор». Верный → дальше, любой промах → разбор.
    const retryOptions = (nodeId: string, excludeIndex: number): OfflineTreeOption[] => {
      const opts: OfflineTreeOption[] = [];
      choices.forEach((c, j) => {
        if (j === excludeIndex || c.kind === "unsure") return;
        opts.push({
          id: `${nodeId}_c${j}`,
          label: c.label,
          nextNodeId: c.kind === "correct" ? nextId : explainId,
          keywords: c.keywords,
          kind: c.kind ?? "neutral",
        });
      });
      opts.push({
        id: `${nodeId}_esc`,
        label: ESCAPE_LABEL,
        nextNodeId: explainId,
        keywords: UNSURE_KEYWORDS,
        kind: "unsure",
      });
      return orderOptions(opts, `${topicId}:${nodeId}`);
    };

    const mainOptions: OfflineTreeOption[] = choices.map((c, j) => {
      const kind = c.kind ?? "neutral";
      let nextNodeId = nextId;
      if (kind === "wrong") nextNodeId = `${id}_w${j}`;
      if (kind === "unsure") nextNodeId = hintId;
      return {
        id: `${id}_c${j}`,
        label: c.label,
        nextNodeId,
        keywords: kind === "unsure" ? [...UNSURE_KEYWORDS, ...(c.keywords ?? [])] : c.keywords,
        kind,
      };
    });

    nodes[id] = {
      id,
      aiText: step.text,
      options: orderOptions(mainOptions, `${topicId}:${id}`),
    };

    choices.forEach((c, j) => {
      if (c.kind !== "wrong") return;
      const wId = `${id}_w${j}`;
      nodes[wId] = {
        id: wId,
        aiText:
          c.feedback ??
          step.hint ??
          "Давай проверим это на маленьком примере. Сходится ли твой вариант? Попробуй ещё раз.",
        options: retryOptions(wId, j),
        missedFocus: focus,
      };
    });

    const unsureIndex = choices.findIndex((c) => c.kind === "unsure");
    nodes[hintId] = {
      id: hintId,
      aiText:
        step.hint ??
        "Ничего страшного. Возьми самый простой пример и проверь каждый вариант на нём. Какой выдерживает проверку?",
      options: retryOptions(hintId, unsureIndex),
      missedFocus: focus,
    };

    nodes[explainId] = {
      id: explainId,
      aiText: `${
        step.explain ?? "Давай разберём этот шаг вместе — он действительно коварный."
      }\n\nЗапомни этот момент — на рефлексии к нему стоит вернуться.`,
      options: [
        {
          id: `${explainId}_go`,
          label: MOVE_ON_LABEL,
          nextNodeId: nextId,
          kind: "neutral",
        },
      ],
      missedFocus: focus,
    };
  });

  return {
    topicId,
    startNodeId: mainId(0),
    nodes,
    reflectionOutcome,
  };
}

/**
 * Короткая реакция наставника на выбранный вариант (добавляется перед следующей
 * репликой). Пусто, если реакция не нужна.
 */
export function ackForOption(
  tree: OfflineDialogueTree,
  fromNode: OfflineTreeNode,
  option: OfflineTreeOption
): string {
  if (option.kind !== "correct") return "";
  const seed = `${tree.topicId}:${option.id}`;
  return fromNode.missedFocus ? pickBy(ACK_AFTER_HINT, seed) : pickBy(ACK_FIRST_TRY, seed);
}
