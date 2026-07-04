// Fallback mock data when backend is unavailable

export const MOCK_STATE = {
  project_name: "AUREON",
  founder_name: "Максим",
  status: "ACTIVE",
  focus_of_day: "Первый клиент: outreach и квалификация лидов",
  risk_level: "MEDIUM",
  days_until_waic: 365,
  active_agents: 4,
  total_agents: 8,
  pending_tasks: 5,
  completed_tasks: 3,
  total_tasks: 8,
  progress_percent: 5,
  revenue_current: 0,
  revenue_goal: 100000,
  autonomy_level: 1,
  waic_date: "2027-07-01",
}

export const MOCK_AGENTS = [
  { id: 1, name: "CEO Agent", role: "Стратегия и управление", status: "active", current_task: "Анализ приоритетов и планирование недели", last_result: "Сформирован план на 7 дней. Определены 3 ключевых приоритета.", priority: 1, icon: "👑", color: "#D4AF37", tasks_completed: 12 },
  { id: 2, name: "Sales Agent", role: "Клиенты и продажи", status: "active", current_task: "Поиск и квалификация потенциальных клиентов", last_result: "Найдено 5 лидов. Отправлено 2 КП.", priority: 2, icon: "💼", color: "#3B82F6", tasks_completed: 8 },
  { id: 3, name: "Marketing Agent", role: "Контент и рост", status: "active", current_task: "Генерация постов для Telegram-канала", last_result: "Создано 3 поста. Охват: ~200 просмотров.", priority: 2, icon: "📢", color: "#8B5CF6", tasks_completed: 15 },
  { id: 4, name: "Product Agent", role: "Развитие продукта", status: "idle", current_task: "Планирование CEO Agent v2", last_result: "Список фич для следующего релиза составлен.", priority: 3, icon: "🚀", color: "#10B981", tasks_completed: 5 },
  { id: 5, name: "Research Agent", role: "Рынок и конкуренты", status: "active", current_task: "Мониторинг AI-новостей", last_result: "Обнаружен новый конкурент. Анализ составлен.", priority: 3, icon: "🔍", color: "#F59E0B", tasks_completed: 20 },
  { id: 6, name: "Finance Agent", role: "Финансы и юнит-экономика", status: "idle", current_task: "Расчёт юнит-экономики", last_result: "Маржа AI-бота: 72%. Точка безубыточности: 2 клиента.", priority: 4, icon: "💰", color: "#EF4444", tasks_completed: 7 },
  { id: 7, name: "CTO Agent", role: "Разработка и технологии", status: "idle", current_task: "Архитектура AI-системы", last_result: "Стек выбран: FastAPI + LangChain + SQLite.", priority: 4, icon: "⚙️", color: "#6B7280", tasks_completed: 9 },
  { id: 8, name: "Design Agent", role: "Бренд и визуал", status: "idle", current_task: "Разработка визуального стиля", last_result: "Цветовая палитра готова. Логотип в процессе.", priority: 5, icon: "🎨", color: "#EC4899", tasks_completed: 4 },
]

export const MOCK_TASKS = [
  { id: 1, title: "Запустить Telegram-канал AUREON", agent: "Marketing Agent", status: "completed", priority: "high", tags: ["маркетинг"] },
  { id: 2, title: "Получить первого платящего клиента", agent: "Sales Agent", status: "in_progress", priority: "high", tags: ["продажи"] },
  { id: 3, title: "Разработать AI-бот для демо", agent: "CTO Agent", status: "in_progress", priority: "high", tags: ["разработка"] },
  { id: 4, title: "Написать 10 постов в Telegram", agent: "Marketing Agent", status: "in_progress", priority: "medium", tags: ["контент"] },
  { id: 5, title: "Составить прайс-лист услуг", agent: "Finance Agent", status: "pending", priority: "high", tags: ["финансы"] },
  { id: 6, title: "Провести анализ 5 конкурентов", agent: "Research Agent", status: "completed", priority: "medium", tags: ["исследование"] },
  { id: 7, title: "Подать заявку на WAIC 2027", agent: "CEO Agent", status: "pending", priority: "medium", tags: ["WAIC"] },
  { id: 8, title: "Создать landing page AUREON", agent: "CTO Agent", status: "pending", priority: "medium", tags: ["разработка"] },
]

