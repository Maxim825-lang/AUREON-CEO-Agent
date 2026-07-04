import os
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from database import get_db
from models import Lead, Offer, ContentPost, ActionLog


def require_admin(x_admin_secret: str = Header(default="")):
    expected = os.getenv("ADMIN_SECRET", "change_me")
    if not x_admin_secret or x_admin_secret != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])

FAKE_LEAD_NAMES = [
    "Telegram Business Channel",
    "LocalStyle Brand",
    "SkillUp School",
    "MindGrow Blogger",
    "LaunchPad Startup",
]

FAKE_ACTION_RESULTS = [
    "Система запущена. Все агенты активированы. База данных инициализирована.",
    "Рынок AI-автоматизации растёт на 35% г/г. Ниша малого бизнеса практически свободна.",
    "Найдено 5 потенциальных клиентов. Добавлены в CRM.",
    "Пост 'AUREON: AI-агентство нового поколения' создан. Готов к публикации.",
    "AI-бот: $1,200 чек, $340 себестоимость, маржа 71.7%. Точка безубыточности: 2 клиента.",
    "Стратегия утверждена: 4 фазы, цель $100K выручки к Q2 2027.",
]


# ── Demo data cleanup ─────────────────────────────────────────────────────────

@router.post("/clear-demo-data")
def clear_demo_data(db: Session = Depends(get_db)):
    deleted_leads = db.query(Lead).filter(Lead.is_demo == 1).delete()
    deleted_offers = db.query(Offer).filter(Offer.is_demo == 1).delete()
    deleted_posts = db.query(ContentPost).filter(ContentPost.is_demo == 1).delete()

    for name in FAKE_LEAD_NAMES:
        n = db.query(Lead).filter(Lead.name == name).delete()
        deleted_leads += n

    for name in ["SkillUp School", "LaunchPad Startup"]:
        n = db.query(Offer).filter(Offer.client == name).delete()
        deleted_offers += n

    deleted_actions = 0
    for fake_result in FAKE_ACTION_RESULTS:
        n = db.query(ActionLog).filter(ActionLog.result == fake_result).delete()
        deleted_actions += n

    db.commit()
    return {
        "status": "ok",
        "deleted_leads": deleted_leads,
        "deleted_offers": deleted_offers,
        "deleted_posts": deleted_posts,
        "deleted_actions": deleted_actions,
        "message": (
            f"Удалено: {deleted_leads} лидов, {deleted_offers} офферов, "
            f"{deleted_posts} постов, {deleted_actions} фейковых action logs"
        ),
    }


@router.get("/demo-data-count")
def demo_data_count(db: Session = Depends(get_db)):
    demo_leads_flag = db.query(Lead).filter(Lead.is_demo == 1).count()
    demo_leads_name = db.query(Lead).filter(Lead.name.in_(FAKE_LEAD_NAMES)).count()
    demo_offers_flag = db.query(Offer).filter(Offer.is_demo == 1).count()
    demo_offers_name = db.query(Offer).filter(Offer.client.in_(["SkillUp School", "LaunchPad Startup"])).count()
    demo_actions = db.query(ActionLog).filter(ActionLog.result.in_(FAKE_ACTION_RESULTS)).count()
    return {
        "demo_leads": demo_leads_flag + demo_leads_name,
        "demo_offers": demo_offers_flag + demo_offers_name,
        "demo_posts": db.query(ContentPost).filter(ContentPost.is_demo == 1).count(),
        "demo_actions": demo_actions,
        "real_leads": db.query(Lead).filter(Lead.is_demo != 1).filter(Lead.name.notin_(FAKE_LEAD_NAMES)).count(),
        "real_offers": db.query(Offer).filter(Offer.is_demo != 1).filter(Offer.client.notin_(["SkillUp School", "LaunchPad Startup"])).count(),
    }


# ── Purchase Requests ─────────────────────────────────────────────────────────

def _serialize_request(r) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "username": r.username,
        "telegram_chat_id": r.telegram_chat_id,
        "service": r.service,
        "budget": r.budget,
        "deadline": r.deadline,
        "project_description": r.project_description,
        "contact": r.contact,
        "status": r.status,
        "admin_notes": r.admin_notes,
        "lead_id": r.lead_id,
        "created_at": r.created_at.isoformat() if r.created_at else None,
        "updated_at": r.updated_at.isoformat() if r.updated_at else None,
    }


@router.get("/purchase-requests")
def list_purchase_requests(status: Optional[str] = None, db: Session = Depends(get_db)):
    from models import PurchaseRequest
    q = db.query(PurchaseRequest)
    if status:
        q = q.filter(PurchaseRequest.status == status)
    items = q.order_by(PurchaseRequest.id.desc()).all()
    return [_serialize_request(r) for r in items]


