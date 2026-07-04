from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Lead, Offer, ContentPost

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/clear-demo-data")
def clear_demo_data(db: Session = Depends(get_db)):
    deleted_leads = db.query(Lead).filter(Lead.is_demo == 1).delete()
    deleted_offers = db.query(Offer).filter(Offer.is_demo == 1).delete()
    deleted_posts = db.query(ContentPost).filter(ContentPost.is_demo == 1).delete()
    db.commit()
    return {
        "status": "ok",
        "deleted_leads": deleted_leads,
        "deleted_offers": deleted_offers,
        "deleted_posts": deleted_posts,
        "message": f"Удалено: {deleted_leads} лидов, {deleted_offers} офферов, {deleted_posts} постов с меткой demo",
    }


@router.get("/demo-data-count")
def demo_data_count(db: Session = Depends(get_db)):
    return {
        "demo_leads": db.query(Lead).filter(Lead.is_demo == 1).count(),
        "demo_offers": db.query(Offer).filter(Offer.is_demo == 1).count(),
        "demo_posts": db.query(ContentPost).filter(ContentPost.is_demo == 1).count(),
        "real_leads": db.query(Lead).filter(Lead.is_demo != 1).count(),
        "real_offers": db.query(Offer).filter(Offer.is_demo != 1).count(),
    }
