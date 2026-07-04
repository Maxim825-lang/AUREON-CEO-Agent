"""
Telegram Bot Mode — AUREON CEO Agent second interface.
Supports polling (local) and webhook (production/Render).
Bot always identifies as AI-representative of AUREON, never as the founder.
"""

import os
import time
import logging
import threading
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)

_bot_thread: threading.Thread | None = None
_bot_running = False
_bot_state = {
    "mode": None,
    "running": False,
    "started_at": None,
    "updates_processed": 0,
    "last_update_at": None,
    "error": None,
}


# ── Telegram API helpers ──────────────────────────────────────────────────────

def _token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "").strip()


def _tg(method: str, **params) -> dict:
    token = _token()
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set")
    url = f"https://api.telegram.org/bot{token}/{method}"
    with httpx.Client(timeout=35) as client:
        resp = client.post(url, json={k: v for k, v in params.items() if v is not None})
    return resp.json()


def _send(chat_id, text: str, keyboard=None, parse_mode="HTML") -> None:
    try:
        params = {"chat_id": str(chat_id), "text": text, "parse_mode": parse_mode}
        if keyboard:
            params["reply_markup"] = keyboard
        _tg("sendMessage", **params)
    except Exception as e:
        logger.error(f"Bot send error to {chat_id}: {e}")


# ── Keyboards ─────────────────────────────────────────────────────────────────

def _main_kb():
    return {
        "inline_keyboard": [
            [
                {"text": "⚡ Run CEO Cycle", "callback_data": "run_cycle"},
                {"text": "✍️ Generate Post", "callback_data": "generate_post"},
            ],
            [
                {"text": "📢 Publish to Channel", "callback_data": "publish"},
                {"text": "🔍 Show Leads", "callback_data": "show_leads"},
            ],
            [
                {"text": "💬 Generate Outreach", "callback_data": "generate_outreach"},
                {"text": "📊 Sales Pipeline", "callback_data": "show_pipeline"},
            ],
            [
                {"text": "📈 Daily Report", "callback_data": "daily_report"},
                {"text": "💡 Next Action", "callback_data": "next_action"},
            ],
        ]
    }


# ── DB helpers ────────────────────────────────────────────────────────────────

def _new_db():
    from database import SessionLocal
    return SessionLocal()


def _log(db, action: str, result: str, status: str = "success"):
    try:
        from models import ActionLog
        db.add(ActionLog(agent="Telegram Bot", action=action, result=result, status=status))
        db.commit()
    except Exception:
        pass


def _ensure_user(db, chat_id: str, from_user: dict, command: str):
    """Upsert TelegramUser on any message and sync chat_id to matching Lead."""
    try:
        from models import TelegramUser, Lead
        username = from_user.get("username") or ""
        first_name = from_user.get("first_name") or ""
        last_name = from_user.get("last_name") or ""

        u = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
        if u:
            if username:
                u.username = username
            if first_name:
                u.first_name = first_name
            if last_name:
                u.last_name = last_name
            u.last_seen_at = datetime.utcnow()
            u.command_count = (u.command_count or 0) + 1
            u.last_command = command
        else:
            u = TelegramUser(
                chat_id=chat_id,
                username=username,
                first_name=first_name,
                last_name=last_name,
                command_count=1,
                last_command=command,
            )
            db.add(u)

        # Auto-link matching Lead by username
        if username:
            lead = db.query(Lead).filter(
                (Lead.telegram == f"@{username}") | (Lead.telegram == username)
            ).first()
            if lead and not lead.telegram_chat_id:
                lead.telegram_chat_id = chat_id

        db.commit()
    except Exception:
        pass


# ── Command Handlers ──────────────────────────────────────────────────────────

def _cmd_start(chat_id: str, from_user: dict, db):
    from models import TelegramUser
    username = from_user.get("username") or ""
    first_name = from_user.get("first_name") or ""
    last_name = from_user.get("last_name") or ""

    user = db.query(TelegramUser).filter(TelegramUser.chat_id == chat_id).first()
    if user:
        user.username = username
        user.first_name = first_name
        user.last_name = last_name
        user.last_seen_at = datetime.utcnow()
        user.command_count = (user.command_count or 0) + 1
        user.last_command = "/start"
        is_new = False
    else:
        user = TelegramUser(
            chat_id=chat_id,
            username=username,
            first_name=first_name,
            last_name=last_name,
            command_count=1,
            last_command="/start",
        )
        db.add(user)
        is_new = True
    db.commit()

    name = first_name or username or "CEO"
    greeting = "Добро пожаловать" if is_new else "С возвращением"
    text = (
        f"👋 {greeting}, {name}!\n\n"
        f"Я <b>AI-представитель AUREON</b> — ваш CEO Agent в Telegram.\n\n"
        f"✅ Ваш chat_id <code>{chat_id}</code> сохранён.\n"
        f"Теперь система может отправлять вам уведомления.\n\n"
        f"Выберите действие:"
    )
    _send(chat_id, text, keyboard=_main_kb())
    _log(db, "/start", f"@{username} ({first_name}) {'зарегистрирован' if is_new else 'обновлён'}, chat_id: {chat_id}")


