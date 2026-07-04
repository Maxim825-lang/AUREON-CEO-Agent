"""
Sales Agent Router — Real outreach, pipeline management, inbox, autonomy settings.
All outreach messages include AI disclosure per founder_style.md.
"""

import csv
import io
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
from models import Lead, SalesConversation, SalesMessage, SalesSettings, ActionLog, TelegramUser
from schemas import (
    SalesSettingsSchema, SalesSettingsUpdate, SalesConversationSchema,
    SalesMessageSchema, ImportLeadsRequest, ImportUsernamesRequest, AddInboundRequest,
)
from services.sales_agent import (
    generate_outreach_message, generate_reply_suggestion,
    count_sent_today, already_contacted, contains_forbidden,
)
from services.telegram_sender import send_dm, can_send

router = APIRouter(prefix="/api/sales", tags=["sales"])


# ── Settings ──────────────────────────────────────────────────────────────────

def _get_or_create_settings(db: Session) -> SalesSettings:
    s = db.query(SalesSettings).first()
    if not s:
        s = SalesSettings()
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.get("/settings", response_model=SalesSettingsSchema)
def get_sales_settings(db: Session = Depends(get_db)):
    return _get_or_create_settings(db)


@router.put("/settings", response_model=SalesSettingsSchema)
def update_sales_settings(data: SalesSettingsUpdate, db: Session = Depends(get_db)):
    s = _get_or_create_settings(db)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


# ── Lead Import ───────────────────────────────────────────────────────────────

@router.post("/import-leads")
def import_leads(request: ImportLeadsRequest, db: Session = Depends(get_db)):
    created = []
    skipped = 0
    for row in request.leads:
        name = (row.get("name") or "").strip()
        telegram = (row.get("telegram") or "").strip()
        if not name and not telegram:
            skipped += 1
            continue
        if not name:
            name = telegram
        existing = db.query(Lead).filter(Lead.telegram == telegram).first() if telegram else None
        if existing:
            skipped += 1
            continue
        lead = Lead(
            name=name,
            telegram=telegram,
            niche=row.get("niche") or "",
            company=row.get("company") or "",
            problem=row.get("problem") or "",
            estimated_price=float(row.get("estimated_price") or 0),
            source_url=row.get("source_url") or "",
            platform=row.get("platform") or "telegram",
            status="found",
            is_demo=0,
        )
        db.add(lead)
        db.flush()
        created.append({"id": lead.id, "name": lead.name, "telegram": lead.telegram})

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Импорт лидов",
        result=f"Добавлено: {len(created)}, пропущено: {skipped}",
        status="success",
    ))
    db.commit()
    return {"imported": len(created), "skipped": skipped, "leads": created}


@router.post("/import-usernames")
def import_usernames(request: ImportUsernamesRequest, db: Session = Depends(get_db)):
    lines = [l.strip() for l in request.usernames.splitlines() if l.strip()]
    created = []
    skipped = 0
    for username in lines:
        if not username.startswith("@"):
            username = "@" + username
        existing = db.query(Lead).filter(Lead.telegram == username).first()
        if existing:
            skipped += 1
            continue
        lead = Lead(
            name=username,
            telegram=username,
            niche=request.niche or "general",
            platform="telegram",
            source_url=request.source or "manual",
            status="found",
            is_demo=0,
        )
        db.add(lead)
        db.flush()
        created.append({"id": lead.id, "telegram": username})

    db.add(ActionLog(
        agent="Sales Agent",
        action="Импорт username'ов",
        result=f"Добавлено: {len(created)}, пропущено: {skipped}",
        status="success",
    ))
    db.commit()
    return {"imported": len(created), "skipped": skipped, "leads": created}


