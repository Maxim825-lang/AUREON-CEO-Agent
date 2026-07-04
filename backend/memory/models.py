from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from database import Base


class MemoryEntry(Base):
    __tablename__ = "memory_entries"

    id = Column(Integer, primary_key=True)
    # short | long | knowledge | experience | founder
    type = Column(String(50), nullable=False, index=True)
    # client | lead | task | deal | message | decision | brand | service | arch | principle | ...
    category = Column(String(100), default="general", index=True)
    title = Column(String(300), nullable=False)
    summary = Column(Text)
    content = Column(Text)
    tags = Column(JSON, default=list)
    entities = Column(JSON, default=list)          # [{type, value}]
    source = Column(String(100), default="manual") # ceo_cycle | sales | telegram | manual
    importance = Column(Integer, default=3)        # 1..5
    linked_objects = Column(JSON, default=list)    # [{type, id, label}]
    embedding_ready = Column(Boolean, default=False)
    ttl_expires_at = Column(DateTime, nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
