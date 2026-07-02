from sqlalchemy.orm import Session
from models import Agent, Task, ActionLog, Lead, ContentPost, Offer, StrategyState, Settings
from services.strategy_engine import DEFAULT_STRATEGY
from services.sales_generator import MOCK_LEADS
from services.content_generator import generate_post


AGENTS_SEED = [
    {
        "name": "CEO Agent",
        "role": "Стратегия и управление",
        "status": "active",
        "current_task": "Анализ приоритетов и планирование недели",
        "last_result": "Сформирован план на 7 дней. Определены 3 ключевых приоритета.",
        "priority": 1,
        "icon": "👑",
        "color": "#D4AF37",
        "tasks_completed": 12,
    },
    {
        "name": "Sales Agent",
        "role": "Клиенты и продажи",
        "status": "active",
        "current_task": "Поиск и квалификация потенциальных клиентов",
        "last_result": "Найдено 5 лидов в нише Telegram-каналов. Отправлено 2 КП.",
        "priority": 2,
        "icon": "💼",
        "color": "#3B82F6",
        "tasks_completed": 8,
    },
    {
        "name": "Marketing Agent",
        "role": "Контент и рост",
        "status": "active",
        "current_task": "Генерация постов для Telegram-канала",
        "last_result": "Создано 3 поста. Охват последнего: ~200 просмотров.",
        "priority": 2,
        "icon": "📢",
        "color": "#8B5CF6",
        "tasks_completed": 15,
    },
    {
        "name": "Product Agent",
        "role": "Развитие продукта",
        "status": "idle",
        "current_task": "Планирование CEO Agent v2",
        "last_result": "Составлен список фич для следующего релиза.",
        "priority": 3,
        "icon": "🚀",
        "color": "#10B981",
        "tasks_completed": 5,
    },
    {
        "name": "Research Agent",
        "role": "Рынок и конкуренты",
        "status": "active",
        "current_task": "Мониторинг AI-новостей и анализ конкурентов",
        "last_result": "Обнаружен новый конкурент. Составлен сравнительный анализ.",
        "priority": 3,
        "icon": "🔍",
        "color": "#F59E0B",
        "tasks_completed": 20,
    },
    {
        "name": "Finance Agent",
        "role": "Финансы и юнит-экономика",
        "status": "idle",
        "current_task": "Расчёт юнит-экономики для AI-бота",
        "last_result": "Маржинальность сервиса AI-бот: 72%. Точка безубыточности: 2 клиента/месяц.",
        "priority": 4,
        "icon": "💰",
        "color": "#EF4444",
        "tasks_completed": 7,
    },
    {
        "name": "CTO Agent",
        "role": "Разработка и технологии",
        "status": "idle",
        "current_task": "Архитектура AI-системы для клиентов",
        "last_result": "Выбран стек: FastAPI + LangChain + SQLite. Готово к масштабированию.",
        "priority": 4,
        "icon": "⚙️",
        "color": "#6B7280",
        "tasks_completed": 9,
    },
    {
        "name": "Design Agent",
        "role": "Бренд и визуал",
        "status": "idle",
        "current_task": "Разработка визуального стиля AUREON",
        "last_result": "Готова цветовая палитра. Логотип в процессе.",
        "priority": 5,
        "icon": "🎨",
        "color": "#EC4899",
        "tasks_completed": 4,
    },
]

