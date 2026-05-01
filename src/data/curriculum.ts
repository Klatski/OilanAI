import type { Grade, Quarter } from "../types";

/**
 * The school curriculum for OilanAI demo.
 *
 * Shape:  CURRICULUM[subjectId][grade][quarter] = TopicSeed[]
 *
 * "Deep" parallels (5, 7, 11) have 4-6 topics per quarter per subject.
 * Other parallels (6, 8, 9, 10) are intentionally empty — they show as
 * "по этой параллели тем пока нет" in the UI without crashing anything.
 *
 * Subjects that don't exist for a given grade in real Kazakhstani / РФ school
 * (e.g. chemistry in grade 5) are represented as an empty quarter list — same
 * treatment.
 *
 * `topics.ts` walks this table and produces a flat `Topic[]` with stable ids
 * shaped like `math.g7.q2.t3`.
 */

export interface TopicSeed {
  title: string;
  description: string;
  icon: string;
}

type QuarterMap = Partial<Record<Quarter, TopicSeed[]>>;
type GradeMap = Partial<Record<Grade, QuarterMap>>;
type Curriculum = Record<string, GradeMap>;

// ---------------------------------------------------------------------------
// Subject blocks
// ---------------------------------------------------------------------------

const MATH: GradeMap = {
  5: {
    1: [
      { title: "Натуральные числа", description: "Что такое натуральные числа и как они устроены.", icon: "🔢" },
      { title: "Сложение и вычитание", description: "Скоростные приёмы в столбик и в уме.", icon: "➕" },
      { title: "Умножение и деление", description: "Таблица, многозначные числа, деление с остатком.", icon: "✖️" },
      { title: "Сравнение чисел", description: "Знаки <, >, =. Координатный луч.", icon: "📏" },
    ],
    2: [
      { title: "Делимость чисел", description: "Признаки делимости на 2, 3, 5, 9, 10.", icon: "🔍" },
      { title: "Простые и составные", description: "Разложение на простые множители.", icon: "🧱" },
      { title: "НОД и НОК", description: "Зачем они нужны и как их быстро находить.", icon: "🧮" },
      { title: "Степень числа", description: "Что значит «возвести в степень».", icon: "⚡" },
    ],
    3: [
      { title: "Обыкновенные дроби", description: "Числитель, знаменатель и смысл дроби.", icon: "🍕" },
      { title: "Сравнение дробей", description: "Приведение к общему знаменателю.", icon: "⚖️" },
      { title: "Сложение дробей", description: "Дроби с разными знаменателями.", icon: "➕" },
      { title: "Десятичные дроби", description: "Запись и действия с десятичными.", icon: "🔟" },
    ],
    4: [
      { title: "Проценты", description: "Что такое процент и как находить от числа.", icon: "💯" },
      { title: "Площадь и периметр", description: "Прямоугольник, квадрат, единицы измерения.", icon: "🟦" },
      { title: "Объём", description: "Прямоугольный параллелепипед: V = a·b·c.", icon: "📦" },
      { title: "Углы", description: "Виды углов и их измерение.", icon: "📐" },
    ],
  },
  7: {
    1: [
      { title: "Степень с натуральным показателем", description: "Свойства степеней и операции с ними.", icon: "⚡" },
      { title: "Одночлены", description: "Стандартный вид и действия с одночленами.", icon: "🔣" },
      { title: "Многочлены", description: "Сумма, разность, умножение многочленов.", icon: "🧩" },
      { title: "Формулы сокращённого умножения", description: "(a±b)², (a−b)(a+b) и их применение.", icon: "✨" },
    ],
    2: [
      { title: "Линейные уравнения", description: "Корень уравнения и его смысл. ax + b = 0.", icon: "📐" },
      { title: "Линейные неравенства", description: "Знаки <, >, ≤, ≥ и числовая прямая.", icon: "↔️" },
      { title: "Системы линейных уравнений", description: "Способ подстановки и сложения.", icon: "🧮" },
      { title: "Текстовые задачи", description: "Перевод задачи в уравнение.", icon: "📖" },
    ],
    3: [
      { title: "Линейная функция", description: "y = kx + b. График и смысл k и b.", icon: "📈" },
      { title: "Прямая пропорциональность", description: "Когда величины растут согласованно.", icon: "🔗" },
      { title: "Геометрия: углы", description: "Смежные, вертикальные углы, биссектриса.", icon: "📐" },
      { title: "Треугольники", description: "Виды треугольников и их свойства.", icon: "🔺" },
    ],
    4: [
      { title: "Признаки равенства треугольников", description: "Три классических признака.", icon: "🟰" },
      { title: "Параллельные прямые", description: "Признаки и свойства параллельности.", icon: "║" },
      { title: "Сумма углов треугольника", description: "Почему всегда 180°.", icon: "📐" },
      { title: "Внешние углы", description: "Свойства внешних углов треугольника.", icon: "🔺" },
    ],
  },
  11: {
    1: [
      { title: "Производная функции", description: "Скорость изменения и геометрический смысл.", icon: "⚡" },
      { title: "Правила дифференцирования", description: "Производная суммы, произведения, частного.", icon: "🧮" },
      { title: "Производная сложной функции", description: "Цепное правило.", icon: "🔗" },
      { title: "Применение производной", description: "Касательная, монотонность, экстремумы.", icon: "📈" },
    ],
    2: [
      { title: "Первообразная", description: "Обратная задача дифференцирования.", icon: "🔄" },
      { title: "Неопределённый интеграл", description: "Семейство первообразных и константа C.", icon: "∫" },
      { title: "Определённый интеграл", description: "Площадь криволинейной трапеции.", icon: "📐" },
      { title: "Формула Ньютона-Лейбница", description: "Связь определённого и неопределённого интеграла.", icon: "✨" },
    ],
    3: [
      { title: "Показательная функция", description: "y = aˣ, её свойства и график.", icon: "📊" },
      { title: "Логарифмы", description: "logₐ(b) и основные свойства.", icon: "🔮" },
      { title: "Логарифмические уравнения", description: "Методы решения и ОДЗ.", icon: "🧩" },
      { title: "Показательные уравнения", description: "Сводим к одному основанию.", icon: "⚡" },
    ],
    4: [
      { title: "Комбинаторика", description: "Перестановки, размещения, сочетания.", icon: "🎲" },
      { title: "Вероятность", description: "Классическое определение и формула.", icon: "🎯" },
      { title: "Комплексные числа", description: "Мнимая единица i и алгебраическая форма.", icon: "🌠" },
      { title: "Подготовка к ЕНТ", description: "Разбор типовых сложных задач.", icon: "🏆" },
    ],
  },
};

