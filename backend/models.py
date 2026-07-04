from sqlalchemy import Column, Integer, String, Text, Float, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from database import Base


class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    role = Column(String(100))
    status = Column(String(50), default="idle")
    current_task = Column(Text)
    last_result = Column(Text)
    priority = Column(Integer, default=1)
    icon = Column(String(10))
    color = Column(String(20))
    tasks_completed = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    description = Column(Text)
    agent = Column(String(100))
    status = Column(String(50), default="pending")
    priority = Column(String(20), default="medium")
    due_date = Column(String(50))
    tags = Column(JSON, default=list)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ActionLog(Base):
    __tablename__ = "action_logs"

    id = Column(Integer, primary_key=True)
    agent = Column(String(100))
    action = Column(String(200))
    result = Column(Text)
    status = Column(String(50), default="success")
    extra_data = Column(JSON, default=dict)
    created_at = Column(DateTime, server_default=func.now())


class Lead(Base):
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    company = Column(String(200))
    contact = Column(String(200))
    platform = Column(String(100))
    niche = Column(String(100))
    problem = Column(Text)
    aureon_offer = Column(Text)
    estimated_price = Column(Float)
    status = Column(String(50), default="new")
    last_message = Column(Text)
    email = Column(String(200))
    telegram = Column(String(100))
    score = Column(Integer, default=0)
    source_url = Column(String(500))
    notes = Column(Text)
    is_demo = Column(Integer, default=0)
    telegram_chat_id = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ContentPost(Base):
    __tablename__ = "content_posts"

    id = Column(Integer, primary_key=True)
    title = Column(String(300))
    content = Column(Text)
    topic = Column(String(100))
    status = Column(String(50), default="draft")
    platform = Column(String(50), default="telegram")
    tags = Column(JSON, default=list)
    views = Column(Integer, default=0)
    is_demo = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True)
    client = Column(String(200))
    service = Column(String(200))
    price = Column(Float)
    timeline = Column(String(100))
    status = Column(String(50), default="draft")
    content = Column(Text)
    lead_id = Column(Integer)
    is_demo = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class StrategyState(Base):
    __tablename__ = "strategy_state"

    id = Column(Integer, primary_key=True)
    main_goal = Column(Text)
    weekly_goals = Column(JSON, default=list)
    monthly_goals = Column(JSON, default=list)
    risks = Column(JSON, default=list)
    ceo_decisions = Column(JSON, default=list)
    roadmap = Column(JSON, default=list)
    progress_percent = Column(Float, default=0)
    revenue_goal = Column(Float, default=0)
    revenue_current = Column(Float, default=0)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True)
    project_name = Column(String(200), default="AUREON")
    founder_name = Column(String(100), default="Максим")
    main_goal = Column(Text, default="Подготовка AUREON к WAIC 2027")
    revenue_goal = Column(Float, default=100000)
    telegram_channel = Column(String(100), default="@aureon_ai")
    openai_api_key = Column(String(200), default="")
    autonomy_level = Column(Integer, default=1)
    waic_date = Column(String(50), default="2027-07-01")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SalesConversation(Base):
    __tablename__ = "sales_conversations"

    id = Column(Integer, primary_key=True)
    lead_id = Column(Integer, nullable=False)
    platform = Column(String(50), default="telegram")
    status = Column(String(50), default="open")  # open, won, lost
    last_inbound_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class SalesMessage(Base):
    __tablename__ = "sales_messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, nullable=False)
    lead_id = Column(Integer, nullable=False)
    direction = Column(String(10), nullable=False)  # outbound, inbound
    content = Column(Text, nullable=False)
    platform = Column(String(50), default="telegram")
    sent = Column(Boolean, default=False)
    sent_at = Column(DateTime)
    telegram_message_id = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())


class TelegramUser(Base):
    __tablename__ = "telegram_users"

    id = Column(Integer, primary_key=True)
    chat_id = Column(String(100), unique=True, nullable=False)
    username = Column(String(100))
    first_name = Column(String(200))
    last_name = Column(String(200))
    is_admin = Column(Boolean, default=False)
    registered_at = Column(DateTime, server_default=func.now())
    last_seen_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    command_count = Column(Integer, default=0)
    last_command = Column(String(100))


class SalesSettings(Base):
    __tablename__ = "sales_settings"

    id = Column(Integer, primary_key=True)
    real_sales_mode = Column(Boolean, default=False)
    auto_send_first = Column(Boolean, default=False)
    auto_reply = Column(Boolean, default=False)
    daily_limit = Column(Integer, default=5)
    allowed_platforms = Column(JSON, default=lambda: ["telegram"])
    forbidden_words = Column(JSON, default=list)
    max_discount = Column(Integer, default=20)
    min_price = Column(Float, default=100.0)
    telegram_bot_token = Column(String(300), default="")
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
