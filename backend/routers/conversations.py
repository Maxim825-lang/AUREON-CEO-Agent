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


def _serialize_conv(c, req, msgs, include_messages=False) -> dict:
    last = msgs[-1] if msgs else None
    d = {
        "id": c.id,
        "purchase_request_id": c.purchase_request_id,
        "lead_id": c.lead_id,
        "telegram_chat_id": c.telegram_chat_id,
        "status": c.status,
        "needs_human": c.needs_human,
        "ai_paused": c.ai_paused,
        "summary": c.summary,
        "extracted_requirements": {
            k: v for k, v in (c.extracted_requirements or {}).items()
            if not k.startswith("_")
        },
        "client_name": req.name if req else None,
        "service": req.service if req else None,
        "budget": req.budget if req else None,
        "msg_count": len(msgs),
        "last_message": last.text[:120] if last else None,
        "last_message_sender": last.sender if last else None,
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "updated_at": c.updated_at.isoformat() if c.updated_at else None,
    }
    if include_messages:
        d["messages"] = [
            {
                "id": m.id,
                "sender": m.sender,
                "text": m.text,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in msgs
        ]
    return d


@router.get("")
def list_conversations(db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage, PurchaseRequest
    convs = db.query(Conversation).order_by(Conversation.updated_at.desc()).all()
    result = []
    for c in convs:
        req = db.query(PurchaseRequest).filter(PurchaseRequest.id == c.purchase_request_id).first()
        msgs = db.query(ConversationMessage).filter(
            ConversationMessage.conversation_id == c.id
        ).order_by(ConversationMessage.id.asc()).all()
        result.append(_serialize_conv(c, req, msgs))
    return result


@router.get("/{conv_id}")
def get_conversation(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage, PurchaseRequest
    c = db.query(Conversation).filter(Conversation.id == conv_id).first()
    if not c:
        raise HTTPException(404, "Not found")
    req = db.query(PurchaseRequest).filter(PurchaseRequest.id == c.purchase_request_id).first()
    msgs = db.query(ConversationMessage).filter(
        ConversationMessage.conversation_id == c.id
    ).order_by(ConversationMessage.id.asc()).all()
    return _serialize_conv(c, req, msgs, include_messages=True)


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
    if c.telegram_chat_id:
        _send(c.telegram_chat_id, text)
    return {"ok": True}


@router.post("/{conv_id}/take-over")
def take_over(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage
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
    return {"ok": True, "ai_paused": True}


@router.post("/{conv_id}/resume-ai")
def resume_ai(conv_id: int, db: Session = Depends(get_db)):
    from models import Conversation, ConversationMessage
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
