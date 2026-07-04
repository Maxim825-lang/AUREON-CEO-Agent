from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Offer
from schemas import OfferSchema, OfferCreate
from services.sales_generator import generate_offer
from services.services_catalog import AUREON_SERVICES
from typing import List

router = APIRouter(prefix="/api/offers", tags=["offers"])


@router.get("", response_model=List[OfferSchema])
def get_offers(db: Session = Depends(get_db)):
    return db.query(Offer).order_by(Offer.id.desc()).all()


@router.post("/generate", response_model=OfferSchema)
def generate_offer_endpoint(data: OfferCreate, db: Session = Depends(get_db)):
    offer_data = generate_offer(data.client, data.service, data.price)
    offer = Offer(**offer_data)
    if data.lead_id:
        offer.lead_id = data.lead_id
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return offer


@router.patch("/{offer_id}/status")
def update_offer_status(offer_id: int, status: str, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if offer:
        offer.status = status
        db.commit()
    return {"status": "updated"}


@router.delete("/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if offer:
        db.delete(offer)
        db.commit()
    return {"status": "deleted"}


@router.get("/services/catalog")
def get_services_catalog():
    return AUREON_SERVICES
