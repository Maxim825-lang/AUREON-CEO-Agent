"""
Discovery Agent — autonomous AI conversation manager for AUREON sales discovery.

Conducts structured but natural discovery conversations via Telegram.
Tracks which questions have been asked, extracts requirements from answers,
and decides when enough data exists to generate a proposal.

Safety guarantees:
- Never claims to be human or a specific person
- Never promises exact prices/deadlines
- Never accepts payment
- Flags payment/contract/legal requests → needs_human
"""

import logging

logger = logging.getLogger(__name__)

# ── Discovery question bank ───────────────────────────────────────────────────
# Each topic has a key, question, required flag, and detection keywords.
# _last_asked is stored in extracted_requirements to track the current question.

DISCOVERY_TOPICS = [
    {
        "key": "goal",
        "question": (
            "Расскажите подробнее — какую главную задачу должен решать бот?\n"
            "Например: принимать заказы, консультировать клиентов, автоматизировать уведомления или управлять записями."
        ),
        "required": True,
        "label": "Основная цель",
    },
    {
        "key": "users",
        "question": (
            "Кто будет пользоваться: ваши клиенты, сотрудники или оба?\n"
            "Примерное количество пользователей в месяц?"
        ),
        "required": True,
        "label": "Пользователи",
    },
    {
        "key": "features",
        "question": (
            "Какие функции точно нужны?\n"
            "Например: каталог, форма заявки, FAQ, уведомления, личный кабинет, опросы."
        ),
        "required": True,
        "label": "Функции",
    },
    {
        "key": "integrations",
        "question": (
            "Нужны ли интеграции с внешними системами?\n"
            "Например: CRM, Google Таблицы, платёжные системы, 1С, email."
        ),
        "required": False,
        "label": "Интеграции",
    },
    {
        "key": "timeline",
        "question": "Есть ли фиксированный дедлайн или событие, к которому нужно запуститься?",
        "required": True,
        "label": "Дедлайн",
    },
    {
        "key": "admin",
        "question": (
            "Нужна ли возможность самостоятельно редактировать контент бота без программиста?"
        ),
        "required": False,
        "label": "Панель управления",
    },
    {
        "key": "design",
        "question": (
            "Есть ли фирменный стиль — логотип, цвета, тон общения?\n"
            "Или это нужно разработать?"
        ),
        "required": False,
        "label": "Дизайн/стиль",
    },
    {
        "key": "success",
        "question": (
            "Как вы поймёте, что проект успешен?\n"
            "Какой конкретный результат вы ожидаете?"
        ),
        "required": True,
        "label": "Критерий успеха",
    },
    {
        "key": "examples",
        "question": (
            "Есть ли боты или сервисы, которые вам нравятся как ориентир?\n"
            "Поделитесь ссылкой или коротким описанием."
        ),
        "required": False,
        "label": "Референсы",
    },
]

REQUIRED_KEYS = [t["key"] for t in DISCOVERY_TOPICS if t["required"]]

# ── Safety triggers ───────────────────────────────────────────────────────────

_SAFETY = [
    ("оплатит", "payment"),
    ("оплату", "payment"),
    ("оплата", "payment"),
    ("реквизит", "payment"),
    ("перевод", "payment"),
    ("счёт", "payment"),
    ("договор", "contract"),
    ("юридич", "legal"),
    ("гарантир", "guarantee"),
    ("возврат денег", "refund"),
    ("подать в суд", "legal"),
    ("я максим", "identity"),
    ("ты максим", "identity"),
    ("ты человек", "identity"),
    ("ты живой", "identity"),
    ("/human", "human_needed"),
    ("позвоните", "human_needed"),
    ("перезвоните", "human_needed"),
    ("поговорить с человеком", "human_needed"),
]

