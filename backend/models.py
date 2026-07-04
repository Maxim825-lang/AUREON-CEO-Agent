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
    telegram_channel = Column(String(100), default="@manager_aureon")
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


class PurchaseRequest(Base):
    __tablename__ = "purchase_requests"
    id = Column(Integer, primary_key=True)
    telegram_user_id = Column(String(100))
    telegram_chat_id = Column(String(100))
    username = Column(String(100))
    name = Column(String(200))
    service = Column(String(200))
    budget = Column(String(100))
    deadline = Column(String(100))
    project_description = Column(Text)
    contact = Column(String(200))
    status = Column(String(50), default="new")
    admin_notes = Column(Text)
    lead_id = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class PortfolioCase(Base):
    __tablename__ = "portfolio_cases"
    id = Column(Integer, primary_key=True)
    title = Column(String(300))
    client_name = Column(String(200))
    service = Column(String(200))
    problem = Column(Text)
    solution = Column(Text)
    result = Column(Text)
    price = Column(Float)
    duration = Column(String(100))
    status = Column(String(50), default="draft")
    source_lead_id = Column(Integer)
    source_request_id = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
    published_at = Column(DateTime)


class Testimonial(Base):
    __tablename__ = "testimonials"
    id = Column(Integer, primary_key=True)
    client_name = Column(String(200))
    text = Column(Text)
    rating = Column(Integer, default=5)
    service = Column(String(200))
    status = Column(String(50), default="draft")
    source_request_id = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(Integer, primary_key=True)
    purchase_request_id = Column(Integer)
    lead_id = Column(Integer)
    telegram_chat_id = Column(String(100))
    # active / waiting_client / ready_for_proposal / proposal_sent / closed
    status = Column(String(50), default="active")
    summary = Column(Text)
    extracted_requirements = Column(JSON, default=dict)
    needs_human = Column(Boolean, default=False)
    ai_paused = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # ── Sales Brain fields ────────────────────────────────────────────────────
    deal_probability          = Column(Integer, default=0)
    urgency                   = Column(String(20), default="low")
    client_temperature        = Column(String(20), default="cold")
    budget_confidence         = Column(Integer, default=0)
    requirements_completeness = Column(Integer, default=0)
    # new/discovery/qualified/proposal/negotiation/closing/won/lost
    decision_stage            = Column(String(30), default="new")
    estimated_revenue         = Column(Float, default=0.0)
    estimated_close_date      = Column(String(50))
    recommended_next_action   = Column(String(200))
    risk_level                = Column(String(20), default="medium")
    pain_points               = Column(JSON, default=list)
    goals                     = Column(JSON, default=list)
    constraints               = Column(JSON, default=list)
    must_have                 = Column(JSON, default=list)
    nice_to_have              = Column(JSON, default=list)
    budget_range              = Column(String(200))
    deadline                  = Column(String(200))
    competitors               = Column(JSON, default=list)
    preferred_solution        = Column(String(200))
    last_client_message_at    = Column(DateTime)
    follow_up_count           = Column(Integer, default=0)
    is_stale                  = Column(Boolean, default=False)


class ConversationMessage(Base):
    __tablename__ = "conversation_messages"
    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, nullable=False)
    sender = Column(String(20), nullable=False)  # client / agent / admin
    text = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class ConversationEvent(Base):
    __tablename__ = "conversation_events"
    id              = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, nullable=False)
    event_type      = Column(String(50))
    description     = Column(Text)
    created_at      = Column(DateTime, server_default=func.now())
