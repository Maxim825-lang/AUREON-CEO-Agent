import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import date
from dotenv import load_dotenv

load_dotenv()

from database import engine, get_db, Base
import models
import memory.models  # register MemoryEntry with Base before create_all
from seed import seed_database
from schemas import CycleResult
from services.ceo_cycle import run_ceo_cycle
from services.strategy_engine import days_until_waic, get_focus_of_day, get_risk_level
from models import ActionLog, Task, Agent, Settings, StrategyState, TelegramUser

from routers import agents, tasks, leads, content, offers, strategy, settings, telegram, automation, admin, sales, cinema, miniapp, conversations, memory_collector
from memory import router as memory_router
from services import scheduler as sched
from services import telegram_bot as tg_bot

Base.metadata.create_all(bind=engine)


def _migrate_add_columns():
    """Add new columns to existing tables if missing (idempotent)."""
    migrations = [
        ("leads", "contact", "ALTER TABLE leads ADD COLUMN contact TEXT"),
        ("leads", "platform", "ALTER TABLE leads ADD COLUMN platform TEXT"),
        ("leads", "source_url", "ALTER TABLE leads ADD COLUMN source_url TEXT"),
        ("leads", "notes", "ALTER TABLE leads ADD COLUMN notes TEXT"),
        ("leads", "is_demo", "ALTER TABLE leads ADD COLUMN is_demo INTEGER DEFAULT 0"),
        ("leads", "telegram_chat_id", "ALTER TABLE leads ADD COLUMN telegram_chat_id TEXT"),
        ("offers", "is_demo", "ALTER TABLE offers ADD COLUMN is_demo INTEGER DEFAULT 0"),
        ("content_posts", "is_demo", "ALTER TABLE content_posts ADD COLUMN is_demo INTEGER DEFAULT 0"),
        ("telegram_users", "is_admin", "ALTER TABLE telegram_users ADD COLUMN is_admin BOOLEAN DEFAULT 0"),
        ("telegram_users", "command_count", "ALTER TABLE telegram_users ADD COLUMN command_count INTEGER DEFAULT 0"),
        ("telegram_users", "last_command", "ALTER TABLE telegram_users ADD COLUMN last_command TEXT"),
        # Sales Brain fields on conversations
        ("conversations", "deal_probability",          "ALTER TABLE conversations ADD COLUMN deal_probability INTEGER DEFAULT 0"),
        ("conversations", "urgency",                   "ALTER TABLE conversations ADD COLUMN urgency TEXT DEFAULT 'low'"),
        ("conversations", "client_temperature",        "ALTER TABLE conversations ADD COLUMN client_temperature TEXT DEFAULT 'cold'"),
        ("conversations", "budget_confidence",         "ALTER TABLE conversations ADD COLUMN budget_confidence INTEGER DEFAULT 0"),
        ("conversations", "requirements_completeness", "ALTER TABLE conversations ADD COLUMN requirements_completeness INTEGER DEFAULT 0"),
        ("conversations", "decision_stage",            "ALTER TABLE conversations ADD COLUMN decision_stage TEXT DEFAULT 'new'"),
        ("conversations", "estimated_revenue",         "ALTER TABLE conversations ADD COLUMN estimated_revenue REAL DEFAULT 0"),
        ("conversations", "estimated_close_date",      "ALTER TABLE conversations ADD COLUMN estimated_close_date TEXT"),
        ("conversations", "recommended_next_action",   "ALTER TABLE conversations ADD COLUMN recommended_next_action TEXT"),
        ("conversations", "risk_level",                "ALTER TABLE conversations ADD COLUMN risk_level TEXT DEFAULT 'medium'"),
        ("conversations", "pain_points",               "ALTER TABLE conversations ADD COLUMN pain_points JSON"),
        ("conversations", "goals",                     "ALTER TABLE conversations ADD COLUMN goals JSON"),
        ("conversations", "constraints",               "ALTER TABLE conversations ADD COLUMN constraints JSON"),
        ("conversations", "must_have",                 "ALTER TABLE conversations ADD COLUMN must_have JSON"),
        ("conversations", "nice_to_have",              "ALTER TABLE conversations ADD COLUMN nice_to_have JSON"),
        ("conversations", "budget_range",              "ALTER TABLE conversations ADD COLUMN budget_range TEXT"),
        ("conversations", "deadline",                  "ALTER TABLE conversations ADD COLUMN deadline TEXT"),
        ("conversations", "competitors",               "ALTER TABLE conversations ADD COLUMN competitors JSON"),
        ("conversations", "preferred_solution",        "ALTER TABLE conversations ADD COLUMN preferred_solution TEXT"),
        ("conversations", "last_client_message_at",    "ALTER TABLE conversations ADD COLUMN last_client_message_at DATETIME"),
        ("conversations", "follow_up_count",           "ALTER TABLE conversations ADD COLUMN follow_up_count INTEGER DEFAULT 0"),
        ("conversations", "is_stale",                  "ALTER TABLE conversations ADD COLUMN is_stale BOOLEAN DEFAULT 0"),
    ]
    with engine.connect() as conn:
        for table, col, sql in migrations:
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception:
                pass