@router.post("/import-csv")
async def import_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except Exception:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    leads_data = []
    for row in reader:
        leads_data.append({k.strip().lower(): v.strip() for k, v in row.items()})

    created = []
    skipped = 0
    for row in leads_data:
        name = row.get("name") or row.get("имя") or row.get("название") or ""
        telegram = row.get("telegram") or row.get("username") or row.get("юзернейм") or ""
        if not name and not telegram:
            skipped += 1
            continue
        if not name:
            name = telegram
        if telegram and not telegram.startswith("@") and not telegram.lstrip("-").isdigit():
            telegram = "@" + telegram
        existing = db.query(Lead).filter(Lead.telegram == telegram).first() if telegram else None
        if existing:
            skipped += 1
            continue
        try:
            price = float(row.get("price") or row.get("estimated_price") or row.get("цена") or 0)
        except Exception:
            price = 0.0
        lead = Lead(
            name=name,
            telegram=telegram,
            niche=row.get("niche") or row.get("ниша") or "",
            company=row.get("company") or row.get("компания") or "",
            problem=row.get("problem") or row.get("проблема") or "",
            estimated_price=price,
            source_url=row.get("source_url") or row.get("url") or "",
            email=row.get("email") or "",
            platform=row.get("platform") or "telegram",
            status="found",
            is_demo=0,
        )
        db.add(lead)
        db.flush()
        created.append({"id": lead.id, "name": lead.name})

    db.add(ActionLog(
        agent="Sales Agent",
        action="CSV импорт лидов",
        result=f"Файл: {file.filename}, добавлено: {len(created)}, пропущено: {skipped}",
        status="success",
    ))
    db.commit()
    return {"imported": len(created), "skipped": skipped}


# ── Outreach ──────────────────────────────────────────────────────────────────

@router.post("/generate-outreach/{lead_id}")
def generate_outreach(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    message = generate_outreach_message(
        name=lead.name or "",
        niche=lead.niche or "",
        problem=lead.problem or "",
        offer=lead.aureon_offer or "",
        price=lead.estimated_price,
    )

    lead.last_message = message
    if lead.status in ("found", "new"):
        lead.status = "outreach_ready"
    db.commit()

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Outreach сгенерирован: {lead.name}",
        result="Сообщение готово к отправке",
        status="success",
    ))
    db.commit()

    return {"lead_id": lead_id, "message": message, "status": "outreach_ready"}


@router.post("/send-outreach/{lead_id}")
def send_outreach(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    settings = _get_or_create_settings(db)

    def diag_error(reason: str, telegram_error: str = "") -> JSONResponse:
        return JSONResponse(status_code=400, content={
            "status": "error",
            "reason": reason,
            "lead_id": lead_id,
            "username": lead.telegram or "",
            "telegram_chat_id": getattr(lead, "telegram_chat_id", None) or "",
            "telegram_error": telegram_error,
        })

    if not settings.real_sales_mode:
        return diag_error("real_sales_mode_off")

    if already_contacted(lead_id, db):
        return diag_error("already_contacted")

    sent_today = count_sent_today(db)
    if sent_today >= settings.daily_limit:
        raise HTTPException(429, f"Daily limit reached ({settings.daily_limit}/day). Try tomorrow.")

    message = lead.last_message
    if not message:
        message = generate_outreach_message(
            name=lead.name or "",
            niche=lead.niche or "",
            problem=lead.problem or "",
            offer=lead.aureon_offer or "",
            price=lead.estimated_price,
        )

    if not message or not message.strip():
        return diag_error("empty_message")

    if contains_forbidden(message, settings.forbidden_words or []):
        return diag_error("forbidden_words")

    # Auto-resolve chat_id from TelegramUser if lead has username but no chat_id
    if not lead.telegram_chat_id and lead.telegram:
        username_clean = lead.telegram.lstrip("@")
        tg_user = db.query(TelegramUser).filter(
            (TelegramUser.username == username_clean) | (TelegramUser.username == lead.telegram)
        ).first()
        if tg_user:
            lead.telegram_chat_id = tg_user.chat_id
            db.commit()

    chat_id = getattr(lead, "telegram_chat_id", None) or ""

    if not chat_id:
        return diag_error("missing_chat_id")

    if not settings.telegram_bot_token:
        return diag_error("missing_bot_token")

    send_result = send_dm(settings.telegram_bot_token, chat_id, message)
    if not send_result.get("ok"):
        return diag_error("telegram_api_error", send_result.get("error", "unknown"))

    conv = db.query(SalesConversation).filter(SalesConversation.lead_id == lead_id).first()
    if not conv:
        conv = SalesConversation(lead_id=lead_id, platform=lead.platform or "telegram")
        db.add(conv)
        db.flush()

    db.add(SalesMessage(
        conversation_id=conv.id,
        lead_id=lead_id,
        direction="outbound",
        content=message,
        platform=lead.platform or "telegram",
        sent=True,
        sent_at=datetime.utcnow(),
        telegram_message_id=send_result.get("telegram_message_id"),
    ))

    lead.status = "contacted"
    lead.last_message = message

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Outreach отправлен: {lead.name}",
        result="отправлено в Telegram",
        status="success",
    ))
    db.commit()

    return {
        "lead_id": lead_id,
        "conversation_id": conv.id,
        "sent_via_telegram": True,
        "delivery": "отправлено в Telegram",
        "message": message,
    }