def _cmd_status(chat_id: str, db):
    from models import Settings, StrategyState, Task, Agent
    from services.strategy_engine import days_until_waic

    settings = db.query(Settings).first()
    strategy = db.query(StrategyState).first()
    active = db.query(Agent).filter(Agent.status == "active").count()
    pending = db.query(Task).filter(Task.status == "pending").count()
    done = db.query(Task).filter(Task.status == "completed").count()

    text = (
        f"<b>AUREON CEO Agent — Status</b>\n\n"
        f"🏢 {settings.project_name if settings else 'AUREON'}\n"
        f"📊 Прогресс: {strategy.progress_percent if strategy else 0:.1f}%\n"
        f"💰 Выручка: ${strategy.revenue_current if strategy else 0:,.0f}"
        f" / ${strategy.revenue_goal if strategy else 100000:,.0f}\n"
        f"🤖 Активных агентов: {active}\n"
        f"✅ Задач выполнено: {done}  ⏳ Pending: {pending}\n"
        f"📅 До WAIC 2027: {days_until_waic()} дней"
    )
    _send(chat_id, text, keyboard=_main_kb())
    _log(db, "/status", f"Статус запрошен из chat {chat_id}")


def _cmd_run(chat_id: str, db):
    from services.ceo_cycle import run_ceo_cycle
    _send(chat_id, "⚙️ Запускаю CEO Cycle...")
    try:
        result = run_ceo_cycle(db)
        summary = result.get("summary", "Цикл выполнен")
        _send(chat_id, f"✅ CEO Cycle завершён:\n{summary}", keyboard=_main_kb())
        _log(db, "/run", f"CEO Cycle запущен из Telegram: {summary}")
    except Exception as e:
        _send(chat_id, f"❌ Ошибка CEO Cycle: {e}")
        _log(db, "/run", f"Ошибка: {e}", "error")


def _cmd_post(chat_id: str, db):
    from services.content_generator import generate_post
    from models import ContentPost
    _send(chat_id, "✍️ Генерирую пост...")
    try:
        post_data = generate_post("AUREON AI Agency")
        post = ContentPost(**post_data)
        db.add(post)
        db.commit()
        db.refresh(post)
        preview = (post.content or "")[:400]
        if len(post.content or "") > 400:
            preview += "..."
        text = f"📝 <b>Пост готов (ID {post.id}):</b>\n\n<b>{post.title}</b>\n\n{preview}"
        kb = {
            "inline_keyboard": [[
                {"text": "📢 Опубликовать в канал", "callback_data": f"pub_{post.id}"},
                {"text": "🔄 Меню", "callback_data": "menu"},
            ]]
        }
        _send(chat_id, text, keyboard=kb)
        _log(db, "/post", f"Пост #{post.id} сгенерирован: {post.title}")
    except Exception as e:
        _send(chat_id, f"❌ Ошибка: {e}")
        _log(db, "/post", f"Ошибка: {e}", "error")


def _cmd_publish(chat_id: str, db):
    from models import ContentPost
    from services.telegram_service import send_message, is_configured
    if not is_configured():
        _send(chat_id, "❌ Telegram канал не настроен. Добавьте TELEGRAM_CHANNEL_ID в Settings.")
        return
    post = (
        db.query(ContentPost)
        .filter(ContentPost.status.in_(["ready", "draft"]))
        .order_by(ContentPost.id.desc())
        .first()
    )
    if not post:
        _send(chat_id, "📭 Нет постов для публикации (статус ready или draft).", keyboard=_main_kb())
        return
    _do_publish(chat_id, post, db)