_migrate_add_columns()


def _migrate_clean_demo_data():
    """One-time idempotent cleanup of fake seeded data from existing databases."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        FAKE_AGENT_RESULTS = {
            "CEO Agent": "Сформирован план на 7 дней. Определены 3 ключевых приоритета.",
            "Sales Agent": "Найдено 5 лидов в нише Telegram-каналов. Отправлено 2 КП.",
            "Marketing Agent": "Создано 3 поста. Охват последнего: ~200 просмотров.",
            "Product Agent": "Составлен список фич для следующего релиза.",
            "Research Agent": "Обнаружен новый конкурент. Составлен сравнительный анализ.",
            "Finance Agent": "Маржинальность сервиса AI-бот: 72%. Точка безубыточности: 2 клиента/месяц.",
            "CTO Agent": "Выбран стек: FastAPI + LangChain + SQLite. Готово к масштабированию.",
            "Design Agent": "Готова цветовая палитра. Логотип в процессе.",
            "Cinema Agent": "База кино-референсов загружена. Готов к подбору по 10 mood-категориям.",
        }
        for name, fake_result in FAKE_AGENT_RESULTS.items():
            agent = db.query(Agent).filter(Agent.name == name).first()
            if agent and agent.last_result == fake_result:
                agent.last_result = None
                agent.tasks_completed = 0

        FAKE_ACTION_RESULTS = [
            "Система запущена. Все агенты активированы. База данных инициализирована.",
            "Рынок AI-автоматизации растёт на 35% г/г. Ниша малого бизнеса практически свободна.",
            "Найдено 5 потенциальных клиентов. Добавлены в CRM.",
            "Пост 'AUREON: AI-агентство нового поколения' создан. Готов к публикации.",
            "AI-бот: $1,200 чек, $340 себестоимость, маржа 71.7%. Точка безубыточности: 2 клиента.",
            "Стратегия утверждена: 4 фазы, цель $100K выручки к Q2 2027.",
        ]
        for fake_result in FAKE_ACTION_RESULTS:
            db.query(ActionLog).filter(ActionLog.result == fake_result).delete()

        FAKE_WEEKLY = [
            "Запустить MVP CEO Agent и показать первые результаты",
            "Получить первый оплаченный проект",
            "Опубликовать 5 постов в Telegram-канале",
            "Провести 3 демо-звонка с потенциальными клиентами",
            "Настроить базовую CRM-систему",
        ]
        FAKE_MONTHLY = [
            "Заработать первые $3,000",
            "Набрать 500 подписчиков в Telegram",
            "Подписать 3 клиента на ongoing AI-обслуживание",
            "Опубликовать кейс первого успешного проекта",
            "Запустить полноценный сайт AUREON",
            "Протестировать AI Content System на реальном клиенте",
        ]
        strategy = db.query(StrategyState).first()
        if strategy:
            if isinstance(strategy.weekly_goals, list) and set(strategy.weekly_goals) == set(FAKE_WEEKLY):
                strategy.weekly_goals = []
            if isinstance(strategy.monthly_goals, list) and set(strategy.monthly_goals) == set(FAKE_MONTHLY):
                strategy.monthly_goals = []
            if strategy.progress_percent == 5.0:
                strategy.progress_percent = 0.0

        FAKE_STATUS_TASKS = {
            "Запустить Telegram-канал AUREON": "completed",
            "Получить первого платящего клиента": "in_progress",
            "Разработать AI-бот для демо": "in_progress",
            "Написать 10 постов в Telegram": "in_progress",
            "Провести анализ 5 конкурентов": "completed",
        }
        for title, seeded_status in FAKE_STATUS_TASKS.items():
            task = db.query(Task).filter(Task.title == title).first()
            if task and task.status == seeded_status:
                task.status = "pending"

        # Delete fake named leads/offers that exist regardless of is_demo flag
        from models import Lead, Offer
        FAKE_LEAD_NAMES = [
            "Telegram Business Channel", "LocalStyle Brand",
            "SkillUp School", "MindGrow Blogger", "LaunchPad Startup",
        ]
        deleted_leads = db.query(Lead).filter(Lead.name.in_(FAKE_LEAD_NAMES)).delete(synchronize_session=False)
        deleted_offers = db.query(Offer).filter(Offer.client.in_(FAKE_LEAD_NAMES)).delete(synchronize_session=False)
        deleted_demo_leads = db.query(Lead).filter(Lead.is_demo == 1).delete(synchronize_session=False)
        deleted_demo_offers = db.query(Offer).filter(Offer.is_demo == 1).delete(synchronize_session=False)

        db.commit()
        print(f"Demo data migration: cleaned fake seeded data. "
              f"Removed {deleted_leads + deleted_demo_leads} fake leads, "
              f"{deleted_offers + deleted_demo_offers} fake offers.")
    except Exception as e:
        print(f"Demo data migration error: {e}")
        db.rollback()
    finally:
        db.close()


def _add_cinema_agent():
    from database import SessionLocal
    from models import Agent
    db = SessionLocal()
    try:
        if not db.query(Agent).filter(Agent.name == "Cinema Agent").first():
            db.add(Agent(
                name="Cinema Agent",
                role="mood, films, scenes, quotes, content references",
                status="active",
                current_task="Подбор фильмов и сцен под настроение AUREON-контента",
                last_result=None,
                priority=5,
                icon="🎬",
                color="#8B5CF6",
                tasks_completed=0,
            ))
            db.commit()
    except Exception:
        pass
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = next(get_db())
    try:
        seed_database(db)
        from memory.service import seed_initial_memories
        seed_initial_memories(db)
        _add_cinema_agent()
    finally:
        db.close()
    _migrate_clean_demo_data()
    sched.init_scheduler()

    polling_enabled = os.getenv("TELEGRAM_BOT_POLLING", "true").lower() != "false"
    bot_mode = os.getenv("TELEGRAM_BOT_MODE", "polling").lower()
    if bot_mode == "polling" and polling_enabled:
        tg_bot.start_polling()

    yield

    tg_bot.stop_polling()
    try:
        if sched._scheduler.running:
            sched._scheduler.shutdown(wait=False)
    except Exception:
        pass


app = FastAPI(title="AUREON CEO Agent API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents.router)
app.include_router(tasks.router)
app.include_router(leads.router)
app.include_router(content.router)
app.include_router(offers.router)
app.include_router(strategy.router)
app.include_router(settings.router)
app.include_router(telegram.router)
app.include_router(automation.router)
app.include_router(admin.router)
app.include_router(sales.router)
app.include_router(memory_router.router)
app.include_router(cinema.router)
app.include_router(miniapp.router)
app.include_router(conversations.router)
app.include_router(memory_collector.router)


@app.get("/")
def root():
    return {"name": "AUREON CEO Agent API", "status": "active", "version": "1.0.0"}


@app.get("/api/state")
def get_state(db: Session = Depends(get_db)):
    app_settings = db.query(Settings).first()
    strategy = db.query(StrategyState).first()
    active_agents = db.query(Agent).filter(Agent.status == "active").count()
    total_agents = db.query(Agent).count()
    pending_tasks = db.query(Task).filter(Task.status == "pending").count()
    completed_tasks = db.query(Task).filter(Task.status == "completed").count()
    total_tasks = db.query(Task).count()

    risk = get_risk_level(
        pending_tasks,
        strategy.revenue_current if strategy else 0,
        strategy.revenue_goal if strategy else 100000,
    )

    return {
        "project_name": app_settings.project_name if app_settings else "AUREON",
        "founder_name": app_settings.founder_name if app_settings else "Максим",
        "status": "ACTIVE",
        "focus_of_day": get_focus_of_day(),
        "risk_level": risk,
        "days_until_waic": days_until_waic(),
        "active_agents": active_agents,
        "total_agents": total_agents,
        "pending_tasks": pending_tasks,
        "completed_tasks": completed_tasks,
        "total_tasks": total_tasks,
        "progress_percent": strategy.progress_percent if strategy else 0,
        "revenue_current": strategy.revenue_current if strategy else 0,
        "revenue_goal": strategy.revenue_goal if strategy else 100000,
        "autonomy_level": app_settings.autonomy_level if app_settings else 1,
        "waic_date": app_settings.waic_date if app_settings else "2027-07-01",
    }


@app.get("/api/actions")
def get_actions(limit: int = 20, db: Session = Depends(get_db)):
    return db.query(ActionLog).order_by(ActionLog.id.desc()).limit(limit).all()


@app.post("/api/run-cycle", response_model=CycleResult)
def run_cycle(db: Session = Depends(get_db)):
    return run_ceo_cycle(db)


@app.post("/api/generate-post")
def generate_post_endpoint(topic: str = "AUREON", db: Session = Depends(get_db)):
    from services.content_generator import generate_post
    from models import ContentPost
    post_data = generate_post(topic)
    post = ContentPost(**post_data)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@app.post("/api/generate-offer")
def generate_offer_endpoint(client: str, service: str, price: float = None, db: Session = Depends(get_db)):
    from services.sales_generator import generate_offer
    from models import Offer
    offer_data = generate_offer(client, service, price)
    offer = Offer(**offer_data)
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@app.post("/api/report")
def generate_report(db: Session = Depends(get_db)):
    strategy = db.query(StrategyState).first()
    total_tasks = db.query(Task).count()
    completed = db.query(Task).filter(Task.status == "completed").count()
    actions_count = db.query(ActionLog).count()

    return {
        "report": {
            "date": str(date.today()),
            "progress": strategy.progress_percent if strategy else 0,
            "revenue_current": strategy.revenue_current if strategy else 0,
            "revenue_goal": strategy.revenue_goal if strategy else 100000,
            "tasks_done": completed,
            "total_tasks": total_tasks,
            "actions_taken": actions_count,
            "days_until_waic": days_until_waic(),
            "status": "ON TRACK" if (strategy and strategy.progress_percent > 5) else "NEEDS ATTENTION",
        }
    }
