from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from memory import service as svc
from memory.search import text_search

router = APIRouter(prefix="/api/memory", tags=["memory"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class MemoryEntryCreate(BaseModel):
    type: str
    category: Optional[str] = "general"
    title: str
    summary: Optional[str] = ""
    content: Optional[str] = ""
    tags: Optional[List[str]] = []
    entities: Optional[List[dict]] = []
    source: Optional[str] = "manual"
    importance: Optional[int] = 3
    linked_objects: Optional[List[dict]] = []


class MemoryEntryUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    entities: Optional[List[dict]] = None
    source: Optional[str] = None
    importance: Optional[int] = None
    linked_objects: Optional[List[dict]] = None
    is_archived: Optional[bool] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    return svc.get_stats(db)


@router.get("/search")
def search(
    q: str = Query(..., min_length=1),
    types: Optional[str] = Query(None, description="Comma-separated types: short,long,knowledge,experience,founder"),
    limit: int = Query(30, le=100),
    db: Session = Depends(get_db),
):
    type_list = [t.strip() for t in types.split(",")] if types else None
    results = text_search(db, q, types=type_list, limit=limit)
    return {"query": q, "count": len(results), "results": [svc.serialize(e) for e in results]}


@router.get("/timeline")
def get_timeline(
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db),
):
    return svc.get_timeline(db, limit=limit)


@router.get("/founder")
def get_founder(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    entries = svc.get_entries(db, type="founder", limit=limit)
    return [svc.serialize(e) for e in entries]


@router.get("/knowledge")
def get_knowledge(
    category: Optional[str] = None,
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    entries = svc.get_entries(db, type="knowledge", category=category, limit=limit)
    return [svc.serialize(e) for e in entries]


@router.get("/experience")
def get_experience(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    entries = svc.get_entries(db, type="experience", limit=limit)
    return [svc.serialize(e) for e in entries]


@router.get("/context")
def get_cycle_context(db: Session = Depends(get_db)):
    """Context endpoint for CEO Agent cycle."""
    return svc.get_context_for_cycle(db)


@router.get("")
def list_entries(
    type: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    archived: bool = False,
    limit: int = Query(50, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    entries = svc.get_entries(
        db, type=type, category=category, source=source,
        limit=limit, offset=offset, include_archived=archived
    )
    return [svc.serialize(e) for e in entries]


@router.post("")
def create_entry(data: MemoryEntryCreate, db: Session = Depends(get_db)):
    entry = svc.create_entry(db, data.model_dump())
    return svc.serialize(entry)


@router.get("/{entry_id}")
def get_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = svc.get_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    return svc.serialize(entry)


@router.put("/{entry_id}")
def update_entry(entry_id: int, data: MemoryEntryUpdate, db: Session = Depends(get_db)):
    updated = svc.update_entry(db, entry_id, {k: v for k, v in data.model_dump().items() if v is not None})
    if not updated:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    return svc.serialize(updated)


@router.delete("/{entry_id}")
def delete_entry(entry_id: int, db: Session = Depends(get_db)):
    ok = svc.delete_entry(db, entry_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    return {"ok": True}


@router.post("/{entry_id}/archive")
def archive_entry(entry_id: int, db: Session = Depends(get_db)):
    entry = svc.archive_entry(db, entry_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Memory entry not found")
    return svc.serialize(entry)
