import os
import logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

_automation_state = {
    "enabled": False,
    "started_at": None,
    "last_cycle_at": None,
    "last_post_at": None,
    "last_sales_at": None,
    "cycles_done": 0,
    "posts_published": 0,
    "sales_generated": 0,
    "sales_sent": 0,
    "sales_manual_required": 0,
    "action_log": [],
}

_scheduler = BackgroundScheduler(timezone="UTC")
_initialized = False


def _env_int(key: str, default: int) -> int:
    try:
        return int(os.getenv(key, str(default)))
    except (ValueError, TypeError):
        return default


def _env_time(key: str, default: str) -> tuple:
    val = os.getenv(key, default)
    try:
        h, m = val.split(":")
        return int(h), int(m)
    except Exception:
        h, m = default.split(":")
        return int(h), int(m)


def _log(action: str, result: str, status: str = "success"):
    entry = {
        "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "action": action,
        "result": result,
        "status": status,
    }
    _automation_state["action_log"].insert(0, entry)
    _automation_state["action_log"] = _automation_state["action_log"][:50]


def _save_action_log(db, agent: str, action: str, result: str, status: str = "success"):
    try:
        from models import ActionLog
        db.add(ActionLog(agent=agent, action=action, result=result, status=status))
        db.commit()
    except Exception:
        pass


def _run_ceo_cycle_job():
    from database import SessionLocal
    from services.ceo_cycle import run_ceo_cycle

    db = SessionLocal()
    try:
        result = run_ceo_cycle(db)
        _automation_state["last_cycle_at"] = datetime.now().isoformat()
        _automation_state["cycles_done"] += 1
        _log("Авто CEO-цикл", result["summary"])
        _save_action_log(db, "Automation Scheduler", "Авто CEO-цикл", result["summary"])
    except Exception as e:
        logger.error(f"CEO cycle error: {e}")
        _log("Авто CEO-цикл", str(e), "error")
        _save_action_log(db, "Automation Scheduler", "Авто CEO-цикл", f"Ошибка: {e}", "error")
    finally:
        db.close()


def _run_telegram_post_job():
    from database import SessionLocal
    from models import ContentPost
    from services.telegram_service import send_message, is_configured

    if not is_configured():
        _log("Telegram пост", "Telegram не настроен — пропуск", "warning")
        return

    db = SessionLocal()
    try:
        post = (
            db.query(ContentPost)
            .filter(ContentPost.status.in_(["ready", "draft"]))
            .order_by(ContentPost.id.desc())
            .first()
        )
        if not post:
            _log("Telegram пост", "Нет постов для публикации", "warning")
            return

        text = f"<b>{post.title}</b>\n\n{post.content or ''}"
        send_message(text)
        post.status = "published"
        db.commit()

        _automation_state["last_post_at"] = datetime.now().isoformat()
        _automation_state["posts_published"] += 1
        _log("Telegram пост", f"Опубликован: '{post.title}'")
        _save_action_log(db, "Automation Scheduler", "Авто Telegram пост", f"Опубликован: '{post.title}'")
    except Exception as e:
        logger.error(f"Telegram post error: {e}")
        _log("Telegram пост", str(e), "error")
        _save_action_log(db, "Automation Scheduler", "Авто Telegram пост", f"Ошибка: {e}", "error")
    finally:
        db.close()