# ── Inbox ─────────────────────────────────────────────────────────────────────

@router.get("/inbox")
def get_inbox(db: Session = Depends(get_db)):
    convs = db.query(SalesConversation).order_by(SalesConversation.updated_at.desc()).all()
    result = []
    for conv in convs:
        lead = db.query(Lead).filter(Lead.id == conv.lead_id).first()
        messages = (
            db.query(SalesMessage)
            .filter(SalesMessage.conversation_id == conv.id)
            .order_by(SalesMessage.created_at.asc())
            .all()
        )
        unread = sum(1 for m in messages if m.direction == "inbound")
        last_msg = messages[-1] if messages else None
        result.append({
            "conversation_id": conv.id,
            "lead_id": conv.lead_id,
            "lead_name": lead.name if lead else "Unknown",
            "lead_telegram": lead.telegram if lead else "",
            "lead_niche": lead.niche if lead else "",
            "status": conv.status,
            "platform": conv.platform,
            "unread_inbound": unread,
            "last_message": last_msg.content if last_msg else "",
            "last_message_direction": last_msg.direction if last_msg else "",
            "last_message_at": last_msg.created_at.isoformat() if last_msg and last_msg.created_at else None,
            "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
            "messages": [
                {
                    "id": m.id,
                    "direction": m.direction,
                    "content": m.content,
                    "sent": m.sent,
                    "created_at": m.created_at.isoformat() if m.created_at else None,
                }
                for m in messages
            ],
        })
    return result


@router.post("/conversations/{lead_id}/add-inbound")
def add_inbound_message(lead_id: int, request: AddInboundRequest, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    conv = db.query(SalesConversation).filter(SalesConversation.lead_id == lead_id).first()
    if not conv:
        conv = SalesConversation(lead_id=lead_id, platform=request.platform)
        db.add(conv)
        db.flush()

    msg = SalesMessage(
        conversation_id=conv.id,
        lead_id=lead_id,
        direction="inbound",
        content=request.content,
        platform=request.platform,
        sent=True,
        sent_at=datetime.utcnow(),
    )
    db.add(msg)

    conv.last_inbound_at = datetime.utcnow()
    if lead.status == "contacted":
        lead.status = "replied"

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Входящее от {lead.name}",
        result=f"Получен ответ: {request.content[:60]}...",
        status="success",
    ))
    db.commit()

    return {"ok": True, "conversation_id": conv.id, "message_id": msg.id}


@router.post("/generate-reply/{conversation_id}")
def generate_reply(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(SalesConversation).filter(SalesConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    lead = db.query(Lead).filter(Lead.id == conv.lead_id).first()
    messages = (
        db.query(SalesMessage)
        .filter(SalesMessage.conversation_id == conversation_id)
        .order_by(SalesMessage.created_at.asc())
        .all()
    )

    settings = _get_or_create_settings(db)
    history = [{"direction": m.direction, "content": m.content} for m in messages]
    lead_dict = {
        "name": lead.name if lead else "",
        "niche": lead.niche if lead else "",
        "estimated_price": lead.estimated_price if lead else 0,
    }
    settings_dict = {"min_price": settings.min_price, "max_discount": settings.max_discount}

    reply = generate_reply_suggestion(history, lead_dict, settings_dict)

    return {"conversation_id": conversation_id, "suggested_reply": reply}


@router.post("/send-reply/{conversation_id}")
def send_reply(conversation_id: int, content: str, db: Session = Depends(get_db)):
    conv = db.query(SalesConversation).filter(SalesConversation.id == conversation_id).first()
    if not conv:
        raise HTTPException(404, "Conversation not found")

    lead = db.query(Lead).filter(Lead.id == conv.lead_id).first()
    settings = _get_or_create_settings(db)

    if contains_forbidden(content, settings.forbidden_words or []):
        raise HTTPException(400, "Message contains forbidden words.")

    telegram_sent = False
    send_result = {"ok": False}
    chat_id = getattr(lead, "telegram_chat_id", None) or "" if lead else ""
    if settings.telegram_bot_token and chat_id:
        send_result = send_dm(settings.telegram_bot_token, chat_id, content)
        telegram_sent = send_result.get("ok", False)

    msg = SalesMessage(
        conversation_id=conversation_id,
        lead_id=conv.lead_id,
        direction="outbound",
        content=content,
        platform=conv.platform,
        sent=True,
        sent_at=datetime.utcnow(),
        telegram_message_id=send_result.get("telegram_message_id"),
    )
    db.add(msg)

    if lead and lead.status == "replied":
        lead.status = "qualified"

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Ответ отправлен: {lead.name if lead else conv.lead_id}",
        result="via Telegram" if telegram_sent else "сохранено (ручная отправка)",
        status="success",
    ))
    db.commit()

    return {
        "conversation_id": conversation_id,
        "sent_via_telegram": telegram_sent,
        "message": content,
    }


