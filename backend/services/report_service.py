"""
CEO Report Service — generates and sends rich reports to the founder via Telegram.
"""
import os
import logging
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

_report_state = {
    "enabled": True,
    "last_morning_at": None,
    "last_evening_at": None,
    "last_report_at": None,
    "reports_sent": 0,
    "error": None,
}


# ── Founder chat_id resolution ────────────────────────────────────────────────

def get_founder_chat_id(db) -> str | None:
    chat_id = os.getenv("FOUNDER_TELEGRAM_CHAT_ID", "").strip()
    if chat_id:
        return chat_id
    try:
        from models import TelegramUser
        user = (
            db.query(TelegramUser)
            .filter(TelegramUser.is_admin == True)
            .order_by(TelegramUser.registered_at.asc())
            .first()
        )
        if not user:
            user = db.query(TelegramUser).order_by(TelegramUser.registered_at.asc()).first()
        return user.chat_id if user else None
    except Exception:
        return None


# ── Report generation ─────────────────────────────────────────────────────────

def generate_ceo_report(db, report_type: str = "CEO Report") -> str:
    from models import ActionLog, Lead, SalesMessage, ContentPost, Task, StrategyState, Agent
    from services.strategy_engine import days_until_waic

    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # ── Strategy & Progress ───────────────────────────────────────────────────
    strategy = db.query(StrategyState).first()
    progress = strategy.progress_percent if strategy else 0
    rev_cur = strategy.revenue_current if strategy else 0
    rev_goal = strategy.revenue_goal if strategy else 100_000

    # ── Agents ───────────────────────────────────────────────────────────────
    active_agents = db.query(Agent).filter(Agent.status == "active").count()
    total_agents = db.query(Agent).count()

    # ── Today's activity ─────────────────────────────────────────────────────
    logs_today = db.query(ActionLog).filter(ActionLog.created_at >= today_start).all()
    errors_today = [l for l in logs_today if l.status == "error"]
    success_today = [l for l in logs_today if l.status == "success"]

    tasks_done = db.query(Task).filter(
        Task.status == "completed",
        Task.updated_at >= today_start,
    ).count()
    tasks_pending = db.query(Task).filter(Task.status == "pending").count()

    # ── Leads ─────────────────────────────────────────────────────────────────
    new_leads = db.query(Lead).filter(
        Lead.is_demo != 1,
        Lead.created_at >= today_start,
    ).count()

    # ── Sales messages ────────────────────────────────────────────────────────
    msgs_sent = db.query(SalesMessage).filter(
        SalesMessage.sent == True,
        SalesMessage.sent_at >= today_start,
    ).count()

    # ── Published posts ───────────────────────────────────────────────────────
    posts_pub = db.query(ContentPost).filter(
        ContentPost.status == "published",
        ContentPost.updated_at >= today_start,
    ).count()

    # ── Pipeline ──────────────────────────────────────────────────────────────
    all_leads = db.query(Lead).filter(Lead.is_demo != 1).all()
    pipeline = {}
    won_rev = 0.0
    for s in ("found", "new", "outreach_ready", "contacted", "replied",
              "qualified", "proposal_sent", "meeting_scheduled", "won", "lost"):
        pipeline[s] = 0
    for lead in all_leads:
        s = lead.status if lead.status in pipeline else "found"
        pipeline[s] += 1
        if s == "won":
            won_rev += lead.estimated_price or 0

    # ── Next best action ──────────────────────────────────────────────────────
    action_hint = _next_action(pipeline, all_leads)

    # ── Memory highlights ─────────────────────────────────────────────────────
    memory_lines = []
    try:
        from memory.models import MemoryEntry
        important = (
            db.query(MemoryEntry)
            .filter(MemoryEntry.is_archived == False, MemoryEntry.importance >= 4)
            .order_by(MemoryEntry.importance.desc(), MemoryEntry.created_at.desc())
            .limit(3)
            .all()
        )
        for m in important:
            icon = {"knowledge": "📚", "experience": "💡", "founder": "👑"}.get(m.type, "◎")
            memory_lines.append(f"{icon} {m.title}")
    except Exception:
        pass

    # ── Format report ─────────────────────────────────────────────────────────
    sep = "━" * 28
    lines = [
        f"<b>🤖 AUREON — {report_type}</b>",
        f"📅 {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        "",
        f"<b>{sep}</b>",
        "<b>SYSTEM STATUS</b>",
        f"📊 Прогресс: <b>{progress:.1f}%</b>",
        f"💰 Выручка: <b>${rev_cur:,.0f}</b> / ${rev_goal:,.0f}",
        f"⏳ До WAIC 2027: <b>{days_until_waic()} дн</b>",
        f"🤖 Агентов: {active_agents}/{total_agents} active",
        "",
        f"<b>{sep}</b>",
        "<b>СЕГОДНЯ</b>",
        f"✅ Действий: {len(success_today)}  ❌ Ошибок: {len(errors_today)}",
        f"📋 Задач: +{tasks_done} выполнено | {tasks_pending} pending",
        f"🔍 Новых лидов: {new_leads}",
        f"💬 Сообщений отправлено: {msgs_sent}",
        f"📢 Постов опубликовано: {posts_pub}",
    ]

    if errors_today:
        lines.append("")
        lines.append("<b>⚠ ОШИБКИ:</b>")
        for e in errors_today[:3]:
            lines.append(f"• [{e.agent}] {e.action}: {(e.result or '')[:80]}")

    lines += [
        "",
        f"<b>{sep}</b>",
        "<b>PIPELINE</b>",
        f"🔍 Found/New: {pipeline.get('found', 0) + pipeline.get('new', 0)}",
        f"📤 Contacted: {pipeline.get('contacted', 0) + pipeline.get('outreach_ready', 0)}",
        f"⭐ Qualified: {pipeline.get('qualified', 0)}",
        f"📄 Proposal: {pipeline.get('proposal_sent', 0)} | 🤝 Meeting: {pipeline.get('meeting_scheduled', 0)}",
        f"🏆 Won: {pipeline.get('won', 0)} (${won_rev:,.0f}) | ❌ Lost: {pipeline.get('lost', 0)}",
    ]

    lines += [
        "",
        f"<b>{sep}</b>",
        "<b>СЛЕДУЮЩИЙ ШАГ</b>",
        f"→ {action_hint}",
    ]

    # ── Sales Brain pipeline ──────────────────────────────────────────────────
    try:
        from services.sales_brain import get_sales_summary
        ss = get_sales_summary(db)
        if ss.get("total_active", 0) > 0:
            lines += [
                "",
                f"<b>{sep}</b>",
                "<b>DISCOVERY PIPELINE</b>",
                f"🔥 Hot: {ss['hot_leads']}  🌡 Active: {ss['total_active']}",
                f"📄 Ready for proposal: {ss['ready_for_proposal']}",
                f"⏳ Waiting reply: {ss['waiting_client_reply']}",
                f"⚠ Needs human: {ss['needs_human']}  🚨 At risk: {ss['at_risk']}",
                f"💰 Pipeline: ${ss['pipeline_revenue']:,.0f}",
            ]
            for op in ss.get("top_opportunities", [])[:3]:
                lines.append(
                    f"  #{op['id']} {op['stage']} {op['temp']} "
                    f"→ {op['prob']}% · ${op['revenue']:,.0f}"
                )
    except Exception:
        pass

    if memory_lines:
        lines += [
            "",
            f"<b>{sep}</b>",
            "<b>MEMORY HIGHLIGHTS</b>",
        ] + memory_lines

    return "\n".join(lines)


