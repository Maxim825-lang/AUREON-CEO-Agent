"""
Cinema / Mood Content Agent — recommends movies, scenes, quotes and clip ideas
based on mood, character type, and content goal.

Stores only: movie titles, character names, moods, themes, scene descriptions,
short quotes (≤10 words), clip ideas, visual styles.
No piracy links, no full transcripts, no copyrighted text blocks.
"""
import random
from datetime import datetime

# ── Movie database ────────────────────────────────────────────────────────────

MOVIES = {
    "discipline": [
        {"title": "Whiplash", "year": 2014, "director": "Damien Chazelle",
         "why": "Одержимость совершенством. Боль роста. Сцена с барабанами — апогей дисциплины.",
         "atmosphere": "Тёмная, душная, пот и кровь. Джаз как война."},
        {"title": "Jiro Dreams of Sushi", "year": 2011, "director": "David Gelb",
         "why": "85-летний мастер, 60 лет одного дела. Совершенство как образ жизни.",
         "atmosphere": "Медитативная. Золотой рис, серебряный нож, бесконечное повторение."},
        {"title": "1917", "year": 2019, "director": "Sam Mendes",
         "why": "Один непрерывный рывок вперёд. Остановиться = умереть. Чистая дисциплина движения.",
         "atmosphere": "Серая земля, туман, одна линия горизонта."},
        {"title": "Ford v Ferrari", "year": 2019, "director": "James Mangold",
         "why": "Против системы, против времени, против физики. Победа через технику и волю.",
         "atmosphere": "Рёв двигателя, пыль, хронометр, кожа руля."},
    ],
    "lonely_founder": [
        {"title": "The Social Network", "year": 2010, "director": "David Fincher",
         "why": "Строишь будущее пока все остальные смотрят в прошлое. Одиночество как топливо.",
         "atmosphere": "Холодный синий, пустые коридоры, клавиатура в 3 ночи."},
        {"title": "Steve Jobs", "year": 2015, "director": "Danny Boyle",
         "why": "Backstage за 3 минуты до запуска. Конфликты, сомнения, величие.",
         "atmosphere": "Закрытые пространства, резкий диалог, прожекторы."},
        {"title": "Pirates of Silicon Valley", "year": 1999, "director": "Martyn Burke",
         "why": "Гараж → корпорация. Идея важнее правил. Украсть, чтобы изменить мир.",
         "atmosphere": "Зернистая плёнка, свитеры, флуоресцентный свет."},
        {"title": "Citizen Kane", "year": 1941, "director": "Orson Welles",
         "why": "Розовый бутон. Что ты потерял на пути к вершине. Одиночество успеха.",
         "atmosphere": "Чёрно-белые контрасты, замки, тишина."},
    ],
    "dark_motivation": [
        {"title": "Drive", "year": 2011, "director": "Nicolas Winding Refn",
         "why": "Немногословный. Точный. Взрывной когда нужно. Дейст­вие без объяснений.",
         "atmosphere": "Неоновый Лос-Анджелес, синтвейв, кожаный скорпион."},
        {"title": "Sicario", "year": 2015, "director": "Denis Villeneuve",
         "why": "Система не честная, но она работает. Цена победы — моральные компромиссы.",
         "atmosphere": "Пыльный Техас, инфракрасный туннель, тяжёлые ботинки."},
        {"title": "Blade Runner 2049", "year": 2017, "director": "Denis Villeneuve",
         "why": "Цель без смысла vs смысл без цели. Что значит быть настоящим.",
         "atmosphere": "Пепел, оранжевый туман, монолитная архитектура, тишина."},
        {"title": "Training Day", "year": 2001, "director": "Antoine Fuqua",
         "why": "Система сгнила. Кинг — сам себе закон. Тёмная харизма власти.",
         "atmosphere": "Раскалённые улицы, золотой Escalade, пыль и страх."},
    ],
    "luxury_business": [
        {"title": "The Wolf of Wall Street", "year": 2013, "director": "Martin Scorsese",
         "why": "Энергия денег как наркотик. Продажа как искусство. Жизнь на максимуме.",
         "atmosphere": "Белые яхты, серпантин, кокаин, костюмы за $5000."},
        {"title": "Wall Street", "year": 1987, "director": "Oliver Stone",
         "why": "'Greed is good.' Формула власти через информацию и дерзость.",
         "atmosphere": "Нью-Йорк 80-х, подтяжки, сигары, телефонные трубки."},
        {"title": "Glengarry Glen Ross", "year": 1992, "director": "James Foley",
         "why": "Продажи как жизнь и смерть. Первый приз — Cadillac, второй — нож в спину.",
         "atmosphere": "Дождь, неон, отчаяние, галстуки."},
        {"title": "Succession", "year": "2018-2023", "director": "Jesse Armstrong",
         "why": "Власть, семья, предательство. Трон из стекла — один удар и рассыплется.",
         "atmosphere": "Нейтральные бежевые, вертолёты, загородные поместья."},
    ],
    "revenge_arc": [
        {"title": "John Wick", "year": 2014, "director": "Chad Stahelski",
         "why": "Спокойствие перед штормом. Точность. Бесконечная решимость.",
         "atmosphere": "Чёрный костюм, мокрый асфальт, золотые монеты."},
        {"title": "The Count of Monte Cristo", "year": 2002, "director": "Kevin Reynolds",
         "why": "Терпение как оружие. Годы подготовки ради одного момента.",
         "atmosphere": "Морские скалы, тюремные стены, бальные залы."},
        {"title": "Kill Bill", "year": "2003-2004", "director": "Quentin Tarantino",
         "why": "Список — это цель. Каждое имя вычеркнуто. Дорога важнее финала.",
         "atmosphere": "Японские клинки, солнечные пустыни, кровь на снегу."},
        {"title": "Oldboy", "year": 2003, "director": "Park Chan-wook",
         "why": "Один коридор. Один молоток. Сколько угодно врагов. Воля — единственный ресурс.",
         "atmosphere": "Грязный коридор, серые стены, одна лампочка."},
    ],
    "calm_focus": [
        {"title": "Her", "year": 2013, "director": "Spike Jonze",
         "why": "Тихий мир будущего. Интимность с идеей. Красота одиночества.",
         "atmosphere": "Тёплый оранжевый, пастельный, тихие улицы."},
        {"title": "Lost in Translation", "year": 2003, "director": "Sofia Coppola",
         "why": "Тихий разговор важнее громкого действия. Найти себя в чужом городе.",
         "atmosphere": "Неоновый Токио, гостиничный бар, стеклянная тишина."},
        {"title": "Moon", "year": 2009, "director": "Duncan Jones",
         "why": "Один человек. Один вопрос. Три года лунной тишины.",
         "atmosphere": "Белый, серый, лунная пыль, мониторы."},
        {"title": "Ex Machina", "year": 2014, "director": "Alex Garland",
         "why": "Что значит быть разумным. Тихий дом, тихая угроза, тихая революция.",
         "atmosphere": "Стекло, бетон, лес, холодные синие огни."},
    ],
    "future_scifi": [
        {"title": "Blade Runner 2049", "year": 2017, "director": "Denis Villeneuve",
         "why": "Визуальный язык будущего. Масштаб, одиночество, что значит быть человеком.",
         "atmosphere": "Оранжевый туман, пепел, голограммы, дождь."},
        {"title": "Dune", "year": 2021, "director": "Denis Villeneuve",
         "why": "Миссия больше тебя. Пустыня как арена. Избранный или сломанный.",
         "atmosphere": "Золотой песок, синие глаза, голоса предков."},
        {"title": "Interstellar", "year": 2014, "director": "Christopher Nolan",
         "why": "Время — настоящий враг. Любовь как гравитация. Невозможное как цель.",
         "atmosphere": "Бесконечность, тишина, пшеничное поле, чёрная дыра."},
        {"title": "Arrival", "year": 2016, "director": "Denis Villeneuve",
         "why": "Язык меняет восприятие времени. Видеть финал до начала.",
         "atmosphere": "Серый туман, гексапод, нелинейное время."},
    ],
    "confidence": [
        {"title": "The Wolf of Wall Street", "year": 2013, "director": "Martin Scorsese",
         "why": "Невозможная уверенность. Продажа — это шоу. Зал — это арена.",
         "atmosphere": "Зал аплодирует, пот, харизма, деньги летят."},
        {"title": "Any Given Sunday", "year": 1999, "director": "Oliver Stone",
         "why": "'Every inch of that field.' Речь Пачино — код победителя.",
         "atmosphere": "Раздевалка, грязь, пот, прожекторы стадиона."},
        {"title": "Scarface", "year": 1983, "director": "Brian De Palma",
         "why": "Ничего нет — создай всё. Из ниоткуда к вершине.",
         "atmosphere": "Белый костюм, Майами, пальмы, кокаин, пуля."},
        {"title": "The Dark Knight", "year": 2008, "director": "Christopher Nolan",
         "why": "Быть готовым к хаосу — высшая форма уверенности.",
         "atmosphere": "Ночной Готэм, горящий маяк, маска, страх."},
    ],
    "pressure": [
        {"title": "Whiplash", "year": 2014, "director": "Damien Chazelle",
         "why": "Давление как инструмент роста. Не достаточно хорошо — пока.",
         "atmosphere": "Потный лоб, дрожащие руки, метроном."},
        {"title": "Locke", "year": 2013, "director": "Steven Knight",
         "why": "Один человек. Одна машина. Один час. Всё рушится и собирается.",
         "atmosphere": "Шоссе, темнота, телефонные звонки, огни."},
        {"title": "1917", "year": 2019, "director": "Sam Mendes",
         "why": "Дедлайн — смерть. Один путь. Нельзя остановиться.",
         "atmosphere": "Окопы, грязь, зарево, тикающие часы."},
        {"title": "Uncut Gems", "year": 2019, "director": "Safdie Brothers",
         "why": "Ставки на каждой секунде. Адреналин давления невыносим. Невозможно выдохнуть.",
         "atmosphere": "Неоновый Нью-Йорк, толпа, ставки, крик."},
    ],
    "victory": [
        {"title": "Rocky", "year": 1976, "director": "John G. Avildsen",
         "why": "Не победил — но устоял. Путь важнее результата. Беги по ступенькам.",
         "atmosphere": "Утренний Филадельфия, рассвет, крик победы."},
        {"title": "The Pursuit of Happyness", "year": 2006, "director": "Gabriele Muccino",
         "why": "Из ничего к мечте. Слёзы на улице, победа через стекло офиса.",
         "atmosphere": "Тёплый свет, дети, метро, офис."},
        {"title": "The Social Network", "year": 2010, "director": "David Fincher",
         "why": "В 23 самый молодой миллиардер. Но зачем? Финальная сцена — победа и пустота.",
         "atmosphere": "Пустой офис, экран, refresh, одиночество."},
        {"title": "Jerry Maguire", "year": 1996, "director": "Cameron Crowe",
         "why": "'Show me the money.' Один клиент. Одна сделка. Всё поставить на карту.",
         "atmosphere": "Живые цвета, звонки, радость, Deal."},
    ],
}

