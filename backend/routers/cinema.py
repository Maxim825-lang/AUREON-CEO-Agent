from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from services import cinema_agent as ca

router = APIRouter(prefix="/api/cinema", tags=["cinema"])


class RecommendRequest(BaseModel):
    mood: str
    character_type: Optional[str] = "founder"
    goal: Optional[str] = "найти идеи для нарезки"
    topic: Optional[str] = "AUREON"


class SaveToMemoryRequest(BaseModel):
    result: dict
    memory_type: Optional[str] = "knowledge"


class CreatePostRequest(BaseModel):
    post_text: str
    topic: Optional[str] = "cinema"


@router.post("/recommend")
def recommend(data: RecommendRequest, db: Session = Depends(get_db)):
    try:
        movies = ca.recommend_movies(data.mood, data.character_type, data.goal)
        scenes = ca.recommend_scenes(data.mood, data.goal)
        quotes = ca.generate_quote_pack(data.mood)
        clip_ideas = ca.generate_clip_ideas(data.mood, platform="telegram")
        board = ca.create_content_reference_board(
            topic=data.topic or "AUREON",
            mood=data.mood,
            character_type=data.character_type,
            goal=data.goal,
        )
        return {
            "ok": True,
            "mood": data.mood,
            "character_type": data.character_type,
            "goal": data.goal,
            "movies": movies["movies"],
            "palette": movies["palette"],
            "scenes": scenes,
            "quotes": quotes,
            "clip_ideas": clip_ideas,
            "telegram_post": board["telegram_post"],
            "tiktok_script": board["tiktok_script"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenes")
def get_scenes(data: RecommendRequest):
    try:
        return ca.recommend_scenes(data.mood, data.goal)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quotes")
def get_quotes(data: RecommendRequest):
    try:
        return ca.generate_quote_pack(data.mood)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/clip-ideas")
def get_clip_ideas(data: RecommendRequest):
    try:
        platform = "tiktok" if "tiktok" in (data.goal or "").lower() else "telegram"
        return ca.generate_clip_ideas(data.mood, platform=platform)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/save-to-memory")
def save_to_memory(data: SaveToMemoryRequest, db: Session = Depends(get_db)):
    try:
        from memory.service import create_entry
        result = data.result
        mood = result.get("mood", "")
        movies = result.get("movies", [])
        movie_titles = [m.get("title", "") for m in movies[:3]]

        entry_data = {
            "type": data.memory_type,
            "category": "content_reference",
            "title": f"Cinema Reference: {mood.title()} Mood",
            "summary": f"Movies: {', '.join(movie_titles)}. Goal: {result.get('goal', '')}",
            "content": (
                f"Mood: {mood}\n"
                f"Character: {result.get('character_type', '')}\n"
                f"Goal: {result.get('goal', '')}\n\n"
                f"Movies:\n" +
                "\n".join(f"• {m.get('title')} — {m.get('why', '')[:80]}" for m in movies[:4]) +
                f"\n\nPalette: {result.get('palette', {}).get('name', '')} — "
                f"{result.get('palette', {}).get('feeling', '')}"
            ),
            "tags": ["cinema", "mood", mood.replace(" ", "-"), "content-reference"],
            "source": "cinema_agent",
            "importance": 3,
        }
        entry = create_entry(db, entry_data)
        from memory.service import serialize
        return {"ok": True, "entry": serialize(entry)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-post")
def create_post(data: CreatePostRequest, db: Session = Depends(get_db)):
    try:
        from models import ContentPost
        post = ContentPost(
            title=data.post_text[:60] + ("…" if len(data.post_text) > 60 else ""),
            content=data.post_text,
            topic=data.topic or "cinema",
            status="draft",
            platform="telegram",
            tags=["cinema", "mood", data.topic or "cinema"],
        )
        db.add(post)
        db.commit()
        db.refresh(post)
        return {
            "ok": True,
            "post_id": post.id,
            "title": post.title,
            "status": post.status,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
def get_history(limit: int = 20, db: Session = Depends(get_db)):
    try:
        from memory.models import MemoryEntry
        from memory.service import serialize
        entries = (
            db.query(MemoryEntry)
            .filter(
                MemoryEntry.category == "content_reference",
                MemoryEntry.source == "cinema_agent",
                MemoryEntry.is_archived == False,
            )
            .order_by(MemoryEntry.created_at.desc())
            .limit(limit)
            .all()
        )
        return [serialize(e) for e in entries]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/moods")
def get_moods():
    return [
            {"key": "discipline", "label": "Discipline", "emoji": "⚡"},
            {"key": "lonely_founder", "label": "Lonely Founder", "emoji": "🌙"},
            {"key": "dark_motivation", "label": "Dark Motivation", "emoji": "🔥"},
            {"key": "luxury_business", "label": "Luxury Business", "emoji": "💎"},
            {"key": "revenge_arc", "label": "Revenge Arc", "emoji": "⚔️"},
            {"key": "calm_focus", "label": "Calm Focus", "emoji": "🧘"},
            {"key": "future_scifi", "label": "Future / Sci-Fi", "emoji": "🚀"},
            {"key": "confidence", "label": "Confidence", "emoji": "👑"},
            {"key": "pressure", "label": "Pressure", "emoji": "⏱"},
            {"key": "victory", "label": "Victory", "emoji": "🏆"},
        ]
