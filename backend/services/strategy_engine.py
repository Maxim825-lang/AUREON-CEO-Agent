from datetime import datetime, date


def days_until_waic() -> int:
    waic = date(2027, 7, 1)
    today = date.today()
    return (waic - today).days


def calculate_progress(revenue_current: float, revenue_goal: float, tasks_done: int, total_tasks: int) -> float:
    if revenue_goal > 0:
        rev_progress = min(revenue_current / revenue_goal, 1.0) * 50
    else:
        rev_progress = 0

    if total_tasks > 0:
        task_progress = min(tasks_done / total_tasks, 1.0) * 50
    else:
        task_progress = 0

    return round(rev_progress + task_progress, 1)


DEFAULT_STRATEGY = {
    "main_goal": "Выйти на мировую арену с AUREON на WAIC 2027 — представить AI-агентство как лидера автоматизации",
    "weekly_goals": [],
    "monthly_goals": [],
    "risks": [
        {
            "risk": "Нет первого клиента",
            "level": "high",
            "mitigation": "Активный outreach в LinkedIn и Telegram, бесплатный аудит как вход",
        },
        {
            "risk": "OpenAI API расходы превышают доход",
            "level": "medium",
            "mitigation": "Кэширование запросов, использование GPT-3.5 для задач без нужды в GPT-4",
        },
        {
            "risk": "Конкуренты с аналогичными сервисами",
            "level": "medium",
            "mitigation": "Фокус на нише: малый бизнес + Telegram + быстрый старт",
        },
        {
            "risk": "Перегрузка основателя",
            "level": "high",
            "mitigation": "Максимальная автоматизация через CEO Agent, делегирование AI-агентам",
        },
        {
            "risk": "Качество AI-генерации не устраивает клиента",
            "level": "low",
            "mitigation": "Human-in-the-loop: все результаты проходят проверку перед отправкой",
        },
    ],
    "ceo_decisions": [
        {
            "date": "2026-07-02",
            "decision": "Начать с Telegram-ниши: каналы, магазины, школы",
            "reason": "Низкий порог входа, быстрые результаты, понятная ценность",
        },
        {
            "date": "2026-07-02",
            "decision": "Установить минимальный чек $800",
            "reason": "Ниже — нерентабельно с учётом времени и API расходов",
        },
        {
            "date": "2026-07-02",
            "decision": "Публиковать весь путь публично в Telegram",
            "reason": "Build in public = доверие + органический рост + социальное доказательство",
        },
        {
            "date": "2026-07-02",
            "decision": "Цель месяца — $3,000 выручки",
            "reason": "Реалистичная цель для первого месяца с 3 проектами",
        },
    ],
    "roadmap": [
        {
            "phase": "Фаза 1: Запуск",
            "period": "Июль 2026",
            "status": "active",
            "items": [
                "CEO Agent MVP",
                "Первые 5 лидов",
                "Первый оплаченный проект",
                "Telegram-канал запущен",
            ],
        },
        {
            "phase": "Фаза 2: Масштаб",
            "period": "Август — Октябрь 2026",
            "status": "planned",
            "items": [
                "10+ активных клиентов",
                "$10,000/месяц",
                "Команда 2-3 человека",
                "AI-продукт v2",
            ],
        },
        {
            "phase": "Фаза 3: Продукт",
            "period": "Ноябрь 2026 — Март 2027",
            "status": "planned",
            "items": [
                "SaaS платформа",
                "50+ клиентов",
                "$30,000/месяц",
                "Партнёрства",
            ],
        },
        {
            "phase": "Фаза 4: WAIC 2027",
            "period": "Апрель — Июль 2027",
            "status": "planned",
            "items": [
                "Заявка на WAIC 2027",
                "Международные партнёры",
                "Product Hunt запуск",
                "Глобальный рынок",
            ],
        },
    ],
    "progress_percent": 0.0,
    "revenue_goal": 100000,
    "revenue_current": 0,
}


def get_focus_of_day() -> str:
    focuses = [
        "Первый клиент: outreach и квалификация лидов",
        "Контент-стратегия: подготовка постов на неделю",
        "Продукт: улучшение CEO Agent",
        "Продажи: подготовка коммерческих предложений",
        "Стратегия: анализ рынка и конкурентов",
        "Партнёрства: поиск стратегических партнёров",
        "Финансы: юнит-экономика и ценообразование",
    ]
    day_of_week = datetime.now().weekday()
    return focuses[day_of_week % len(focuses)]


def get_risk_level(tasks_pending: int, revenue_current: float, revenue_goal: float) -> str:
    if revenue_current == 0 and tasks_pending > 10:
        return "HIGH"
    elif revenue_current < revenue_goal * 0.1:
        return "MEDIUM"
    else:
        return "LOW"
