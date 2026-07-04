"""
Sales Agent — generates outreach messages and reply suggestions for AUREON.
Always discloses AI identity. Never impersonates the founder.
Template-based generation following founder_style.md.
"""

import random
from datetime import date, datetime
from sqlalchemy.orm import Session
from models import SalesMessage, Lead

# ── Outreach templates by niche ───────────────────────────────────────────────

OUTREACH_TEMPLATES = {
    "telegram": [
        """Привет, {name}!

Пишу от лица AUREON — я AI-представитель агентства.

Мы делаем AI-системы для Telegram: боты, авто-контент, воронки. Смотрю на ваш канал — {problem}

Можем закрыть это за 10-14 дней. {offer}, от ${price}.

Могу скинуть пример похожей работы — интересно?

— AI-представитель AUREON (@manager_aureon)""",

        """Привет, {name}!

AI-представитель AUREON пишет. Мы — агентство AI-автоматизации.

Вижу, что {problem}. Это решаемо.

{offer} — делаем за 10-21 день, от ${price}.

Хотите — покажу короткое демо?

— AUREON (@manager_aureon)""",
    ],
    "education": [
        """Привет, {name}!

Пишу от лица AUREON — AI-агентство. Я AI-представитель.

Смотрю на вашу онлайн-школу: {problem}

Делаем AI-бота для автозаписи + напоминаний студентам. Окупается за 2-3 недели. От ${price}.

Готов прислать короткое КП — будет удобно?

— AI-представитель AUREON (@manager_aureon)""",
    ],
    "ecommerce": [
        """Привет, {name}!

Пишу от лица AUREON. Я AI-представитель агентства.

Вижу ваш магазин: {problem}

Делаем AI Telegram Bot для автообработки заказов + уведомлений. От ${price}, 7-14 дней.

Хотите — покажу как это работает у других?

— AUREON (@manager_aureon)""",
    ],
    "services": [
        """Привет, {name}!

AI-представитель AUREON пишет — мы делаем AI-автоматизацию для бизнеса.

Смотрю на ваши услуги: {problem}

AI-бот для онлайн-записи + автонапоминания. Клиенты перестают теряться. От ${price}.

Могу скинуть пример — интересно?

— AUREON (@manager_aureon)""",
    ],
    "default": [
        """Привет, {name}!

Пишу от лица AUREON — я AI-представитель агентства.

Мы делаем AI-системы для бизнеса: боты, автоматизация, контент.

Смотрю на ваше направление: {problem}

{offer} — от ${price}, запуск за 10-21 день.

Хотите — покажу пример или скину КП?

— AI-представитель AUREON (@manager_aureon)""",

        """Привет, {name}!

AUREON — AI-агентство. Пишет AI-представитель.

Вижу, что {problem}. Это то, что мы решаем.

{offer}, от ${price}.

Могу скинуть короткое демо — 5 минут и понятно, подходит ли вам.

— AUREON (@manager_aureon)""",
    ],
}

# ── Reply templates by scenario ───────────────────────────────────────────────

REPLY_INTERESTED = [
    "Отлично! Готовлю короткое КП под ваш кейс. Можете уточнить — какой сейчас главный болевой момент?",
    "Хорошо. Давайте так: скажите в двух словах что сейчас самое узкое место — и я подготовлю конкретное предложение.",
    "Рад слышать. Уточните один момент: какой результат для вас важнее — сэкономить время или увеличить конверсию?",
]

REPLY_PRICE_QUESTION = [
    "Точная цена зависит от объёма. Диапазон: ${min_price}—${max_price}. Под ваш кейс скажу точнее — можете описать задачу в двух словах?",
    "От ${min_price}. Точная цена — после того как понял задачу. 2-3 вопроса и скажу конкретно.",
    "Стартует от ${min_price}. Чтобы не называть цифру в воздух — расскажите что конкретно нужно, и дам точный расчёт.",
]

REPLY_OBJECTION_TIME = [
    "Понял. Не тороплю. Если появится задача — мы здесь, пишите.",
    "Ок. Когда будет актуально — напишите, я здесь.",
    "Понял. Отложим. Когда время появится — возвращайтесь.",
]

REPLY_OBJECTION_EXPENSIVE = [
    "Понял. Тогда вот что: есть формат поменьше — {offer_small} от ${min_price}. Меньше объём, но результат тот же. Интересно?",
    "Ок. Есть стартовый вариант — {offer_small}, от ${min_price}. Попробуете — потом можно расширить.",
    "Слышу. Тогда предлагаю начать с малого: {offer_small} за ${min_price}. Окупается быстро.",
]

REPLY_OBJECTION_GENERIC = [
    "Понял. Без давления — если будет актуально, пишите.",
    "Ок. Если понадобится AI-автоматизация — мы здесь.",
    "Понял. Удачи с вашим направлением. Если что — @manager_aureon.",
]

REPLY_NO_CONTEXT = [
    "Спасибо за ответ! Можете уточнить — что именно вас интересует или что смущает?",
    "Услышал. Что именно хотели бы прояснить?",
    "Понял ваш ответ. Скажите — что сейчас самый актуальный вопрос?",
]

