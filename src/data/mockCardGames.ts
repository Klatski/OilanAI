/**
 * Card-matching mini-games per subject.
 *
 * Each game is a list of semantic pairs (term ↔ definition / formula / example).
 * The UI shuffles the two sides independently, shows them as two columns,
 * and the player clicks one card on the left, then a card on the right:
 *   - match   → both cards fade out with a green glow
 *   - no match → quick red shake, cards stay
 *
 * The data is fully local so the game is 100% playable offline.
 */

export interface CardPair {
  id: string;
  term: string;
  definition: string;
}

export interface SubjectCardGame {
  subjectId: string;
  title: string;
  subtitle: string;
  pairs: CardPair[];
}

export const CARD_GAMES: SubjectCardGame[] = [
  {
    subjectId: "math",
    title: "Математический конструктор",
    subtitle: "Соедини термин с его формулой или определением",
    pairs: [
      { id: "m1", term: "Дискриминант", definition: "D = b² − 4ac" },
      { id: "m2", term: "Квадратное уравнение", definition: "ax² + bx + c = 0" },
      { id: "m3", term: "Теорема Пифагора", definition: "a² + b² = c²" },
      { id: "m4", term: "Площадь круга", definition: "S = π · r²" },
      { id: "m5", term: "Синус угла", definition: "противолежащий / гипотенуза" },
      { id: "m6", term: "Производная x²", definition: "2x" },
      { id: "m7", term: "Логарифм logₐ(b)", definition: "степень, в которую надо возвести a, чтобы получить b" },
      { id: "m8", term: "5!", definition: "120" },
    ],
  },
  {
    subjectId: "physics",
    title: "Физические связи",
    subtitle: "Сопоставь закон или величину с формулой",
    pairs: [
      { id: "p1", term: "Второй закон Ньютона", definition: "F = m · a" },
      { id: "p2", term: "Закон Ома", definition: "I = U / R" },
      { id: "p3", term: "Кинетическая энергия", definition: "Eₖ = m·v² / 2" },
      { id: "p4", term: "Импульс", definition: "p = m · v" },
      { id: "p5", term: "Потенциальная энергия в поле тяжести", definition: "Eₚ = m · g · h" },
      { id: "p6", term: "Давление", definition: "P = F / S" },
      { id: "p7", term: "Скорость света в вакууме", definition: "≈ 3 · 10⁸ м/с" },
      { id: "p8", term: "E = m · c²", definition: "Эквивалентность массы и энергии" },
    ],
  },
  {
    subjectId: "chemistry",
    title: "Химическое соответствие",
    subtitle: "Соедини символ или вещество с тем, что оно означает",
    pairs: [
      { id: "c1", term: "H₂O", definition: "Вода" },
      { id: "c2", term: "CO₂", definition: "Углекислый газ" },
      { id: "c3", term: "NaCl", definition: "Поваренная соль" },
      { id: "c4", term: "pH < 7", definition: "Кислая среда" },
      { id: "c5", term: "pH > 7", definition: "Щелочная среда" },
      { id: "c6", term: "Au", definition: "Золото" },
      { id: "c7", term: "Изотопы", definition: "Атомы с одинаковым числом протонов, но разным числом нейтронов" },
      { id: "c8", term: "Катализатор", definition: "Вещество, ускоряющее реакцию, но не расходующееся" },
    ],
  },
  {
    subjectId: "history",
    title: "Хроники времени",
    subtitle: "Соедини событие или термин с эпохой или последствием",
    pairs: [
      { id: "h1", term: "Падение Римской империи", definition: "476 г. н. э." },
      { id: "h2", term: "Великая французская революция", definition: "1789–1799 гг." },
      { id: "h3", term: "Вторая мировая война", definition: "1939–1945 гг." },
      { id: "h4", term: "Независимость Казахстана", definition: "16 декабря 1991" },
      { id: "h5", term: "Эпоха Просвещения", definition: "Век разума и прав человека" },
      { id: "h6", term: "Холодная война", definition: "Противостояние США и СССР без прямой войны" },
      { id: "h7", term: "Великий шёлковый путь", definition: "Торговая сеть между Востоком и Западом" },
      { id: "h8", term: "Аль-Фараби", definition: "Великий мыслитель тюркского мира" },
    ],
  },
  {
    subjectId: "biology",
    title: "Живая лаборатория",
    subtitle: "Соедини биологический термин с его функцией",
    pairs: [
      { id: "b1", term: "Митохондрия", definition: "Энергетическая станция клетки" },
      { id: "b2", term: "ДНК", definition: "Молекула, хранящая генетический код" },
      { id: "b3", term: "Фотосинтез", definition: "Превращение света в химическую энергию" },
      { id: "b4", term: "Нейрон", definition: "Клетка, передающая нервный сигнал" },
      { id: "b5", term: "Эволюция", definition: "Постепенное изменение видов через отбор" },
      { id: "b6", term: "Экосистема", definition: "Сообщество организмов и их среда" },
      { id: "b7", term: "Рибосома", definition: "Собирает белки по инструкции мРНК" },
      { id: "b8", term: "CRISPR", definition: "Технология точного редактирования генов" },
    ],
  },
  {
    subjectId: "english",
    title: "English match",
    subtitle: "Match the grammar term with a clean example",
    pairs: [
      { id: "e1", term: "Present Simple", definition: "She drinks coffee every morning." },
      { id: "e2", term: "Present Continuous", definition: "She is drinking coffee right now." },
      { id: "e3", term: "Past Simple", definition: "She drank coffee yesterday." },
      { id: "e4", term: "Present Perfect", definition: "She has drunk three cups today." },
      { id: "e5", term: "First Conditional", definition: "If it rains, I will stay home." },
      { id: "e6", term: "Second Conditional", definition: "If I had more time, I would travel." },
      { id: "e7", term: "Passive voice", definition: "The letter was written by Anna." },
      { id: "e8", term: "Phrasal verb", definition: "give up, look after, run out of" },
    ],
  },
];

export function getCardGameForSubject(subjectId: string | undefined | null) {
  if (!subjectId) return undefined;
  return CARD_GAMES.find((g) => g.subjectId === subjectId);
}