def _send_report(report_type: str):
    from database import SessionLocal
    from models import Task, StrategyState
    from services.telegram_service import send_message, is_configured
    from services.strategy_engine import days_until_waic

    if not is_configured():
        _log(report_type, "Telegram не настроен — пропуск", "warning")
        return

    db = SessionLocal()
    try:
        strategy = db.query(StrategyState).first()
        total_tasks = db.query(Task).count()
        completed = db.query(Task).filter(Task.status == "completed").count()

        text = (
            f"<b>AUREON CEO Agent — {report_type}</b>\n\n"
            f"📅 {datetime.now().strftime('%d.%m.%Y %H:%M')}\n"
            f"🎯 Прогресс: {strategy.progress_percent if strategy else 0:.1f}%\n"
            f"💰 Выручка: ${strategy.revenue_current if strategy else 0:,.0f} / "
            f"${strategy.revenue_goal if strategy else 100000:,.0f}\n"
            f"✅ Задач выполнено: {completed} / {total_tasks}\n"
            f"📊 Циклов запущено: {_automation_state['cycles_done']}\n"
            f"📢 Постов опубликовано: {_automation_state['posts_published']}\n"
            f"⏳ До WAIC 2027: {days_until_waic()} дней"
        )
        send_message(text)
        _log(report_type, "Отчёт отправлен в Telegram")
        _save_action_log(db, "Automation Scheduler", report_type, "Отчёт отправлен в Telegram")
    except Exception as e:
        logger.error(f"{report_type} error: {e}")
        _log(report_type, str(e), "error")
        _save_action_log(db, "Automation Scheduler", report_type, f"Ошибка: {e}", "error")
    finally:
        db.close()


def _run_sales_auto_job():
    from database import SessionLocal
    from models import Lead, SalesConversation, SalesMessage, SalesSettings
    from services.sales_agent import (
        generate_outreach_message, count_sent_today, already_contacted, contains_forbidden,
    )
    from services.telegram_sender import send_dm

    db = SessionLocal()
    try:
        settings = db.query(SalesSettings).first()
        if not settings or not settings.real_sales_mode or not settings.auto_send_first:
            _log("Sales Auto Loop", "Real Sales Mode или Auto Send First отключены — пропуск", "warning")
            return

        # Phase 1: generate for found/new leads
        found_leads = db.query(Lead).filter(
            Lead.status.in_(["found", "new"]), Lead.is_demo != 1
        ).all()
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
        sent_today = count_sent_today(db)
        remaining = settings.daily_limit - sent_today
        if remaining <= 0:
            _log("Sales Auto Loop", f"Дневной лимит исчерпан ({settings.daily_limit}/день)", "warning")
            return

        ready_leads = db.query(Lead).filter(
            Lead.status == "outreach_ready", Lead.is_demo != 1
        ).limit(remaining).all()

        sent = 0
        manual_required = 0
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
                sent_at=datetime.now(),
                telegram_message_id=send_result.get("telegram_message_id"),
            ))

            if telegram_sent:
                lead.status = "contacted"
                sent += 1
            else:
                manual_required += 1

        db.commit()

        summary = f"Сгенерировано: {generated}, отправлено: {sent}, ручная отправка: {manual_required}"
        _automation_state["last_sales_at"] = datetime.now().isoformat()
        _automation_state["sales_generated"] += generated
        _automation_state["sales_sent"] += sent
        _automation_state["sales_manual_required"] += manual_required
        _log("Sales Auto Loop", summary)
        _save_action_log(db, "Sales Agent", "Авто Sales Loop", summary)
    except Exception as e:
        logger.error(f"Sales auto loop error: {e}")
        _log("Sales Auto Loop", str(e), "error")
        _save_action_log(db, "Sales Agent", "Авто Sales Loop", f"Ошибка: {e}", "error")
    finally:
        db.close()


def _run_morning_report():
    _send_report("Утренний отчёт")


def _run_evening_report():
    _send_report("Вечерний отчёт")