const PHYSICS: GradeMap = {
  5: {}, // Физики ещё нет в программе 5 класса
  7: {
    1: [
      { title: "Что изучает физика", description: "Физические явления, наблюдение, опыт.", icon: "🔬" },
      { title: "Измерения и точность", description: "Цена деления, погрешность.", icon: "📏" },
      { title: "Строение вещества", description: "Молекулы, атомы, диффузия.", icon: "⚛️" },
      { title: "Три состояния вещества", description: "Твёрдое, жидкое, газообразное.", icon: "🧊" },
    ],
    2: [
      { title: "Механическое движение", description: "Траектория, путь, скорость.", icon: "🚗" },
      { title: "Равномерное движение", description: "v = s / t — что значит и когда работает.", icon: "📐" },
      { title: "Инерция", description: "Почему тело сохраняет скорость.", icon: "🛞" },
      { title: "Масса и плотность", description: "ρ = m / V и реальные материалы.", icon: "⚖️" },
    ],
    3: [
      { title: "Сила", description: "Как сила меняет движение тела.", icon: "💪" },
      { title: "Сила тяжести и вес", description: "F = m·g и в чём разница с массой.", icon: "🌍" },
      { title: "Сила упругости", description: "Закон Гука для пружины.", icon: "🪝" },
      { title: "Сила трения", description: "Когда трение мешает, а когда помогает.", icon: "🧲" },
    ],
    4: [
      { title: "Давление", description: "P = F / S и почему гвоздь острый.", icon: "📌" },
      { title: "Давление в жидкости", description: "Закон Паскаля и сообщающиеся сосуды.", icon: "💧" },
      { title: "Атмосферное давление", description: "Воздух тоже давит — опыт Торричелли.", icon: "🌬️" },
      { title: "Архимедова сила", description: "Почему корабли не тонут.", icon: "⛵" },
    ],
  },
  11: {
    1: [
      { title: "Колебания и волны", description: "Гармонические колебания, период, частота.", icon: "🌊" },
      { title: "Электромагнитные волны", description: "Шкала ЭМ-волн от радио до гамма.", icon: "📡" },
      { title: "Световые волны", description: "Интерференция, дифракция, поляризация.", icon: "💡" },
      { title: "Геометрическая оптика", description: "Линзы, формула тонкой линзы.", icon: "🔍" },
    ],
    2: [
      { title: "Квантовая природа света", description: "Фотоэффект и фотоны.", icon: "✨" },
      { title: "Уравнение Эйнштейна", description: "hν = A + Eₖ для фотоэффекта.", icon: "⚛️" },
      { title: "Атом водорода", description: "Постулаты Бора и спектр.", icon: "🔆" },
      { title: "Лазеры", description: "Как работает вынужденное излучение.", icon: "🔴" },
    ],
    3: [
      { title: "Ядро атома", description: "Состав, изотопы, ядерные силы.", icon: "☢️" },
      { title: "Радиоактивность", description: "Альфа, бета, гамма распады.", icon: "🌌" },
      { title: "Закон радиоактивного распада", description: "Период полураспада.", icon: "⏳" },
      { title: "Ядерные реакции", description: "Деление, синтез, дефект массы.", icon: "💥" },
    ],
    4: [
      { title: "Специальная теория относительности", description: "Постулаты Эйнштейна и время.", icon: "🕳️" },
      { title: "E = m·c²", description: "Эквивалентность массы и энергии.", icon: "⚡" },
      { title: "Элементарные частицы", description: "Кварки, лептоны, фундаментальные взаимодействия.", icon: "🧬" },
      { title: "Подготовка к ЕНТ", description: "Сборка картины современной физики.", icon: "🏆" },
    ],
  },
};