# ── Pipeline ──────────────────────────────────────────────────────────────────

PIPELINE_STATUSES = [
    "found", "outreach_ready", "contacted", "replied",
    "qualified", "proposal_sent", "meeting_scheduled", "won", "lost",
]

STATUS_PROBABILITY = {
    "found": 0.05,
    "outreach_ready": 0.08,
    "contacted": 0.12,
    "replied": 0.20,
    "qualified": 0.35,
    "proposal_sent": 0.50,
    "meeting_scheduled": 0.70,
    "won": 1.0,
    "lost": 0.0,
}


@router.get("/pipeline")
def get_pipeline(db: Session = Depends(get_db)):
    all_leads = db.query(Lead).filter(Lead.is_demo != 1).all()
    columns = {s: [] for s in PIPELINE_STATUSES}

    for lead in all_leads:
        status = lead.status
        if status in ("new",):
            status = "found"
        elif status in ("closed_won",):
            status = "won"
        elif status in ("closed_lost",):
            status = "lost"
        elif status in ("negotiating",):
            status = "qualified"
        if status not in columns:
            status = "found"
        columns[status].append({
            "id": lead.id,
            "name": lead.name,
            "company": lead.company or "",
            "niche": lead.niche or "",
            "telegram": lead.telegram or "",
            "estimated_price": lead.estimated_price or 0,
            "status": status,
            "last_message": (lead.last_message or "")[:80],
        })

    total_revenue_weighted = 0
    for status, leads in columns.items():
        prob = STATUS_PROBABILITY.get(status, 0)
        total_revenue_weighted += sum(l["estimated_price"] for l in leads) * prob

    won_revenue = sum(l["estimated_price"] for l in columns.get("won", []))

    return {
        "columns": columns,
        "stats": {
            "total_leads": len(all_leads),
            "won": len(columns.get("won", [])),
            "lost": len(columns.get("lost", [])),
            "active": len([l for l in all_leads if l.status not in ("won", "lost", "closed_won", "closed_lost")]),
            "won_revenue": won_revenue,
            "weighted_forecast": round(total_revenue_weighted),
        },
    }


# ── Auto Sales Loop ────────────────────────────────────────────────────────────

@router.post("/generate-all-ready")
def generate_all_ready(db: Session = Depends(get_db)):
    """Generate outreach messages for all found/new leads. Sets status to outreach_ready."""
    leads = (
        db.query(Lead)
        .filter(Lead.status.in_(["found", "new"]), Lead.is_demo != 1)
        .all()
    )

    generated = []
    skipped = []
    for lead in leads:
        if already_contacted(lead.id, db):
            skipped.append(lead.name)
            continue
        message = generate_outreach_message(
            name=lead.name or "",
            niche=lead.niche or "",
            problem=lead.problem or "",
            offer=lead.aureon_offer or "",
            price=lead.estimated_price,
        )
        lead.last_message = message
        lead.status = "outreach_ready"
        generated.append({"id": lead.id, "name": lead.name})

    db.add(ActionLog(
        agent="Sales Agent",
        action="Batch generate outreach",
        result=f"Сгенерировано: {len(generated)}, пропущено (уже контактировали): {len(skipped)}",
        status="success",
    ))
    db.commit()

    return {
        "generated_count": len(generated),
        "skipped_count": len(skipped),
        "leads": generated,
    }