export const MOCK_ACTIONS = [
  { id: 6, agent: "CEO Agent", action: "Определение стратегии до WAIC 2027", result: "Стратегия утверждена: 4 фазы, цель $100K выручки.", status: "success", created_at: new Date().toISOString() },
  { id: 5, agent: "Finance Agent", action: "Расчёт юнит-экономики", result: "AI-бот: $1,200 чек, маржа 71.7%. Точка безубыточности: 2 клиента.", status: "success", created_at: new Date().toISOString() },
  { id: 4, agent: "Marketing Agent", action: "Генерация первого поста для Telegram", result: "Пост создан. Готов к публикации.", status: "success", created_at: new Date().toISOString() },
  { id: 3, agent: "Sales Agent", action: "Поиск клиентов в Telegram", result: "Найдено 5 потенциальных клиентов. Добавлены в CRM.", status: "success", created_at: new Date().toISOString() },
  { id: 2, agent: "Research Agent", action: "Анализ AI-рынка в СНГ", result: "Рынок растёт на 35% г/г. Ниша малого бизнеса свободна.", status: "success", created_at: new Date().toISOString() },
  { id: 1, agent: "CEO Agent", action: "Инициализация системы AUREON CEO Agent", result: "Система запущена. Все агенты активированы.", status: "success", created_at: new Date().toISOString() },
]

export const MOCK_LEADS = [
  { id: 1, name: "Telegram Business Channel", company: "Бизнес в Telegram", niche: "Медиа", problem: "Ручное создание контента 4-6 ч/день", aureon_offer: "AI Content System", estimated_price: 1500, status: "new", score: 85 },
  { id: 2, name: "LocalStyle Brand", company: "Малый бренд одежды", niche: "Fashion", problem: "Нет системы работы с клиентами", aureon_offer: "AI Telegram Bot + CRM", estimated_price: 1200, status: "contacted", score: 72 },
  { id: 3, name: "SkillUp School", company: "Локальная школа", niche: "Образование", problem: "Запись на курсы вручную", aureon_offer: "AI-бот для записи на курсы", estimated_price: 900, status: "proposal_sent", score: 90 },
  { id: 4, name: "MindGrow Blogger", company: "Блогер", niche: "Саморазвитие", problem: "Нет системы монетизации", aureon_offer: "AI Content + Landing Page", estimated_price: 2000, status: "new", score: 68 },
  { id: 5, name: "LaunchPad Startup", company: "Стартап", niche: "Tech", problem: "Нет онлайн-присутствия", aureon_offer: "Landing + Bot + Content", estimated_price: 3500, status: "new", score: 78 },
]

export const MOCK_CONTENT = [
  { id: 1, title: "AUREON: AI-агентство нового", content: "AUREON — это AI-агентство.\n\nМы создаём системы, которые работают пока вы спите.", topic: "AUREON", status: "ready", platform: "telegram", tags: ["AUREON", "AI"], views: 0, created_at: new Date().toISOString() },
  { id: 2, title: "AI уже работает. Вопрос —", content: "AI уже работает. Вопрос — на кого?\n\nМы в AUREON строим агентов, которые берут рутину на себя.", topic: "AI", status: "draft", platform: "telegram", tags: ["AI"], views: 0, created_at: new Date().toISOString() },
  { id: 3, title: "Каждое утро — это решение", content: "Каждое утро — это решение.\n\nДисциплина создаёт судьбу. Фокус — суперсила 21 века.", topic: "дисциплина", status: "draft", platform: "telegram", tags: ["дисциплина"], views: 0, created_at: new Date().toISOString() },
]

export const MOCK_OFFERS = [
  { id: 1, client: "SkillUp School", service: "AI Telegram Bot", price: 900, timeline: "10 дней", status: "sent", content: "Предложение: AI-бот для записи на курсы...", created_at: new Date().toISOString() },
  { id: 2, client: "LaunchPad Startup", service: "Landing Page + AI", price: 1500, timeline: "7 дней", status: "draft", content: "Предложение: лендинг с AI-чатом...", created_at: new Date().toISOString() },
]

