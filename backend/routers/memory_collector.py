from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import memory_collector_bot as mc

router = APIRouter(prefix="/api/memory-collector", tags=["memory-collector"])


class CollectorSave(BaseModel):
    text: str
    memory_type: Optional[str] = "note"  # idea | task | client | note
    telegram_user_id: Optional[str] = None
    username: Optional[str] = None
    tags: Optional[List[str]] = []


@router.post("/save")
def save(data: CollectorSave, db: Session = Depends(get_db)):
    result = mc.save_note(
        db, data.text,
        kind=data.memory_type or "note",
        telegram_user_id=data.telegram_user_id,
        username=data.username,
        tags=data.tags or [],
    )
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.get("/today")
def today(db: Session = Depends(get_db)):
    entries = mc.get_today(db)
    return {"count": len(entries), "entries": entries}


@router.get("/search")
def search(q: str = Query(..., min_length=1), limit: int = Query(20, le=100), db: Session = Depends(get_db)):
    results = mc.search_notes(db, q, limit=limit)
    return {"query": q, "count": len(results), "results": results}


@router.get("/recent")
def recent(
    type: Optional[str] = Query(None, description="idea | task | client | note"),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    return mc.get_recent(db, kind=type, limit=limit)


@router.post("/{entry_id}/to-task")
def to_task(entry_id: int, db: Session = Depends(get_db)):
    result = mc.convert_to_task(db, entry_id)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@router.post("/{entry_id}/pin")
def pin(entry_id: int, db: Session = Depends(get_db)):
    result = mc.pin_to_founder(db, entry_id)
    if not result["ok"]:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
