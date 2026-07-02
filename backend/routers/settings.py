import os
from pathlib import Path
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from dotenv import set_key
from database import get_db
from models import Settings
from schemas import SettingsSchema, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])

ENV_PATH = Path(__file__).parent.parent / ".env"


class TelegramSettingsUpdate(BaseModel):
    bot_token: str
    channel_id: str


@router.get("", response_model=SettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    return db.query(Settings).first()


@router.patch("", response_model=SettingsSchema)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    settings = db.query(Settings).first()
    if settings:
        update_data = data.model_dump(exclude_none=True)
        for key, value in update_data.items():
            setattr(settings, key, value)
        db.commit()
        db.refresh(settings)
    return settings


@router.post("/telegram")
def save_telegram_settings(data: TelegramSettingsUpdate):
    ENV_PATH.touch(exist_ok=True)
    set_key(str(ENV_PATH), "TELEGRAM_BOT_TOKEN", data.bot_token)
    set_key(str(ENV_PATH), "TELEGRAM_CHANNEL_ID", data.channel_id)
    os.environ["TELEGRAM_BOT_TOKEN"] = data.bot_token
    os.environ["TELEGRAM_CHANNEL_ID"] = data.channel_id
    configured = bool(data.bot_token.strip() and data.channel_id.strip())
    return {"status": "saved", "configured": configured}
