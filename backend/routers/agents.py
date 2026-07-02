from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Agent
from schemas import AgentSchema
from typing import List

router = APIRouter(prefix="/api/agents", tags=["agents"])


@router.get("", response_model=List[AgentSchema])
def get_agents(db: Session = Depends(get_db)):
    return db.query(Agent).order_by(Agent.priority).all()


@router.get("/{agent_id}", response_model=AgentSchema)
def get_agent(agent_id: int, db: Session = Depends(get_db)):
    return db.query(Agent).filter(Agent.id == agent_id).first()


@router.patch("/{agent_id}/status")
def update_agent_status(agent_id: int, status: str, db: Session = Depends(get_db)):
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if agent:
        agent.status = status
        db.commit()
    return {"status": "updated"}