def _next_action(pipeline: dict, leads) -> str:
    found = pipeline.get("found", 0) + pipeline.get("new", 0)
    ready = pipeline.get("outreach_ready", 0)
    contacted = pipeline.get("contacted", 0)
    qualified = pipeline.get("qualified", 0)
    proposal = pipeline.get("proposal_sent", 0)

    if qualified > 0:
        return f"Есть {qualified} квалифицированных лидов → готовить КП"
    if proposal > 0:
        return f"КП отправлено {proposal} лидам → follow-up через 24-48ч"
    if contacted > 0:
        return f"{contacted} лидов в contacted → ждать ответа, отправить follow-up"
    if ready > 0:
        return f"Outreach готов для {ready} лидов → запустить Sales Auto Send"
    if found > 0:
        return f"Есть {found} новых лидов → сгенерировать outreach"
    return "Добавить новых лидов через Sales → Import"


# ── Send to founder ───────────────────────────────────────────────────────────

def _tg_send(chat_id: str, text: str) -> dict:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set")
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    with httpx.Client(timeout=15) as client:
        resp = client.post(url, json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
        })
    return resp.json()


def send_ceo_report_to_founder(db, report_type: str = "CEO Report") -> dict:
    if not _report_state["enabled"] and report_type != "Manual":
        return {"ok": False, "message": "CEO Reports disabled"}

    chat_id = get_founder_chat_id(db)
    if not chat_id:
        return {"ok": False, "message": "Founder chat_id not found. Send /start to the bot first."}

    try:
        text = generate_ceo_report(db, report_type)
        result = _tg_send(chat_id, text)

        if result.get("ok"):
            _report_state["last_report_at"] = datetime.now().isoformat()
            _report_state["reports_sent"] += 1
            _report_state["error"] = None
            if "Morning" in report_type or "Утренний" in report_type:
                _report_state["last_morning_at"] = datetime.now().isoformat()
            elif "Evening" in report_type or "Вечерний" in report_type:
                _report_state["last_evening_at"] = datetime.now().isoformat()
            logger.info(f"CEO report sent to {chat_id}")
            return {"ok": True, "message": f"Report sent to {chat_id}"}
        else:
            err = result.get("description", "Telegram API error")
            _report_state["error"] = err
            return {"ok": False, "message": err}
    except Exception as e:
        _report_state["error"] = str(e)
        logger.error(f"CEO report error: {e}")
        return {"ok": False, "message": str(e)}


def set_reports_enabled(enabled: bool) -> None:
    _report_state["enabled"] = enabled


def get_report_status(db) -> dict:
    enabled_env = os.getenv("CEO_REPORTS_ENABLED", "true").lower() != "false"
    return {
        "enabled": _report_state["enabled"] and enabled_env,
        "founder_chat_id": get_founder_chat_id(db) or "",
        "last_report_at": _report_state["last_report_at"],
        "last_morning_at": _report_state["last_morning_at"],
        "last_evening_at": _report_state["last_evening_at"],
        "reports_sent": _report_state["reports_sent"],
        "error": _report_state["error"],
        "morning_time": os.getenv("CEO_REPORT_TIME_MORNING", "09:00"),
        "evening_time": os.getenv("CEO_REPORT_TIME_EVENING", "21:00"),
        "env_enabled": enabled_env,
    }
