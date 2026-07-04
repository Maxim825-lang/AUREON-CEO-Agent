from sqlalchemy.orm import Session
from models import Agent, Task, ActionLog, StrategyState, Settings
from services.strategy_engine import DEFAULT_STRATEGY


AGENTS_SEED = [
    {
        "name": "CEO Agent",
        "role": "Стратегия и управление",
        "status": "active",
        "current_task": "Анализ приоритетов и планирование",
        "last_result": None,
        "priority": 1,
        "icon": "👑",
        "color": "#D4AF37",
        "tasks_completed": 0,
    },
    {
        "name": "Sales Agent",
        "role": "Клиенты и продажи",
        "status": "active",
        "current_task": "Поиск и квалификация потенциальных клиентов",
        "last_result": None,
        "priority": 2,
        "icon": "💼",
        "color": "#3B82F6",
        "tasks_completed": 0,
    },
    {
        "name": "Marketing Agent",
        "role": "Контент и рост",
        "status": "active",
        "current_task": "Генерация постов для Telegram-канала",
        "last_result": None,
        "priority": 2,
        "icon": "📢",
        "color": "#8B5CF6",
        "tasks_completed": 0,
    },
    {
        "name": "Product Agent",
        "role": "Развитие продукта",
        "status": "idle",
        "current_task": "Планирование CEO Agent v2",
        "last_result": None,
        "priority": 3,
        "icon": "🚀",
        "color": "#10B981",
        "tasks_completed": 0,
    },
    {
        "name": "Research Agent",
        "role": "Рынок и конкуренты",
        "status": "active",
        "current_task": "Мониторинг AI-новостей и анализ конкурентов",
        "last_result": None,
        "priority": 3,
        "icon": "🔍",
        "color": "#F59E0B",
        "tasks_completed": 0,
    },
    {
        "name": "Finance Agent",
        "role": "Финансы и юнит-экономика",
        "status": "idle",
        "current_task": "Расчёт юнит-экономики",
        "last_result": None,
        "priority": 4,
        "icon": "💰",
        "color": "#EF4444",
        "tasks_completed": 0,
    },
    {
        "name": "CTO Agent",
        "role": "Разработка и технологии",
        "status": "idle",
        "current_task": "Архитектура AI-системы для клиентов",
        "last_result": None,
        "priority": 4,
        "icon": "⚙️",
        "color": "#6B7280",
        "tasks_completed": 0,
    },
    {
        "name": "Design Agent",
        "role": "Бренд и визуал",
        "status": "idle",
        "current_task": "Разработка визуального стиля AUREON",
        "last_result": None,
        "priority": 5,
        "icon": "🎨",
        "color": "#EC4899",
        "tasks_completed": 0,
    },
]

TASKS_SEED = [
    {
        "title": "Запустить Telegram-канал AUREON",
        "description": "Создать канал, написать описание, опубликовать первый пост",
        "agent": "Marketing Agent",
        "status": "pending",
        "priority": "high",
        "tags": ["маркетинг", "telegram"],
    },
    {
        "title": "Получить первого платящего клиента",
        "description": "Провести outreach, провести демо, подписать первый контракт",
        "agent": "Sales Agent",
        "status": "pending",
        "priority": "high",
        "tags": ["продажи", "клиент"],
    },
    {
        "title": "Разработать AI-бот для демо",
        "description": "Создать демо AI-бот который можно показать клиентам",
        "agent": "CTO Agent",
        "status": "pending",
        "priority": "high",
        "tags": ["разработка", "демо"],
    },
    {
        "title": "Написать 10 постов в Telegram",
        "description": "Подготовить контент-план и реализовать первые 10 постов",
        "agent": "Marketing Agent",
        "status": "pending",
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
        "title": "Провести анализ конкурентов",
        "description": "Исследовать конкурентов, выявить слабые места, найти позиционирование",
        "agent": "Research Agent",
        "status": "pending",
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


def seed_database(db: Session):
    if db.query(Agent).count() > 0:
        return

    for agent_data in AGENTS_SEED:
        agent = Agent(**agent_data)
        db.add(agent)

    for task_data in TASKS_SEED:
        task = Task(**task_data)
        db.add(task)

    strategy = StrategyState(**DEFAULT_STRATEGY)
    db.add(strategy)

    settings = Settings()
    db.add(settings)

    db.commit()
    print("Database seeded (agents, tasks, strategy, settings — no demo leads/offers/actions).")