_SAFETY_REPLIES = {
    "payment": (
        "Вопросы оплаты и реквизитов — за пределами моей зоны. "
        "Передаю запрос команде AUREON, они свяжутся с вами. ✅"
    ),
    "contract": (
        "Договор и условия обсуждаются с командой AUREON напрямую. "
        "Передаю ваш запрос. ✅"
    ),
    "legal": (
        "Юридические вопросы — за пределами моей компетенции. "
        "Передаю команде AUREON. ✅"
    ),
    "guarantee": (
        "Конкретные гарантии — договорная тема. "
        "Передаю ваш запрос специалистам. ✅"
    ),
    "refund": "Вопросы возврата обсуждаются с командой AUREON. Передаю запрос. ✅",
    "identity": (
        "Я — AI-представитель AUREON, не человек. "
        "Но я полностью в курсе вашего проекта. "
        "Если нужен живой специалист — напишите /human."
    ),
    "human_needed": (
        "Понял, хотите поговорить с человеком. "
        "Передаю ваш запрос команде AUREON — ответят в ближайшее время. 🙌"
    ),
}

_ACKS = [
    "Понял.", "Отлично.", "Хорошо.", "Ясно.", "Принято.",
    "Записал.", "Понял, спасибо.", "Записал это.", "Отлично, спасибо.",
]

_COMPLETION = (
    "Отлично — у меня достаточно информации, чтобы подготовить предложение. 🙌\n\n"
    "Сейчас сформирую черновик КП и передам команде AUREON для проверки.\n"
    "Ответим в течение 24 часов."
)


# ── Core logic ────────────────────────────────────────────────────────────────

def _next_topic(reqs: dict):
    """Return the next unanswered topic, required first, then up to 2 optional."""
    answered = set(reqs.keys()) - {"_last_asked"}
    # Required topics first
    for t in DISCOVERY_TOPICS:
        if t["required"] and t["key"] not in answered:
            return t
    # Optional topics — ask at most 2
    optional_done = sum(1 for t in DISCOVERY_TOPICS if not t["required"] and t["key"] in answered)
    if optional_done < 2:
        for t in DISCOVERY_TOPICS:
            if not t["required"] and t["key"] not in answered:
                return t
    return None


def _is_ready(reqs: dict, msg_count: int) -> bool:
    answered = set(reqs.keys()) - {"_last_asked"}
    required_done = all(k in answered for k in REQUIRED_KEYS)
    return required_done and (msg_count >= len(REQUIRED_KEYS) * 2 or len(answered) >= 5)


def _check_safety(text: str):
    tl = text.lower()
    for kw, trigger in _SAFETY:
        if kw in tl:
            return trigger, _SAFETY_REPLIES.get(trigger, _SAFETY_REPLIES["human_needed"])
    return None, None


def _build_summary(reqs: dict) -> str:
    lines = ["📋 Discovery Summary\n"]
    for t in DISCOVERY_TOPICS:
        if t["key"] in reqs:
            lines.append(f"• {t['label']}: {str(reqs[t['key']])[:120]}")
    return "\n".join(lines)


# ── Public API ────────────────────────────────────────────────────────────────

def build_first_message(req) -> str:
    name = (req.name or "").split()[0] or "Привет"
    service = req.service or "AI-решение"
    return (
        f"Привет, {name}! 👋\n\n"
        f"Я — AI-представитель AUREON.\n"
        f"Ваша заявка на <b>{service}</b> принята в работу.\n\n"
        f"Чтобы подготовить точное предложение, уточню несколько деталей — займёт 5–7 минут.\n\n"
        + DISCOVERY_TOPICS[0]["question"]
    )


def start_discovery(req, db):
    """Create Conversation and send first message. Called on approve."""
    from models import Conversation, ConversationMessage, Lead
    from services.telegram_bot import _send
    from services.sales_brain import log_event

    # Idempotent — don't create duplicate conversations
    existing = db.query(Conversation).filter(
        Conversation.purchase_request_id == req.id,
        Conversation.status.notin_(["closed"]),
    ).first()
    if existing:
        return existing

    lead_id = req.lead_id
    conv = Conversation(
        purchase_request_id=req.id,
        lead_id=lead_id,
        telegram_chat_id=req.telegram_chat_id,
        status="active" if req.telegram_chat_id else "waiting_client",
        extracted_requirements={"_last_asked": DISCOVERY_TOPICS[0]["key"]},
        decision_stage="new",
        deal_probability=10,
        client_temperature="cold",
        risk_level="medium",
        urgency="low",
    )
    db.add(conv)
    db.flush()

    first_msg = build_first_message(req)
    db.add(ConversationMessage(
        conversation_id=conv.id,
        sender="agent",
        text=first_msg,
    ))
    db.commit()

    log_event(conv.id, "lead_created",
              f"Purchase request approved — discovery started", db)

    if req.telegram_chat_id:
        try:
            _send(req.telegram_chat_id, first_msg)
        except Exception as e:
            logger.error(f"Discovery first message send error: {e}")

    return conv