# ── Scenes by mood ─────────────────────────────────────────────────────────────

SCENES = {
    "discipline": [
        {"film": "Whiplash", "scene": "Финальное соло — Флетчер даёт знак начинать, но Эндрю играет сам. Контроль переходит к тому, кто не отступил."},
        {"film": "Jiro Dreams of Sushi", "scene": "Массаж осьминога 45 минут каждое утро. Детали, которые никто не заметит. Но мастер заметит."},
        {"film": "1917", "scene": "Пробег через горящий город ночью. Единственная линия движения вперёд через хаос."},
        {"film": "Ford v Ferrari", "scene": "Финальный круг — Мэтт Демон тихо плачет в ангаре. Скорость достигнута. Цена уплачена."},
    ],
    "lonely_founder": [
        {"film": "The Social Network", "scene": "Начало — разговор в баре. Марк говорит быстрее, чем собеседник думает. Одиночество как конкурентное преимущество."},
        {"film": "The Social Network", "scene": "Ночное кодирование после разрыва. Фейсмэш запущен. Мир изменился, пока все спали."},
        {"film": "Steve Jobs", "scene": "За кулисами перед запуском первого Mac — Джобс меняет текст последний раз. Перфекционизм как одиночество."},
        {"film": "Citizen Kane", "scene": "Розовый бутон в руинах. Сжигают. Что мы теряем строя империи."},
    ],
    "dark_motivation": [
        {"film": "Drive", "scene": "Водитель в маске скорпиона — медленный лифт, финальная секунда, переключение."},
        {"film": "Sicario", "scene": "Переход через туннель в инфракрасном режиме. Тишина и смерть как профессия."},
        {"film": "Blade Runner 2049", "scene": "Детектив в пустыне находит дерево. Единственное живое. Невозможное — оно здесь."},
        {"film": "Training Day", "scene": "Кинг стоит посреди улицы. Весь квартал с ним. Власть не в значке."},
    ],
    "luxury_business": [
        {"film": "The Wolf of Wall Street", "scene": "Речь Белфорта на продаже акций — холодный звонок превращается в $4000 за минуту."},
        {"film": "Wall Street", "scene": "Гекко на крыше — 'Greed is good.' Зал аплодирует. Эпоха меняется."},
        {"film": "Glengarry Glen Ross", "scene": "Алек Болдуин: первый приз — Кадиллак. Второй — набор ножей. Третий — ты уволен."},
        {"film": "Succession", "scene": "Логан Рой за столом переговоров. Слово не произнесено — сделка уже заключена."},
    ],
    "revenge_arc": [
        {"film": "John Wick", "scene": "Подготовка в оружейке — каждое движение точное. Легенда просыпается."},
        {"film": "Kill Bill", "scene": "Невеста в больнице, двигает пальцем три часа. Воля без тела. Тело подчиняется воле."},
        {"film": "The Count of Monte Cristo", "scene": "Данглар смотрит в глаза Эдмону. Узнаёт. Слишком поздно."},
        {"film": "Oldboy", "scene": "Коридор. Один молоток. Пятнадцать человек. Усталость не останавливает."},
    ],
    "calm_focus": [
        {"film": "Her", "scene": "Теодор идёт через вокзал слушая Саманту. Мир шумит — он в тишине внутри."},
        {"film": "Ex Machina", "scene": "Калеб ночью один, смотрит в экран. Понимает. Слишком поздно."},
        {"film": "Moon", "scene": "Сэм смотрит на Землю из иллюминатора. Три года. Один вопрос о реальности."},
        {"film": "Lost in Translation", "scene": "Боб и Шарлотт на полу отеля. Не нужно слов. Тишина понимания."},
    ],
    "future_scifi": [
        {"film": "Blade Runner 2049", "scene": "К идёт к стеклянной стене, за ней — оранжевый туман без горизонта."},
        {"film": "Interstellar", "scene": "Стыковка со Странником на безумной скорости. Невозможно — но необходимо."},
        {"film": "Dune", "scene": "Пол смотрит на червя в пустыне. Страх — убийца разума. Он его прошёл."},
        {"film": "Arrival", "scene": "Первый разговор с гептаподами — круговой символ на стекле. Время нелинейно."},
    ],
    "confidence": [
        {"film": "The Wolf of Wall Street", "scene": "Белфорт выходит на сцену в кроссовках. Зал орёт. Деньги — кровь этого мира."},
        {"film": "Any Given Sunday", "scene": "Речь Пачино в раздевалке — каждый дюйм. Каждую секунду."},
        {"film": "Scarface", "scene": "Тони Монтана — я хочу мир, а потом всё остальное в нём."},
        {"film": "The Dark Knight", "scene": "Бэтмен над городом. Выбор — опуститься или нести."},
    ],
    "pressure": [
        {"film": "Whiplash", "scene": "Флетчер бросает тарелки. Андрей играет окровавленными руками. Дедлайн не ждёт."},
        {"film": "Locke", "scene": "Иван едет. Звонит. Всё рушится. Едет. Звонит. Управляет хаосом голосом."},
        {"film": "Uncut Gems", "scene": "Адам Сэндлер ставит всё на один матч. Невозможно смотреть. Невозможно отвести взгляд."},
        {"film": "1917", "scene": "Сражение с течением реки — мёртвые цветы, тело несёт сквозь кровавую воду."},
    ],
    "victory": [
        {"film": "Rocky", "scene": "Лестница Филадельфии на рассвете — руки подняты, город внизу, оркестр."},
        {"film": "The Pursuit of Happyness", "scene": "Уилл Смит плачет на улице прижимая сына. Это счастье? Да. Оно настоящее."},
        {"film": "Jerry Maguire", "scene": "Show me the money — крик в пустом офисе, первая сделка, новая жизнь."},
        {"film": "The Social Network", "scene": "Цукерберг добавляет Эрику в друзья. Refresh. Refresh. Refresh. Пустота победы."},
    ],
}