const CHEMISTRY: GradeMap = {
  5: {}, // Химии нет в 5 классе
  7: {}, // Химия в РК/РФ начинается с 8 класса
  11: {
    1: [
      { title: "Теория строения органических соединений", description: "Идеи Бутлерова и изомерия.", icon: "🧬" },
      { title: "Алканы", description: "Предельные углеводороды и их свойства.", icon: "🔥" },
      { title: "Алкены и алкины", description: "Двойные и тройные связи.", icon: "🔗" },
      { title: "Арены", description: "Бензол и ароматические углеводороды.", icon: "💍" },
    ],
    2: [
      { title: "Спирты и фенолы", description: "Гидроксильная группа и её роль.", icon: "🧪" },
      { title: "Альдегиды и кетоны", description: "Карбонильная группа.", icon: "💧" },
      { title: "Карбоновые кислоты", description: "Свойства и применение в жизни.", icon: "🍋" },
      { title: "Сложные эфиры и жиры", description: "Реакция этерификации.", icon: "🌻" },
    ],
    3: [
      { title: "Углеводы", description: "Моно-, ди- и полисахариды.", icon: "🍞" },
      { title: "Аминокислоты и белки", description: "Аминогруппы, пептидная связь.", icon: "🥚" },
      { title: "Нуклеиновые кислоты", description: "ДНК и РНК — химия наследственности.", icon: "🧬" },
      { title: "Полимеры", description: "Реакции полимеризации и поликонденсации.", icon: "🧵" },
    ],
    4: [
      { title: "Биологически активные вещества", description: "Витамины, ферменты, гормоны.", icon: "💊" },
      { title: "Химия и экология", description: "Загрязнения и зелёная химия.", icon: "🌿" },
      { title: "Промышленный синтез", description: "Как делают пластики, лекарства, удобрения.", icon: "🏭" },
      { title: "Подготовка к ЕНТ", description: "Цепочки превращений и комбинированные задачи.", icon: "🏆" },
    ],
  },
};

