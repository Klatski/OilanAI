import { useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { FancySelect, type FancyOption } from "../components/ui/FancySelect";
import { InfoTip } from "../components/ui/InfoTip";
import { SUBJECTS } from "../data/mockSubjects";
import { getAllTopics, getTopicById } from "../data/topics";
import { useAuth } from "../context/AuthContext";
import {
  getBuiltInSource,
  scenarioOrigin,
  type ScenarioOrigin,
} from "../data/offlineDialogues/registry";
import {
  buildLessonTree,
  ackForOption,
  type LessonStep,
  type StepChoice,
} from "../data/offlineDialogues/buildLessonTree";
import type { OfflineDialogueTree, OfflineOptionKind } from "../data/offlineDialogues/types";
import {
  deleteCustomScenario,
  exportScenariosJson,
  getCustomScenario,
  importScenariosJson,
  listCustomScenarios,
  saveCustomScenario,
  validateScenario,
} from "../utils/customScenarios";
import { renderOfflineTemplate } from "../utils/offlineDialogueEngine";
import type { Grade, ReflectionFeedbackBlocks, Topic } from "../types";

// ------------------------------------------------------------------ model

type StepMode = "check" | "open";

interface EditorStep {
  key: string;
  mode: StepMode;
  step: LessonStep;
}

interface Draft {
  steps: EditorStep[];
  final: string;
  reflection: ReflectionFeedbackBlocks;
}

const KIND_OPTIONS: FancyOption<OfflineOptionKind>[] = [
  { value: "correct", label: "Верно", dot: "var(--success)", hint: "урок идёт дальше" },
  { value: "wrong", label: "Ошибка", dot: "var(--warn)", hint: "наставник задаёт наводящий вопрос" },
  { value: "unsure", label: "Не уверен(а)", dot: "var(--accent-2)", hint: "ученик получает подсказку" },
  { value: "neutral", label: "Без оценки", dot: "var(--text-dim)", hint: "просто идёт дальше" },
];

const PLACEHOLDERS = [
  { token: "{{firstName}}", label: "имя ученика", sample: "Арман" },
  { token: "{{knowledge}}", label: "что ученик уже знает", sample: "его запись из барьера «Что я знаю»" },
];

const uid = () => Math.random().toString(36).slice(2, 10);

function emptyCheckStep(text = ""): EditorStep {
  return {
    key: uid(),
    mode: "check",
    step: {
      text,
      focus: "",
      hint: "",
      explain: "",
      choices: [
        { label: "", kind: "correct" },
        { label: "", kind: "wrong", feedback: "" },
        { label: "Пока не уверен(а)", kind: "unsure" },
      ],
    },
  };
}

function newDraft(topic: Topic): Draft {
  return {
    steps: [
      emptyCheckStep(
        `Привет, {{firstName}}! Ты написал(а), что уже знаешь: «{{knowledge}}».\n\nТема «${topic.title}». `
      ),
    ],
    final:
      "Отлично, ты прошёл(ла) сценарий урока. На рефлексии опиши своими словами главное, что понял(а).",
    reflection: { validation: "", mustKnow: "", struggles: "" },
  };
}

function draftFromSource(steps: LessonStep[], reflection: ReflectionFeedbackBlocks): Draft {
  const questions = steps.slice(0, -1);
  const final = steps[steps.length - 1]?.text ?? "";
  return {
    steps: questions.map((s) => ({
      key: uid(),
      mode: s.choices.some((c) => c.kind === "correct") ? "check" : "open",
      step: {
        ...s,
        choices: s.choices.map((c) => ({ ...c, kind: c.kind ?? "neutral" })),
      },
    })),
    final,
    reflection: { ...reflection },
  };
}

/** Черновик → исходник для дерева: чистим пустые поля, чтобы сработали значения по умолчанию. */
function draftToSteps(d: Draft): LessonStep[] {
  const clean = (s?: string) => (s && s.trim() ? s.trim() : undefined);
  const questions: LessonStep[] = d.steps.map(({ mode, step }) => ({
    text: step.text.trim(),
    focus: mode === "check" ? clean(step.focus) : undefined,
    hint: mode === "check" ? clean(step.hint) : undefined,
    explain: mode === "check" ? clean(step.explain) : undefined,
    choices: step.choices.map((c) => {
      const kind: OfflineOptionKind = mode === "open" ? "neutral" : c.kind ?? "neutral";
      const out: StepChoice = { label: c.label.trim(), kind };
      if (kind === "wrong") out.feedback = c.feedback?.trim() ?? "";
      return out;
    }),
  }));
  return [...questions, { text: d.final.trim(), choices: [] }];
}

function loadDraft(topic: Topic): { draft: Draft; origin: ScenarioOrigin | null } {
  const custom = getCustomScenario(topic.id);
  if (custom) return { draft: draftFromSource(custom.steps, custom.reflection), origin: "custom" };
  const builtIn = getBuiltInSource(topic.id);
  if (builtIn) return { draft: draftFromSource(builtIn.steps, builtIn.reflection), origin: "builtin" };
  return { draft: newDraft(topic), origin: null };
}

// ------------------------------------------------------------------ page

export function ScenarioEditorPage() {
  const { currentUser } = useAuth();
  const topics = useMemo(() => getAllTopics(), []);

  const [subjectId, setSubjectId] = useState("math");
  const gradesForSubject = useMemo(
    () =>
      [...new Set(topics.filter((t) => t.subjectId === subjectId).map((t) => t.grade))].sort(
        (a, b) => a - b
      ) as Grade[],
    [topics, subjectId]
  );
  const [grade, setGrade] = useState<Grade>(7);
  const effectiveGrade = gradesForSubject.includes(grade) ? grade : gradesForSubject[0];

  const visibleTopics = useMemo(
    () =>
      topics
        .filter((t) => t.subjectId === subjectId && t.grade === effectiveGrade)
        .sort((a, b) => a.quarter - b.quarter || a.order - b.order),
    [topics, subjectId, effectiveGrade]
  );

  const [topicId, setTopicId] = useState<string | null>(null);
  const topic = topicId ? getTopicById(topicId) : undefined;

  const [draft, setDraft] = useState<Draft | null>(null);
  const [origin, setOrigin] = useState<ScenarioOrigin | null>(null);
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [showIssues, setShowIssues] = useState(false);
  const [, bump] = useState(0); // перерисовать бейджи в списке после сохранения
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const h = () => bump((n) => n + 1);
    window.addEventListener("oilanai-scenarios-changed", h);
    return () => window.removeEventListener("oilanai-scenarios-changed", h);
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const h = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [dirty]);

  const openTopic = (t: Topic) => {
    if (t.id === topicId) return;
    if (dirty && !window.confirm("Есть несохранённые изменения. Перейти к другой теме без сохранения?")) {
      return;
    }
    const { draft: d, origin: o } = loadDraft(t);
    setTopicId(t.id);
    setDraft(d);
    setOrigin(o);
    setDirty(false);
    setNotice(null);
    setShowIssues(false);
  };

  const update = (fn: (d: Draft) => Draft) => {
    setDraft((d) => (d ? fn(d) : d));
    setDirty(true);
    setNotice(null);
  };

  const updateStep = (key: string, fn: (s: EditorStep) => EditorStep) =>
    update((d) => ({ ...d, steps: d.steps.map((s) => (s.key === key ? fn(s) : s)) }));

  const steps = draft ? draftToSteps(draft) : [];
  const issues = draft ? validateScenario(steps, draft.reflection) : [];

  const previewTree = useMemo<OfflineDialogueTree | null>(() => {
    if (!draft || !topic) return null;
    try {
      return buildLessonTree(topic.id, draftToSteps(draft), draft.reflection);
    } catch {
      return null;
    }
  }, [draft, topic]);

  // Предпросмотр перезапускается, когда меняется содержание сценария.
  const previewKey = useMemo(() => {
    const s = JSON.stringify(steps);
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    return `${topicId}:${h}`;
  }, [steps, topicId]);

  const save = () => {
    if (!draft || !topic) return;
    if (issues.length > 0) {
      setShowIssues(true);
      setNotice({ kind: "err", text: `Не сохранено: есть замечания (${issues.length}) — они показаны ниже.` });
      return;
    }
    try {
      saveCustomScenario({
        topicId: topic.id,
        steps,
        reflection: {
          validation: draft.reflection.validation.trim(),
          mustKnow: draft.reflection.mustKnow.trim(),
          struggles: draft.reflection.struggles.trim(),
        },
        author: currentUser?.name,
      });
      setOrigin("custom");
      setDirty(false);
      setNotice({
        kind: "ok",
        text: "Сохранено. Ученики на этом устройстве увидят сценарий в офлайн-режиме урока.",
      });
    } catch (e) {
      setNotice({ kind: "err", text: (e as Error).message });
    }
  };

  const removeCustom = () => {
    if (!topic) return;
    const builtIn = getBuiltInSource(topic.id);
    const msg = builtIn
      ? "Удалить ваш сценарий? Для темы снова будет действовать готовый сценарий OilanAI."
      : "Удалить сценарий? Офлайн-урок по этой теме станет недоступен.";
    if (!window.confirm(msg)) return;
    deleteCustomScenario(topic.id);
    const { draft: d, origin: o } = loadDraft(topic);
    setDraft(d);
    setOrigin(o);
    setDirty(false);
    setNotice({ kind: "ok", text: "Сценарий удалён." });
  };

  const startFromScratch = () => {
    if (!topic) return;
    if (!window.confirm("Начать с пустого шаблона? Текущий текст в редакторе будет заменён.")) return;
    setDraft(newDraft(topic));
    setDirty(true);
  };

  const exportAll = () => {
    const all = listCustomScenarios();
    if (all.length === 0) {
      setNotice({ kind: "err", text: "Пока нечего экспортировать: сохраните хотя бы один сценарий." });
      return;
    }
    const blob = new Blob([exportScenariosJson(all)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oilanai-scenarii-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice({ kind: "ok", text: `Экспортировано сценариев: ${all.length}.` });
  };

  const importFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const n = importScenariosJson(await file.text());
      setNotice({ kind: "ok", text: `Импортировано сценариев: ${n}.` });
      if (topic && !dirty) {
        const { draft: d, origin: o } = loadDraft(topic);
        setDraft(d);
        setOrigin(o);
      }
    } catch (err) {
      setNotice({ kind: "err", text: (err as Error).message });
    }
  };

  const customCount = listCustomScenarios().length;

  return (
    <div className="teacher-page sced">
      <div className="teacher-hero sced__hero">
        <div>
          <div className="teacher-hero__hello">Офлайн-уроки</div>
          <h1 className="teacher-hero__title">
            Редактор <span className="accent">сценариев</span>
          </h1>
          <p className="teacher-hero__sub">
            Сценарий — это диалог наставника для урока без интернета: вопросы, варианты ответа,
            наводящие вопросы на типичные ошибки и разбор. Ваш сценарий заменяет готовый.
          </p>
        </div>
        <div className="sced__hero-actions">
          <button type="button" className="btn btn--ghost" onClick={() => fileRef.current?.click()}>
            Импорт JSON
          </button>
          <button type="button" className="btn btn--ghost" onClick={exportAll}>
            Экспорт ({customCount})
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
          <InfoTip title="Зачем экспорт и импорт" align="right">
            Сценарии сохраняются в этом браузере. Чтобы они появились на другом компьютере —
            например, на школьном ПК или интерактивной доске, — нажмите «Экспорт», перенесите файл
            и нажмите там «Импорт JSON».
          </InfoTip>
        </div>
      </div>

      <HowItWorks />

      {notice && !draft && (
        <div className={`sced__notice sced__notice--${notice.kind}`}>{notice.text}</div>
      )}

      <div className="sced__layout">
        <aside className="sced__topics">
          <div className="sced__filters">
            <FancySelect
              ariaLabel="Предмет"
              value={subjectId}
              onChange={setSubjectId}
              options={SUBJECTS.map((s) => ({ value: s.id, label: s.icon + " " + s.name }))}
            />
            <FancySelect
              ariaLabel="Класс"
              value={effectiveGrade}
              onChange={(g) => setGrade(g as Grade)}
              options={gradesForSubject.map((g) => ({ value: g, label: g + " класс" }))}
            />
          </div>
          <div className="sced__legend">
            <span>Темы</span>
            <InfoTip title="Пометки у тем" align="right">
              <b>Готовый</b> — сценарий от OilanAI. Его можно открыть, доработать и сохранить как свой.
              <br />
              <b>Ваш</b> — сценарий, который вы сохранили. Ученики видят его вместо готового.
              <br />
              <b>Нет сценария</b> — без интернета этот урок пока недоступен. Напишите его с нуля.
            </InfoTip>
          </div>
          <ul className="sced__topic-list">
            {visibleTopics.map((t) => {
              const o = scenarioOrigin(t.id);
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    className={`sced__topic ${t.id === topicId ? "active" : ""}`}
                    onClick={() => openTopic(t)}
                  >
                    <span className="sced__topic-title">
                      <span className="sced__topic-q">{t.quarter} ч.</span> {t.title}
                    </span>
                    <OriginBadge origin={o} />
                  </button>
                </li>
              );
            })}
            {visibleTopics.length === 0 && <li className="sced__empty">Нет тем для этого класса.</li>}
          </ul>
        </aside>

        <section className="sced__main">
          {!draft || !topic ? (
            <div className="sced__placeholder">
              Выберите тему слева. Темы с пометкой «Готовый» можно взять за основу и доработать,
              для остальных — написать сценарий с нуля.
            </div>
          ) : (
            <>
              <div className="sced__topic-head">
                <div>
                  <h2>{topic.title}</h2>
                  <div className="sced__topic-meta">
                    {topic.grade} класс · {topic.quarter} четверть · <OriginBadge origin={origin} />
                    {dirty && <span className="sced__dirty">не сохранено</span>}
                  </div>
                </div>
                <div className="sced__head-actions">
                  <button type="button" className="btn btn--ghost" onClick={startFromScratch}>
                    С нуля
                  </button>
                  {origin === "custom" && (
                    <button type="button" className="btn btn--danger-ghost" onClick={removeCustom}>
                      Удалить
                    </button>
                  )}
                  <button type="button" className="btn btn--primary" onClick={save}>
                    Сохранить
                  </button>
                </div>
              </div>

              {origin === "builtin" && !dirty && (
                <div className="sced__notice sced__notice--info">
                  Это готовый сценарий OilanAI. Измените что нужно и сохраните — у этой темы будет
                  ваша версия.
                </div>
              )}
              {notice && <div className={`sced__notice sced__notice--${notice.kind}`}>{notice.text}</div>}

              {showIssues && issues.length > 0 && (
                <ul className="sced__issues">
                  {issues.map((iss, i) => (
                    <li key={i}>
                      {iss.step !== null ? <b>Шаг {iss.step + 1}: </b> : null}
                      {iss.message}
                    </li>
                  ))}
                </ul>
              )}

              <div className="sced__columns">
                <div className="sced__editor">

                  {draft.steps.map((es, i) => (
                    <StepCard
                      key={es.key}
                      index={i}
                      total={draft.steps.length}
                      es={es}
                      issues={showIssues ? issues.filter((x) => x.step === i) : []}
                      onChange={(fn) => updateStep(es.key, fn)}
                      onMove={(dir) =>
                        update((d) => {
                          const arr = [...d.steps];
                          const j = i + dir;
                          [arr[i], arr[j]] = [arr[j], arr[i]];
                          return { ...d, steps: arr };
                        })
                      }
                      onRemove={() => {
                        if (!window.confirm(`Удалить шаг ${i + 1}?`)) return;
                        update((d) => ({ ...d, steps: d.steps.filter((s) => s.key !== es.key) }));
                      }}
                    />
                  ))}

                  <div className="sced__add-step">
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() => update((d) => ({ ...d, steps: [...d.steps, emptyCheckStep()] }))}
                    >
                      + Проверочный вопрос
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost"
                      onClick={() =>
                        update((d) => ({
                          ...d,
                          steps: [
                            ...d.steps,
                            {
                              key: uid(),
                              mode: "open",
                              step: {
                                text: "",
                                choices: [
                                  { label: "", kind: "neutral" },
                                  { label: "", kind: "neutral" },
                                ],
                              },
                            },
                          ],
                        }))
                      }
                    >
                      + Вопрос «о себе»
                    </button>
                  </div>

                  <div className="sced__card">
                    <div className="sced__card-title">
                      Финальная реплика перед рефлексией
                      <InfoTip title="Финальная реплика">
                        Последнее сообщение наставника после всех вопросов. Подведите короткий итог
                        и пригласите ученика написать рефлексию — своими словами, что он понял.
                      </InfoTip>
                    </div>
                    <textarea
                      className="field__input sced__ta"
                      rows={3}
                      value={draft.final}
                      onChange={(e) => update((d) => ({ ...d, final: e.target.value }))}
                    />
                  </div>

                  <div className="sced__card">
                    <div className="sced__card-title">
                      Итог урока
                      <InfoTip title="Итог урока">
                        Ученик видит эти три блока после того, как напишет рефлексию. Без интернета
                        ИИ не может разобрать его текст, поэтому итог пишете вы — коротко и по делу.
                      </InfoTip>
                    </div>
                    <Field
                      label="Что ты понял сам"
                      tip="Похвала за ход мысли: какие идеи ученик разобрал на этом уроке."
                      value={draft.reflection.validation}
                      onChange={(v) =>
                        update((d) => ({ ...d, reflection: { ...d.reflection, validation: v } }))
                      }
                    />
                    <Field
                      label="Что нужно знать (формулы, правила)"
                      tip="То, что нельзя вывести самому и нужно запомнить: определения, формулы, правила."
                      value={draft.reflection.mustKnow}
                      onChange={(v) =>
                        update((d) => ({ ...d, reflection: { ...d.reflection, mustKnow: v } }))
                      }
                    />
                    <Field
                      label="Где ты застрял — общий совет"
                      hint="Шаги, на которых ученик ошибся, добавятся сюда автоматически."
                      value={draft.reflection.struggles}
                      onChange={(v) =>
                        update((d) => ({ ...d, reflection: { ...d.reflection, struggles: v } }))
                      }
                    />
                  </div>
                </div>

                <div className="sced__preview-col">
                  {previewTree ? (
                    <ScenarioPreview
                      key={previewKey}
                      tree={previewTree}
                      studentName={"Арман"}
                    />
                  ) : null}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ parts

function OriginBadge({ origin }: { origin: ScenarioOrigin | null }) {
  if (origin === "custom") return <span className="sced__badge sced__badge--custom">Ваш</span>;
  if (origin === "builtin") return <span className="sced__badge sced__badge--builtin">Готовый</span>;
  return <span className="sced__badge">Нет сценария</span>;
}

function Field({
  label,
  value,
  onChange,
  hint,
  tip,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  tip?: ReactNode;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className="field sced__field">
      <span className="field__label sced__label-row">
        {label}
        {tip && <InfoTip title={label}>{tip}</InfoTip>}
      </span>
      <textarea
        className="field__input sced__ta"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="sced__field-hint">{hint}</span>}
    </label>
  );
}

function StepCard({
  index,
  total,
  es,
  issues,
  onChange,
  onMove,
  onRemove,
}: {
  index: number;
  total: number;
  es: EditorStep;
  issues: { message: string }[];
  onChange: (fn: (s: EditorStep) => EditorStep) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const { mode, step } = es;
  const setStep = (patch: Partial<LessonStep>) =>
    onChange((s) => ({ ...s, step: { ...s.step, ...patch } }));
  const setChoice = (j: number, patch: Partial<StepChoice>) =>
    setStep({ choices: step.choices.map((c, k) => (k === j ? { ...c, ...patch } : c)) });

  const setMode = (m: StepMode) =>
    onChange((s) => ({
      ...s,
      mode: m,
      step: {
        ...s.step,
        choices: s.step.choices.map((c, k) => ({
          ...c,
          kind: m === "open" ? "neutral" : k === 0 ? "correct" : "wrong",
        })),
      },
    }));

  return (
    <div className={`sced__card ${issues.length ? "sced__card--issue" : ""}`}>
      <div className="sced__step-head">
        <span className="sced__step-num">Шаг {index + 1}</span>
        <div className="sced__seg">
          <button
            type="button"
            className={mode === "check" ? "active" : ""}
            onClick={() => mode !== "check" && setMode("check")}
          >
            Проверочный
          </button>
          <button
            type="button"
            className={mode === "open" ? "active" : ""}
            onClick={() => mode !== "open" && setMode("open")}
          >
            О себе
          </button>
        </div>
        <InfoTip title="Тип шага">
          <b>Проверочный</b> — у вопроса есть верный ответ. Если ученик ошибся, наставник не
          говорит «неправильно», а задаёт ваш наводящий вопрос. После второй ошибки показывает разбор
          и ведёт дальше.
          <br />
          <br />
          <b>О себе</b> — вопрос про опыт ученика: «что тебе сложнее всего?», «как ты обычно
          решаешь?». Правильного ответа нет, любой вариант ведёт к следующему шагу.
        </InfoTip>
        <div className="sced__step-tools">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} title="Выше">
            ↑
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} title="Ниже">
            ↓
          </button>
          <button type="button" onClick={onRemove} title="Удалить шаг">
            ✕
          </button>
        </div>
      </div>

      <QuestionField value={step.text} onChange={(v) => setStep({ text: v })} />

      <div className="field__label sced__choices-label sced__label-row">
        Варианты ответа
        <InfoTip title="Варианты ответа">
          Это кнопки, которые видит ученик. Он может нажать одну из них или написать ответ своими
          словами.
          {mode === "check" && (
            <>
              <br />
              <br />
              У каждого варианта есть роль:
              <br />● <b>Верно</b> — урок идёт к следующему шагу.
              <br />● <b>Ошибка</b> — типичное заблуждение учеников. Напишите, что ответит наставник:
              вопрос или пример, который поможет заметить ошибку, но не готовый ответ.
              <br />● <b>Не уверен(а)</b> — ученик получает подсказку (её вы пишете ниже).
              <br />● <b>Без оценки</b> — ответ не проверяется, урок идёт дальше.
              <br />
              <br />
              На экране ученика кнопки перемешиваются, так что верный вариант можно писать первым.
            </>
          )}
        </InfoTip>
        <span className="sced__field-hint">
          {mode === "check"
            ? "— на кнопках порядок перемешается сам"
            : "— правильного нет, любой ведёт к следующему шагу"}
        </span>
      </div>
      {step.choices.map((c, j) => (
        <div key={j} className={`sced__choice sced__choice--${mode === "open" ? "neutral" : c.kind}`}>
          <div className="sced__choice-row">
            {mode === "check" && (
              <FancySelect
                className="sced__kind"
                ariaLabel="Роль варианта"
                value={c.kind ?? "neutral"}
                onChange={(k) => setChoice(j, { kind: k })}
                options={KIND_OPTIONS}
              />
            )}
            <input
              className="field__input sced__choice-input"
              value={c.label}
              placeholder="Текст кнопки"
              onChange={(e) => setChoice(j, { label: e.target.value })}
            />
            <button
              type="button"
              className="sced__icon-btn"
              title="Удалить вариант"
              disabled={step.choices.length <= 2}
              onClick={() => setStep({ choices: step.choices.filter((_, k) => k !== j) })}
            >
              ✕
            </button>
          </div>
          {mode === "check" && c.kind === "wrong" && (
            <span className="sced__feedback-label">↳ что ответит наставник на эту ошибку</span>
          )}
          {mode === "check" && c.kind === "wrong" && (
            <textarea
              className="field__input sced__ta sced__feedback"
              rows={2}
              value={c.feedback ?? ""}
              placeholder="Наводящий вопрос или контрпример — не готовый ответ. Например: «Проверь на числах: 2²·2³ — сколько двоек?»"
              onChange={(e) => setChoice(j, { feedback: e.target.value })}
            />
          )}
        </div>
      ))}
      {step.choices.length < 5 && (
        <button
          type="button"
          className="sced__link-btn"
          onClick={() =>
            setStep({
              choices: [
                ...step.choices,
                mode === "check" ? { label: "", kind: "wrong", feedback: "" } : { label: "", kind: "neutral" },
              ],
            })
          }
        >
          + вариант
        </button>
      )}

      {mode === "check" && (
        <div className="sced__remed">
          <Field
            label="Подсказка для «не уверен(а)»"
            tip="Показывается, когда ученик нажал «Не уверен(а)» или написал ответ, который программа не узнала. Дайте зацепку — простой пример или наводящий вопрос, но не ответ."
            hint="Если пусто — ученик получит общую подсказку «проверь на простом примере»."
            value={step.hint ?? ""}
            onChange={(v) => setStep({ hint: v })}
          />
          <Field
            label="Разбор после второй ошибки"
            tip="Если ученик ошибся снова, наставник объясняет сам: правило и короткий пример. После разбора урок идёт дальше, чтобы ученик не застрял, а шаг попадает в итог «Где ты застрял»."
            hint="Здесь можно объяснить прямо, с примером. После него урок идёт дальше."
            value={step.explain ?? ""}
            onChange={(v) => setStep({ explain: v })}
          />
          <label className="field sced__field">
            <span className="field__label sced__label-row">
              Короткое имя шага
              <InfoTip title="Короткое имя шага">
                2–4 слова о том, что проверяет вопрос. Если ученик здесь ошибётся, в итоге урока он
                увидит: «Сегодня ты спотыкался на шагах: деление степеней».
              </InfoTip>
            </span>
            <input
              className="field__input"
              value={step.focus ?? ""}
              placeholder="например: деление степеней"
              onChange={(e) => setStep({ focus: e.target.value })}
            />
            <span className="sced__field-hint">
              Попадёт в «Где ты застрял», если ученик здесь ошибётся.
            </span>
          </label>
        </div>
      )}

      {issues.length > 0 && (
        <ul className="sced__step-issues">
          {issues.map((x, k) => (
            <li key={k}>{x.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Прогон сценария так, как его увидит ученик. */
function ScenarioPreview({ tree, studentName }: { tree: OfflineDialogueTree; studentName: string }) {
  const render = (t: string) =>
    renderOfflineTemplate(t, { firstName: studentName, knowledge: "(то, что ученик написал в барьере)" });

  const [nodeId, setNodeId] = useState(tree.startNodeId);
  const [log, setLog] = useState<{ role: "ai" | "user"; text: string }[]>(() => [
    { role: "ai", text: render(tree.nodes[tree.startNodeId]?.aiText ?? "") },
  ]);
  const [missed, setMissed] = useState<string[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [log]);

  const node = tree.nodes[nodeId];

  const choose = (optId: string) => {
    const opt = node?.options?.find((o) => o.id === optId);
    if (!node || !opt) return;
    const next = tree.nodes[opt.nextNodeId];
    if (!next) return;
    const ack = ackForOption(tree, node, opt);
    const text = render(next.aiText);
    setLog((l) => [...l, { role: "user", text: opt.label }, { role: "ai", text: ack ? `${ack}\n\n${text}` : text }]);
    if (next.missedFocus && !missed.includes(next.missedFocus)) setMissed((m) => [...m, next.missedFocus!]);
    setNodeId(next.id);
  };

  const restart = () => {
    setNodeId(tree.startNodeId);
    setLog([{ role: "ai", text: render(tree.nodes[tree.startNodeId]?.aiText ?? "") }]);
    setMissed([]);
  };

  const finished = !node?.options?.length;

  return (
    <div className="sced__preview">
      <div className="sced__preview-head">
        <span className="sced__label-row">
          Предпросмотр глазами ученика
          <InfoTip title="Предпросмотр" align="right">
            Пройдите урок так, как его пройдёт ученик: нажмите неверный вариант и проверьте, что
            наводящий вопрос и разбор звучат понятно. Любая правка в редакторе сразу попадает сюда, и
            урок начинается заново. Вместо имени подставлено «Арман».
          </InfoTip>
        </span>
        <button type="button" className="sced__link-btn" onClick={restart}>
          заново
        </button>
      </div>
      <div className="sced__preview-log">
        {log.map((m, i) => (
          <div key={i} className={`sced__bubble sced__bubble--${m.role}`}>
            {m.text}
          </div>
        ))}
        {finished && (
          <div className="sced__preview-end">
            → ученик переходит к рефлексии.
            {missed.length > 0 && <> В «Где ты застрял» попадут: {missed.join("; ")}.</>}
          </div>
        )}
        <div ref={endRef} />
      </div>
      {!finished && node?.options && (
        <div className="sced__preview-options">
          {node.options.map((o) => (
            <button key={o.id} type="button" className="btn btn--ghost" onClick={() => choose(o.id)}>
              {o.label || "(пустой вариант)"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Поле вопроса с кнопками вставки имени ученика и его «Что я знаю». */
function QuestionField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const insert = (token: string) => {
    const ta = ref.current;
    const start = ta?.selectionStart ?? value.length;
    const end = ta?.selectionEnd ?? value.length;
    onChange(value.slice(0, start) + token + value.slice(end));
    requestAnimationFrame(() => {
      ta?.focus();
      const pos = start + token.length;
      ta?.setSelectionRange(pos, pos);
    });
  };

  const used = PLACEHOLDERS.filter((p) => value.includes(p.token));

  return (
    <div className="field sced__field">
      <span className="field__label sced__label-row">
        Вопрос наставника
        <InfoTip title="Вопрос наставника">
          Что скажет наставник на этом шаге. Пишите <b>вопрос</b>, а не объяснение: ученик должен сам
          прийти к мысли.
          <br />
          <br />
          Кнопки под полем вставляют в текст метки, вместо которых ученик увидит своё имя или то, что
          он написал в начале урока в поле «Что я знаю». Обычно их ставят в первый вопрос, чтобы
          поздороваться и опереться на знания ученика.
        </InfoTip>
      </span>
      <textarea
        ref={ref}
        className="field__input sced__ta"
        rows={3}
        value={value}
        placeholder="Например: «Как ты своими словами понимаешь запись aⁿ?»"
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="sced__insert">
        <span className="sced__field-hint">Вставить:</span>
        {PLACEHOLDERS.map((p) => (
          <button key={p.token} type="button" className="sced__chip" onClick={() => insert(p.token)}>
            + {p.label}
          </button>
        ))}
      </div>
      {used.length > 0 && (
        <span className="sced__field-hint">
          {used.map((p, i) => (
            <span key={p.token}>
              {i > 0 && " · "}
              <code>{p.token}</code> → {p.sample}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

const GUIDE_KEY = "oilanai_sced_guide_closed";

/** Раскрывающаяся памятка: как ученик проходит сценарий. */
function HowItWorks() {
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(GUIDE_KEY) !== "1";
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      if (next) localStorage.removeItem(GUIDE_KEY);
      else localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <section className={`sced__guide ${open ? "is-open" : ""}`}>
      <button type="button" className="sced__guide-toggle" onClick={toggle} aria-expanded={open}>
        <span className="sced__guide-icon">i</span>
        Как работает сценарий урока
        <span className="sced__guide-chev">{open ? "Свернуть" : "Показать"}</span>
      </button>
      {open && (
        <div className="sced__guide-body">
          <ol className="sced__guide-steps">
            <li>
              <b>Начало.</b> Ученик пишет, что уже знает по теме. Наставник здоровается и задаёт
              первый вопрос.
            </li>
            <li>
              <b>Шаги.</b> Вопросы идут по порядку. На каждый ученик нажимает вариант ответа или пишет
              свой.
            </li>
            <li>
              <b>Ошибки.</b> Наставник не говорит «неправильно», а задаёт наводящий вопрос и даёт
              попробовать ещё раз:
            </li>
          </ol>

          <div className="sced__flow" aria-label="Схема шага">
            <div className="sced__flow-row">
              <span className="sced__flow-box">Вопрос</span>
              <span className="sced__flow-arrow sced__flow-arrow--ok">верно →</span>
              <span className="sced__flow-box sced__flow-box--ok">Следующий шаг</span>
            </div>
            <div className="sced__flow-row">
              <span className="sced__flow-box">Вопрос</span>
              <span className="sced__flow-arrow sced__flow-arrow--warn">ошибка →</span>
              <span className="sced__flow-box sced__flow-box--warn">Наводящий вопрос</span>
              <span className="sced__flow-arrow">→</span>
              <span className="sced__flow-box">2-я попытка</span>
              <span className="sced__flow-arrow sced__flow-arrow--warn">снова мимо →</span>
              <span className="sced__flow-box sced__flow-box--info">Разбор</span>
              <span className="sced__flow-arrow">→</span>
              <span className="sced__flow-box sced__flow-box--ok">Следующий шаг</span>
            </div>
            <div className="sced__flow-row">
              <span className="sced__flow-box">Вопрос</span>
              <span className="sced__flow-arrow sced__flow-arrow--info">не уверен →</span>
              <span className="sced__flow-box sced__flow-box--info">Подсказка</span>
              <span className="sced__flow-arrow">→</span>
              <span className="sced__flow-box">2-я попытка</span>
            </div>
          </div>

          <ol className="sced__guide-steps" start={4}>
            <li>
              <b>Финал.</b> После последнего шага наставник подводит итог, ученик пишет рефлексию и
              видит три блока итога. Шаги, где он ошибался, попадут в «Где ты застрял».
            </li>
          </ol>

          <div className="sced__guide-tips">
            <b>Советы:</b> 3–6 шагов на урок · в «Ошибке» пишите настоящие заблуждения учеников ·
            наводящий вопрос должен помочь заметить ошибку, а не сообщать ответ · справа можно сразу
            пройти урок как ученик. Нажмите{" "}
            <span className="infotip__btn infotip__btn--static">?</span> рядом с любым полем, чтобы
            узнать, что в него писать.
          </div>
        </div>
      )}
    </section>
  );
}
