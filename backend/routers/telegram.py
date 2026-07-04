from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models import ContentPost, Lead, TelegramUser, ActionLog
from services import telegram_service
from services import telegram_bot as bot_svc

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.post("/test")
def test_telegram():
    try:
        result = telegram_service.test_connection()
        return {"status": "ok", "username": result["username"], "name": result["name"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")


@router.post("/publish-latest-post")
def publish_latest_post(db: Session = Depends(get_db)):
    post = (
        db.query(ContentPost)
        .filter(ContentPost.status.in_(["ready", "draft"]))
        .order_by(ContentPost.id.desc())
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Нет постов со статусом ready или draft")

    text = f"<b>{post.title}</b>\n\n{post.content or ''}"
    try:
        telegram_service.send_message(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")

    post.status = "published"
    db.commit()
    return {"status": "published", "post_id": post.id, "title": post.title}


@router.post("/publish-post/{post_id}")
def publish_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Пост уже опубликован")

    text = f"<b>{post.title}</b>\n\n{post.content or ''}"
    try:
        telegram_service.send_message(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")

    post.status = "published"
    db.commit()
    return {"status": "published", "post_id": post.id, "title": post.title}


@router.get("/status")
def telegram_status():
    return {"configured": telegram_service.is_configured()}


@router.get("/get-updates")
def get_updates():
    try:
        return telegram_service.get_updates()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")


@router.get("/sync-updates")
def sync_updates(db: Session = Depends(get_db)):
    """Fetch getUpdates from Telegram, save all users to TelegramUser and link to Leads."""
    from datetime import datetime
    try:
        raw = telegram_service.get_updates(limit=100)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")

    saved = []
    linked = []

    for upd in raw.get("updates", []):
        chat_id = upd.get("chat_id", "")
        username = upd.get("username", "")
        first_name = upd.get("first_name", "")
        last_name = upd.get("last_name", "")
        if not chat_id:
            continue

        user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
        if user:
            if username:
                user.username = username
            if first_name:
                user.first_name = first_name
            if last_name:
                user.last_name = last_name
            user.last_seen_at = datetime.utcnow()
        else:
            user = TelegramUser(
                chat_id=chat_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
            )
            db.add(user)
            saved.append({"chat_id": chat_id, "username": username})

        # Auto-link Lead by username
        if username:
            lead = db.query(Lead).filter(
                (Lead.telegram == f"@{username}") | (Lead.telegram == username)
            ).first()
            if lead and not lead.telegram_chat_id:
                lead.telegram_chat_id = chat_id
                linked.append({"lead_id": lead.id, "name": lead.name, "chat_id": chat_id})

    db.commit()
    return {
        "ok": True,
        "updates_checked": raw.get("count", 0),
        "users_saved": len(saved),
        "leads_linked": len(linked),
        "new_users": saved,
        "linked_leads": linked,
    }


class ImportChatIdRequest(BaseModel):
    chat_id: str
    username: str = ""
    first_name: str = ""
    last_name: str = ""


# ── Bot Endpoints ─────────────────────────────────────────────────────────────

@router.post("/webhook")
async def webhook(request: Request):
    """Receive updates from Telegram webhook (production mode)."""
    try:
        update = await request.json()
        bot_svc.process_update(update)
    except Exception as e:
        pass
    return {"ok": True}


@router.get("/bot-status")
def bot_status():
    return bot_svc.get_bot_status()


@router.get("/bot-users")
def bot_users(db: Session = Depends(get_db)):
    users = (
        db.query(TelegramUser)
        .order_by(TelegramUser.last_seen_at.desc())
        .all()
    )
    return [
        {
            "id": u.id,
            "chat_id": u.chat_id,
            "username": u.username or "",
            "first_name": u.first_name or "",
            "last_name": u.last_name or "",
            "is_admin": u.is_admin,
            "registered_at": u.registered_at.isoformat() if u.registered_at else None,
            "last_seen_at": u.last_seen_at.isoformat() if u.last_seen_at else None,
            "command_count": u.command_count or 0,
            "last_command": u.last_command or "",
        }
        for u in users
    ]


@router.get("/bot-actions")
def bot_actions(limit: int = 20, db: Session = Depends(get_db)):
    logs = (
        db.query(ActionLog)
        .filter(ActionLog.agent == "Telegram Bot")
        .order_by(ActionLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "action": l.action,
            "result": l.result,
            "status": l.status,
            "created_at": l.created_at.isoformat() if l.created_at else None,
        }
        for l in logs
    ]


@router.post("/start-bot")
def start_bot():
    result = bot_svc.start_polling()
    return result


@router.post("/stop-bot")
def stop_bot():
    result = bot_svc.stop_polling()
    return result


# ── CEO Reports Endpoints ─────────────────────────────────────────────────────

@router.get("/report-status")
def report_status(db: Session = Depends(get_db)):
    from services.report_service import get_report_status
    return get_report_status(db)


@router.post("/send-report")
def send_report_now(db: Session = Depends(get_db)):
    from services.report_service import send_ceo_report_to_founder
    result = send_ceo_report_to_founder(db, "Manual")
    return result


@router.post("/reports-toggle")
def toggle_reports(enabled: bool, db: Session = Depends(get_db)):
    from services.report_service import set_reports_enabled
    set_reports_enabled(enabled)
    return {"ok": True, "enabled": enabled}


class SetWebhookRequest(BaseModel):
    webhook_url: str


@router.post("/set-webhook")
def set_webhook_endpoint(data: SetWebhookRequest):
    if not data.webhook_url.startswith("https://"):
        raise HTTPException(400, "Webhook URL must be HTTPS")
    result = bot_svc.set_webhook(data.webhook_url + "/api/telegram/webhook")
    if not result.get("ok"):
        raise HTTPException(502, result.get("description", "Failed to set webhook"))
    return {"ok": True, "webhook_url": data.webhook_url + "/api/telegram/webhook"}


@router.post("/import-chat-id")
def import_chat_id(data: ImportChatIdRequest, db: Session = Depends(get_db)):
    if not data.chat_id:
        raise HTTPException(status_code=400, detail="chat_id обязателен")

    lead = None
    if data.username:
        username_clean = data.username.lstrip("@")
        lead = db.query(Lead).filter(
            (Lead.telegram == f"@{username_clean}") | (Lead.telegram == username_clean)
        ).first()

    if lead:
        lead.telegram_chat_id = data.chat_id
        db.commit()
        return {"status": "updated", "lead_id": lead.id, "name": lead.name, "chat_id": data.chat_id}

    display_name = " ".join(filter(None, [data.first_name, data.last_name])) or data.chat_id
    telegram_handle = f"@{data.username}" if data.username else ""
    new_lead = Lead(
        name=display_name,
        telegram=telegram_handle,
        telegram_chat_id=data.chat_id,
        platform="Telegram",
        status="new",
        is_demo=0,
    )
    db.add(new_lead)
    db.commit()
    db.refresh(new_lead)
    return {"status": "created", "lead_id": new_lead.id, "name": new_lead.name, "chat_id": data.chat_id}
