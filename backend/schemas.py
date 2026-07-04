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
    contact: Optional[str] = ""
    platform: Optional[str] = ""
    niche: Optional[str] = ""
    problem: Optional[str] = ""
    aureon_offer: Optional[str] = ""
    estimated_price: Optional[float] = 0
    status: Optional[str] = "new"
    email: Optional[str] = ""
    telegram: Optional[str] = ""
    source_url: Optional[str] = ""
    notes: Optional[str] = ""
    is_demo: Optional[int] = 0


class LeadSchema(BaseModel):
    id: int
    name: str
    company: Optional[str]
    contact: Optional[str]
    platform: Optional[str]
    niche: Optional[str]
    problem: Optional[str]
    aureon_offer: Optional[str]
    estimated_price: Optional[float]
    status: str
    last_message: Optional[str]
    email: Optional[str]
    telegram: Optional[str]
    score: int
    source_url: Optional[str]
    notes: Optional[str]
    is_demo: Optional[int]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class FindLeadsRequest(BaseModel):
    niche: str
    location: str = "Worldwide"
    service: str = "AI Telegram Bot"
    max_results: Optional[int] = 10


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


# ── Sales Agent ──────────────────────────────────────────────────────────────

class SalesConversationSchema(BaseModel):
    id: int
    lead_id: int
    platform: Optional[str]
    status: str
    last_inbound_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class SalesMessageSchema(BaseModel):
    id: int
    conversation_id: int
    lead_id: int
    direction: str
    content: str
    platform: Optional[str]
    sent: bool
    sent_at: Optional[datetime]
    created_at: Optional[datetime]

    class Config:
        from_attributes = True


class SalesSettingsSchema(BaseModel):
    id: int
    real_sales_mode: bool
    auto_send_first: bool
    auto_reply: bool
    daily_limit: int
    allowed_platforms: Optional[Any]
    forbidden_words: Optional[Any]
    max_discount: int
    min_price: float
    telegram_bot_token: str

    class Config:
        from_attributes = True


class SalesSettingsUpdate(BaseModel):
    real_sales_mode: Optional[bool] = None
    auto_send_first: Optional[bool] = None
    auto_reply: Optional[bool] = None
    daily_limit: Optional[int] = None
    allowed_platforms: Optional[List[str]] = None
    forbidden_words: Optional[List[str]] = None
    max_discount: Optional[int] = None
    min_price: Optional[float] = None
    telegram_bot_token: Optional[str] = None


class ImportLeadsRequest(BaseModel):
    leads: List[dict]  # list of {name, telegram, niche, company, problem, estimated_price, source_url}


class ImportUsernamesRequest(BaseModel):
    usernames: str  # newline-separated @usernames
    niche: Optional[str] = "general"
    source: Optional[str] = "manual"


class AddInboundRequest(BaseModel):
    content: str
    platform: Optional[str] = "telegram"