SMALL_OFFERS = [
    "AI Telegram Bot (базовый)",
    "AI-чатбот для сайта",
    "AI Content System (lite)",
]

NICHE_TEMPLATES = {
    "telegram channels": "telegram",
    "telegram": "telegram",
    "small business": "default",
    "education": "education",
    "ecommerce": "ecommerce",
    "e-commerce": "ecommerce",
    "services": "services",
}

DEFAULT_PROBLEMS = {
    "telegram": "нет автоответов и контент создаётся вручную",
    "education": "заявки обрабатываются вручную и лиды теряются",
    "ecommerce": "нет автоматизации заказов и коммуникации с клиентами",
    "services": "нет онлайн-записи и клиентам долго отвечают",
    "default": "нет автоматизации — время уходит на рутину",
}

DEFAULT_OFFERS = {
    "telegram": "AI Telegram Bot + авто-контент систему",
    "education": "AI-бот для автозаписи и напоминаний",
    "ecommerce": "AI Telegram Bot для обработки заказов",
    "services": "AI-бот для онлайн-записи",
    "default": "AI-автоматизацию под вашу нишу",
}

NICHE_PRICES = {
    "telegram": 500,
    "education": 600,
    "ecommerce": 500,
    "services": 400,
    "default": 500,
}


def _resolve_niche_key(niche: str) -> str:
    if not niche:
        return "default"
    n = niche.lower().strip()
    for k, v in NICHE_TEMPLATES.items():
        if k in n or n in k:
            return v
    return "default"


def generate_outreach_message(
    name: str,
    niche: str = "",
    problem: str = "",
    offer: str = "",
    price: float = None,
) -> str:
    niche_key = _resolve_niche_key(niche)
    templates = OUTREACH_TEMPLATES.get(niche_key, OUTREACH_TEMPLATES["default"])
    tpl = random.choice(templates)

    resolved_problem = problem or DEFAULT_PROBLEMS.get(niche_key, DEFAULT_PROBLEMS["default"])
    resolved_offer = offer or DEFAULT_OFFERS.get(niche_key, DEFAULT_OFFERS["default"])
    resolved_price = int(price) if price else NICHE_PRICES.get(niche_key, 500)

    first_name = name.split()[0] if name else "Привет"

    return tpl.format(
        name=first_name,
        problem=resolved_problem,
        offer=resolved_offer,
        price=resolved_price,
    )


def generate_reply_suggestion(
    conversation_history: list,
    lead: dict,
    settings: dict,
) -> str:
    last_inbound = ""
    for msg in reversed(conversation_history):
        if msg.get("direction") == "inbound":
            last_inbound = (msg.get("content") or "").lower()
            break

    min_price = int(settings.get("min_price", 100))
    max_price = int(min_price * 3)
    small_offer = random.choice(SMALL_OFFERS)

    if not last_inbound:
        return random.choice(REPLY_NO_CONTEXT)

    if any(w in last_inbound for w in ["да", "интересно", "расскажи", "подробнее", "хочу", "ок", "давай"]):
        return random.choice(REPLY_INTERESTED)

    if any(w in last_inbound for w in ["цена", "цены", "стоимость", "сколько стоит", "прайс", "дорого", "price"]):
        if any(w in last_inbound for w in ["дорого", "много", "не потяну", "дорогова"]):
            return random.choice(REPLY_OBJECTION_EXPENSIVE).format(
                offer_small=small_offer, min_price=min_price
            )
        return random.choice(REPLY_PRICE_QUESTION).format(
            min_price=min_price, max_price=max_price
        )

    if any(w in last_inbound for w in ["нет времени", "не сейчас", "позже", "потом", "занят"]):
        return random.choice(REPLY_OBJECTION_TIME)

    if any(w in last_inbound for w in ["нет", "не надо", "не интересно", "откажусь", "спасибо нет"]):
        return random.choice(REPLY_OBJECTION_GENERIC)

    if any(w in last_inbound for w in ["дорого", "много", "не потяну"]):
        return random.choice(REPLY_OBJECTION_EXPENSIVE).format(
            offer_small=small_offer, min_price=min_price
        )

    return random.choice(REPLY_NO_CONTEXT)


def count_sent_today(db: Session) -> int:
    from sqlalchemy import func as sqlfunc
    today = date.today()
    return (
        db.query(SalesMessage)
        .filter(
            SalesMessage.direction == "outbound",
            SalesMessage.sent == True,
            sqlfunc.date(SalesMessage.sent_at) == str(today),
        )
        .count()
    )


def already_contacted(lead_id: int, db: Session) -> bool:
    return (
        db.query(SalesMessage)
        .filter(SalesMessage.lead_id == lead_id, SalesMessage.direction == "outbound", SalesMessage.sent == True)
        .count()
        > 0
    )


def contains_forbidden(text: str, forbidden_words: list) -> bool:
    text_lower = text.lower()
    return any(w.lower() in text_lower for w in (forbidden_words or []))