def init_scheduler():
    global _initialized
    if _initialized:
        return

    interval_min = _env_int("CEO_CYCLE_INTERVAL_MINUTES", 60)
    post_hours = _env_int("TELEGRAM_POST_INTERVAL_HOURS", 4)
    sales_hours = _env_int("SALES_AUTO_INTERVAL_HOURS", 6)
    morning_h, morning_m = _env_time("MORNING_REPORT_TIME", "09:00")
    evening_h, evening_m = _env_time("EVENING_REPORT_TIME", "21:00")

    _scheduler.add_job(
        _run_ceo_cycle_job,
        trigger=IntervalTrigger(minutes=interval_min),
        id="ceo_cycle",
        replace_existing=True,
        misfire_grace_time=300,
    )
    _scheduler.add_job(
        _run_telegram_post_job,
        trigger=IntervalTrigger(hours=post_hours),
        id="telegram_post",
        replace_existing=True,
        misfire_grace_time=300,
    )
    _scheduler.add_job(
        _run_sales_auto_job,
        trigger=IntervalTrigger(hours=sales_hours),
        id="sales_auto",
        replace_existing=True,
        misfire_grace_time=300,
    )
    _scheduler.add_job(
        _run_morning_report,
        trigger=CronTrigger(hour=morning_h, minute=morning_m),
        id="morning_report",
        replace_existing=True,
    )
    _scheduler.add_job(
        _run_evening_report,
        trigger=CronTrigger(hour=evening_h, minute=evening_m),
        id="evening_report",
        replace_existing=True,
    )

    _scheduler.start()
    _initialized = True

    auto_enabled = os.getenv("AUTO_AGENT_ENABLED", "true").lower() == "true"
    if auto_enabled:
        _automation_state["enabled"] = True
        _automation_state["started_at"] = datetime.now().isoformat()
        _log("Scheduler запущен", f"Авто-старт. Цикл каждые {interval_min} мин, пост каждые {post_hours} ч, sales каждые {sales_hours} ч")
        logger.info("AUREON Automation Scheduler auto-started")
    else:
        _scheduler.pause()
        _automation_state["enabled"] = False
        _log("Scheduler инициализирован", "AUTO_AGENT_ENABLED=false — ожидание ручного запуска", "warning")
        logger.info("AUREON Automation Scheduler initialized but paused (AUTO_AGENT_ENABLED=false)")


def start_automation():
    if not _initialized:
        init_scheduler()
        return
    if _automation_state["enabled"]:
        return
    _scheduler.resume()
    _automation_state["enabled"] = True
    if not _automation_state["started_at"]:
        _automation_state["started_at"] = datetime.now().isoformat()
    _log("Scheduler запущен", "Автоматизация активирована вручную")
    logger.info("AUREON Automation Scheduler started")


def stop_automation():
    if not _automation_state["enabled"]:
        return
    _scheduler.pause()
    _automation_state["enabled"] = False
    _log("Scheduler остановлен", "Автоматизация приостановлена вручную", "warning")
    logger.info("AUREON Automation Scheduler paused")


def run_cycle_now():
    _run_ceo_cycle_job()


def get_automation_status() -> dict:
    next_run = None
    if _initialized and _automation_state["enabled"]:
        job = _scheduler.get_job("ceo_cycle")
        if job and job.next_run_time:
            next_run = job.next_run_time.isoformat()

    return {
        "enabled": _automation_state["enabled"],
        "status": "ACTIVE" if _automation_state["enabled"] else "PAUSED",
        "started_at": _automation_state["started_at"],
        "last_cycle_at": _automation_state["last_cycle_at"],
        "next_cycle_at": next_run,
        "last_post_at": _automation_state["last_post_at"],
        "last_sales_at": _automation_state["last_sales_at"],
        "cycles_done": _automation_state["cycles_done"],
        "posts_published": _automation_state["posts_published"],
        "sales_generated": _automation_state["sales_generated"],
        "sales_sent": _automation_state["sales_sent"],
        "sales_manual_required": _automation_state["sales_manual_required"],
        "action_log": _automation_state["action_log"][:20],
        "config": {
            "cycle_interval_minutes": _env_int("CEO_CYCLE_INTERVAL_MINUTES", 60),
            "post_interval_hours": _env_int("TELEGRAM_POST_INTERVAL_HOURS", 4),
            "sales_auto_interval_hours": _env_int("SALES_AUTO_INTERVAL_HOURS", 6),
            "morning_report": os.getenv("MORNING_REPORT_TIME", "09:00"),
            "evening_report": os.getenv("EVENING_REPORT_TIME", "21:00"),
        },
    }
