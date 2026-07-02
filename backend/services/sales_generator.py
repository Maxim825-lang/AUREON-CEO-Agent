import random
from datetime import datetime

SERVICES = {
    "AI Telegram Bot": {
        "description": "Умный AI-бот для автоматизации коммуникации в Telegram",
        "price_range": (800, 2500),
        "timeline": "7-14 дней",
        "features": [
            "Автоответы на частые вопросы",
            "Интеграция с CRM",
            "Аналитика диалогов",
            "Персонализированные ответы",
        ],
    },
    "AI Content System": {
        "description": "Система автоматической генерации контента для социальных сетей",
        "price_range": (1200, 3500),
        "timeline": "10-21 день",
        "features": [
            "Генерация постов по расписанию",
            "Адаптация под голос бренда",
            "Публикация в Telegram/Instagram",
            "Аналитика охвата",
        ],
    },
    "Landing Page + AI": {
        "description": "Конвертирующий лендинг с AI-чатом для захвата лидов",
        "price_range": (600, 1800),
        "timeline": "5-10 дней",
        "features": [
            "Современный дизайн",
            "AI-чат для квалификации",
            "Интеграция с CRM",
            "A/B тестирование",
        ],
    },
    "Business Automation": {
        "description": "Комплексная автоматизация бизнес-процессов с помощью AI",
        "price_range": (2000, 8000),
        "timeline": "21-45 дней",
        "features": [
            "Аудит процессов",
            "Автоматизация рутины",
            "AI-агент для задач",
            "Интеграция всех систем",
        ],
    },
    "AI Assistant for Project": {
        "description": "Персональный AI-ассистент для управления проектом",
        "price_range": (1500, 4000),
        "timeline": "14-21 день",
        "features": [
            "Планирование задач",
            "Автоматические отчёты",
            "Анализ данных",
            "Рекомендации CEO",
        ],
    },
}

OFFER_TEMPLATE = """🤝 КОММЕРЧЕСКОЕ ПРЕДЛОЖЕНИЕ
━━━━━━━━━━━━━━━━━━━━━━━━━

От: AUREON AI Agency
Кому: {client}
Дата: {date}

━━━━━━━━━━━━━━━━━━━━━━━━━
УСЛУГА: {service}
━━━━━━━━━━━━━━━━━━━━━━━━━

{description}

ЧТО ВХОДИТ:
{features}

СТОИМОСТЬ: ${price}
СРОК РЕАЛИЗАЦИИ: {timeline}

━━━━━━━━━━━━━━━━━━━━━━━━━
ПОЧЕМУ AUREON?

✓ Специализируемся на AI-автоматизации
✓ Работаем с современными технологиями
✓ Прозрачность на каждом этапе
✓ Результат, а не процесс

━━━━━━━━━━━━━━━━━━━━━━━━━
СЛЕДУЮЩИЙ ШАГ:

Готовы обсудить детали и начать работу.
Напишите нам в Telegram: @aureon_ai

⚠️ Это предложение подготовлено AI-представителем AUREON.
Финальное согласование с командой — перед стартом.

━━━━━━━━━━━━━━━━━━━━━━━━━
AUREON AI Agency | aureon.ai
"""


def generate_offer(client: str, service: str, price: float = None) -> dict:
    service_data = SERVICES.get(service, SERVICES["AI Telegram Bot"])

    if not price:
        low, high = service_data["price_range"]
        price = random.randint(low // 100, high // 100) * 100

    features_text = "\n".join([f"• {f}" for f in service_data["features"]])

    content = OFFER_TEMPLATE.format(
        client=client,
        service=service,
        description=service_data["description"],
        features=features_text,
        price=price,
        timeline=service_data["timeline"],
        date=datetime.now().strftime("%d.%m.%Y"),
    )

    return {
        "client": client,
        "service": service,
        "price": price,
        "timeline": service_data["timeline"],
        "status": "draft",
        "content": content,
    }


def generate_lead_message(lead_name: str, lead_niche: str, problem: str, offer: str) -> str:
    return f"""Привет, {lead_name}!

Я — AI-представитель AUREON AI Agency.

Мы проанализировали ситуацию в нише "{lead_niche}" и увидели, что:
{problem}

AUREON может помочь с этим через:
{offer}

Это позволит автоматизировать процессы и освободить ваше время для стратегии.

Хотите узнать подробности? Напишем детальное предложение специально под вас.

⚠️ Это сообщение подготовлено AI-агентом AUREON. Для продолжения диалога с командой — дайте знать.

С уважением,
AUREON AI Agency"""


MOCK_LEADS = [
    {
        "name": "Telegram Business Channel",
        "company": "Бизнес в Telegram",
        "niche": "Медиа / Telegram-канал",
        "problem": "Создание контента занимает 4-6 часов в день вручную",
        "aureon_offer": "AI Content System — автоматическая генерация постов в стиле канала",
        "estimated_price": 1500,
        "status": "new",
        "score": 85,
    },
    {
        "name": "LocalStyle Brand",
        "company": "Малый бренд одежды",
        "niche": "Fashion / E-commerce",
        "problem": "Нет системы для работы с клиентами и обработки заказов",
        "aureon_offer": "AI Telegram Bot для обработки заказов + CRM",
        "estimated_price": 1200,
        "status": "contacted",
        "score": 72,
    },
    {
        "name": "SkillUp School",
        "company": "Локальная школа навыков",
        "niche": "Образование / EdTech",
        "problem": "Запись на курсы вручную, потеря лидов, нет автоответов",
        "aureon_offer": "AI-бот для записи на курсы + автоматические напоминания",
        "estimated_price": 900,
        "status": "proposal_sent",
        "score": 90,
    },
    {
        "name": "MindGrow Blogger",
        "company": "Блогер по саморазвитию",
        "niche": "Self-development / Блогинг",
        "problem": "Хочет монетизировать аудиторию, нет системы продаж",
        "aureon_offer": "AI Content System + Landing Page с AI-чатом",
        "estimated_price": 2000,
        "status": "new",
        "score": 68,
    },
    {
        "name": "LaunchPad Startup",
        "company": "Стартап без сайта",
        "niche": "Tech Startup",
        "problem": "Нет онлайн-присутствия, теряют потенциальных клиентов",
        "aureon_offer": "Landing Page + AI Telegram Bot + Content System",
        "estimated_price": 3500,
        "status": "new",
        "score": 78,
    },
]
