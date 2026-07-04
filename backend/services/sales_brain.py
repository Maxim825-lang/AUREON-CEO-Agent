"""
AUREON Sales Brain — Deal scoring, analysis, and recommendation engine.

Called after every client message to update Conversation intelligence fields.
Pure rule-based scoring — no external API calls.
"""
from __future__ import annotations
import re
from datetime import datetime, timedelta
from typing import Any

# ── Signal keyword banks ──────────────────────────────────────────────────────

BUYING_SIGNALS = [
    "хочу", "нужен", "нужна", "нужно", "планирую", "готов",
    "берём", "берем", "сколько стоит", "давайте", "договорились",
    "подходит", "нравится", "отлично", "интересует",
    "let's", "deal", "agree", "go ahead", "proceed", "ready",
]
OBJECTION_SIGNALS = [
    "дорого", "дороговато", "не могу", "не готов", "подумаю", "посмотрю",
    "не уверен", "сомневаюсь", "не сейчас", "позже", "отложим",
    "нашёл дешевле", "нашел дешевле", "другой вариант",
    "too expensive", "not sure", "maybe later",
]
URGENCY_HIGH_KW = ["срочно", "asap", "как можно быстрее", "немедленно", "горит", "urgent", "сегодня", "завтра"]
URGENCY_MED_KW  = ["на следующей неделе", "в этом месяце", "в ближайшее время", "скоро", "soon"]
BUDGET_KW       = ["бюджет", "стоимость", "цена", "сколько", "budget", "price", "cost", "$", "₽", "тысяч", "руб"]
COMPETITOR_KW   = ["другая компания", "другой исполнитель", "нашли дешевле", "альтернатива",
                   "upwork", "фрилансер", "freelancer", "другой подрядчик"]
NEGOTIATION_KW  = ["скидк", "можно меньше", "дешевле", "пересмотреть", "negotiate", "discount", "торг"]
CLOSING_KW      = ["договор", "счёт", "счет", "предоплат", "оплат", "подпишем",
                   "начинаем", "ready to pay", "invoice", "contract"]
PAIN_KW         = ["проблема", "боль", "сложно", "не работает", "теряем", "тратим",
                   "медленно", "неудобно", "trouble", "issue", "problem"]
GOAL_KW         = ["хочу", "нужно", "цель", "планирую", "должно", "чтобы", "want", "need", "goal"]


def _any(text: str, kws: list[str]) -> bool:
    t = text.lower()
    return any(kw in t for kw in kws)


# ── Per-message signal extraction ─────────────────────────────────────────────

def analyze_message(text: str) -> dict[str, Any]:
    t = text.lower()
    return {
        "buying_signal":   _any(t, BUYING_SIGNALS),
        "objection":       _any(t, OBJECTION_SIGNALS),
        "urgency_high":    _any(t, URGENCY_HIGH_KW),
        "urgency_med":     _any(t, URGENCY_MED_KW),
        "budget_mention":  _any(t, BUDGET_KW),
        "competitor_kw":   _any(t, COMPETITOR_KW),
        "negotiation_kw":  _any(t, NEGOTIATION_KW),
        "closing_kw":      _any(t, CLOSING_KW),
        "pain_point":      _any(t, PAIN_KW),
        "goal_mention":    _any(t, GOAL_KW),
        "word_count":      len(text.split()),
        "long_message":    len(text.split()) > 25,
    }


def _extract_entities(text: str, conv) -> dict:
    updates: dict[str, Any] = {}
    t = text.lower()

    if _any(t, PAIN_KW):
        pains = list(conv.pain_points or [])
        snippet = text.strip()[:150]
        if snippet not in pains:
            pains.append(snippet)
        updates["pain_points"] = pains[:5]

    if _any(t, GOAL_KW):
        goals = list(conv.goals or [])
        snippet = text.strip()[:150]
        if snippet not in goals:
            goals.append(snippet)
        updates["goals"] = goals[:5]

    if _any(t, COMPETITOR_KW):
        comps = list(conv.competitors or [])
        snippet = text.strip()[:100]
        if snippet not in comps:
            comps.append(snippet)
        updates["competitors"] = comps[:3]

    # Budget amount
    m = re.search(r'(\d[\d\s]{1,8})\s*(тыс|руб|usd|\$|₽|k\b)', t)
    if m and not conv.budget_range:
        updates["budget_range"] = m.group(0).strip()

    # Deadline
    deadline_kw = ["через ", "до ", "конец ", "конца ", "недел", "месяц", "квартал"]
    if any(kw in t for kw in deadline_kw) and not conv.deadline:
        updates["deadline"] = text.strip()[:120]

    return updates