const BIOLOGY: GradeMap = {
  5: {
    1: [
      { title: "Что изучает биология", description: "Признаки живого и многообразие жизни.", icon: "🌱" },
      { title: "Методы изучения природы", description: "Наблюдение, опыт, измерение.", icon: "🔬" },
      { title: "Среды обитания", description: "Водная, наземная, почвенная, организменная.", icon: "🌍" },
      { title: "Экологические факторы", description: "Свет, температура, влажность.", icon: "🌤️" },
    ],
    2: [
      { title: "Клетка — единица жизни", description: "Простое устройство клетки.", icon: "🦠" },
      { title: "Микроскоп", description: "Как смотрят на клетки.", icon: "🔍" },
      { title: "Деление клеток", description: "Зачем клеткам делиться.", icon: "➗" },
      { title: "Ткани", description: "Группы похожих клеток.", icon: "🧶" },
    ],
    3: [
      { title: "Бактерии", description: "Самые мелкие живые организмы.", icon: "🦠" },
      { title: "Грибы", description: "Не растения и не животные.", icon: "🍄" },
      { title: "Лишайники", description: "Симбиоз гриба и водоросли.", icon: "🪨" },
      { title: "Простейшие", description: "Одноклеточные животные.", icon: "🔄" },
    ],
    4: [
      { title: "Растения", description: "Главные группы и их особенности.", icon: "🌿" },
      { title: "Животные", description: "От беспозвоночных к позвоночным.", icon: "🐾" },
      { title: "Природные сообщества", description: "Кто с кем дружит и кто кого ест.", icon: "🌳" },
      { title: "Охрана природы", description: "Зачем беречь биоразнообразие.", icon: "🦋" },
    ],
  },
  7: {
    1: [
      { title: "Многообразие животных", description: "Систематика: тип, класс, отряд.", icon: "🐾" },
      { title: "Простейшие", description: "Одноклеточные животные.", icon: "🔬" },
      { title: "Кишечнополостные", description: "Гидра, медузы, кораллы.", icon: "🪼" },
      { title: "Черви", description: "Плоские, круглые, кольчатые.", icon: "🪱" },
    ],
    2: [
      { title: "Моллюски", description: "Улитки, мидии, осьминоги.", icon: "🐚" },
      { title: "Членистоногие", description: "Ракообразные, паукообразные, насекомые.", icon: "🦂" },
      { title: "Насекомые", description: "Самый многочисленный класс на Земле.", icon: "🐝" },
      { title: "Иглокожие", description: "Морские звёзды и ежи.", icon: "⭐" },
    ],
    3: [
      { title: "Рыбы", description: "Жизнь в воде: жабры, плавники, чешуя.", icon: "🐟" },
      { title: "Земноводные", description: "Двойная жизнь — вода и суша.", icon: "🐸" },
      { title: "Пресмыкающиеся", description: "Чешуя и яйца — выход на сушу.", icon: "🦎" },
      { title: "Птицы", description: "Полёт, перья, теплокровность.", icon: "🦅" },
    ],
    4: [
      { title: "Млекопитающие", description: "Шерсть, молоко, забота о потомстве.", icon: "🦁" },
      { title: "Эволюция животного мира", description: "От древних форм к современным.", icon: "🦕" },
      { title: "Экология животных", description: "Связи в пищевых цепях.", icon: "🌐" },
      { title: "Охрана животных", description: "Красная книга и заповедники.", icon: "🐼" },
    ],
  },
  11: {
    1: [
      { title: "Молекулярная биология", description: "Биополимеры — белки, нуклеиновые кислоты.", icon: "🧬" },
      { title: "Структура ДНК", description: "Двойная спираль и принцип комплементарности.", icon: "🔗" },
      { title: "Репликация и транскрипция", description: "Как клетка читает и копирует ДНК.", icon: "📋" },
      { title: "Биосинтез белка", description: "Генетический код и трансляция.", icon: "⚙️" },
    ],
    2: [
      { title: "Генетика", description: "Законы Менделя и наследование.", icon: "🌸" },
      { title: "Сцепленное наследование", description: "Хромосомная теория Моргана.", icon: "🔗" },
      { title: "Изменчивость", description: "Мутации и комбинативная изменчивость.", icon: "🎲" },
      { title: "Генетика человека", description: "Методы изучения и наследственные болезни.", icon: "👤" },
    ],
    3: [
      { title: "Эволюция", description: "Теория Дарвина и современные представления.", icon: "🦕" },
      { title: "Микро- и макроэволюция", description: "Виды, популяции, видообразование.", icon: "🌿" },
      { title: "Происхождение жизни", description: "Гипотезы и эксперимент Миллера.", icon: "🌌" },
      { title: "Антропогенез", description: "Происхождение человека.", icon: "🚶" },
    ],
    4: [
      { title: "Экосистемы", description: "Биогеоценоз и его компоненты.", icon: "🌳" },
      { title: "Биосфера", description: "Учение Вернадского о живом веществе.", icon: "🌍" },
      { title: "Биотехнология", description: "ГМО, CRISPR, клонирование.", icon: "🔬" },
      { title: "Подготовка к ЕНТ", description: "Сложные задачи и комбинированные темы.", icon: "🏆" },
    ],
  },
};