@router.post("/auto-send-ready")
def auto_send_ready(db: Session = Depends(get_db)):
    """Send to outreach_ready leads with chat_id. Leads without chat_id stay outreach_ready (manual send required)."""
    settings = _get_or_create_settings(db)

    if not settings.real_sales_mode:
        return {"ok": False, "message": "Real Sales Mode is OFF", "sent_count": 0, "manual_required_count": 0}

    sent_today = count_sent_today(db)
    remaining = settings.daily_limit - sent_today
    if remaining <= 0:
        return {"ok": False, "message": f"Daily limit reached ({settings.daily_limit}/day)", "sent_count": 0, "manual_required_count": 0}

    ready_leads = (
        db.query(Lead)
        .filter(Lead.status == "outreach_ready", Lead.is_demo != 1)
        .limit(remaining)
        .all()
    )

    sent = []
    manual_required = []
    skipped = []

    for lead in ready_leads:
        if already_contacted(lead.id, db):
            skipped.append(lead.name)
            continue

        message = lead.last_message or generate_outreach_message(
            name=lead.name or "",
            niche=lead.niche or "",
            problem=lead.problem or "",
            offer=lead.aureon_offer or "",
            price=lead.estimated_price,
        )
        lead.last_message = message

        if contains_forbidden(message, settings.forbidden_words or []):
            skipped.append(lead.name)
            continue

        conv = db.query(SalesConversation).filter(SalesConversation.lead_id == lead.id).first()
        if not conv:
            conv = SalesConversation(lead_id=lead.id, platform=lead.platform or "telegram")
            db.add(conv)
            db.flush()

        chat_id = getattr(lead, "telegram_chat_id", None) or ""
        telegram_sent = False
        send_result = {"ok": False}

        if settings.telegram_bot_token and chat_id:
            send_result = send_dm(settings.telegram_bot_token, chat_id, message)
            telegram_sent = send_result.get("ok", False)

        db.add(SalesMessage(
            conversation_id=conv.id,
            lead_id=lead.id,
            direction="outbound",
            content=message,
            platform=lead.platform or "telegram",
            sent=True,
            sent_at=datetime.utcnow(),
            telegram_message_id=send_result.get("telegram_message_id"),
        ))

        if telegram_sent:
            lead.status = "contacted"
            sent.append({"id": lead.id, "name": lead.name})
        else:
            # No chat_id or send failed — keep outreach_ready for manual send
            reason = "no_chat_id" if not chat_id else "telegram_error"
            manual_required.append({"id": lead.id, "name": lead.name, "reason": reason})

    db.add(ActionLog(
        agent="Sales Agent",
        action="Auto-send outreach",
        result=f"Отправлено: {len(sent)}, ручная отправка: {len(manual_required)}, пропущено: {len(skipped)}",
        status="success",
    ))
    db.commit()

    return {
        "ok": True,
        "sent_count": len(sent),
        "manual_required_count": len(manual_required),
        "skipped_count": len(skipped),
        "daily_limit": settings.daily_limit,
        "sent_today_total": sent_today + len(sent),
        "leads_sent": sent,
        "manual_required": manual_required,
    }


@router.post("/sync-chat-ids")
def sync_chat_ids(db: Session = Depends(get_db)):
    """Match leads by telegram username to TelegramUser and fill telegram_chat_id."""
    leads = db.query(Lead).filter(
        Lead.telegram != None,
        Lead.telegram != "",
        Lead.telegram_chat_id == None,
        Lead.is_demo != 1,
    ).all()

    updated = []
    not_found = []

    for lead in leads:
        username_clean = lead.telegram.lstrip("@")
        tg_user = db.query(TelegramUser).filter(
            TelegramUser.username == username_clean
        ).first()
        if tg_user:
            lead.telegram_chat_id = tg_user.chat_id
            updated.append({"id": lead.id, "name": lead.name, "telegram": lead.telegram, "chat_id": tg_user.chat_id})
        else:
            not_found.append({"id": lead.id, "name": lead.name, "telegram": lead.telegram})

    db.add(ActionLog(
        agent="Sales Agent",
        action="Sync Chat IDs",
        result=f"Обновлено: {len(updated)}, не найдено в TelegramUser: {len(not_found)}",
        status="success",
    ))
    db.commit()

    return {
        "ok": True,
        "updated_count": len(updated),
        "not_found_count": len(not_found),
        "updated": updated,
        "not_found": not_found,
    }


