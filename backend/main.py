from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date
from dotenv import load_dotenv

load_dotenv()

from database import engine, get_db, Base
import models
from seed import seed_database
from schemas import CycleResult
from services.ceo_cycle import run_ceo_cycle
from services.strategy_engine import days_until_waic, get_focus_of_day, get_risk_level
from models import ActionLog, Task, Agent, Settings, StrategyState

from routers import agents, tasks, leads, content, offers, strategy, settings, telegram

Base.metadata.create_all(bind=engine)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = next(get_db())
    try:
        seed_database(db)
    finally:
        db.close()
    yield


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