# ── Quotes ────────────────────────────────────────────────────────────────────

QUOTES = {
    "discipline": [
        {"text": "Not my tempo.", "film": "Whiplash", "char": "Fletcher"},
        {"text": "There are no two words more harmful than 'good job.'", "film": "Whiplash", "char": "Fletcher"},
        {"text": "Dedication is not what others expect of you.", "film": "Jiro Dreams of Sushi", "char": "Narrator"},
        {"text": "Every frame counts. Every second counts.", "film": "Ford v Ferrari", "char": "Ken Miles"},
    ],
    "lonely_founder": [
        {"text": "You're gonna need a lawyer.", "film": "The Social Network", "char": "Eduardo Saverin"},
        {"text": "A million dollars isn't cool. You know what's cool?", "film": "The Social Network", "char": "Sean Parker"},
        {"text": "Real artists ship.", "film": "Steve Jobs", "char": "Steve Jobs"},
        {"text": "They all loved him once. He made sure of it.", "film": "Citizen Kane", "char": "Narrator"},
    ],
    "dark_motivation": [
        {"text": "If you're good at something, never do it for free.", "film": "The Dark Knight", "char": "Joker"},
        {"text": "The future is not yet written.", "film": "Terminator", "char": "Sarah Connor"},
        {"text": "I drive.", "film": "Drive", "char": "Driver"},
        {"text": "Nothing is what it seems.", "film": "Sicario", "char": "Alejandro"},
    ],
    "luxury_business": [
        {"text": "Greed, for lack of a better word, is good.", "film": "Wall Street", "char": "Gordon Gekko"},
        {"text": "The money never sleeps, pal.", "film": "Wall Street", "char": "Gordon Gekko"},
        {"text": "First prize is a Cadillac Eldorado.", "film": "Glengarry Glen Ross", "char": "Blake"},
        {"text": "I am the wolf of Wall Street.", "film": "The Wolf of Wall Street", "char": "Jordan Belfort"},
    ],
    "revenge_arc": [
        {"text": "He used to be someone.", "film": "John Wick", "char": "Viggo"},
        {"text": "The man, the myth, the legend.", "film": "John Wick", "char": "Aurelio"},
        {"text": "Vengeance is patient.", "film": "The Count of Monte Cristo", "char": "Edmond Dantès"},
        {"text": "Wiggle your big toe.", "film": "Kill Bill", "char": "The Bride"},
    ],
    "calm_focus": [
        {"text": "The past is just a story we tell ourselves.", "film": "Her", "char": "Samantha"},
        {"text": "What's it like to hold the hand of someone you love?", "film": "Ex Machina", "char": "Ava"},
        {"text": "Are you ever lonely?", "film": "Moon", "char": "Sam Bell"},
        {"text": "Let's never come here again.", "film": "Lost in Translation", "char": "Bob Harris"},
    ],
    "future_scifi": [
        {"text": "All those moments will be lost in time.", "film": "Blade Runner", "char": "Roy Batty"},
        {"text": "I'm not afraid anymore.", "film": "Interstellar", "char": "Cooper"},
        {"text": "Fear is the mind-killer.", "film": "Dune", "char": "Paul Atreides"},
        {"text": "Memory is the key.", "film": "Blade Runner 2049", "char": "Ana Stelline"},
    ],
    "confidence": [
        {"text": "I want the world. Then I want everything else.", "film": "Scarface", "char": "Tony Montana"},
        {"text": "Every inch of that field is ours.", "film": "Any Given Sunday", "char": "Coach D'Amato"},
        {"text": "Show me the money!", "film": "Jerry Maguire", "char": "Rod Tidwell"},
        {"text": "Why so serious?", "film": "The Dark Knight", "char": "Joker"},
    ],
    "pressure": [
        {"text": "Are you rushing or are you dragging?", "film": "Whiplash", "char": "Fletcher"},
        {"text": "Whatever it takes.", "film": "1917", "char": "Schofield"},
        {"text": "Don't stop. Keep going.", "film": "Uncut Gems", "char": "Howard Ratner"},
        {"text": "I will be there.", "film": "Locke", "char": "Ivan Locke"},
    ],
    "victory": [
        {"text": "Yo, Adrian! We did it!", "film": "Rocky II", "char": "Rocky Balboa"},
        {"text": "Don't ever let somebody tell you can't do something.", "film": "The Pursuit of Happyness", "char": "Chris Gardner"},
        {"text": "You complete me.", "film": "Jerry Maguire", "char": "Jerry Maguire"},
        {"text": "You know what's cooler than a million dollars? A billion.", "film": "The Social Network", "char": "Sean Parker"},
    ],
}