def _do_publish(chat_id: str, post, db):
    from services.telegram_service import send_message
    try:
        send_message(f"<b>{post.title}</b>\n\n{post.content or ''}")
        post.status = "published"
        db.commit()
        _send(chat_id, f"✅ Опубликовано в канал!\n<b>{post.title}</b>", keyboard=_main_kb())
        _log(db, "/publish", f"Пост #{post.id} опубликован: {post.title}")
    except Exception as e:
        _send(chat_id, f"❌ Ошибка публикации: {e}")
        _log(db, "/publish", f"Ошибка: {e}", "error")


def _cmd_leads(chat_id: str, db):
    from models import Lead
    leads = (
        db.query(Lead)
        .filter(Lead.is_demo != 1)
        .order_by(Lead.id.desc())
        .limit(8)
        .all()
    )
    if not leads:
        _send(chat_id, "📋 Нет реальных лидов. Добавьте через Sales → Import.", keyboard=_main_kb())
        return
    EMOJI = {"found": "🔍", "outreach_ready": "📝", "contacted": "📤",
              "replied": "💬", "qualified": "⭐", "won": "🏆", "lost": "❌"}
    lines = ["<b>Последние лиды:</b>\n"]
    for lead in leads:
        em = EMOJI.get(lead.status, "•")
        tg = f" {lead.telegram}" if lead.telegram else ""
        has_cid = " ✅" if lead.telegram_chat_id else " ⚠️"
        lines.append(f"{em} <b>{lead.name}</b>{tg}{has_cid}")
        if lead.niche:
            lines.append(f"   {lead.niche}")
    kb = {
        "inline_keyboard": [
            [{"text": "💬 Generate Outreach (все)", "callback_data": "generate_outreach"}],
            [{"text": "🔄 Меню", "callback_data": "menu"}],
        ]
    }
    _send(chat_id, "\n".join(lines), keyboard=kb)
    _log(db, "/leads", f"Список лидов запрошен из chat {chat_id}")


def _cmd_sales(chat_id: str, db):
    from models import Lead
    all_leads = db.query(Lead).filter(Lead.is_demo != 1).all()
    pipeline = ["found", "outreach_ready", "contacted", "replied", "qualified",
                "proposal_sent", "meeting_scheduled", "won", "lost"]
    counts = {s: 0 for s in pipeline}
    won_rev = 0
    for lead in all_leads:
        s = lead.status if lead.status in counts else "found"
        counts[s] += 1
        if s == "won":
            won_rev += lead.estimated_price or 0
    text = (
        f"<b>Sales Pipeline</b>\n\n"
        f"🔍 Found: {counts['found']}\n"
        f"📝 Outreach Ready: {counts['outreach_ready']}\n"
        f"📤 Contacted: {counts['contacted']}\n"
        f"💬 Replied: {counts['replied']}\n"
        f"⭐ Qualified: {counts['qualified']}\n"
        f"📄 Proposal: {counts['proposal_sent']}\n"
        f"🤝 Meeting: {counts['meeting_scheduled']}\n"
        f"🏆 Won: {counts['won']} (${won_rev:,.0f})\n"
        f"❌ Lost: {counts['lost']}\n\n"
        f"Всего лидов: {len(all_leads)}"
    )
    _send(chat_id, text, keyboard=_main_kb())
    _log(db, "/sales", f"Pipeline запрошен из chat {chat_id}")


def _cmd_next(chat_id: str, db):
    from models import Lead
    from services.strategy_engine import days_until_waic, get_focus_of_day
    focus = get_focus_of_day()
    days = days_until_waic()
    found = db.query(Lead).filter(Lead.status.in_(["found", "new"]), Lead.is_demo != 1).count()
    ready = db.query(Lead).filter(Lead.status == "outreach_ready", Lead.is_demo != 1).count()
    actions = []
    if found > 0:
        actions.append(f"• Сгенерировать outreach для {found} новых лидов → /run или кнопка Generate Outreach")
    if ready > 0:
        actions.append(f"• Отправить {ready} готовых outreach → Sales → Auto Send")
    actions.append("• Запустить CEO Cycle для планирования → /run")
    actions.append("• Опубликовать пост в канал → /publish")
    text = (
        f"<b>Следующее денежное действие</b>\n\n"
        f"🎯 Фокус: {focus}\n"
        f"⏳ До WAIC 2027: {days} дней\n\n" +
        "\n".join(actions)
    )
    _send(chat_id, text, keyboard=_main_kb())
    _log(db, "/next", f"Next action из chat {chat_id}")