export const MOCK_STRATEGY = {
  main_goal: "Выйти на мировую арену с AUREON на WAIC 2027 — представить AI-агентство как лидера автоматизации",
  weekly_goals: ["Запустить MVP CEO Agent", "Получить первый оплаченный проект", "Опубликовать 5 постов в Telegram", "Провести 3 демо-звонка", "Настроить базовую CRM"],
  monthly_goals: ["Заработать первые $3,000", "500 подписчиков в Telegram", "3 клиента на ongoing", "Кейс первого проекта", "Запустить сайт AUREON"],
  risks: [
    { risk: "Нет первого клиента", level: "high", mitigation: "Активный outreach, бесплатный аудит как вход" },
    { risk: "OpenAI API расходы", level: "medium", mitigation: "Кэширование запросов, GPT-3.5 для простых задач" },
    { risk: "Конкуренты", level: "medium", mitigation: "Фокус на нише: малый бизнес + Telegram" },
  ],
  ceo_decisions: [
    { date: "2026-07-02", decision: "Начать с Telegram-ниши", reason: "Низкий порог входа, быстрые результаты" },
    { date: "2026-07-02", decision: "Минимальный чек $800", reason: "Ниже нерентабельно" },
  ],
  roadmap: [
    { phase: "Фаза 1: Запуск", period: "Июль 2026", status: "active", items: ["CEO Agent MVP", "Первые 5 лидов", "Первый проект", "Telegram-канал"] },
    { phase: "Фаза 2: Масштаб", period: "Авг — Окт 2026", status: "planned", items: ["10+ клиентов", "$10K/мес", "Команда 2-3", "AI-продукт v2"] },
    { phase: "Фаза 3: Продукт", period: "Ноя 2026 — Мар 2027", status: "planned", items: ["SaaS", "50+ клиентов", "$30K/мес", "Партнёрства"] },
    { phase: "Фаза 4: WAIC 2027", period: "Апр — Июл 2027", status: "planned", items: ["WAIC 2027", "Мировой рынок", "Product Hunt", "Партнёры"] },
  ],
  progress_percent: 5,
  revenue_goal: 100000,
  revenue_current: 0,
}

export const MOCK_SETTINGS = {
  project_name: "AUREON",
  founder_name: "Максим",
  main_goal: "Подготовка AUREON к WAIC 2027",
  revenue_goal: 100000,
  telegram_channel: "@aureon_ai",
  openai_api_key: "",
  autonomy_level: 1,
  waic_date: "2027-07-01",
}

export const AUREON_SERVICES_FALLBACK = [
  { id: 1, name: "AI Telegram Bot", price_from: 300, price_to: 1500, currency: "USD", timeline: "7-14 дней", description: "Умный AI-бот для Telegram: автоответы, квалификация лидов, интеграция с CRM", features: ["Автоответы 24/7", "Квалификация лидов", "Интеграция с CRM", "Аналитика"], ideal_for: ["Telegram-каналы", "Онлайн-школы", "Малый бизнес"], color: "#3B82F6", icon: "🤖", roi_example: "Экономия 3-4 часов в день" },
  { id: 2, name: "AI Content System", price_from: 500, price_to: 2500, currency: "USD", timeline: "10-21 день", description: "Автоматическая генерация и публикация контента в вашем стиле", features: ["Авто-посты по расписанию", "Адаптация под стиль бренда", "Авто-публикация в Telegram", "Контент-план"], ideal_for: ["Блогеры", "Telegram-каналы", "Бренды"], color: "#8B5CF6", icon: "📢", roi_example: "Экономия 20-30 часов в месяц" },
  { id: 3, name: "Landing Page + AI Chat", price_from: 700, price_to: 2000, currency: "USD", timeline: "5-10 дней", description: "Конвертирующий лендинг с AI-чатом, квалифицирующим лидов", features: ["Современный дизайн", "AI-чат для квалификации", "Интеграция с CRM", "Аналитика конверсий"], ideal_for: ["Стартапы", "Фрилансеры", "Малый бизнес"], color: "#10B981", icon: "🌐", roi_example: "Рост конверсии на 40-60%" },
  { id: 4, name: "Business Automation", price_from: 1000, price_to: 5000, currency: "USD", timeline: "21-45 дней", description: "Комплексная AI-автоматизация бизнес-процессов", features: ["Аудит процессов", "Автоматизация рутины", "AI-агент", "Интеграция систем"], ideal_for: ["Агентства", "E-commerce", "Сервисные компании"], color: "#F59E0B", icon: "⚙️", roi_example: "Снижение расходов на 30-50%" },
  { id: 5, name: "AUREON Mini HQ", price_from: 1500, price_to: 8000, currency: "USD", timeline: "30-60 дней", description: "Полная AI-система: контент + продажи + операции + аналитика", features: ["CEO AI-агент", "Content Agent 24/7", "Sales Agent", "Автоматизация операционки", "Дашборд"], ideal_for: ["Стартапы", "Онлайн-школы", "Агентства"], color: "#D4AF37", icon: "👑", roi_example: "Замена 2-3 позиций в команде" },
]