# ── Color palettes ─────────────────────────────────────────────────────────────

PALETTES = {
    "discipline":       {"name": "Precision Monochrome", "colors": ["#1A1A1A", "#F5F5F5", "#C8A951", "#444444"], "feeling": "Резкость. Контраст. Совершенство."},
    "lonely_founder":   {"name": "Cold Blue Night", "colors": ["#0A0E1A", "#1E3A5F", "#6B9BD2", "#F0F4FF"], "feeling": "Изоляция. Ясность. Экран в темноте."},
    "dark_motivation":  {"name": "Neon Shadow", "colors": ["#0D0D0D", "#FF3366", "#9B59B6", "#1ABC9C"], "feeling": "Неон в ночи. Угроза как сила."},
    "luxury_business":  {"name": "Gold & Marble", "colors": ["#0A0A0A", "#D4AF37", "#F5E6CC", "#2C2C2C"], "feeling": "Власть. Элегантность. Деньги молчат."},
    "revenge_arc":      {"name": "Blood & Steel", "colors": ["#1A0000", "#CC0000", "#888888", "#2A2A2A"], "feeling": "Холодная решимость. Красная точка прицела."},
    "calm_focus":       {"name": "Warm Minimal", "colors": ["#1A1208", "#D4B896", "#8DB6CD", "#E8E0D5"], "feeling": "Тепло. Присутствие. Стекло и лес."},
    "future_scifi":     {"name": "Cosmic Orange", "colors": ["#0A0A0F", "#FF6B35", "#7B2FBE", "#00D4FF"], "feeling": "Бесконечность. Пепел. Будущее уже здесь."},
    "confidence":       {"name": "Power Red", "colors": ["#0A0A0A", "#FF2222", "#FFD700", "#FFFFFF"], "feeling": "Харизма. Власть. Взрыв."},
    "pressure":         {"name": "Adrenaline Grey", "colors": ["#111111", "#666666", "#FF4500", "#CCCCCC"], "feeling": "Тикающий счётчик. Сердцебиение. Дедлайн."},
    "victory":          {"name": "Golden Dawn", "colors": ["#0A0A0A", "#FFD700", "#FF6B00", "#FFFFFF"], "feeling": "Рассвет после ночи. Победный крик. Золото."},
}

