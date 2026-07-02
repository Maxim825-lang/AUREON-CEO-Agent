from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import datetime


class AgentSchema(BaseModel):
    id: int
    name: str
    role: Optional[str]
    status: str
    current_task: Optional[str]
    last_result: Optional[str]
    priority: int
    icon: Optional[str]
    color: Optional[str]
    tasks_completed: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = ""
    agent: Optional[str] = "CEO Agent"
    priority: Optional[str] = "medium"
    due_date: Optional[str] = None
    tags: Optional[List[str]] = []


class TaskSchema(BaseModel):
    id: int
    title: str
    description: Optional[str]
    agent: Optional[str]
    status: str
    priority: str
    due_date: Optional[str]
    tags: Optional[Any]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ActionLogSchema(BaseModel):
    id: int
    agent: Optional[str]
    action: str
    result: Optional[str]
    status: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class LeadCreate(BaseModel):
    name: str
    company: Optional[str] = ""
    niche: Optional[str] = ""
    problem: Optional[str] = ""
    aureon_offer: Optional[str] = ""
    estimated_price: Optional[float] = 0
    status: Optional[str] = "new"
    email: Optional[str] = ""
    telegram: Optional[str] = ""


class LeadSchema(BaseModel):
    id: int
    name: str
    company: Optional[str]
    niche: Optional[str]
    problem: Optional[str]
    aureon_offer: Optional[str]
    estimated_price: Optional[float]
    status: str
    last_message: Optional[str]
    email: Optional[str]
    telegram: Optional[str]
    score: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class ContentPostCreate(BaseModel):
    title: Optional[str] = ""
    topic: Optional[str] = "AI"
    tags: Optional[List[str]] = []


class ContentPostSchema(BaseModel):
    id: int
    title: Optional[str]
    content: Optional[str]
    topic: Optional[str]
    status: str
    platform: str
    tags: Optional[Any]
    views: int
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class OfferCreate(BaseModel):
    client: str
    service: str
    price: Optional[float] = 0
    timeline: Optional[str] = ""
    lead_id: Optional[int] = None


class OfferSchema(BaseModel):
    id: int
    client: str
    service: Optional[str]
    price: Optional[float]
    timeline: Optional[str]
    status: str
    content: Optional[str]
    lead_id: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class StrategySchema(BaseModel):
    id: int
    main_goal: Optional[str]
    weekly_goals: Optional[Any]
    monthly_goals: Optional[Any]
    risks: Optional[Any]
    ceo_decisions: Optional[Any]
    roadmap: Optional[Any]
    progress_percent: float
    revenue_goal: float
    revenue_current: float

    class Config:
        from_attributes = True


class SettingsSchema(BaseModel):
    id: int
    project_name: str
    founder_name: str
    main_goal: str
    revenue_goal: float
    telegram_channel: str
    openai_api_key: str
    autonomy_level: int
    waic_date: str

    class Config:
        from_attributes = True


class SettingsUpdate(BaseModel):
    project_name: Optional[str] = None
    founder_name: Optional[str] = None
    main_goal: Optional[str] = None
    revenue_goal: Optional[float] = None
    telegram_channel: Optional[str] = None
    openai_api_key: Optional[str] = None
    autonomy_level: Optional[int] = None


class CycleResult(BaseModel):
    status: str
    actions: List[dict]
    summary: str
    tasks_created: int
    posts_generated: int