# ── Scoring ───────────────────────────────────────────────────────────────────

def calculate_deal_probability(conv) -> int:
    if conv.decision_stage == "won":
        return 100
    if conv.decision_stage == "lost":
        return 0

    score = 10
    reqs = conv.extracted_requirements or {}
    answered = [k for k, v in reqs.items() if v and not k.startswith("_")]
    score += min(len(answered) * 7, 35)

    if conv.budget_range:
        score += 12
    if conv.deadline or reqs.get("timeline"):
        score += 8
    if reqs.get("goal") or conv.goals:
        score += 5

    all_text = " ".join(str(v) for k, v in reqs.items() if not k.startswith("_"))
    if _any(all_text, BUYING_SIGNALS):
        score += 10
    if _any(all_text, OBJECTION_SIGNALS):
        score -= 12
    if conv.competitors:
        score -= 8
    if conv.is_stale:
        score -= 15

    stage_bonus = {
        "discovery": 0, "qualified": 5, "proposal": 15,
        "negotiation": 25, "closing": 35,
    }
    score += stage_bonus.get(conv.decision_stage or "new", 0)

    return max(5, min(95, score))


def calculate_temperature(prob: int) -> str:
    if prob >= 60:
        return "hot"
    if prob >= 30:
        return "warm"
    return "cold"


def calculate_budget_confidence(conv) -> int:
    if conv.budget_range:
        return 80
    reqs = conv.extracted_requirements or {}
    all_text = " ".join(str(v) for k, v in reqs.items() if not k.startswith("_"))
    if _any(all_text, BUDGET_KW):
        return 45
    return 10


def calculate_requirements_completeness(conv) -> int:
    reqs = conv.extracted_requirements or {}
    answered = [k for k, v in reqs.items() if v and not k.startswith("_")]
    return min(100, int(len(answered) / 9 * 100))


def determine_decision_stage(conv, sig: dict) -> str:
    current = conv.decision_stage or "new"
    if current in ("won", "lost"):
        return current

    if sig.get("closing_kw"):
        return "closing"
    if sig.get("negotiation_kw") and current not in ("closing",):
        return "negotiation"

    if conv.status == "proposal_sent" and current not in ("negotiation", "closing", "won", "lost"):
        return "proposal"
    if conv.status == "ready_for_proposal" and current not in ("proposal", "negotiation", "closing", "won", "lost"):
        return "qualified"

    reqs = conv.extracted_requirements or {}
    answered = [k for k, v in reqs.items() if v and not k.startswith("_")]
    if current == "new":
        return "discovery"
    if current == "discovery" and len(answered) >= 3:
        return "qualified"

    return current


def determine_urgency(conv, sig: dict) -> str:
    if sig.get("urgency_high"):
        return "high"
    if sig.get("urgency_med"):
        return "medium"
    timeline = str(
        (conv.extracted_requirements or {}).get("timeline") or conv.deadline or ""
    ).lower()
    if any(kw in timeline for kw in URGENCY_HIGH_KW):
        return "high"
    if any(kw in timeline for kw in URGENCY_MED_KW):
        return "medium"
    return "low"


def determine_risk(conv, prob: int) -> str:
    if conv.is_stale or conv.needs_human:
        return "high"
    if conv.competitors:
        return "high"
    if prob < 30:
        return "high"
    if prob < 55:
        return "medium"
    return "low"


def estimate_revenue(conv, db) -> float:
    br = conv.budget_range or (conv.extracted_requirements or {}).get("budget_range")
    if br:
        nums = re.findall(r"\d+", str(br).replace(" ", ""))
        if nums:
            val = int(nums[0])
            if val < 1000:
                val *= 1000
            return float(min(val, 500_000))
    try:
        from models import PurchaseRequest
        pr = db.query(PurchaseRequest).filter(
            PurchaseRequest.id == conv.purchase_request_id
        ).first()
        if pr and pr.budget:
            nums = re.findall(r"\d+", str(pr.budget).replace(" ", "").replace(",", ""))
            if nums:
                val = int(nums[0])
                if val < 1000:
                    val *= 1000
                return float(min(val, 500_000))
    except Exception:
        pass
    return 0.0