# ── Clip ideas ────────────────────────────────────────────────────────────────

CLIP_IDEAS = {
    "discipline": [
        "Быстрый монтаж: секундомер → рука на клавиатуре → экран с кодом → рассвет. Без слов.",
        "Слоу-мо: капли пота на форме атлета = капли воды на стекле офиса. Параллельный монтаж.",
        "Текст появляется на экране посекундно под метроном. Каждое слово — удар.",
        "Timelapse рабочего стола: пустой → заполненный → завершённый проект → новый.",
    ],
    "lonely_founder": [
        "Пустой офис ночью. Одна лампа. Силуэт за экраном. Надпись: 'Building in the dark.'",
        "Параллельный монтаж: толпа веселится — ты работаешь. Снова и снова.",
        "Экран телефона: 03:47. Сообщения без ответа. Код продолжает писаться.",
        "Лифт поднимается в пустом здании. Один человек. Взгляд вверх.",
    ],
    "dark_motivation": [
        "Черно-белый монтаж провалов → цветной взрыв победы. Переключение в один кадр.",
        "Скандал, отказ, неудача — каждый удар делает тебя тяжелее. Слоу-мо.",
        "Неоновые буквы на мокром асфальте: 'They said no.' Затем: 'Watch.'",
        "Камера поднимается из земли вверх в небо. Один кадр. Без слов.",
    ],
    "luxury_business": [
        "B-roll: часы, кожа портфеля, кофе в белой чашке, город с высоты. Без людей.",
        "Рука подписывает контракт. Крупный план. Звук ручки. Тишина после.",
        "Дорогой ресторан. Пустой. Один человек читает цифры на телефоне. Улыбается.",
        "Быстрый монтаж: переговоры → рукопожатие → шампанское → горизонт с самолёта.",
    ],
    "revenge_arc": [
        "Список. Имена вычёркиваются одно за другим. Красная ручка. Рука не дрожит.",
        "Флешбэк чёрно-белый → настоящее цветное. Один человек. Другой мир.",
        "Медленная ходьба по коридору. Камера сзади. Дверь в конце.",
        "Цифровой таймер обратного отсчёта на экране. Ноль. Тишина.",
    ],
    "calm_focus": [
        "Утренний ритуал. Кофе → окно → блокнот → компьютер. Без спешки.",
        "Природа и экран — параллельный монтаж. Лес = чистый разум. Код = порядок.",
        "Одна рука открывает ноутбук. Мягкий свет. Тишина начала.",
        "Книга закрывается. Ноутбук открывается. Один поворот страницы жизни.",
    ],
    "future_scifi": [
        "Скриншоты кода, алгоритмы, данные — быстрый монтаж. Финал: один пиксель = большое решение.",
        "Человек идёт сквозь голографический дата-центр. Данные вокруг него.",
        "Текст на экране: 'In 2024 nobody believed in AI agents. In 2026—' Стоп кадр.",
        "Городской пейзаж с высоты дрона. Строчка кода на весь экран.",
    ],
    "confidence": [
        "Slow motion выход из лифта. Костюм, взгляд вперёд. Зал за дверью.",
        "Один человек за столом переговоров. Остальные ждут. Тишина его власть.",
        "Быстрые флэши: отказ → работа → отказ → работа → победа. Под бас-дропом.",
        "Камера смотрит снизу вверх на человека на фоне неба.",
    ],
    "pressure": [
        "Таймер на весь экран считает вниз. Руки печатают. Пот. 0:00. Отправлено.",
        "Несколько окон на мониторах. Всё красное. Один за другим — зелёный.",
        "Телефонный звонок. Молчание. Ответ: 'Done.' Конец.",
        "Хаотичный монтаж → один момент тишины → снова хаос → победа.",
    ],
    "victory": [
        "Экран показывает первый платёж. Сумма. Человек смотрит. Не верит. Смотрит снова.",
        "Timelapse пустого офиса → полный офис → снова пустой — но теперь богатый.",
        "Восход. Силуэт на крыше. Руки в стороны. Тишина победы.",
        "Статистика растёт: лиды → сделки → выручка. Каждая цифра — история.",
    ],
}

