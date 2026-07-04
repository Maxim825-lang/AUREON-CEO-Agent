import os
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db

router = APIRouter(prefix="/api/miniapp", tags=["miniapp"])

SERVICES_CATALOG = [
    {"id": 1, "name": "AI Telegram Bot", "price_from": 300, "price_to": 1500, "currency": "USD",
     "timeline": "7-14 дней", "icon": "🤖", "color": "#3B82F6",
     "description": "Умный AI-бот: автоответы 24/7, квалификация лидов, интеграция с CRM",
     "features": ["Автоответы 24/7", "Квалификация лидов", "CRM интеграция", "Аналитика"]},
    {"id": 2, "name": "AI Content System", "price_from": 500, "price_to": 2500, "currency": "USD",
     "timeline": "10-21 день", "icon": "📢", "color": "#8B5CF6",
     "description": "Автогенерация контента в вашем стиле + публикация по расписанию",
     "features": ["Авто-посты", "Стиль бренда", "Расписание", "Telegram/Instagram"]},
    {"id": 3, "name": "Landing Page + AI Chat", "price_from": 700, "price_to": 2000, "currency": "USD",
     "timeline": "5-10 дней", "icon": "🌐", "color": "#10B981",
     "description": "Конвертирующий лендинг с AI-чатом для квалификации клиентов",
     "features": ["Современный дизайн", "AI-чат", "CRM интеграция", "Аналитика конверсий"]},
    {"id": 4, "name": "Business Automation", "price_from": 1000, "price_to": 5000, "currency": "USD",
     "timeline": "21-45 дней", "icon": "⚙️", "color": "#F59E0B",
     "description": "Комплексная AI-автоматизация бизнес-процессов",
     "features": ["Аудит процессов", "AI-агент", "Интеграции", "Обучение команды"]},
    {"id": 5, "name": "AUREON Mini HQ", "price_from": 1500, "price_to": 8000, "currency": "USD",
     "timeline": "30-60 дней", "icon": "👑", "color": "#D4AF37",
     "description": "Полная AI-система: контент + продажи + операции + аналитика",
     "features": ["CEO AI-агент", "Content 24/7", "Sales Agent", "Дашборд"]},
]


@router.get("/config")
def get_config():
    miniapp_url = os.getenv("MINIAPP_URL", "http://localhost:5173/miniapp")
    return {
        "name": "AUREON",
        "tagline": "AI-боты и автоматизация для вашего бизнеса",
        "telegram_channel": os.getenv("TELEGRAM_CHANNEL_ID", "@aureon_01"),
        "miniapp_url": miniapp_url,
        "contact": "@manager_aureon",
    }


@router.get("/services")
def get_services():
    return SERVICES_CATALOG


@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db)):
    from models import PortfolioCase
    cases = (
        db.query(PortfolioCase)
        .filter(PortfolioCase.status == "published")
        .order_by(PortfolioCase.published_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "title": c.title,
            "client_name": c.client_name,
            "service": c.service,
            "problem": c.problem,
            "solution": c.solution,
            "result": c.result,
            "price": c.price,
            "duration": c.duration,
            "published_at": c.published_at.isoformat() if c.published_at else None,
        }
        for c in cases
    ]


@router.get("/testimonials")
def get_testimonials(db: Session = Depends(get_db)):
    from models import Testimonial
    items = (
        db.query(Testimonial)
        .filter(Testimonial.status == "published")
        .order_by(Testimonial.created_at.desc())
        .all()
    )
    return [
        {
            "id": t.id,
            "client_name": t.client_name,
            "text": t.text,
            "rating": t.rating,
            "service": t.service,
        }
        for t in items
    ]


class PurchaseRequestIn(BaseModel):
    name: str
    username: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    telegram_user_id: Optional[str] = None
    service: str
    budget: Optional[str] = None
    deadline: Optional[str] = None
    project_description: Optional[str] = None
    contact: Optional[str] = None


@router.post("/purchase-request")
def create_purchase_request(data: PurchaseRequestIn, db: Session = Depends(get_db)):
    from models import PurchaseRequest, Lead, ActionLog
    import os

    req = PurchaseRequest(
        telegram_user_id=data.telegram_user_id,
        telegram_chat_id=data.telegram_chat_id,
        username=data.username,
        name=data.name,
        service=data.service,
        budget=data.budget,
        deadline=data.deadline,
        project_description=data.project_description,
        contact=data.contact or data.username,
        status="new",
    )
    db.add(req)
    db.flush()

    # Create Lead in CRM
    lead = Lead(
        name=data.name,
        telegram=f"@{data.username}" if data.username else None,
        telegram_chat_id=data.telegram_chat_id,
        contact=data.contact,
        niche="Mini App",
        aureon_offer=data.service,
        estimated_price=_parse_budget(data.budget),
        status="new",
        notes=data.project_description,
        is_demo=0,
    )
    db.add(lead)
    db.flush()
    req.lead_id = lead.id

    log = ActionLog(
        agent="Mini App",
        action=f"Новая заявка от {data.name}",
        result=f"Услуга: {data.service}. Бюджет: {data.budget or '—'}. Контакт: {data.contact or data.username or '—'}",
        status="success",
    )
    db.add(log)
    db.commit()

    # Memory Core — Long Memory
    try:
        from memory.service import create_entry
        create_entry(db, {
            "type": "long",
            "category": "client",
            "title": f"Заявка от {data.name} — {data.service}",
            "content": f"Имя: {data.name}\nUusername: @{data.username}\nУслуга: {data.service}\nБюджет: {data.budget}\nДедлайн: {data.deadline}\nОписание: {data.project_description}",
            "tags": ["заявка", "miniapp", data.service.lower().replace(" ", "-")],
            "source": "miniapp",
            "importance": 4,
        })
    except Exception:
        pass

    # Notify founder via Telegram
    try:
        from services.report_service import get_founder_chat_id
        from services.telegram_bot import _send
        founder_cid = get_founder_chat_id(db)
        if founder_cid:
            msg = (
                f"🔔 <b>Новая заявка через Mini App!</b>\n\n"
                f"👤 <b>{data.name}</b>"
                + (f" (@{data.username})" if data.username else "") + "\n"
                f"🛠 Услуга: {data.service}\n"
                f"💰 Бюджет: {data.budget or '—'}\n"
                f"📅 Дедлайн: {data.deadline or '—'}\n"
                f"📝 {(data.project_description or '')[:200]}\n\n"
                f"Откройте Requests в AUREON, чтобы одобрить заявку."
            )
            _send(founder_cid, msg)
    except Exception:
        pass

    return {"ok": True, "request_id": req.id, "lead_id": lead.id}


def _parse_budget(budget_str: Optional[str]) -> Optional[float]:
    if not budget_str:
        return None
    b = budget_str.replace("$", "").replace(",", "").replace(" ", "").split("-")[0]
    try:
        return float(b)
    except ValueError:
        return None