const HISTORY: GradeMap = {
  5: {
    1: [
      { title: "Что такое история", description: "Время, источники, лента времени.", icon: "⏳" },
      { title: "Жизнь древнейших людей", description: "Каменный век и первые орудия.", icon: "🗿" },
      { title: "Появление земледелия", description: "Неолитическая революция.", icon: "🌾" },
      { title: "Первые города", description: "Шумер, Аккад, Месопотамия.", icon: "🏛️" },
    ],
    2: [
      { title: "Древний Египет", description: "Нил, фараоны, пирамиды.", icon: "🐫" },
      { title: "Древняя Индия", description: "Касты, Будда, Веды.", icon: "🕉️" },
      { title: "Древний Китай", description: "Конфуций, Великая стена, шёлк.", icon: "🐉" },
      { title: "Финикия и алфавит", description: "Кто придумал буквы.", icon: "📜" },
    ],
    3: [
      { title: "Древняя Греция", description: "Полисы, демократия Афин.", icon: "🏛️" },
      { title: "Греко-персидские войны", description: "Марафон и Фермопилы.", icon: "⚔️" },
      { title: "Александр Македонский", description: "Походы и эллинистический мир.", icon: "🌍" },
      { title: "Олимпийские игры", description: "Спорт как культурное явление.", icon: "🏅" },
    ],
    4: [
      { title: "Древний Рим: республика", description: "От царей к сенату.", icon: "🐺" },
      { title: "Юлий Цезарь", description: "Гражданские войны и принципат.", icon: "👑" },
      { title: "Римская империя", description: "Расцвет и устройство.", icon: "🏛️" },
      { title: "Падение Западной Римской империи", description: "Великое переселение народов.", icon: "🌪️" },
    ],
  },
  7: {
    1: [
      { title: "Раннее Средневековье", description: "Падение Рима и варварские королевства.", icon: "🛡️" },
      { title: "Византийская империя", description: "Константинополь и православие.", icon: "⛪" },
      { title: "Арабский халифат", description: "Возникновение ислама и расширение.", icon: "🌙" },
      { title: "Карл Великий", description: "Возрождение империи на Западе.", icon: "👑" },
    ],
    2: [
      { title: "Феодализм", description: "Сеньоры, вассалы, крестьяне.", icon: "🏰" },
      { title: "Крестовые походы", description: "Запад против Востока.", icon: "⚔️" },
      { title: "Средневековый город", description: "Цехи, ярмарки, университеты.", icon: "🏘️" },
      { title: "Великая чума", description: "Эпидемия, изменившая Европу.", icon: "🦠" },
    ],
    3: [
      { title: "Великие географические открытия", description: "Колумб, Васко да Гама, Магеллан.", icon: "🧭" },
      { title: "Возрождение", description: "Гуманизм, Леонардо, Микеланджело.", icon: "🎨" },
      { title: "Реформация", description: "Лютер и раскол христианства.", icon: "📖" },
      { title: "Абсолютизм", description: "Людовик XIV — «государство — это я».", icon: "👑" },
    ],
    4: [
      { title: "Казахское ханство", description: "Образование и расцвет.", icon: "🦅" },
      { title: "Казахско-джунгарские войны", description: "Анырақай и хан Абылай.", icon: "🐎" },
      { title: "Присоединение к России", description: "Младший и Средний жузы.", icon: "🤝" },
      { title: "Культура средневекового Казахстана", description: "Жырау, кюйши, степной эпос.", icon: "🪕" },
    ],
  },
  11: {
    1: [
      { title: "Первая мировая война", description: "Причины, фронты, итоги.", icon: "🎖️" },
      { title: "Революции 1917 года", description: "Февраль и Октябрь в России.", icon: "🚩" },
      { title: "Мир между войнами", description: "Версаль, Великая депрессия, фашизм.", icon: "💸" },
      { title: "Казахстан в 1920-30-е", description: "Коллективизация и голощёкинский голод.", icon: "🌾" },
    ],
    2: [
      { title: "Вторая мировая война", description: "1939–1945: глобальный конфликт.", icon: "🌍" },
      { title: "Великая Отечественная", description: "Решающие сражения и тыл.", icon: "⭐" },
      { title: "Казахстан в годы войны", description: "Эвакуация, фронт, тыл.", icon: "🛡️" },
      { title: "Итоги Второй мировой", description: "ООН, ядерная эра, Нюрнберг.", icon: "🕊️" },
    ],
    3: [
      { title: "Холодная война", description: "Два лагеря и гонка вооружений.", icon: "❄️" },
      { title: "Деколонизация", description: "Распад колониальных империй.", icon: "🌐" },
      { title: "Брежневская эпоха", description: "Застой и его признаки.", icon: "🏭" },
      { title: "Перестройка", description: "Гласность, ускорение, распад СССР.", icon: "🔄" },
    ],
    4: [
      { title: "Независимый Казахстан", description: "1991: суверенитет и реформы.", icon: "🇰🇿" },
      { title: "Современный мир", description: "Глобализация, интернет, миграции.", icon: "🌍" },
      { title: "XXI век: вызовы", description: "Климат, ИИ, пандемии, конфликты.", icon: "⚡" },
      { title: "Подготовка к ЕНТ", description: "Хронология и причинно-следственные связи.", icon: "🏆" },
    ],
  },
};

