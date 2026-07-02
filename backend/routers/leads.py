from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Lead
from schemas import LeadSchema, LeadCreate
from typing import List

router = APIRouter(prefix="/api/leads", tags=["leads"])


@router.get("", response_model=List[LeadSchema])
def get_leads(db: Session = Depends(get_db)):
    return db.query(Lead).order_by(Lead.score.desc()).all()


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
    if lead:
        lead.status = status
        db.commit()
    return {"status": "updated"}


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()
    if lead:
        db.delete(lead)
        db.commit()
    return {"status": "deleted"}
