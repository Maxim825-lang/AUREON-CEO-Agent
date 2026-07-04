"""
Text search for Memory Core. Architecture is prepared for vector search via embeddings.py.
"""
from sqlalchemy.orm import Session
from memory.models import MemoryEntry
from memory.embeddings import vector_search


def text_search(db: Session, query: str, types: list[str] | None = None, limit: int = 30) -> list[MemoryEntry]:
    q_lower = f"%{query.lower()}%"
    stmt = (
        db.query(MemoryEntry)
        .filter(
            MemoryEntry.is_archived == False,
            (
                MemoryEntry.title.ilike(q_lower)
                | MemoryEntry.summary.ilike(q_lower)
                | MemoryEntry.content.ilike(q_lower)
                | MemoryEntry.category.ilike(q_lower)
            ),
        )
        .order_by(MemoryEntry.importance.desc(), MemoryEntry.created_at.desc())
    )
    if types:
        stmt = stmt.filter(MemoryEntry.type.in_(types))
    results = stmt.limit(limit).all()
    # Vector re-ranking (stub — returns same order when no embeddings)
    return vector_search(query, results, top_k=limit)
