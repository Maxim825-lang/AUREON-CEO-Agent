"""
Lead Finder Service — generates structured search queries and analyses for real lead discovery.
No fake/mock companies are generated. Real search API integration can be added later.
"""

PRICING_PACKAGES = {
    "AI Telegram Bot": 300,
    "AI Content System": 500,
    "Landing Page + AI Chat": 700,
    "Landing Page + AI": 700,
    "Business Automation": 1000,
    "AUREON Mini HQ": 1500,
}

NICHE_PROBLEM_MAP = {
    "Telegram channels": "ручное создание контента занимает 3-5 часов в день, нет автоответов для аудитории",
    "small business": "нет системы для работы с клиентами, заявки теряются, нет автоматизации",
    "education": "запись на курсы вручную, потеря лидов из-за долгого ответа, нет автонапоминаний",
    "bloggers": "нет системы монетизации аудитории, контент создаётся вручную",
    "e-commerce": "нет автоматизации заказов и коммуникации с клиентами в Telegram",
    "services": "нет онлайн-записи и автоматических напоминаний для клиентов",
}

NICHE_OFFER_MAP = {
    "Telegram channels": "AI Content System — автогенерация постов в вашем стиле + бот для аудитории",
    "small business": "AI Telegram Bot с CRM-интеграцией для работы с клиентами 24/7",
    "education": "AI-бот для автоматической записи на курсы + напоминания для студентов",
    "bloggers": "AI Content System + Landing Page с AI-чатом для монетизации аудитории",
    "e-commerce": "AI Telegram Bot для обработки заказов и уведомлений клиентам",
    "services": "AI Telegram Bot для онлайн-записи + автонапоминания о визитах",
}

NICHE_PRICE_MAP = {
    "Telegram channels": 500,
    "small business": 400,
    "education": 600,
    "bloggers": 700,
    "e-commerce": 500,
    "services": 400,
}

NICHE_QUERIES = {
    "Telegram channels": [
        "{service} для Telegram канала {location}",
        "администратор Telegram канал {location} автоматизация контент",
        "Telegram бизнес канал {location} бот автоответы",
        "site:t.me {location} бизнес канал без бота",
    ],
    "small business": [
        "малый бизнес {location} автоматизация AI {service}",
        "ИП предприниматель {location} Telegram бот CRM",
        "розничный бизнес {location} автоматизация клиентов",
        "магазин {location} Telegram бот продажи",
    ],
    "education": [
        "онлайн школа {location} автоматизация записи {service}",
        "EdTech курсы {location} AI бот студенты",
        "репетитор преподаватель {location} Telegram автоматизация",
        "образование онлайн {location} запись клиенты бот",
    ],
    "bloggers": [
        "блогер инфлюенсер {location} монетизация автоматизация",
        "Telegram канал {location} монетизация система продаж",
        "блог {location} автоматизация контент AI {service}",
        "инфобизнес {location} воронка продаж бот",
    ],
    "e-commerce": [
        "интернет магазин {location} автоматизация заказы {service}",
        "e-commerce {location} Telegram бот клиенты",
        "онлайн продажи {location} автоматизация CRM",
        "маркетплейс продавец {location} Telegram уведомления",
    ],
    "services": [
        "сервисная компания {location} автоматизация клиентов",
        "услуги {location} Telegram бот запись",
        "клиника салон {location} автоматизация записи {service}",
        "фриланс агентство {location} CRM автоматизация",
    ],
}

PLATFORM_SEARCH = {
    "Telegram": [
        "поиск t.me/username {niche}",
        "Telegram Directory {niche} {location}",
        "@tgstat {niche} каналы {location}",
    ],
    "Instagram": [
        "Instagram business {niche} {location}",
        "инстаграм бизнес {niche} {location}",
    ],
    "VK": [
        "ВКонтакте паблик {niche} {location}",
        "vk.com/club {niche} бизнес {location}",
    ],
    "LinkedIn": [
        "LinkedIn {niche} company {location}",
    ],
}

OUTREACH_TEMPLATE = """Привет, {name}!

Пишу от лица проекта AUREON AI Agency.

Мы специализируемся на AI-автоматизации для {niche} — помогаем бизнесу сэкономить время и увеличить продажи.

Я изучил вашу ситуацию и вижу, что {problem}

Мы можем помочь через: {offer}

Это позволит освободить ваше время для роста, а рутину переложить на AI.

Хотите — подготовим детальное предложение именно для вас. Без обязательств.

⚠️ Важно: это сообщение подготовлено AI-агентом AUREON. Финальное общение — с командой AUREON.

С уважением,
AI-представитель AUREON
Telegram: @manager_aureon"""


def generate_search_queries(niche: str, location: str, service: str, max_results: int = 10) -> list:
    templates = NICHE_QUERIES.get(niche, [
        f"{niche} {location} автоматизация AI",
        f"{niche} {location} Telegram бот {service}",
        f"{niche} {location} {service} автоматизация",
        f"{niche} бизнес {location} клиенты онлайн",
    ])

    queries = [t.format(location=location, service=service, niche=niche) for t in templates]
    return queries[:max_results]


def generate_platform_queries(niche: str, location: str, platform: str = "Telegram") -> list:
    templates = PLATFORM_SEARCH.get(platform, [f"{platform} {niche} {location}"])
    return [t.format(niche=niche, location=location) for t in templates]


def generate_outreach_message(name: str, niche: str, problem: str, offer: str) -> str:
    return OUTREACH_TEMPLATE.format(
        name=name,
        niche=niche,
        problem=problem,
        offer=offer,
    )


def analyze_lead(name: str, company: str, contact: str, platform: str, niche: str, source_url: str = "") -> dict:
    """Analyse a real lead and suggest problem/offer/price without inventing fake data."""
    niche_key = niche.lower()
    matched_key = next((k for k in NICHE_PROBLEM_MAP if k in niche_key or niche_key in k), "")
    return {
        "name": name,
        "company": company,
        "contact": contact,
        "platform": platform,
        "niche": niche,
        "source_url": source_url,
        "suggested_problem": NICHE_PROBLEM_MAP.get(matched_key, f"нет автоматизации в нише {niche}"),
        "suggested_offer": NICHE_OFFER_MAP.get(matched_key, "AI Telegram Bot — автоматизация коммуникации с клиентами"),
        "suggested_price": NICHE_PRICE_MAP.get(matched_key, 500),
    }


def suggest_offer(lead: dict) -> str:
    niche = (lead.get("niche") or "").lower()
    matched = next((k for k in NICHE_OFFER_MAP if k in niche or niche in k), "")
    return NICHE_OFFER_MAP.get(matched, "AI Telegram Bot — автоматизация коммуникации с клиентами")


def suggest_price(service: str, lead: dict = None) -> float:
    return float(PRICING_PACKAGES.get(service, 500))