def _cmd_report(chat_id: str, db):
    from models import Task, StrategyState, ActionLog as AL
    from services.strategy_engine import days_until_waic
    strategy = db.query(StrategyState).first()
    done = db.query(Task).filter(Task.status == "completed").count()
    total = db.query(Task).count()
    recent = db.query(AL).filter(AL.agent != "Telegram Bot").order_by(AL.id.desc()).limit(5).all()
    acts = "\n".join(f"• {a.action}" for a in recent) or "—"
    text = (
        f"<b>Отчёт AUREON CEO Agent</b>\n"
        f"📅 {datetime.now().strftime('%d.%m.%Y %H:%M')}\n\n"
        f"📊 Прогресс: {strategy.progress_percent if strategy else 0:.1f}%\n"
        f"💰 ${strategy.revenue_current if strategy else 0:,.0f}"
        f" / ${strategy.revenue_goal if strategy else 100000:,.0f}\n"
        f"✅ Задач: {done}/{total}\n"
        f"⏳ До WAIC 2027: {days_until_waic()} дней\n\n"
        f"<b>Последние действия:</b>\n{acts}"
    )
    _send(chat_id, text, keyboard=_main_kb())
    _log(db, "/report", f"Отчёт из chat {chat_id}")


def _cmd_ceo_report(chat_id: str, db):
    """Send rich CEO report to the requesting chat_id."""
    try:
        from services.report_service import generate_ceo_report
        text = generate_ceo_report(db, "CEO Report")
        _send(chat_id, text)
        _log(db, "/report", f"CEO Report отправлен в chat {chat_id}")
    except Exception as e:
        _send(chat_id, f"❌ Ошибка генерации отчёта: {e}")
        _log(db, "/report", str(e), "error")


def _cmd_morning_report(chat_id: str, db):
    try:
        from services.report_service import generate_ceo_report
        text = generate_ceo_report(db, "Утренний отчёт")
        _send(chat_id, text)
        _log(db, "/morning", f"Утренний отчёт отправлен в chat {chat_id}")
    except Exception as e:
        _send(chat_id, f"❌ Ошибка: {e}")


def _cmd_evening_report(chat_id: str, db):
    try:
        from services.report_service import generate_ceo_report
        text = generate_ceo_report(db, "Вечерний отчёт")
        _send(chat_id, text)
        _log(db, "/evening", f"Вечерний отчёт отправлен в chat {chat_id}")
    except Exception as e:
        _send(chat_id, f"❌ Ошибка: {e}")


def _cmd_reports_toggle(chat_id: str, enabled: bool, db):
    from services.report_service import set_reports_enabled
    set_reports_enabled(enabled)
    status = "включены ✅" if enabled else "выключены ⏸"
    _send(chat_id, f"CEO Reports {status}.\n\n/morning — отправить утренний отчёт\n/evening — отправить вечерний отчёт", keyboard=_main_kb())
    _log(db, f"/reports_{'on' if enabled else 'off'}", f"CEO Reports {status} из chat {chat_id}")


def _cmd_help(chat_id: str, db):
    text = (
        "<b>AUREON CEO Agent — Команды</b>\n\n"
        "/start — Регистрация, сохранение chat_id, меню\n"
        "/status — Статус системы\n"
        "/run — Запустить CEO Cycle\n"
        "/post — Сгенерировать пост\n"
        "/publish — Опубликовать пост в канал\n"
        "/leads — Список лидов\n"
        "/sales — Sales Pipeline\n"
        "/next — Следующее денежное действие\n"
        "/report — Полный CEO-отчёт сейчас\n"
        "/morning — Утренний отчёт сейчас\n"
        "/evening — Вечерний отчёт сейчас\n"
        "/reports_on — Включить плановые отчёты\n"
        "/reports_off — Выключить плановые отчёты\n"
        "/help — Эта справка\n\n"
        "<i>Я AI-представитель AUREON. Не выдаю себя за Максима.</i>"
    )
    _send(chat_id, text, keyboard=_main_kb())
    _log(db, "/help", f"Help из chat {chat_id}")


def _cb_generate_outreach(chat_id: str, db):
    from models import Lead
    from services.sales_agent import generate_outreach_message, already_contacted
    leads = db.query(Lead).filter(Lead.status.in_(["found", "new"]), Lead.is_demo != 1).all()
    generated = 0
    for lead in leads:
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

    if generated == 0:
        _send(chat_id, "ℹ️ Нет новых лидов для outreach (все уже contacted или нет found).", keyboard=_main_kb())
    else:
        kb = {
            "inline_keyboard": [
                [{"text": f"📤 Отправить {generated} outreach", "callback_data": "auto_send"}],
                [{"text": "📋 Показать лидов", "callback_data": "show_leads"},
                 {"text": "🔄 Меню", "callback_data": "menu"}],
            ]
        }
        _send(chat_id, f"✅ Outreach сгенерирован для {generated} лидов.\nЛиды со статусом ✅ chat_id будут отправлены автоматически.", keyboard=kb)
    _log(db, "generate_outreach", f"Outreach для {generated} лидов из Telegram")