TASKS_SEED = [
    {
        "title": "Запустить Telegram-канал AUREON",
        "description": "Создать канал, написать описание, опубликовать первый пост",
        "agent": "Marketing Agent",
        "status": "completed",
        "priority": "high",
        "tags": ["маркетинг", "telegram"],
    },
    {
        "title": "Получить первого платящего клиента",
        "description": "Провести outreach, провести 3 демо, подписать первый контракт",
        "agent": "Sales Agent",
        "status": "in_progress",
        "priority": "high",
        "tags": ["продажи", "клиент"],
    },
    {
        "title": "Разработать AI-бот для демо",
        "description": "Создать демо AI-бот который можно показать клиентам",
        "agent": "CTO Agent",
        "status": "in_progress",
        "priority": "high",
        "tags": ["разработка", "демо"],
    },
    {
        "title": "Написать 10 постов в Telegram",
        "description": "Подготовить контент-план и реализовать первые 10 постов",
        "agent": "Marketing Agent",
        "status": "in_progress",
        "priority": "medium",
        "tags": ["контент", "telegram"],
    },
    {
        "title": "Составить прайс-лист услуг",
        "description": "Финализировать цены на все услуги AUREON",
        "agent": "Finance Agent",
        "status": "pending",
        "priority": "high",
        "tags": ["финансы", "продажи"],
    },
    {
        "title": "Провести анализ 5 конкурентов",
        "description": "Исследовать конкурентов, выявить слабые места, найти позиционирование",
        "agent": "Research Agent",
        "status": "completed",
        "priority": "medium",
        "tags": ["исследование", "стратегия"],
    },
    {
        "title": "Подать заявку на WAIC 2027",
        "description": "Изучить требования, подготовить материалы, подать заявку",
        "agent": "CEO Agent",
        "status": "pending",
        "priority": "medium",
        "tags": ["WAIC", "стратегия"],
    },
    {
        "title": "Создать landing page AUREON",
        "description": "Разработать конвертирующий лендинг с описанием услуг",
        "agent": "CTO Agent",
        "status": "pending",
        "priority": "medium",
        "tags": ["разработка", "маркетинг"],
    },
]

ACTIONS_SEED = [
    {
        "agent": "CEO Agent",
        "action": "Инициализация системы AUREON CEO Agent",
        "result": "Система запущена. Все агенты активированы. База данных инициализирована.",
        "status": "success",
    },
    {
        "agent": "Research Agent",
        "action": "Анализ AI-рынка в СНГ",
        "result": "Рынок AI-автоматизации растёт на 35% г/г. Ниша малого бизнеса практически свободна.",
        "status": "success",
    },
    {
        "agent": "Sales Agent",
        "action": "Поиск потенциальных клиентов в Telegram",
        "result": "Найдено 5 потенциальных клиентов. Добавлены в CRM.",
        "status": "success",
    },
    {
        "agent": "Marketing Agent",
        "action": "Генерация первого поста для Telegram",
        "result": "Пост 'AUREON: AI-агентство нового поколения' создан. Готов к публикации.",
        "status": "success",
    },
    {
        "agent": "Finance Agent",
        "action": "Расчёт юнит-экономики",
        "result": "AI-бот: $1,200 чек, $340 себестоимость, маржа 71.7%. Точка безубыточности: 2 клиента.",
        "status": "success",
    },
    {
        "agent": "CEO Agent",
        "action": "Определение стратегии до WAIC 2027",
        "result": "Стратегия утверждена: 4 фазы, цель $100K выручки к Q2 2027.",
        "status": "success",
    },
]

OFFERS_SEED = [
    {
        "client": "SkillUp School",
        "service": "AI Telegram Bot",
        "price": 900,
        "timeline": "10 дней",
        "status": "sent",
        "content": "Предложение: AI-бот для автоматической записи на курсы, квалификации студентов и напоминаний. Интеграция с расписанием.",
        "lead_id": 3,
    },
    {
        "client": "LaunchPad Startup",
        "service": "Landing Page + AI",
        "price": 1500,
        "timeline": "7 дней",
        "status": "draft",
        "content": "Предложение: конвертирующий лендинг с AI-чатом для захвата лидов и квалификации клиентов.",
        "lead_id": 5,
    },
]


def seed_database(db: Session):
    if db.query(Agent).count() > 0:
        return

    for agent_data in AGENTS_SEED:
        agent = Agent(**agent_data)
        db.add(agent)

    for task_data in TASKS_SEED:
        task = Task(**task_data)
        db.add(task)

    for action_data in ACTIONS_SEED:
        log = ActionLog(**action_data)
        db.add(log)

    for lead_data in MOCK_LEADS:
        lead = Lead(**lead_data)
        db.add(lead)

    for topic in ["AUREON", "AI", "предпринимательство"]:
        post_data = generate_post(topic)
        post_data["status"] = "ready" if topic == "AUREON" else "draft"
        post = ContentPost(**post_data)
        db.add(post)

    for offer_data in OFFERS_SEED:
        offer = Offer(**offer_data)
        db.add(offer)

    strategy = StrategyState(**DEFAULT_STRATEGY)
    db.add(strategy)

    settings = Settings()
    db.add(settings)

    db.commit()
    print("Database seeded successfully.")
