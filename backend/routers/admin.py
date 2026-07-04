from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Lead, Offer, ContentPost, ActionLog

router = APIRouter(prefix="/api/admin", tags=["admin"])

FAKE_LEAD_NAMES = [
    "Telegram Business Channel",
    "LocalStyle Brand",
    "SkillUp School",
    "MindGrow Blogger",
    "LaunchPad Startup",
]

FAKE_ACTION_RESULTS = [
    "Система запущена. Все агенты активированы. База данных инициализирована.",
    "Рынок AI-автоматизации растёт на 35% г/г. Ниша малого бизнеса практически свободна.",
    "Найдено 5 потенциальных клиентов. Добавлены в CRM.",
    "Пост 'AUREON: AI-агентство нового поколения' создан. Готов к публикации.",
    "AI-бот: $1,200 чек, $340 себестоимость, маржа 71.7%. Точка безубыточности: 2 клиента.",
    "Стратегия утверждена: 4 фазы, цель $100K выручки к Q2 2027.",
]


@router.post("/clear-demo-data")
def clear_demo_data(db: Session = Depends(get_db)):
    # Delete by is_demo flag
    deleted_leads = db.query(Lead).filter(Lead.is_demo == 1).delete()
    deleted_offers = db.query(Offer).filter(Offer.is_demo == 1).delete()
    deleted_posts = db.query(ContentPost).filter(ContentPost.is_demo == 1).delete()

    # Delete by known fake names (even if is_demo=0)
    for name in FAKE_LEAD_NAMES:
        n = db.query(Lead).filter(Lead.name == name).delete()
        deleted_leads += n

    for name in ["SkillUp School", "LaunchPad Startup"]:
        n = db.query(Offer).filter(Offer.client == name).delete()
        deleted_offers += n

    # Delete fake seeded action logs
    deleted_actions = 0
    for fake_result in FAKE_ACTION_RESULTS:
        n = db.query(ActionLog).filter(ActionLog.result == fake_result).delete()
        deleted_actions += n

    db.commit()
    return {
        "status": "ok",
        "deleted_leads": deleted_leads,
        "deleted_offers": deleted_offers,
        "deleted_posts": deleted_posts,
        "deleted_actions": deleted_actions,
        "message": (
            f"Удалено: {deleted_leads} лидов, {deleted_offers} офферов, "
            f"{deleted_posts} постов, {deleted_actions} фейковых action logs"
        ),
    }


@router.get("/demo-data-count")
def demo_data_count(db: Session = Depends(get_db)):
    demo_leads_flag = db.query(Lead).filter(Lead.is_demo == 1).count()
    demo_leads_name = db.query(Lead).filter(Lead.name.in_(FAKE_LEAD_NAMES)).count()
    demo_offers_flag = db.query(Offer).filter(Offer.is_demo == 1).count()
    demo_offers_name = db.query(Offer).filter(Offer.client.in_(["SkillUp School", "LaunchPad Startup"])).count()
    demo_actions = db.query(ActionLog).filter(ActionLog.result.in_(FAKE_ACTION_RESULTS)).count()
    return {
        "demo_leads": demo_leads_flag + demo_leads_name,
        "demo_offers": demo_offers_flag + demo_offers_name,
        "demo_posts": db.query(ContentPost).filter(ContentPost.is_demo == 1).count(),
        "demo_actions": demo_actions,
        "real_leads": db.query(Lead).filter(Lead.is_demo != 1).filter(Lead.name.notin_(FAKE_LEAD_NAMES)).count(),
        "real_offers": db.query(Offer).filter(Offer.is_demo != 1).filter(Offer.client.notin_(["SkillUp School", "LaunchPad Startup"])).count(),
    }