def handle_client_message(conv, text: str, db, chat_id: str) -> None:
    """Route an incoming Telegram message through the discovery engine."""
    from models import ConversationMessage, ActionLog
    from services.telegram_bot import _send, _log
    from services.sales_brain import run_analysis, log_event

    # Save the client's message
    db.add(ConversationMessage(
        conversation_id=conv.id,
        sender="client",
        text=text,
    ))
    db.flush()

    # Run Sales Brain analysis on every client message
    try:
        run_analysis(conv, text, db)
    except Exception as e:
        logger.warning(f"Sales Brain analysis error: {e}")

    msg_count = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == conv.id,
        ConversationMessage.sender == "client",
    ).count()

    reqs = dict(conv.extracted_requirements or {})

    # Safety check
    trigger, safety_reply = _check_safety(text)
    if trigger in ("payment", "contract", "legal", "guarantee", "refund", "human_needed"):
        conv.needs_human = True
        conv.ai_paused = True
        conv.extracted_requirements = reqs
        _save_agent_msg(conv, safety_reply, db)
        db.commit()
        _send(chat_id, safety_reply)
        _notify_needs_human(conv, db)
        _log(db, "Discovery Agent", f"Safety trigger '{trigger}' in conv #{conv.id}")
        return

    if trigger == "identity":
        _save_agent_msg(conv, safety_reply, db)
        db.commit()
        _send(chat_id, safety_reply)
        return

    # Extract answer for the question we last asked
    last_asked = reqs.get("_last_asked")
    if last_asked and last_asked not in reqs and len(text.strip()) >= 3:
        reqs[last_asked] = text.strip()[:300]

    # Check readiness
    if _is_ready(reqs, msg_count):
        reqs.pop("_last_asked", None)
        conv.extracted_requirements = reqs
        conv.status = "ready_for_proposal"
        conv.summary = _build_summary(reqs)
        conv.decision_stage = "qualified"
        conv.requirements_completeness = 100
        _save_agent_msg(conv, _COMPLETION, db)
        db.commit()
        _send(chat_id, _COMPLETION)
        log_event(conv.id, "requirements_complete",
                  f"{len(reqs)} topics covered — ready for proposal", db)
        _generate_offer_draft(conv, reqs, db)
        _notify_ready(conv, db)
        _log(db, "Discovery Agent", f"Conv #{conv.id} ready_for_proposal — {len(reqs)} topics covered")
        return

    # Ask next question
    next_t = _next_topic(reqs)
    if not next_t:
        # All covered — ready
        reqs.pop("_last_asked", None)
        conv.extracted_requirements = reqs
        conv.status = "ready_for_proposal"
        conv.summary = _build_summary(reqs)
        conv.decision_stage = "qualified"
        conv.requirements_completeness = 100
        _save_agent_msg(conv, _COMPLETION, db)
        db.commit()
        _send(chat_id, _COMPLETION)
        log_event(conv.id, "requirements_complete",
                  f"{len(reqs)} topics covered — ready for proposal", db)
        _generate_offer_draft(conv, reqs, db)
        _notify_ready(conv, db)
        return

    reqs["_last_asked"] = next_t["key"]
    conv.extracted_requirements = reqs
    conv.status = "waiting_client"

    ack = _ACKS[msg_count % len(_ACKS)]
    reply = f"{ack}\n\n{next_t['question']}"
    _save_agent_msg(conv, reply, db)
    db.commit()
    _send(chat_id, reply)
    _log(db, "Discovery Agent", f"Conv #{conv.id} asked '{next_t['key']}'. Covered: {[k for k in reqs if not k.startswith('_')]}")