# ── Post templates ─────────────────────────────────────────────────────────────

POST_TEMPLATES = {
    "discipline": """🎬 Если бы мой путь был фильмом — это был бы {film}.

{scene_desc}

Каждый день — это твоё соло.
Дирижёр не хвалит. Он требует.
Ты играешь окровавленными руками или нет?

— AUREON CEO в 03:00

#AUREON #discipline #founder""",

    "lonely_founder": """🎬 Строить что-то большое — это всегда одиноко.

Как в {film}:
{scene_desc}

Ночью не спишь — код, решения, цифры.
Утром встаёшь — снова работаешь.

Это не жертва. Это выбор.

#AUREON #founder #строим""",

    "future_scifi": """🚀 Мы строим то, что раньше было фантастикой.

Как в {film}:
"{quote}"

AI-агенты работают пока ты спишь.
Системы учатся. Данные растут.
Будущее уже здесь — просто неровно распределено.

— AUREON AI Operating System

#AUREON #AI #future""",

    "luxury_business": """💼 Деньги не разговаривают. Они говорят сами за себя.

Как сказал {char} в {film}:
"{quote}"

AI-система AUREON:
→ Работает 24/7
→ Не устаёт
→ Не просит повышения

Это и есть luxury в бизнесе.

#AUREON #бизнес #AI""",

    "default": """🎬 Рекомендация от Cinema Agent:

Фильм: {film}
Настроение: {mood}

{scene_desc}

→ Используй это как визуальный язык своего контента.

#AUREON #content #cinema""",
}

