import random
from datetime import datetime
from sqlalchemy.orm import Session
from models import Task, ActionLog, ContentPost, Lead
from services.content_generator import generate_post
from services.sales_generator import generate_offer, MOCK_LEADS
from services.strategy_engine import get_focus_of_day, get_risk_level


DAILY_TASK_TEMPLATES = [
    ("Провести анализ конкурентов в Telegram-нише", "Research Agent", "high"),
    ("Подготовить 3 поста на неделю", "Marketing Agent", "high"),
    ("Составить список из 10 потенциальных клиентов", "Sales Agent", "high"),
    ("Обновить цены на услуги", "Finance Agent", "medium"),
    ("Проверить статус активных проектов", "CEO Agent", "high"),
    ("Написать первый outreach-message", "Sales Agent", "medium"),
    ("Обновить roadmap до WAIC 2027", "CEO Agent", "medium"),
    ("Проанализировать юнит-экономику", "Finance Agent", "medium"),
    ("Подготовить новый кейс для сайта", "Marketing Agent", "low"),
    ("Изучить новости AI-индустрии", "Research Agent", "low"),
]


def run_ceo_cycle(db: Session) -> dict:
    actions = []
    tasks_created = 0
    posts_generated = 0

    action1 = ActionLog(
        agent="CEO Agent",
        action="Запуск автономного CEO-цикла",
        result=f"Цикл начат в {datetime.now().strftime('%H:%M')}. Анализирую текущее состояние проекта.",
        status="success",
    )
    db.add(action1)
    actions.append({"agent": "CEO Agent", "action": action1.action, "result": action1.result})

    focus = get_focus_of_day()
    action2 = ActionLog(
        agent="CEO Agent",
        action="Определение фокуса дня",
        result=f"Фокус дня: {focus}",
        status="success",
    )
    db.add(action2)
    actions.append({"agent": "CEO Agent", "action": action2.action, "result": action2.result})

    num_tasks = random.randint(2, 4)
    selected_tasks = random.sample(DAILY_TASK_TEMPLATES, num_tasks)

    for title, agent, priority in selected_tasks:
        task = Task(
            title=title,
            description=f"Задача создана CEO Agent во время автономного цикла. Фокус: {focus}",
            agent=agent,
            status="pending",
            priority=priority,
            tags=["auto", "ceo-cycle"],
        )
        db.add(task)
        tasks_created += 1

    action3 = ActionLog(
        agent="CEO Agent",
        action="Генерация задач дня",
        result=f"Создано {num_tasks} приоритетных задач на основе текущего фокуса",
        status="success",
    )
    db.add(action3)
    actions.append({"agent": "CEO Agent", "action": action3.action, "result": action3.result})

    post_topic = random.choice(["AUREON", "AI", "предпринимательство", "WAIC 2027", "дисциплина"])
    post_data = generate_post(post_topic)
    post = ContentPost(**post_data)
    db.add(post)
    posts_generated += 1

    action4 = ActionLog(
        agent="Marketing Agent",
        action=f"Генерация поста на тему: {post_topic}",
        result=f"Пост создан: '{post_data['title']}'. Статус: draft. Готов к публикации.",
        status="success",
    )
    db.add(action4)
    actions.append({"agent": "Marketing Agent", "action": action4.action, "result": action4.result})

    existing_leads = db.query(Lead).count()
    if existing_leads < 3:
        lead_data = random.choice(MOCK_LEADS)
        lead = Lead(**lead_data)
        db.add(lead)

        action5 = ActionLog(
            agent="Sales Agent",
            action="Добавление нового потенциального клиента",
            result=f"Лид добавлен: {lead_data['name']} ({lead_data['niche']}). Оценка: {lead_data['score']}/100",
            status="success",
        )
        db.add(action5)
        actions.append({"agent": "Sales Agent", "action": action5.action, "result": action5.result})

    revenue_note = random.choice([
        "Текущие расходы под контролем. API-расходы: $0 (нет реальных звонков)",
        "Рекомендую установить базовый чек на AI-бот: $1,200",
        "Анализ: 3 сделки по $1,500 = $4,500 — реалистичная цель месяца",
    ])
    action6 = ActionLog(
        agent="Finance Agent",
        action="Анализ финансового состояния",
        result=revenue_note,
        status="success",
    )
    db.add(action6)
    actions.append({"agent": "Finance Agent", "action": action6.action, "result": action6.result})

    market_note = random.choice([
        "AI-автоматизация для малого бизнеса растёт на 40% в год. Ниша свободна.",
        "Конкуренты фокусируются на крупном бизнесе — SMB-ниша открыта для AUREON",
        "Telegram-ботизация малого бизнеса: тренд набирает силу в 2026",
    ])
    action7 = ActionLog(
        agent="Research Agent",
        action="Мониторинг рынка и трендов",
        result=market_note,
        status="success",
    )
    db.add(action7)
    actions.append({"agent": "Research Agent", "action": action7.action, "result": action7.result})

    action8 = ActionLog(
        agent="CEO Agent",
        action="Завершение CEO-цикла",
        result=f"Цикл завершён. Создано задач: {tasks_created}. Постов: {posts_generated}. Следующий цикл: через 24 часа.",
        status="success",
    )
    db.add(action8)
    actions.append({"agent": "CEO Agent", "action": action8.action, "result": action8.result})

    db.commit()

    return {
        "status": "success",
        "actions": actions,
        "summary": f"CEO-цикл завершён успешно. Создано {tasks_created} задач, {posts_generated} пост для Telegram. Агенты активны.",
        "tasks_created": tasks_created,
        "posts_generated": posts_generated,
    }