def estimate_close_date(conv, urgency: str) -> str:
    now = datetime.utcnow()
    timeline_str = str(
        (conv.extracted_requirements or {}).get("timeline") or conv.deadline or ""
    ).lower()

    weeks_m  = re.search(r"(\d+)\s*(недел|week)", timeline_str)
    months_m = re.search(r"(\d+)\s*(месяц|month)", timeline_str)

    if weeks_m:
        close = now + timedelta(weeks=int(weeks_m.group(1)))
    elif months_m:
        close = now + timedelta(days=int(months_m.group(1)) * 30)
    elif urgency == "high":
        close = now + timedelta(days=7)
    elif urgency == "medium":
        close = now + timedelta(days=21)
    else:
        close = now + timedelta(days=45)

    return close.strftime("%Y-%m-%d")


def choose_next_action(conv, prob: int, sig: dict) -> str:
    if conv.status == "closed":
        return "—"

    if conv.needs_human or sig.get("closing_kw"):
        return "Escalate to founder"

    if conv.decision_stage in ("closing", "negotiation"):
        return "Escalate to founder"

    completeness = calculate_requirements_completeness(conv)

    if conv.status == "ready_for_proposal":
        return "Generate proposal"

    if conv.status == "proposal_sent":
        if conv.last_client_message_at:
            hours = (datetime.utcnow() - conv.last_client_message_at).total_seconds() / 3600
            if hours > 24:
                return "Follow up tomorrow"
        return "Wait for client response"

    if sig.get("objection"):
        return "Offer cheaper solution" if prob < 30 else "Address objection"

    if sig.get("buying_signal") and completeness >= 60:
        return "Generate proposal"

    if completeness >= 80:
        return "Generate proposal"

    if conv.is_stale:
        return "Mark stale — consider closing"

    return "Ask question"


# ── Timeline logging ──────────────────────────────────────────────────────────

def log_event(conv_id: int, event_type: str, description: str, db) -> None:
    try:
        from models import ConversationEvent
        db.add(ConversationEvent(
            conversation_id=conv_id,
            event_type=event_type,
            description=description,
        ))
        db.commit()
    except Exception:
        pass


# ── Main analysis entry point ─────────────────────────────────────────────────

def run_analysis(conv, latest_text: str, db) -> dict[str, Any]:
    """
    Analyze latest client message, update all scoring fields on the Conversation,
    log timeline events for stage changes and new signals.
    """
    sig = analyze_message(latest_text)

    had_budget = bool(conv.budget_range)
    updates = _extract_entities(latest_text, conv)
    for field, val in updates.items():
        setattr(conv, field, val)
    budget_found = not had_budget and bool(conv.budget_range)

    conv.last_client_message_at = datetime.utcnow()

    old_stage = conv.decision_stage
    conv.decision_stage = determine_decision_stage(conv, sig)

    prob = calculate_deal_probability(conv)
    conv.deal_probability          = prob
    conv.client_temperature        = calculate_temperature(prob)
    conv.budget_confidence         = calculate_budget_confidence(conv)
    conv.requirements_completeness = calculate_requirements_completeness(conv)
    conv.urgency                   = determine_urgency(conv, sig)
    conv.risk_level                = determine_risk(conv, prob)
    conv.estimated_revenue         = estimate_revenue(conv, db)
    conv.estimated_close_date      = estimate_close_date(conv, conv.urgency)
    conv.recommended_next_action   = choose_next_action(conv, prob, sig)

    db.commit()

    if old_stage != conv.decision_stage:
        log_event(conv.id, "stage_change",
                  f"{old_stage or 'new'} → {conv.decision_stage}", db)

    if budget_found:
        log_event(conv.id, "budget_identified", f"Budget: {conv.budget_range}", db)

    return {
        "deal_probability":        prob,
        "client_temperature":      conv.client_temperature,
        "decision_stage":          conv.decision_stage,
        "urgency":                 conv.urgency,
        "risk_level":              conv.risk_level,
        "estimated_revenue":       conv.estimated_revenue,
        "recommended_next_action": conv.recommended_next_action,
    }