TIKTOK_TEMPLATES = {
    "discipline": """🎬 TIKTOK СЦЕНАРИЙ: Дисциплина

[0-2 сек] Чёрный экран. Звук метронома.
[2-4 сек] Текст: "Они думали я сломаюсь"
[4-8 сек] Быстрый монтаж: ноутбук, код, таймер, кофе
[8-12 сек] Текст: "Но я просто начал с начала"
[12-15 сек] Логотип AUREON. Звук выключения метронома.

Саундтрек: тяжёлый бит с метрономом
Эффект: резкий монохром → вспышка золота
Референс по атмосфере: {film}""",

    "future_scifi": """🎬 TIKTOK СЦЕНАРИЙ: AI Agent

[0-3 сек] POV: открываешь ноутбук
[3-6 сек] Интерфейс CEO Agent загружается
[6-10 сек] Данные летят: лиды, посты, сделки — автоматически
[10-14 сек] Текст: "Пока ты спал, агент работал"
[14-15 сек] AUREON. CEO Agent. 2026.

Саундтрек: синтвейв или ambient electronica
Референс атмосферы: {film}""",

    "default": """🎬 TIKTOK СЦЕНАРИЙ

[0-3 сек] Захват внимания: {hook}
[3-8 сек] Основная идея: {idea}
[8-12 сек] Доказательство: {proof}
[12-15 сек] CTA: {cta}

Атмосфера: {mood}
Референс: {film}
Цвета: {colors}""",
}


# ── Core functions ─────────────────────────────────────────────────────────────

def recommend_movies(mood: str, character_type: str, goal: str) -> dict:
    mood_key = _normalize_mood(mood)
    movies = MOVIES.get(mood_key, MOVIES["discipline"])
    palette = PALETTES.get(mood_key, PALETTES["discipline"])

    selected = movies[:4]

    return {
        "mood": mood,
        "mood_key": mood_key,
        "character_type": character_type,
        "goal": goal,
        "movies": [
            {
                "title": m["title"],
                "year": m.get("year"),
                "director": m.get("director"),
                "why": m["why"],
                "atmosphere": m["atmosphere"],
            }
            for m in selected
        ],
        "palette": palette,
        "generated_at": datetime.now().isoformat(),
    }