def _cb_auto_send(chat_id: str, db):
    from models import Lead, SalesConversation, SalesMessage, SalesSettings
    from services.sales_agent import generate_outreach_message, already_contacted, count_sent_today, contains_forbidden
    from services.telegram_sender import send_dm
    settings = db.query(SalesSettings).first()
    if not settings or not settings.real_sales_mode:
        _send(chat_id, "⚠️ Real Sales Mode выключен. Включите в Sales → Settings.", keyboard=_main_kb())
        return

    ready_leads = db.query(Lead).filter(Lead.status == "outreach_ready", Lead.is_demo != 1).all()
    sent_count = 0
    manual_count = 0
    for lead in ready_leads:
        if already_contacted(lead.id, db):
            continue
        message = lead.last_message or generate_outreach_message(
            name=lead.name or "",
            niche=lead.niche or "",
            problem=lead.problem or "",
            offer=lead.aureon_offer or "",
            price=lead.estimated_price,
        )
        if contains_forbidden(message, settings.forbidden_words or []):
            continue

        conv = db.query(SalesConversation).filter(SalesConversation.lead_id == lead.id).first()
        if not conv:
            conv = SalesConversation(lead_id=lead.id, platform=lead.platform or "telegram")
            db.add(conv)
            db.flush()

        chat_id_lead = lead.telegram_chat_id or ""
        telegram_sent = False
        send_result = {"ok": False}
        if settings.telegram_bot_token and chat_id_lead:
            send_result = send_dm(settings.telegram_bot_token, chat_id_lead, message)
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
            sent_count += 1
        else:
            manual_count += 1

    db.commit()
    _send(
        chat_id,
        f"✅ Auto Send завершён:\n"
        f"• Отправлено через Telegram: {sent_count}\n"
        f"• Требует ручной отправки (нет chat_id): {manual_count}\n\n"
        f"Для лидов без chat_id: попросите их написать /start боту.",
        keyboard=_main_kb()
    )
    _log(db, "auto_send", f"Отправлено: {sent_count}, manual: {manual_count}")


# ── Update Dispatcher ─────────────────────────────────────────────────────────

def process_update(update: dict) -> None:
    db = _new_db()
    try:
        _dispatch(update, db)
    except Exception as e:
        logger.error(f"Update dispatch error: {e}")
    finally:
        db.close()
    _bot_state["updates_processed"] += 1
    _bot_state["last_update_at"] = datetime.now().isoformat()


def _dispatch(update: dict, db) -> None:
    callback = update.get("callback_query")
    if callback:
        _handle_callback(callback, db)
        return

    msg = update.get("message") or {}
    if not msg:
        return

    chat_id = str(msg.get("chat", {}).get("id", ""))
    from_user = msg.get("from") or {}
    text = (msg.get("text") or "").strip()
    if not chat_id or not text:
        return

    cmd = text.split()[0].lower().split("@")[0]
    _ensure_user(db, chat_id, from_user, cmd)

    COMMANDS = {
        "/start": lambda: _cmd_start(chat_id, from_user, db),
        "/status": lambda: _cmd_status(chat_id, db),
        "/run": lambda: _cmd_run(chat_id, db),
        "/post": lambda: _cmd_post(chat_id, db),
        "/publish": lambda: _cmd_publish(chat_id, db),
        "/leads": lambda: _cmd_leads(chat_id, db),
        "/sales": lambda: _cmd_sales(chat_id, db),
        "/next": lambda: _cmd_next(chat_id, db),
        "/report": lambda: _cmd_ceo_report(chat_id, db),
        "/morning": lambda: _cmd_morning_report(chat_id, db),
        "/evening": lambda: _cmd_evening_report(chat_id, db),
        "/reports_on": lambda: _cmd_reports_toggle(chat_id, True, db),
        "/reports_off": lambda: _cmd_reports_toggle(chat_id, False, db),
        "/help": lambda: _cmd_help(chat_id, db),
    }
    handler = COMMANDS.get(cmd)
    if handler:
        handler()
    else:
        _send(chat_id, "Не понял команду. Используй /help для списка.", keyboard=_main_kb())