# ── Follow-up engine ──────────────────────────────────────────────────────────

def check_follow_ups(db) -> list[dict]:
    """
    Called hourly by scheduler. Detects silent conversations, updates
    recommended_next_action, notifies founder.
    """
    from models import Conversation
    now = datetime.utcnow()
    results = []

    active = db.query(Conversation).filter(
        Conversation.status.in_(["active", "waiting_client", "proposal_sent"]),
        Conversation.last_client_message_at.isnot(None),
        Conversation.is_stale == False,
    ).all()

    for conv in active:
        if getattr(conv, "is_stale", False):
            continue
        hours = (now - conv.last_client_message_at).total_seconds() / 3600
        fc = conv.follow_up_count or 0

        action = None
        if hours >= 168 and fc < 3:
            conv.is_stale = True
            conv.recommended_next_action = "Mark stale — consider closing"
            conv.risk_level = "high"
            action = "stale"
        elif hours >= 72 and fc < 2:
            action = "follow_up_2"
            conv.follow_up_count = 2
            conv.recommended_next_action = "Follow up (day 3)"
        elif hours >= 24 and fc < 1:
            action = "follow_up_1"
            conv.follow_up_count = 1
            conv.recommended_next_action = "Follow up tomorrow"

        if action:
            db.commit()
            results.append({"conv_id": conv.id, "action": action, "hours_silent": round(hours, 1)})
            log_event(conv.id, f"follow_up",
                      f"Silent {round(hours)}h — {conv.recommended_next_action}", db)
            _notify_follow_up(conv, hours, db)

    return results


def _notify_follow_up(conv, hours: float, db) -> None:
    try:
        from services.report_service import get_founder_chat_id
        from services.telegram_bot import _send
        cid = get_founder_chat_id(db)
        if not cid:
            return
        from models import PurchaseRequest
        pr = db.query(PurchaseRequest).filter(
            PurchaseRequest.id == conv.purchase_request_id
        ).first()
        name = pr.name if pr else f"Conv #{conv.id}"
        _send(cid, (
            f"⏰ <b>Follow-up needed</b>\n\n"
            f"Client: {name}\n"
            f"Silent: {int(hours)}h\n"
            f"Stage: {conv.decision_stage}\n"
            f"Probability: {conv.deal_probability}%\n"
            f"Action: {conv.recommended_next_action}"
        ))
    except Exception:
        pass


# ── Dashboard / Report data ───────────────────────────────────────────────────

def get_sales_summary(db) -> dict:
    from models import Conversation

    convs = db.query(Conversation).filter(
        Conversation.status.notin_(["closed"])
    ).all()

    hot     = [c for c in convs if c.client_temperature == "hot"]
    at_risk = [c for c in convs if (c.risk_level == "high") and not c.is_stale]
    stale   = [c for c in convs if c.is_stale]
    ready   = [c for c in convs if c.status == "ready_for_proposal"]
    waiting = [c for c in convs if c.status == "proposal_sent"]
    needs_h = [c for c in convs if c.needs_human]

    pipeline = sum(c.estimated_revenue or 0 for c in convs)
    hot_rev  = sum(c.estimated_revenue or 0 for c in hot)

    top_opps = sorted(
        [
            {
                "id":      c.id,
                "stage":   c.decision_stage,
                "prob":    c.deal_probability,
                "temp":    c.client_temperature,
                "revenue": c.estimated_revenue,
                "action":  c.recommended_next_action,
            }
            for c in convs if (c.deal_probability or 0) > 0
        ],
        key=lambda x: x["prob"],
        reverse=True,
    )[:5]

    return {
        "total_active":         len(convs),
        "hot_leads":            len(hot),
        "at_risk":              len(at_risk),
        "stale":                len(stale),
        "ready_for_proposal":   len(ready),
        "waiting_client_reply": len(waiting),
        "needs_human":          len(needs_h),
        "pipeline_revenue":     pipeline,
        "hot_pipeline_revenue": hot_rev,
        "top_opportunities":    top_opps,
    }
