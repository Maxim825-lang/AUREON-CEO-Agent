from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import StrategyState
from schemas import StrategySchema

router = APIRouter(prefix="/api/strategy", tags=["strategy"])


@router.get("", response_model=StrategySchema)
def get_strategy(db: Session = Depends(get_db)):
    strategy = db.query(StrategyState).first()
    return strategy


@router.patch("")
def update_strategy(data: dict, db: Session = Depends(get_db)):
    strategy = db.query(StrategyState).first()
    if strategy:
        for key, value in data.items():
            if hasattr(strategy, key):
                setattr(strategy, key, value)
        db.commit()
    return {"status": "updated"}
