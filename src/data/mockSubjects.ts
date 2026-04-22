import type { Subject } from "../types";

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
    lessons: [
      { id: 1, title: "Введение в алгебру", topic: "Алгебра", description: "Первые шаги: переменные, выражения, уравнения.", icon: "✨" },
      { id: 2, title: "Линейные уравнения", topic: "Алгебра", description: "Как приручить x и расшифровать его смысл.", icon: "📐" },
      { id: 3, title: "Функции", topic: "Алгебра", description: "Отношения между числами — язык математики.", icon: "🔗" },
      { id: 4, title: "Квадратные уравнения", topic: "Алгебра", description: "Дискриминант и магия параболы.", icon: "🌀" },
      { id: 5, title: "Системы уравнений", topic: "Алгебра", description: "Когда нужно найти сразу несколько неизвестных.", icon: "🧩" },
      { id: 6, title: "Тригонометрия", topic: "Геометрия", description: "Синусы и косинусы как ритм Вселенной.", icon: "🌊" },
      { id: 7, title: "Логарифмы", topic: "Алгебра", description: "Сила обратного действия.", icon: "🔮" },
      { id: 8, title: "Производные", topic: "Матанализ", description: "Скорость изменений и наклон кривой.", icon: "⚡" },
      { id: 9, title: "Интегралы", topic: "Матанализ", description: "Площадь, объём и бесконечные суммы.", icon: "∫" },
      { id: 10, title: "Пределы", topic: "Матанализ", description: "Что происходит на самом краю бесконечности.", icon: "🌌" },
      { id: 11, title: "Комплексные числа", topic: "Алгебра", description: "Мнимая ось — портал в другое измерение.", icon: "🌠" },
      { id: 12, title: "Векторы", topic: "Геометрия", description: "Направления, скорости и силы.", icon: "➡️" },
      { id: 13, title: "Матрицы", topic: "Линейная алгебра", description: "Таблицы, которые меняют пространство.", icon: "🗺️" },
      { id: 14, title: "Вероятность", topic: "Статистика", description: "Математика случайности.", icon: "🎲" },
      { id: 15, title: "Финальный квест", topic: "Всё вместе", description: "Соедини все знания в одно большое решение.", icon: "🏆" },
    ],
  },
  {
    id: "physics",
    name: "Физика",
    shortName: "Физика",
    icon: "⚛️",
    accent: "#00D4FF",
    gradient: "linear-gradient(135deg, #00D4FF 0%, #6C63FF 100%)",
    description:
      "Как устроен мир: от падающего яблока до чёрных дыр.",
    lessons: [
      { id: 1, title: "Механика: движение", topic: "Механика", description: "Скорость, ускорение, законы Ньютона.", icon: "🚀" },
      { id: 2, title: "Силы и трение", topic: "Механика", description: "Почему всё в мире замедляется.", icon: "🧲" },
      { id: 3, title: "Энергия и работа", topic: "Механика", description: "Закон сохранения — и что из него следует.", icon: "💫" },
      { id: 4, title: "Термодинамика", topic: "Тепло", description: "Энтропия, температура и почему чай остывает.", icon: "🔥" },
      { id: 5, title: "Волны и звук", topic: "Колебания", description: "Как ухо ловит мысли музыкантов.", icon: "🌊" },
      { id: 6, title: "Электричество", topic: "Электромагнетизм", description: "Ток, напряжение и сила Кулона.", icon: "⚡" },
      { id: 7, title: "Магнетизм", topic: "Электромагнетизм", description: "Невидимые линии, которые двигают моторы.", icon: "🧭" },
      { id: 8, title: "Оптика", topic: "Свет", description: "Преломление, отражение и природа света.", icon: "💡" },
      { id: 9, title: "Атомы и кванты", topic: "Квантовая физика", description: "Где заканчивается здравый смысл.", icon: "⚛️" },
      { id: 10, title: "Ядерная физика", topic: "Квантовая физика", description: "Энергия звёзд прямо у нас в ладонях.", icon: "☢️" },
      { id: 11, title: "Теория относительности", topic: "Современная физика", description: "Время — это иллюзия. Но полезная.", icon: "🕳️" },
      { id: 12, title: "Финальный квест", topic: "Всё вместе", description: "Собери физическую картину мира в одно целое.", icon: "🏆" },
    ],
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
    lessons: [
      { id: 1, title: "Атом и молекула", topic: "Основы", description: "Кирпичики реальности.", icon: "⚛️" },
      { id: 2, title: "Таблица Менделеева", topic: "Основы", description: "Карта всех элементов — и её скрытая логика.", icon: "🗂️" },
      { id: 3, title: "Химические связи", topic: "Структура", description: "Почему атомы цепляются друг за друга.", icon: "🔗" },
      { id: 4, title: "Химические реакции", topic: "Процессы", description: "Что происходит, когда вещества встречаются.", icon: "💥" },
      { id: 5, title: "Растворы и концентрации", topic: "Процессы", description: "Искусство смешивать точно.", icon: "🧉" },
      { id: 6, title: "Кислоты и основания", topic: "Процессы", description: "pH и баланс вещей.", icon: "🧪" },
      { id: 7, title: "Электрохимия", topic: "Процессы", description: "Как работают батарейки и ржавчина.", icon: "🔋" },
      { id: 8, title: "Органическая химия", topic: "Органика", description: "Химия живого: углерод как основа.", icon: "🧬" },
      { id: 9, title: "Полимеры", topic: "Органика", description: "Длинные цепочки, из которых мы сделаны.", icon: "🧵" },
      { id: 10, title: "Финальный квест", topic: "Всё вместе", description: "От атомов до сложных молекул жизни.", icon: "🏆" },
    ],
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
    lessons: [
      { id: 1, title: "Древний мир", topic: "Античность", description: "Первые цивилизации и великие империи.", icon: "🏺" },
      { id: 2, title: "Греция и Рим", topic: "Античность", description: "Откуда взялась демократия и право.", icon: "🏛️" },
      { id: 3, title: "Средние века", topic: "Средневековье", description: "Рыцари, чума и первые университеты.", icon: "⚔️" },
      { id: 4, title: "Великие открытия", topic: "Новое время", description: "Карты, корабли и столкновение цивилизаций.", icon: "🧭" },
      { id: 5, title: "Эпоха Просвещения", topic: "Новое время", description: "Разум как главная ценность.", icon: "📜" },
      { id: 6, title: "Индустриальная революция", topic: "Новое время", description: "Пар, сталь и новый ритм жизни.", icon: "⚙️" },
      { id: 7, title: "Мировые войны", topic: "Новейшее время", description: "Как два конфликта изменили всё.", icon: "🎖️" },
      { id: 8, title: "Холодная война", topic: "Новейшее время", description: "Два мира — одна планета.", icon: "❄️" },
      { id: 9, title: "История Казахстана", topic: "Региональная история", description: "От Великой Степи до независимости.", icon: "🦅" },
      { id: 10, title: "Цифровая эпоха", topic: "XXI век", description: "Как интернет переписал правила.", icon: "🌐" },
      { id: 11, title: "Глобальные вызовы", topic: "XXI век", description: "Климат, технологии и будущее.", icon: "🌍" },
      { id: 12, title: "Финальный квест", topic: "Всё вместе", description: "Собери нить времени в цельную историю.", icon: "🏆" },
    ],
  },
  {
    id: "biology",
    name: "Биология",
    shortName: "Биология",
    icon: "🧬",
    accent: "#A855F7",
    gradient: "linear-gradient(135deg, #A855F7 0%, #00E5A0 100%)",
    description:
      "Как работает жизнь — от клетки до экосистемы планеты.",
    lessons: [
      { id: 1, title: "Клетка", topic: "Цитология", description: "Самая маленькая единица живого.", icon: "🦠" },
      { id: 2, title: "Генетика и ДНК", topic: "Молекулярная биология", description: "Код, по которому строится жизнь.", icon: "🧬" },
      { id: 3, title: "Эволюция", topic: "Теория эволюции", description: "Как естественный отбор создал разнообразие.", icon: "🦕" },
      { id: 4, title: "Растения", topic: "Ботаника", description: "Зелёные химические фабрики планеты.", icon: "🌿" },
      { id: 5, title: "Животные", topic: "Зоология", description: "От амёбы до кита.", icon: "🐋" },
      { id: 6, title: "Тело человека", topic: "Анатомия", description: "Твой личный биологический аппарат.", icon: "🫀" },
      { id: 7, title: "Нервная система", topic: "Физиология", description: "Как 86 миллиардов нейронов создают тебя.", icon: "🧠" },
      { id: 8, title: "Экология", topic: "Экосистемы", description: "Всё связано со всем.", icon: "🌳" },
      { id: 9, title: "Биотехнологии", topic: "Современная биология", description: "CRISPR, вакцины и редактирование жизни.", icon: "🔬" },
      { id: 10, title: "Финальный квест", topic: "Всё вместе", description: "Собери картину жизни в единое целое.", icon: "🏆" },
    ],
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
    lessons: [
      { id: 1, title: "Present Simple vs Continuous", topic: "Grammar", description: "Когда то, что есть — и когда то, что прямо сейчас.", icon: "⏱️" },
      { id: 2, title: "Past Tenses", topic: "Grammar", description: "Пять оттенков прошлого.", icon: "📼" },
      { id: 3, title: "Future forms", topic: "Grammar", description: "Планы, предсказания и обещания.", icon: "🔮" },
      { id: 4, title: "Conditionals", topic: "Grammar", description: "Если бы да кабы — по-английски.", icon: "🌈" },
      { id: 5, title: "Modal verbs", topic: "Grammar", description: "Can, should, must — тонкие оттенки.", icon: "🎭" },
      { id: 6, title: "Passive voice", topic: "Grammar", description: "Когда важно действие, а не действующий.", icon: "🔄" },
      { id: 7, title: "Phrasal verbs", topic: "Vocabulary", description: "Мини-конструктор native-речи.", icon: "🧩" },
      { id: 8, title: "Idioms", topic: "Vocabulary", description: "Фразы, которые буквально не переведёшь.", icon: "🎨" },
      { id: 9, title: "Academic writing", topic: "Skills", description: "Чёткие аргументы, элегантная структура.", icon: "✍️" },
      { id: 10, title: "Speaking fluency", topic: "Skills", description: "Как перестать бояться и начать говорить.", icon: "🗣️" },
      { id: 11, title: "Listening comprehension", topic: "Skills", description: "Ловить смысл, а не каждое слово.", icon: "🎧" },
      { id: 12, title: "Final quest", topic: "All together", description: "Собери все навыки в свободную речь.", icon: "🏆" },
    ],
  },
];

export function getSubjectById(id: string | undefined | null): Subject | undefined {
  if (!id) return undefined;
  return SUBJECTS.find((s) => s.id === id);
}

export function getLessonById(
  subjectId: string | undefined | null,
  lessonId: number | undefined | null
) {
  const subject = getSubjectById(subjectId);
  if (!subject || !lessonId) return undefined;
  return subject.lessons.find((l) => l.id === lessonId);
}
