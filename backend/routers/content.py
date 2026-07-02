from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import ContentPost
from schemas import ContentPostSchema, ContentPostCreate
from services.content_generator import generate_post
from typing import List

router = APIRouter(prefix="/api/content", tags=["content"])


@router.get("", response_model=List[ContentPostSchema])
def get_posts(db: Session = Depends(get_db)):
    return db.query(ContentPost).order_by(ContentPost.id.desc()).all()


@router.post("/generate", response_model=ContentPostSchema)
def generate_content_post(data: ContentPostCreate, db: Session = Depends(get_db)):
    post_data = generate_post(data.topic)
    post = ContentPost(**post_data)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.patch("/{post_id}/status")
def update_post_status(post_id: int, status: str, db: Session = Depends(get_db)):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if post:
        post.status = status
        db.commit()
    return {"status": "updated"}


@router.delete("/{post_id}")
def delete_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if post:
        db.delete(post)
        db.commit()
    return {"status": "deleted"}