const ENGLISH: GradeMap = {
  5: {
    1: [
      { title: "Greetings & introductions", description: "Hello, how are you, what's your name.", icon: "👋" },
      { title: "Numbers 1-100", description: "Считаем по-английски.", icon: "🔢" },
      { title: "Family vocabulary", description: "Mother, father, sister, brother.", icon: "👨‍👩‍👧" },
      { title: "Verb 'to be'", description: "I am, you are, he/she/it is.", icon: "🔤" },
    ],
    2: [
      { title: "Present Simple", description: "Простые повседневные действия.", icon: "⏱️" },
      { title: "Articles a / an / the", description: "Когда что ставить.", icon: "🔤" },
      { title: "Plural nouns", description: "Книги, мыши, дети — формы множ. числа.", icon: "📚" },
      { title: "Possessive pronouns", description: "My, your, his, her, our, their.", icon: "👜" },
    ],
    3: [
      { title: "Daily routine", description: "Лексика дня: I get up, I have breakfast.", icon: "🌅" },
      { title: "Telling the time", description: "Half past, quarter to, o'clock.", icon: "🕒" },
      { title: "Food & drink", description: "Базовый словарь еды.", icon: "🍎" },
      { title: "Colours & clothes", description: "What are you wearing?", icon: "👕" },
    ],
    4: [
      { title: "Can / can't", description: "Что я умею и не умею.", icon: "✅" },
      { title: "Prepositions of place", description: "In, on, under, behind.", icon: "📍" },
      { title: "There is / there are", description: "Описание комнаты, города.", icon: "🏠" },
      { title: "My country: Kazakhstan", description: "Простой проект на английском.", icon: "🇰🇿" },
    ],
  },
  7: {
    1: [
      { title: "Present Simple vs Continuous", description: "Что вообще и что прямо сейчас.", icon: "⏱️" },
      { title: "Past Simple", description: "Регулярные и нерегулярные глаголы.", icon: "📼" },
      { title: "Past Continuous", description: "Длительное действие в прошлом.", icon: "🌧️" },
      { title: "Question forms", description: "Wh-questions и порядок слов.", icon: "❓" },
    ],
    2: [
      { title: "Present Perfect", description: "Связь прошлого с настоящим.", icon: "🔗" },
      { title: "Just / already / yet", description: "Маркеры Present Perfect.", icon: "⚡" },
      { title: "Future: will vs going to", description: "Прогноз vs план.", icon: "🔮" },
      { title: "Adverbs of frequency", description: "Always, usually, often, never.", icon: "🔁" },
    ],
    3: [
      { title: "Comparatives & superlatives", description: "Bigger, the biggest.", icon: "📊" },
      { title: "Modal verbs: must, should", description: "Обязательства и советы.", icon: "🎭" },
      { title: "Quantifiers", description: "Some, any, much, many, a lot of.", icon: "🧮" },
      { title: "Travel vocabulary", description: "Aeroplane, ticket, passport.", icon: "✈️" },
    ],
    4: [
      { title: "Conditionals (zero & first)", description: "If you heat water, it boils.", icon: "🌈" },
      { title: "Reported speech (basic)", description: "He said that…", icon: "💬" },
      { title: "Phrasal verbs (intro)", description: "Get up, look after, give up.", icon: "🧩" },
      { title: "Project: my dream trip", description: "Описать поездку мечты.", icon: "🗺️" },
    ],
  },
  11: {
    1: [
      { title: "Advanced tenses overview", description: "Все 12 времён в одной системе.", icon: "🕰️" },
      { title: "Mixed conditionals", description: "If I had studied, I would be…", icon: "🌀" },
      { title: "Inversion", description: "Never have I seen…", icon: "🔄" },
      { title: "Cleft sentences", description: "It is X that…, What I need is…", icon: "🎯" },
    ],
    2: [
      { title: "Academic vocabulary", description: "Slang vs formal language.", icon: "📚" },
      { title: "Linking words", description: "Furthermore, however, despite.", icon: "🔗" },
      { title: "Essay structure", description: "Intro, body, conclusion.", icon: "✍️" },
      { title: "Argumentative writing", description: "Тезис, аргументы, контраргументы.", icon: "⚖️" },
    ],
    3: [
      { title: "IELTS Speaking", description: "Three parts and how to handle them.", icon: "🗣️" },
      { title: "IELTS Listening", description: "Стратегии для разных типов заданий.", icon: "🎧" },
      { title: "IELTS Reading", description: "Skimming, scanning, T/F/NG.", icon: "📖" },
      { title: "IELTS Writing", description: "Task 1 graphs and Task 2 essays.", icon: "📊" },
    ],
    4: [
      { title: "Idioms & collocations", description: "Native-like phrasing.", icon: "🎨" },
      { title: "Public speaking", description: "Структура и подача речи.", icon: "🎤" },
      { title: "CV & cover letter", description: "Личное письмо для университета.", icon: "📄" },
      { title: "Final project", description: "5-минутная презентация на свободную тему.", icon: "🏆" },
    ],
  },
};

// ---------------------------------------------------------------------------
// Public table
// ---------------------------------------------------------------------------

export const CURRICULUM: Curriculum = {
  math: MATH,
  physics: PHYSICS,
  chemistry: CHEMISTRY,
  biology: BIOLOGY,
  history: HISTORY,
  english: ENGLISH,
};