@router.post("/purchase-requests/{req_id}/approve")
def approve_request(req_id: int, db: Session = Depends(get_db)):
    from models import PurchaseRequest, Task
    from services.discovery_agent import start_discovery
    req = db.query(PurchaseRequest).filter(PurchaseRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Not found")
    req.status = "in_discovery"
    db.add(ActionLog(
        agent="CEO Agent",
        action=f"Заявка #{req_id} одобрена",
        result=f"Клиент: {req.name}, Услуга: {req.service}. Discovery запущен.",
        status="success",
    ))
    existing = db.query(Task).filter(Task.title == f"Discovery: {req.name}").first()
    if not existing:
        db.add(Task(
            title=f"Discovery: {req.name}",
            description=f"Уточнить детали для {req.service}. Бюджет: {req.budget}. {req.project_description or ''}",
            agent="Sales Agent",
            status="pending",
            priority="high",
            tags=["discovery", "miniapp"],
        ))
    db.commit()
    # Start autonomous discovery conversation
    conv = start_discovery(req, db)
    no_chat = not req.telegram_chat_id
    try:
        from memory.service import create_entry
        create_entry(db, {
            "type": "long",
            "category": "client",
            "title": f"[Approved] {req.name} — {req.service}",
            "content": f"Заявка одобрена. Discovery запущен. Conv #{conv.id}.\nБюджет: {req.budget}",
            "tags": ["approved", "discovery", req.service.lower().replace(" ", "-")],
            "source": "miniapp",
            "importance": 4,
        })
    except Exception:
        pass
    return {
        "ok": True,
        "status": "in_discovery",
        "conversation_id": conv.id,
        "chat_available": not no_chat,
    }


@router.post("/purchase-requests/{req_id}/reject")
def reject_request(req_id: int, db: Session = Depends(get_db)):
    from models import PurchaseRequest
    from services.telegram_bot import _send
    req = db.query(PurchaseRequest).filter(PurchaseRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Not found")
    req.status = "rejected"
    db.add(ActionLog(
        agent="CEO Agent",
        action=f"Заявка #{req_id} отклонена",
        result=f"Клиент: {req.name}",
        status="success",
    ))
    db.commit()
    if req.telegram_chat_id:
        try:
            _send(req.telegram_chat_id,
                  f"Привет, {req.name}.\n\nК сожалению, на данный момент мы не можем взяться за ваш проект.\n"
                  f"Если ситуация изменится — пишите!")
        except Exception:
            pass
    return {"ok": True, "status": "rejected"}


@router.post("/purchase-requests/{req_id}/mark-won")
def mark_won(req_id: int, db: Session = Depends(get_db)):
    from models import PurchaseRequest, StrategyState
    req = db.query(PurchaseRequest).filter(PurchaseRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Not found")
    req.status = "won"
    db.add(ActionLog(
        agent="CEO Agent",
        action=f"Сделка закрыта: {req.name} — {req.service}",
        result=f"Бюджет: {req.budget or '—'}. Lead #{req.lead_id}.",
        status="success",
    ))
    # Update revenue
    price = _parse_budget_float(req.budget)
    if price:
        strategy = db.query(StrategyState).first()
        if strategy:
            strategy.revenue_current = (strategy.revenue_current or 0) + price
            from services.strategy_engine import calculate_progress
            strategy.progress_percent = calculate_progress(
                strategy.revenue_current, strategy.revenue_goal or 100000, 0, 1
            )
    # Update linked lead
    if req.lead_id:
        from models import Lead
        lead = db.query(Lead).filter(Lead.id == req.lead_id).first()
        if lead:
            lead.status = "closed_won"
    db.commit()
    # Memory
    try:
        from memory.service import create_entry
        create_entry(db, {
            "type": "experience",
            "category": "sales",
            "title": f"[Won] {req.name} — {req.service}",
            "content": f"Сделка закрыта. Бюджет: {req.budget}. Дедлайн: {req.deadline}.\nОписание: {req.project_description or ''}",
            "tags": ["won", "deal", req.service.lower().replace(" ", "-")],
            "source": "miniapp",
            "importance": 5,
        })
    except Exception:
        pass
    return {"ok": True, "status": "won", "revenue_added": price}


@router.post("/purchase-requests/{req_id}/generate-portfolio-case")
def generate_portfolio_case_endpoint(req_id: int, db: Session = Depends(get_db)):
    from models import PurchaseRequest, PortfolioCase
    from services.portfolio_generator import generate_portfolio_case
    req = db.query(PurchaseRequest).filter(PurchaseRequest.id == req_id).first()
    if not req:
        raise HTTPException(404, "Not found")
    data = generate_portfolio_case(req)
    case = PortfolioCase(**data)
    db.add(case)
    db.commit()
    db.refresh(case)
    return {"ok": True, "case_id": case.id, "title": case.title, "status": case.status}


# ── Portfolio cases ───────────────────────────────────────────────────────────

@router.get("/portfolio")
def list_portfolio(db: Session = Depends(get_db)):
    from models import PortfolioCase
    cases = db.query(PortfolioCase).order_by(PortfolioCase.id.desc()).all()
    return [_serialize_case(c) for c in cases]


@router.put("/portfolio/{case_id}")
def update_case(case_id: int, data: dict, db: Session = Depends(get_db)):
    from models import PortfolioCase
    case = db.query(PortfolioCase).filter(PortfolioCase.id == case_id).first()
    if not case:
        raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(case, k) and k not in ("id", "created_at"):
            setattr(case, k, v)
    db.commit()
    return _serialize_case(case)


@router.post("/portfolio/{case_id}/publish")
def publish_case(case_id: int, db: Session = Depends(get_db)):
    from models import PortfolioCase
    case = db.query(PortfolioCase).filter(PortfolioCase.id == case_id).first()
    if not case:
        raise HTTPException(404, "Not found")
    case.status = "published"
    case.published_at = datetime.utcnow()
    db.add(ActionLog(
        agent="CEO Agent",
        action=f"Кейс опубликован: {case.title}",
        result="Кейс доступен в Mini App",
        status="success",
    ))
    db.commit()
    # Knowledge memory
    try:
        from memory.service import create_entry
        create_entry(db, {
            "type": "knowledge",
            "category": "portfolio",
            "title": f"Кейс: {case.title}",
            "content": f"Клиент: {case.client_name}\nУслуга: {case.service}\nПроблема: {case.problem}\nРешение: {case.solution}\nРезультат: {case.result}",
            "tags": ["portfolio", "case", case.service.lower().replace(" ", "-") if case.service else ""],
            "source": "portfolio",
            "importance": 4,
        })
    except Exception:
        pass
    return {"ok": True, "status": "published"}


@router.post("/portfolio/{case_id}/unpublish")
def unpublish_case(case_id: int, db: Session = Depends(get_db)):
    from models import PortfolioCase
    case = db.query(PortfolioCase).filter(PortfolioCase.id == case_id).first()
    if not case:
        raise HTTPException(404, "Not found")
    case.status = "draft"
    db.commit()
    return {"ok": True, "status": "draft"}


def _serialize_case(c) -> dict:
    return {
        "id": c.id,
        "title": c.title,
        "client_name": c.client_name,
        "service": c.service,
        "problem": c.problem,
        "solution": c.solution,
        "result": c.result,
        "price": c.price,
        "duration": c.duration,
        "status": c.status,
        "source_lead_id": c.source_lead_id,
        "source_request_id": c.source_request_id,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "published_at": c.published_at.isoformat() if c.published_at else None,
    }


# ── Testimonials ──────────────────────────────────────────────────────────────

@router.get("/testimonials")
def list_testimonials(db: Session = Depends(get_db)):
    from models import Testimonial
    items = db.query(Testimonial).order_by(Testimonial.id.desc()).all()
    return [_serialize_testimonial(t) for t in items]


@router.post("/testimonials")
def create_testimonial(data: dict, db: Session = Depends(get_db)):
    from models import Testimonial
    t = Testimonial(
        client_name=data.get("client_name", ""),
        text=data.get("text", ""),
        rating=data.get("rating", 5),
        service=data.get("service", ""),
        status="draft",
        source_request_id=data.get("source_request_id"),
    )
    db.add(t)
    db.commit()
    db.refresh(t)
    return _serialize_testimonial(t)


@router.put("/testimonials/{t_id}")
def update_testimonial(t_id: int, data: dict, db: Session = Depends(get_db)):
    from models import Testimonial
    t = db.query(Testimonial).filter(Testimonial.id == t_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    for k, v in data.items():
        if hasattr(t, k) and k not in ("id", "created_at"):
            setattr(t, k, v)
    db.commit()
    return _serialize_testimonial(t)


@router.post("/testimonials/{t_id}/publish")
def publish_testimonial(t_id: int, db: Session = Depends(get_db)):
    from models import Testimonial
    t = db.query(Testimonial).filter(Testimonial.id == t_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    t.status = "published"
    db.commit()
    return {"ok": True, "status": "published"}


@router.post("/testimonials/{t_id}/unpublish")
def unpublish_testimonial(t_id: int, db: Session = Depends(get_db)):
    from models import Testimonial
    t = db.query(Testimonial).filter(Testimonial.id == t_id).first()
    if not t:
        raise HTTPException(404, "Not found")
    t.status = "draft"
    db.commit()
    return {"ok": True, "status": "draft"}


def _serialize_testimonial(t) -> dict:
    return {
        "id": t.id,
        "client_name": t.client_name,
        "text": t.text,
        "rating": t.rating,
        "service": t.service,
        "status": t.status,
        "source_request_id": t.source_request_id,
        "created_at": t.created_at.isoformat() if t.created_at else None,
    }


def _parse_budget_float(budget_str) -> float:
    if not budget_str:
        return 0.0
    b = str(budget_str).replace("$", "").replace(",", "").replace(" ", "").split("-")[0]
    try:
        return float(b)
    except ValueError:
        return 0.0