@router.post("/reset-lead/{lead_id}")
def reset_lead_status(lead_id: int, db: Session = Depends(get_db)):
    """Reset a lead back to 'found' and clear conversation history for re-testing."""
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if not lead:
        raise HTTPException(404, "Lead not found")

    old_status = lead.status

    # Clear conversation history so already_contacted check passes
    convs = db.query(SalesConversation).filter(SalesConversation.lead_id == lead_id).all()
    for conv in convs:
        db.query(SalesMessage).filter(SalesMessage.conversation_id == conv.id).delete()
    db.query(SalesConversation).filter(SalesConversation.lead_id == lead_id).delete()

    lead.status = "found"
    lead.last_message = None

    db.add(ActionLog(
        agent="Sales Agent",
        action=f"Reset lead: {lead.name}",
        result=f"Статус сброшен: {old_status} → found, история очищена",
        status="success",
    ))
    db.commit()

    return {"lead_id": lead_id, "old_status": old_status, "new_status": "found", "history_cleared": True}


@router.post("/auto-run")
def auto_run(db: Session = Depends(get_db)):
    """Full loop: generate for found leads, then send to ready leads. Returns full stats."""
    settings = _get_or_create_settings(db)

    if not settings.real_sales_mode:
        return {"ok": False, "message": "Real Sales Mode is OFF", "generated_count": 0, "sent_count": 0, "manual_required_count": 0}
    if not settings.auto_send_first:
        return {"ok": False, "message": "Auto Send First Message is OFF", "generated_count": 0, "sent_count": 0, "manual_required_count": 0}

    sent_today = count_sent_today(db)
    remaining = settings.daily_limit - sent_today
    if remaining <= 0:
        return {"ok": False, "message": f"Daily limit reached ({settings.daily_limit}/day)", "generated_count": 0, "sent_count": 0, "manual_required_count": 0}

    # Phase 1: generate for found/new leads
    found_leads = (
        db.query(Lead)
        .filter(Lead.status.in_(["found", "new"]), Lead.is_demo != 1)
        .all()
    )
    generated = 0
    for lead in found_leads:
        if already_contacted(lead.id, db):
            continue
        lead.last_message = generate_outreach_message(
            name=lead.name or "",
            niche=lead.niche or "",
            problem=lead.problem or "",
            offer=lead.aureon_offer or "",
            price=lead.estimated_price,
        )
        lead.status = "outreach_ready"
        generated += 1
    db.commit()

    # Phase 2: send to outreach_ready leads
    ready_leads = (
        db.query(Lead)
        .filter(Lead.status == "outreach_ready", Lead.is_demo != 1)
        .limit(remaining)
        .all()
    )

    sent = []
    manual_required = []
    skipped = []

    for lead in ready_leads:
        if already_contacted(lead.id, db):
            skipped.append(lead.name)
            continue

        message = lead.last_message or generate_outreach_message(
            name=lead.name or "",
            niche=lead.niche or "",
            problem=lead.problem or "",
            offer=lead.aureon_offer or "",
            price=lead.estimated_price,
        )

        if contains_forbidden(message, settings.forbidden_words or []):
            skipped.append(lead.name)
            continue

        conv = db.query(SalesConversation).filter(SalesConversation.lead_id == lead.id).first()
        if not conv:
            conv = SalesConversation(lead_id=lead.id, platform=lead.platform or "telegram")
            db.add(conv)
            db.flush()

        chat_id = getattr(lead, "telegram_chat_id", None) or ""
        telegram_sent = False
        send_result = {"ok": False}
        if settings.telegram_bot_token and chat_id:
            send_result = send_dm(settings.telegram_bot_token, chat_id, message)
            telegram_sent = send_result.get("ok", False)

        db.add(SalesMessage(
            conversation_id=conv.id,
            lead_id=lead.id,
            direction="outbound",
            content=message,
            platform=lead.platform or "telegram",
            sent=True,
            sent_at=datetime.utcnow(),
            telegram_message_id=send_result.get("telegram_message_id"),
        ))

        if telegram_sent:
            lead.status = "contacted"
            sent.append({"id": lead.id, "name": lead.name, "telegram_sent": True})
        else:
            reason = "no_chat_id" if not chat_id else "telegram_error"
            manual_required.append({"id": lead.id, "name": lead.name, "reason": reason})

    db.add(ActionLog(
        agent="Sales Agent",
        action="Auto-run Sales Loop",
        result=f"Сгенерировано: {generated}, отправлено: {len(sent)}, ручная отправка: {len(manual_required)}, пропущено: {len(skipped)}",
        status="success",
    ))
    db.commit()

    return {
        "ok": True,
        "generated_count": generated,
        "sent_count": len(sent),
        "manual_required_count": len(manual_required),
        "skipped_count": len(skipped),
        "daily_limit": settings.daily_limit,
        "sent_today_total": sent_today + len(sent),
        "leads_sent": sent,
        "manual_required": manual_required,
    }
