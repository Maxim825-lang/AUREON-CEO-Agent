from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Lead
from services import scheduler as sched
from services.telegram_service import is_configured as tg_is_configured

router = APIRouter(prefix="/api/automation", tags=["automation"])


@router.get("/status")
def get_status(db: Session = Depends(get_db)):
    status = sched.get_automation_status()
    real_leads = db.query(Lead).filter(Lead.is_demo != 1).count()
    demo_leads = db.query(Lead).filter(Lead.is_demo == 1).count()
    tg_connected = tg_is_configured()
    status["real_sales_mode"] = real_leads > 0
    status["telegram_connected"] = tg_connected
    status["real_leads_count"] = real_leads
    status["demo_data_cleared"] = demo_leads == 0
    return status


@router.post("/start")
def start(db: Session = Depends(get_db)):
    sched.start_automation()
    status = sched.get_automation_status()
    real_leads = db.query(Lead).filter(Lead.is_demo != 1).count()
    status["real_sales_mode"] = real_leads > 0
    status["telegram_connected"] = tg_is_configured()
    status["real_leads_count"] = real_leads
    return {"ok": True, **status}


@router.post("/stop")
def stop(db: Session = Depends(get_db)):
    sched.stop_automation()
    status = sched.get_automation_status()
    real_leads = db.query(Lead).filter(Lead.is_demo != 1).count()
    status["real_sales_mode"] = real_leads > 0
    status["telegram_connected"] = tg_is_configured()
    status["real_leads_count"] = real_leads
    return {"ok": True, **status}


@router.post("/run-now")
def run_now(db: Session = Depends(get_db)):
    sched.run_cycle_now()
    status = sched.get_automation_status()
    real_leads = db.query(Lead).filter(Lead.is_demo != 1).count()
    status["real_sales_mode"] = real_leads > 0
    status["telegram_connected"] = tg_is_configured()
    status["real_leads_count"] = real_leads
    return {"ok": True, **status}