def _handle_callback(callback: dict, db) -> None:
    chat_id = str(callback.get("message", {}).get("chat", {}).get("id", ""))
    data = callback.get("data", "")
    if not chat_id:
        return

    try:
        _tg("answerCallbackQuery", callback_query_id=callback["id"])
    except Exception:
        pass

    from_user = callback.get("from") or {}
    _ensure_user(db, chat_id, from_user, f"cb:{data}")

    if data == "run_cycle":
        _cmd_run(chat_id, db)
    elif data == "generate_post":
        _cmd_post(chat_id, db)
    elif data == "publish":
        _cmd_publish(chat_id, db)
    elif data == "show_leads":
        _cmd_leads(chat_id, db)
    elif data == "generate_outreach":
        _cb_generate_outreach(chat_id, db)
    elif data == "auto_send":
        _cb_auto_send(chat_id, db)
    elif data == "show_pipeline":
        _cmd_sales(chat_id, db)
    elif data == "daily_report":
        _cmd_report(chat_id, db)
    elif data == "next_action":
        _cmd_next(chat_id, db)
    elif data == "menu":
        _send(chat_id, "Выберите действие:", keyboard=_main_kb())
    elif data.startswith("pub_"):
        try:
            post_id = int(data[4:])
            from models import ContentPost
            from services.telegram_service import is_configured
            if not is_configured():
                _send(chat_id, "❌ Telegram канал не настроен.")
                return
            post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
            if post:
                _do_publish(chat_id, post, db)
        except Exception as e:
            _send(chat_id, f"❌ Ошибка: {e}")
    else:
        _send(chat_id, "Используй /help.", keyboard=_main_kb())


# ── Polling Mode ──────────────────────────────────────────────────────────────

def _polling_loop():
    token = _token()
    if not token:
        logger.warning("No TELEGRAM_BOT_TOKEN — polling disabled")
        return

    logger.info("Telegram bot polling started")
    offset = None
    while _bot_running:
        try:
            url = f"https://api.telegram.org/bot{token}/getUpdates"
            params: dict = {"limit": 10, "timeout": 30}
            if offset is not None:
                params["offset"] = offset
            with httpx.Client(timeout=35) as client:
                resp = client.get(url, params=params)
            data = resp.json()
            if data.get("ok"):
                for upd in data.get("result", []):
                    if _bot_running:
                        process_update(upd)
                    offset = upd["update_id"] + 1
        except Exception as e:
            if _bot_running:
                logger.error(f"Polling error: {e}")
                _bot_state["error"] = str(e)
                time.sleep(5)


def start_polling():
    global _bot_thread, _bot_running
    if _bot_running:
        return {"ok": False, "message": "Already running"}
    token = _token()
    if not token:
        return {"ok": False, "message": "TELEGRAM_BOT_TOKEN not set"}

    # Remove any existing webhook so polling works
    try:
        with httpx.Client(timeout=10) as client:
            client.post(
                f"https://api.telegram.org/bot{token}/deleteWebhook",
                json={"drop_pending_updates": False},
            )
    except Exception:
        pass

    _bot_running = True
    _bot_state.update({"running": True, "mode": "polling",
                        "started_at": datetime.now().isoformat(), "error": None})

    _bot_thread = threading.Thread(target=_polling_loop, daemon=True, name="tg-bot-poll")
    _bot_thread.start()
    logger.info("Telegram bot polling thread started")
    return {"ok": True, "message": "Polling started"}


def stop_polling():
    global _bot_running
    _bot_running = False
    _bot_state["running"] = False
    logger.info("Telegram bot polling stopped")
    return {"ok": True, "message": "Polling stopped"}


# ── Webhook Mode ──────────────────────────────────────────────────────────────

def set_webhook(url: str) -> dict:
    token = _token()
    if not token:
        return {"ok": False, "error": "No token"}
    with httpx.Client(timeout=10) as client:
        resp = client.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={"url": url},
        )
    data = resp.json()
    if data.get("ok"):
        _bot_state.update({"mode": "webhook", "running": True,
                            "started_at": datetime.now().isoformat()})
    return data


# ── Status ────────────────────────────────────────────────────────────────────

def get_bot_status() -> dict:
    from database import SessionLocal
    from models import TelegramUser
    db = SessionLocal()
    try:
        user_count = db.query(TelegramUser).count()
    except Exception:
        user_count = 0
    finally:
        db.close()
    return {
        **_bot_state,
        "token_configured": bool(_token()),
        "registered_users": user_count,
    }