def send_next_question(conv, db) -> str:
    """Admin-triggered: send the next AI question. Returns text sent."""
    from services.telegram_bot import _send

    reqs = dict(conv.extracted_requirements or {})
    if _is_ready(reqs, 99):
        text = _COMPLETION
        conv.status = "ready_for_proposal"
        conv.summary = _build_summary(reqs)
    else:
        next_t = _next_topic(reqs)
        if next_t:
            reqs["_last_asked"] = next_t["key"]
            conv.extracted_requirements = reqs
            text = next_t["question"]
        else:
            text = _COMPLETION
            conv.status = "ready_for_proposal"

    _save_agent_msg(conv, text, db)
    db.commit()
    if conv.telegram_chat_id:
        _send(conv.telegram_chat_id, text)
    return text


# ── Internal helpers ──────────────────────────────────────────────────────────

def _save_agent_msg(conv, text: str, db):
    from models import ConversationMessage
    db.add(ConversationMessage(
        conversation_id=conv.id,
        sender="agent",
        text=text,
    ))


def _generate_offer_draft(conv, reqs: dict, db):
    from models import Offer, PurchaseRequest
    from services.sales_brain import log_event
    req = db.query(PurchaseRequest).filter(PurchaseRequest.id == conv.purchase_request_id).first()
    if not req:
        return None

    goal = reqs.get("goal", req.service or "AI-решение")
    features = reqs.get("features", "Уточняются")
    timeline = reqs.get("timeline", req.deadline or "По договорённости")

    content = (
        f"# Коммерческое предложение AUREON\n\n"
        f"**Клиент:** {req.name}\n"
        f"**Услуга:** {req.service}\n"
        f"**Бюджет:** {req.budget or 'Обсуждается'}\n\n"
        f"## Цели проекта\n{goal}\n\n"
        f"## Функциональные требования\n{features}\n\n"
    )
    if reqs.get("integrations"):
        content += f"## Интеграции\n{reqs['integrations']}\n\n"
    if reqs.get("success"):
        content += f"## Критерий успеха\n{reqs['success']}\n\n"
    content += f"## Сроки\n{timeline}\n\n"
    content += "## Следующий шаг\nКоманда AUREON подготовит детальное КП в течение 24 часов."

    price = _parse_price(req.budget)
    offer = Offer(
        client=req.name,
        service=req.service,
        price=price,
        timeline=timeline,
        status="draft",
        content=content,
        lead_id=conv.lead_id,
    )
    db.add(offer)
    db.commit()
    log_event(conv.id, "proposal_generated",
              f"Draft KP created — offer #{offer.id} for {req.name}", db)
    conv.decision_stage = "proposal"
    db.commit()
    return offer


def _parse_price(budget_str):
    if not budget_str:
        return None
    b = str(budget_str).replace("$", "").replace(",", "").replace(" ", "").split("-")[0]
    try:
        return float(b)
    except ValueError:
        return None


def _notify_ready(conv, db):
    from services.report_service import get_founder_chat_id
    from services.telegram_bot import _send
    founder_cid = get_founder_chat_id(db)
    if not founder_cid:
        return
    try:
        from models import PurchaseRequest
        req = db.query(PurchaseRequest).filter(PurchaseRequest.id == conv.purchase_request_id).first()
        name = req.name if req else "Клиент"
        service = req.service if req else ""
        _send(founder_cid, (
            f"🎯 <b>Discovery завершён!</b>\n\n"
            f"Клиент: <b>{name}</b> — {service}\n"
            f"Статус: <b>Ready for Proposal</b>\n\n"
            f"Черновик КП создан. Откройте Conversations в AUREON."
        ))
    except Exception as e:
        logger.error(f"notify_ready error: {e}")


def _notify_needs_human(conv, db):
    from services.report_service import get_founder_chat_id
    from services.telegram_bot import _send
    founder_cid = get_founder_chat_id(db)
    if not founder_cid:
        return
    try:
        from models import PurchaseRequest
        req = db.query(PurchaseRequest).filter(PurchaseRequest.id == conv.purchase_request_id).first()
        name = req.name if req else "Клиент"
        _send(founder_cid, (
            f"⚠️ <b>Клиент запросил человека</b>\n\n"
            f"Клиент: <b>{name}</b>\n"
            f"Chat ID: <code>{conv.telegram_chat_id}</code>\n\n"
            f"Требуется ручная обработка. Откройте Conversations в AUREON."
        ))
    except Exception as e:
        logger.error(f"notify_needs_human error: {e}")
