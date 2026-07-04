from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Lead, Offer, ActionLog
from schemas import LeadSchema, LeadCreate, FindLeadsRequest
from services.lead_finder import generate_search_queries, generate_platform_queries, generate_outreach_message
from services.sales_generator import generate_offer
from typing import List, Optional

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=List[LeadSchema])
def get_leads(db: Session = Depends(get_db)):
    return db.query(Lead).order_by(Lead.score.desc(), Lead.created_at.desc()).all()


@router.post("", response_model=LeadSchema)
def create_lead(lead: LeadCreate, db: Session = Depends(get_db)):
    db_lead = Lead(**lead.model_dump())
    db.add(db_lead)
    db.commit()
    db.refresh(db_lead)
    return db_lead


@router.patch("/{lead_id}/status")
def update_lead_status(lead_id: int, status: str, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = status
    db.commit()
    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Статус лида обновлён: {lead.name}",
        result=f"Новый статус: {status}",
        status="success",
    ))
    db.commit()
    return {"status": "updated"}


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    db.delete(lead)
    db.commit()
    return {"status": "deleted"}


@router.post("/find-real")
def find_real_leads(request: FindLeadsRequest, db: Session = Depends(get_db)):
    queries = generate_search_queries(
        niche=request.niche,
        location=request.location,
        service=request.service,
        max_results=request.max_results,
    )
    platform_queries = generate_platform_queries(
        niche=request.niche,
        location=request.location,
        platform="Telegram",
    )

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Поиск лидов: {request.niche} / {request.location}",
        result=f"Сгенерировано {len(queries)} поисковых запросов для ниши '{request.niche}'",
        status="success",
    ))
    db.commit()

    return {
        "status": "ok",
        "niche": request.niche,
        "location": request.location,
        "service": request.service,
        "search_queries": queries,
        "platform_queries": platform_queries,
        "instructions": [
            f"1. Используйте поисковые запросы ниже в Google / Yandex",
            f"2. Найдите реальные компании / каналы в нише '{request.niche}'",
            f"3. Добавьте найденные лиды через кнопку 'Add Lead'",
            f"4. Укажите source_url для каждого лида",
            "5. AI сгенерирует персональный outreach-message для каждого",
        ],
        "note": "Реальные лиды добавляются вручную — никаких автоматических фейковых данных",
    }


@router.post("/{lead_id}/generate-outreach")
def generate_outreach(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    message = generate_outreach_message(
        name=lead.name,
        niche=lead.niche or "вашей нише",
        problem=lead.problem or "есть задачи, которые можно автоматизировать",
        offer=lead.aureon_offer or "AI-решение под ваши задачи",
    )

    lead.last_message = message
    db.commit()

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Outreach для {lead.name}",
        result="Outreach-сообщение сгенерировано AI-представителем AUREON",
        status="success",
    ))
    db.commit()

    return {"message": message, "lead_id": lead_id}


@router.post("/{lead_id}/generate-offer")
def generate_offer_for_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    service = "AI Telegram Bot"
    if lead.aureon_offer:
        offer_lower = lead.aureon_offer.lower()
        if "content" in offer_lower:
            service = "AI Content System"
        elif "landing" in offer_lower or "лендинг" in offer_lower:
            service = "Landing Page + AI"
        elif "automation" in offer_lower or "автоматизац" in offer_lower:
            service = "Business Automation"

    offer_data = generate_offer(lead.name, service, lead.estimated_price)
    offer = Offer(**offer_data, lead_id=lead.id)
    db.add(offer)
    db.commit()
    db.refresh(offer)

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Оффер для {lead.name}",
        result=f"КП сгенерировано: {service} — ${offer.price}",
        status="success",
    ))
    db.commit()

    return offer


def _set_status(lead_id: int, new_status: str, label: str, db: Session):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    lead.status = new_status
    db.commit()
    db.add(ActionLog(
        agent="Sales Agent",
        action=f"{label}: {lead.name}",
        result=f"Статус обновлён → {new_status}",
        status="success",
    ))
    db.commit()
    return {"status": new_status, "lead_id": lead_id}


@router.post("/{lead_id}/mark-contacted")
def mark_contacted(lead_id: int, db: Session = Depends(get_db)):
    return _set_status(lead_id, "contacted", "Лид отмечен как Contacted", db)


@router.post("/{lead_id}/mark-proposal-sent")
def mark_proposal_sent(lead_id: int, db: Session = Depends(get_db)):
    return _set_status(lead_id, "proposal_sent", "КП отправлено", db)


@router.post("/{lead_id}/mark-won")
def mark_won(lead_id: int, db: Session = Depends(get_db)):
    return _set_status(lead_id, "closed_won", "Сделка закрыта: WON", db)


@router.post("/{lead_id}/mark-lost")
def mark_lost(lead_id: int, db: Session = Depends(get_db)):
    return _set_status(lead_id, "closed_lost", "Сделка закрыта: LOST", db)


@router.get("/pipeline/stats")
def get_pipeline_stats(db: Session = Depends(get_db)):
    leads = db.query(Lead).all()
    total = len(leads)
    contacted = [l for l in leads if l.status in ("contacted", "proposal_sent", "negotiating", "closed_won")]
    proposals = [l for l in leads if l.status in ("proposal_sent", "negotiating", "closed_won")]
    won = [l for l in leads if l.status == "closed_won"]
    lost = [l for l in leads if l.status == "closed_lost"]
    active = [l for l in leads if l.status not in ("closed_won", "closed_lost")]

    total_potential = sum(l.estimated_price or 0 for l in active)
    won_revenue = sum(l.estimated_price or 0 for l in won)
    conversion = round(len(won) / total * 100, 1) if total > 0 else 0

    next_action = "Нет лидов — добавьте первого через 'Find Real Leads'"
    if active:
        new_leads = [l for l in active if l.status == "new"]
        if new_leads:
            next_action = f"Отправить outreach {new_leads[0].name} (статус: new)"
        proposal_leads = [l for l in active if l.status == "contacted"]
        if proposal_leads:
            next_action = f"Отправить КП для {proposal_leads[0].name}"

    import os
    real_leads_count = db.query(Lead).filter(Lead.is_demo != 1).count()
    tg_token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    telegram_connected = bool(tg_token and tg_token != "your_bot_token_here")

    return {
        "total_leads": total,
        "real_leads": real_leads_count,
        "real_leads_count": real_leads_count,
        "active_leads": len(active),
        "contacted": len(contacted),
        "proposals_sent": len(proposals),
        "won_deals": len(won),
        "lost_deals": len(lost),
        "total_potential_revenue": total_potential,
        "won_revenue": won_revenue,
        "conversion_rate": conversion,
        "next_best_action": next_action,
        "telegram_connected": telegram_connected,
    }
