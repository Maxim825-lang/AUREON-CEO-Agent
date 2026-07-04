from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from routers.admin import require_admin

router = APIRouter(
    prefix="/api/conversations",
    tags=["conversations"],
    dependencies=[Depends(require_admin)],
)

# ── Temperature / stage badge colours (for frontend hints) ──────────────────

TEMP_COLOR  = {"cold": "#6B7280", "warm": "#F59E0B", "hot": "#EF4444"}
STAGE_COLOR = {
    "new": "#6B7280", "discovery": "#3B82F6", "qualified": "#8B5CF6",
    "proposal": "#10B981", "negotiation": "#F59E0B",
    "closing": "#EF4444", "won": "#10B981", "lost": "#6B7280",
}


def _serialize_conv(c, req, msgs, include_messages=False) -> dict:
    last = msgs[-1] if msgs else None
    reqs_clean = {
        k: v for k, v in (c.extracted_requirements or {}).items()
        if not k.startswith("_")
    }
    d = {
        "id":                       c.id,
        "purchase_request_id":      c.purchase_request_id,
        "lead_id":                  c.lead_id,
        "telegram_chat_id":         c.telegram_chat_id,
        "status":                   c.status,
        "needs_human":              c.needs_human,
        "ai_paused":                c.ai_paused,
        "summary":                  c.summary,
        "extracted_requirements":   reqs_clean,
        "client_name":              req.name if req else None,
        "service":                  req.service if req else None,
        "budget":                   req.budget if req else None,
        "msg_count":                len(msgs),
        "last_message":             last.text[:120] if last else None,
        "last_message_sender":      last.sender if last else None,
        "created_at":               c.created_at.isoformat() if c.created_at else None,
        "updated_at":               c.updated_at.isoformat() if c.updated_at else None,
        # Sales Brain
        "deal_probability":          getattr(c, "deal_probability", 0),
        "urgency":                   getattr(c, "urgency", "low"),
        "client_temperature":        getattr(c, "client_temperature", "cold"),
        "budget_confidence":         getattr(c, "budget_confidence", 0),
        "requirements_completeness": getattr(c, "requirements_completeness", 0),
        "decision_stage":            getattr(c, "decision_stage", "new"),
        "estimated_revenue":         getattr(c, "estimated_revenue", 0),
        "estimated_close_date":      getattr(c, "estimated_close_date", None),
        "recommended_next_action":   getattr(c, "recommended_next_action", None),
        "risk_level":                getattr(c, "risk_level", "medium"),
        "pain_points":               getattr(c, "pain_points", []) or [],
        "goals":                     getattr(c, "goals", []) or [],
        "budget_range":              getattr(c, "budget_range", None),
        "deadline":                  getattr(c, "deadline", None),
        "competitors":               getattr(c, "competitors", []) or [],
        "is_stale":                  getattr(c, "is_stale", False),
        "follow_up_count":           getattr(c, "follow_up_count", 0),
        "last_client_message_at":    (
            c.last_client_message_at.isoformat()
            if getattr(c, "last_client_message_at", None) else None
        ),
        # colour hints
        "temperature_color": TEMP_COLOR.get(getattr(c, "client_temperature", "cold"), "#6B7280"),
        "stage_color":       STAGE_COLOR.get(getattr(c, "decision_stage", "new"), "#6B7280"),
    }
    if include_messages:
        d["messages"] = [
            {
                "id":         m.id,
                "sender":     m.sender,
                "text":       m.text,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ]
    return d


# ── List / detail ─────────────────────────────────────────────────────────────

@router.get("")
def list_conversations(db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage, PurchaseRequest
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    result = []
    for c in convs:
        req  = db.query(PurchaseRequest).filter(PurchaseRequest.id == c.purchase_request_id).first()
        msgs = (db.query(ConversationMessage)
                .filter(ConversationMessage.conversation_id == c.id)
                .order_by(ConversationMessage.id.asc()).all())
        result.append(_serialize_conv(c, req, msgs))
    return result


@router.get("/dashboard")
def sales_dashboard(db: Session = Depends(get_db)):
    from services.sales_brain import get_sales_summary
    return get_sales_summary(db)


@router.get("/{conv_id}")
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage, PurchaseRequest
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    req  = db.query(PurchaseRequest).filter(PurchaseRequest.id == c.purchase_request_id).first()
    msgs = (db.query(ConversationMessage)
            .filter(ConversationMessage.conversation_id == c.id)
            .order_by(ConversationMessage.id.asc()).all())
    return _serialize_conv(c, req, msgs, include_messages=True)


@router.get("/{conv_id}/timeline")
def get_timeline(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationEvent
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    events = (db.query(ConversationEvent)
              .filter(ConversationEvent.conversation_id == conv_id)
              .order_by(ConversationEvent.created_at.asc())
              .all())
    return [
        {
            "id":          e.id,
            "event_type":  e.event_type,
            "description": e.description,
            "created_at":  e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


# ── Stage control ─────────────────────────────────────────────────────────────

class SetStageBody(BaseModel):
    stage: str


@router.post("/{conv_id}/set-stage")
def set_stage(conv_id: int, body: SetStageBody, db: Session = Depends(get_db)):
    from models import Conversation
    from services.sales_brain import log_event, calculate_deal_probability
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    valid = {"new", "discovery", "qualified", "proposal", "negotiation", "closing", "won", "lost"}
    if body.stage not in valid:
        raise HTTPException(400, f"Invalid stage. Must be one of: {valid}")
    old = c.decision_stage
    c.decision_stage = body.stage
    if body.stage == "won":
        c.deal_probability = 100
        c.status = "closed"
    elif body.stage == "lost":
        c.deal_probability = 0
        c.status = "closed"
    else:
        c.deal_probability = calculate_deal_probability(c)
    db.commit()
    log_event(conv_id, "stage_change", f"Manual: {old} → {body.stage}", db)
    return {"ok": True, "decision_stage": body.stage, "deal_probability": c.deal_probability}


# ── Messaging controls ────────────────────────────────────────────────────────

@router.post("/{conv_id}/send-next-question")
def send_next_question(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation
    from services.discovery_agent import send_next_question as _do
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    if not c.telegram_chat_id:
        raise HTTPException(400, "No telegram_chat_id — cannot send")
    text = _do(c, db)
    return {"ok": True, "sent": text}


class SendMessageBody(BaseModel):
    text: str


@router.post("/{conv_id}/send-message")
def admin_send_message(conv_id: int, body: SendMessageBody, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage, ActionLog
    from services.telegram_bot import _send
    from services.sales_brain import log_event
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "text required")
    db.add(ConversationMessage(conversation_id=c.id, sender="admin", text=text))
    db.add(ActionLog(
        agent="Admin",
        action=f"Manual message — conv #{conv_id}",
        result=text[:100],
        status="success",
    ))
    db.commit()
    log_event(conv_id, "admin_message", text[:80], db)
    if c.telegram_chat_id:
        _send(c.telegram_chat_id, text)
    return {"ok": True}


@router.post("/{conv_id}/take-over")
def take_over(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage
    from services.sales_brain import log_event
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    c.ai_paused = True
    db.add(ConversationMessage(
        conversation_id=c.id,
        sender="admin",
        text="[Admin took over — AI paused]",
    ))
    db.commit()
    log_event(conv_id, "admin_takeover", "Admin paused AI, took over conversation", db)
    return {"ok": True, "ai_paused": True}


@router.post("/{conv_id}/resume-ai")
def resume_ai(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage
    from services.sales_brain import log_event
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    c.ai_paused = False
    c.needs_human = False
    if c.status not in ("ready_for_proposal", "proposal_sent", "closed"):
        c.status = "active"
    db.add(ConversationMessage(
        conversation_id=c.id,
        sender="admin",
        text="[AI resumed]",
    ))
    db.commit()
    log_event(conv_id, "ai_resumed", "AI resumed by admin", db)
    return {"ok": True, "ai_paused": False}


@router.post("/{conv_id}/generate-proposal")
def generate_proposal(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation
    from services.discovery_agent import _generate_offer_draft
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    reqs = {k: v for k, v in (c.extracted_requirements or {}).items() if not k.startswith("_")}
    offer = _generate_offer_draft(c, reqs, db)
    if offer:
        if c.status not in ("proposal_sent", "closed"):
            c.status = "proposal_sent"
        db.commit()
        return {"ok": True, "offer_id": offer.id, "client": offer.client}
    return {"ok": False, "detail": "Could not generate proposal — no linked purchase request"}