def recommend_scenes(mood: str, goal: str) -> list[dict]:
    mood_key = _normalize_mood(mood)
    scenes = SCENES.get(mood_key, SCENES["discipline"])
    return random.sample(scenes, min(len(scenes), 4))


def generate_quote_pack(mood: str, style: str = "motivational") -> list[dict]:
    mood_key = _normalize_mood(mood)
    quotes = QUOTES.get(mood_key, QUOTES["discipline"])
    random.shuffle(quotes)
    return quotes[:4]


def generate_clip_ideas(mood: str, platform: str = "telegram") -> list[str]:
    mood_key = _normalize_mood(mood)
    ideas = CLIP_IDEAS.get(mood_key, CLIP_IDEAS["discipline"])
    return ideas


def create_content_reference_board(
    topic: str,
    mood: str,
    character_type: str,
    goal: str,
) -> dict:
    mood_key = _normalize_mood(mood)
    movies = MOVIES.get(mood_key, [])[:2]
    scenes = SCENES.get(mood_key, [])[:2]
    quotes = QUOTES.get(mood_key, [])[:3]
    ideas = CLIP_IDEAS.get(mood_key, [])[:3]
    palette = PALETTES.get(mood_key, PALETTES["discipline"])

    first_movie = movies[0]["title"] if movies else "Whiplash"
    first_scene = scenes[0]["scene"] if scenes else ""
    first_quote = quotes[0] if quotes else {}

    post = _generate_post(mood_key, first_movie, first_scene, first_quote)
    tiktok = _generate_tiktok(mood_key, first_movie, mood)

    return {
        "topic": topic,
        "mood": mood,
        "mood_key": mood_key,
        "character_type": character_type,
        "goal": goal,
        "movies": [{"title": m["title"], "why": m["why"], "atmosphere": m["atmosphere"]} for m in movies],
        "scenes": scenes,
        "quotes": quotes,
        "clip_ideas": ideas,
        "palette": palette,
        "telegram_post": post,
        "tiktok_script": tiktok,
        "generated_at": datetime.now().isoformat(),
    }


def _generate_post(mood_key: str, film: str, scene_desc: str, quote: dict) -> str:
    template = POST_TEMPLATES.get(mood_key, POST_TEMPLATES["default"])
    char = quote.get("char", "") if quote else ""
    q_text = quote.get("text", "") if quote else ""
    try:
        return template.format(
            film=film,
            scene_desc=scene_desc[:120] if scene_desc else "",
            quote=q_text[:60] if q_text else "",
            char=char,
            mood=mood_key,
        )
    except KeyError:
        return POST_TEMPLATES["default"].format(
            film=film, mood=mood_key, scene_desc=scene_desc[:100] if scene_desc else ""
        )


def _generate_tiktok(mood_key: str, film: str, mood: str) -> str:
    palette = PALETTES.get(mood_key, PALETTES["discipline"])
    template = TIKTOK_TEMPLATES.get(mood_key, TIKTOK_TEMPLATES["default"])
    try:
        return template.format(
            film=film,
            mood=mood,
            hook=f"Ты думал что это невозможно?",
            idea=f"AUREON строит AI-систему пока все ждут",
            proof=f"CEO Agent работает 24/7 без выходных",
            cta=f"Узнай как → @manager_aureon",
            colors=" · ".join(palette["colors"][:3]),
        )
    except KeyError:
        return template


def _normalize_mood(mood: str) -> str:
    mapping = {
        "discipline": "discipline",
        "lonely founder": "lonely_founder",
        "lonely_founder": "lonely_founder",
        "dark motivation": "dark_motivation",
        "dark_motivation": "dark_motivation",
        "luxury business": "luxury_business",
        "luxury_business": "luxury_business",
        "revenge arc": "revenge_arc",
        "revenge_arc": "revenge_arc",
        "calm focus": "calm_focus",
        "calm_focus": "calm_focus",
        "future / sci-fi": "future_scifi",
        "future scifi": "future_scifi",
        "future_scifi": "future_scifi",
        "sci-fi": "future_scifi",
        "confidence": "confidence",
        "pressure": "pressure",
        "victory": "victory",
    }
    return mapping.get(mood.lower().strip(), "discipline")
