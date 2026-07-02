from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import ContentPost
from services import telegram_service

router = APIRouter(prefix="/api/telegram", tags=["telegram"])


@router.post("/test")
def test_telegram():
    try:
        result = telegram_service.test_connection()
        return {"status": "ok", "username": result["username"], "name": result["name"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")


@router.post("/publish-latest-post")
def publish_latest_post(db: Session = Depends(get_db)):
    post = (
        db.query(ContentPost)
        .filter(ContentPost.status.in_(["ready", "draft"]))
        .order_by(ContentPost.id.desc())
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Нет постов со статусом ready или draft")

    text = f"<b>{post.title}</b>\n\n{post.content or ''}"
    try:
        telegram_service.send_message(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")

    post.status = "published"
    db.commit()
    return {"status": "published", "post_id": post.id, "title": post.title}


@router.post("/publish-post/{post_id}")
def publish_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(ContentPost).filter(ContentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Пост не найден")
    if post.status == "published":
        raise HTTPException(status_code=400, detail="Пост уже опубликован")

    text = f"<b>{post.title}</b>\n\n{post.content or ''}"
    try:
        telegram_service.send_message(text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Ошибка Telegram API: {str(e)}")

    post.status = "published"
    db.commit()
    return {"status": "published", "post_id": post.id, "title": post.title}


@router.get("/status")
def telegram_status():
    return {"configured": telegram_service.is_configured()}
