from datetime import datetime


SOLUTION_TEMPLATES = {
    "AI Telegram Bot": "Разработан интеллектуальный Telegram-бот с AI-ядром: автоответы, квалификация лидов, интеграция с CRM-системой AUREON.",
    "AI Content System": "Внедрена система автоматической генерации контента: посты создаются в стиле бренда и публикуются по расписанию без участия человека.",
    "Landing Page + AI Chat": "Создан конвертирующий лендинг с AI-чатом. Чат квалифицирует посетителей и передаёт горячие лиды в CRM.",
    "Business Automation": "Проведён аудит и автоматизация ключевых бизнес-процессов. Рутинные задачи переданы AI-агентам.",
    "AUREON Mini HQ": "Развёрнута полная AI-операционная система: контент, продажи, аналитика и операционка работают в единой связке.",
}


def generate_portfolio_case(request) -> dict:
    """Generate a portfolio case dict from a PurchaseRequest."""
    service = request.service or "AI Solution"
    solution = SOLUTION_TEMPLATES.get(service, f"Разработано AI-решение на базе AUREON: {service}.")

    price = None
    if request.budget:
        b = request.budget.replace("$", "").replace(",", "").replace(" ", "").split("-")[0]
        try:
            price = float(b)
        except ValueError:
            pass

    return {
        "title": f"{service} — {request.name or 'Клиент'}",
        "client_name": request.name or "Клиент",
        "service": service,
        "problem": request.project_description or "Задача уточняется после консультации.",
        "solution": solution,
        "result": "Результат будет обновлён после запуска проекта",
        "price": price,
        "duration": request.deadline or "В процессе",
        "status": "draft",
        "source_request_id": request.id,
    }
