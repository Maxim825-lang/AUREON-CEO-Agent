"""
CRUD + business logic for Memory Core.
"""
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func as sqlfunc
from memory.models import MemoryEntry
from memory.summarizer import auto_summarize, extract_tags, detect_category


# ── CRUD ──────────────────────────────────────────────────────────────────────

def get_entries(
    db: Session,
    type: str | None = None,
    category: str | None = None,
    source: str | None = None,
    limit: int = 50,
    offset: int = 0,
    include_archived: bool = False,
) -> list[MemoryEntry]:
    q = db.query(MemoryEntry)
    if not include_archived:
        q = q.filter(MemoryEntry.is_archived == False)
    if type:
        q = q.filter(MemoryEntry.type == type)
    if category:
        q = q.filter(MemoryEntry.category == category)
    if source:
        q = q.filter(MemoryEntry.source == source)
    return q.order_by(MemoryEntry.importance.desc(), MemoryEntry.created_at.desc()).offset(offset).limit(limit).all()


def get_entry(db: Session, entry_id: int) -> MemoryEntry | None:
    return db.query(MemoryEntry).filter(MemoryEntry.id == entry_id).first()


def create_entry(db: Session, data: dict) -> MemoryEntry:
    content = data.get("content") or ""
    if not data.get("summary") and content:
        data["summary"] = auto_summarize(content)
    if not data.get("tags") and content:
        data["tags"] = extract_tags(content)
    if not data.get("category") or data["category"] == "general":
        combined = f"{data.get('title', '')} {content}"
        data["category"] = detect_category(combined)
    entry = MemoryEntry(**data)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def update_entry(db: Session, entry_id: int, data: dict) -> MemoryEntry | None:
    entry = get_entry(db, entry_id)
    if not entry:
        return None
    for k, v in data.items():
        if hasattr(entry, k) and v is not None:
            setattr(entry, k, v)
    db.commit()
    db.refresh(entry)
    return entry


def delete_entry(db: Session, entry_id: int) -> bool:
    entry = get_entry(db, entry_id)
    if not entry:
        return False
    db.delete(entry)
    db.commit()
    return True


def archive_entry(db: Session, entry_id: int) -> MemoryEntry | None:
    entry = get_entry(db, entry_id)
    if not entry:
        return None
    entry.is_archived = True
    db.commit()
    db.refresh(entry)
    return entry


# ── Timeline ──────────────────────────────────────────────────────────────────

def get_timeline(db: Session, limit: int = 100) -> list[dict]:
    entries = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.is_archived == False)
        .order_by(MemoryEntry.created_at.asc())
        .limit(limit)
        .all()
    )
    grouped: dict[str, list] = {}
    for e in entries:
        month = e.created_at.strftime("%B %Y") if e.created_at else "Unknown"
        if month not in grouped:
            grouped[month] = []
        grouped[month].append(_serialize(e))
    return [{"month": k, "events": v} for k, v in grouped.items()]


# ── Stats ─────────────────────────────────────────────────────────────────────

def get_stats(db: Session) -> dict:
    total = db.query(sqlfunc.count(MemoryEntry.id)).filter(MemoryEntry.is_archived == False).scalar() or 0
    by_type = {}
    for mem_type in ("short", "long", "knowledge", "experience", "founder"):
        count = (
            db.query(sqlfunc.count(MemoryEntry.id))
            .filter(MemoryEntry.type == mem_type, MemoryEntry.is_archived == False)
            .scalar() or 0
        )
        by_type[mem_type] = count
    recent = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.is_archived == False)
        .order_by(MemoryEntry.created_at.desc())
        .limit(5)
        .all()
    )
    important = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.is_archived == False, MemoryEntry.importance >= 4)
        .order_by(MemoryEntry.importance.desc(), MemoryEntry.created_at.desc())
        .limit(5)
        .all()
    )
    return {
        "total": total,
        "by_type": by_type,
        "recent": [_serialize(e) for e in recent],
        "important": [_serialize(e) for e in important],
    }


# ── CEO Cycle Integration ─────────────────────────────────────────────────────

def record_cycle_memory(db: Session, cycle_result: dict) -> MemoryEntry:
    summary_lines = [cycle_result.get("summary", "")]
    actions = cycle_result.get("actions", [])
    content_parts = []
    for a in actions:
        content_parts.append(f"[{a.get('agent')}] {a.get('action')}: {a.get('result')}")
    content = "\n".join(content_parts)

    entry = MemoryEntry(
        type="short",
        category="ceo_cycle",
        title=f"CEO Cycle — {datetime.now().strftime('%d.%m.%Y %H:%M')}",
        summary=summary_lines[0][:200] if summary_lines else "",
        content=content,
        tags=["ceo-cycle", "auto", "agents"],
        source="ceo_cycle",
        importance=3,
        entities=[{"type": "agent", "value": a.get("agent")} for a in actions[:3]],
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_context_for_cycle(db: Session) -> dict:
    """Return memory context relevant for CEO cycle decision-making."""
    experience = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.type == "experience", MemoryEntry.is_archived == False)
        .order_by(MemoryEntry.importance.desc())
        .limit(3)
        .all()
    )
    knowledge = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.type == "knowledge", MemoryEntry.is_archived == False)
        .order_by(MemoryEntry.importance.desc())
        .limit(3)
        .all()
    )
    recent_short = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.type == "short", MemoryEntry.is_archived == False)
        .order_by(MemoryEntry.created_at.desc())
        .limit(3)
        .all()
    )
    return {
        "experience": [{"title": e.title, "summary": e.summary} for e in experience],
        "knowledge": [{"title": e.title, "summary": e.summary} for e in knowledge],
        "recent": [{"title": e.title, "summary": e.summary} for e in recent_short],
    }


# ── Seed Initial Memories ─────────────────────────────────────────────────────

INITIAL_MEMORIES = [
    # ── Founder ───────────────────────────────────────────────────────────────
    {
        "type": "founder",
        "category": "mission",
        "title": "Почему создан AUREON",
        "summary": "AUREON создан чтобы доказать: один человек с AI-командой может конкурировать с целым агентством.",
        "content": (
            "AUREON — это эксперимент и бизнес одновременно. Основатель Максим видит, что AI делает "
            "невозможное возможным: один человек с правильно выстроенной системой может масштабироваться "
            "быстрее, чем команда из 10 людей. Цель — доказать это на WAIC 2027 и монетизировать систему.\n\n"
            "Ключевой инсайт: агентства тратят деньги на людей там, где AI справляется лучше. "
            "AUREON захватывает эту маржу."
        ),
        "tags": ["миссия", "основатель", "философия", "waic"],
        "source": "manual",
        "importance": 5,
    },
    {
        "type": "founder",
        "category": "architecture",
        "title": "Архитектурные решения: FastAPI + React + SQLite",
        "summary": "Выбран минимальный стек для максимальной скорости разработки. SQLite на старте, PostgreSQL при масштабировании.",
        "content": (
            "Решение: FastAPI (Python) + React (Vite) + SQLite.\n\n"
            "Почему FastAPI: быстрая разработка, автоматическая документация, нативная поддержка async.\n"
            "Почему React: компонентный UI, экосистема, знание основателя.\n"
            "Почему SQLite: нулевая инфраструктура на старте, легкий деплой на Render. "
            "Миграция на PostgreSQL запланирована при >1000 записей/день.\n\n"
            "Принцип: не переусложнять пока нет нагрузки. Ship fast, scale later."
        ),
        "tags": ["архитектура", "fastapi", "react", "sqlite", "технологии"],
        "source": "manual",
        "importance": 4,
    },
    {
        "type": "founder",
        "category": "principle",
        "title": "Принцип разработки: MVP-first",
        "summary": "Каждый модуль запускается как минимально рабочий продукт, затем итерируется по обратной связи.",
        "content": (
            "Правило: не строим идеально — строим рабочее. Каждая фича должна приносить ценность "
            "уже в первой версии.\n\n"
            "Порядок приоритетов:\n"
            "1. Работает\n"
            "2. Быстро\n"
            "3. Красиво\n"
            "4. Масштабируемо\n\n"
            "Не добавлять фичи, пока текущие не монетизированы."
        ),
        "tags": ["принципы", "mvp", "разработка"],
        "source": "manual",
        "importance": 4,
    },
    {
        "type": "founder",
        "category": "decision",
        "title": "Решение: CEO Agent как основной продукт",
        "summary": "AUREON продаёт не разработку, а управляющую AI-систему. CEO Agent — демо и продукт одновременно.",
        "content": (
            "Ключевое позиционирование: AUREON — это не фриланс-разработка, а AI Operating System "
            "для малого бизнеса.\n\n"
            "CEO Agent сам по себе является демонстрацией возможностей. Когда показываем клиенту — "
            "он видит, что может получить такую же систему для своего бизнеса.\n\n"
            "Это решение принято в июне 2026 после анализа рынка: продавать 'часы разработки' — "
            "красный океан. Продавать AI-систему управления — голубой."
        ),
        "tags": ["решение", "позиционирование", "продукт", "стратегия"],
        "source": "manual",
        "importance": 5,
    },
    {
        "type": "founder",
        "category": "goal",
        "title": "Цель: WAIC 2027",
        "summary": "World AI Conference 2027 — главная дата. К этому моменту AUREON должен быть готов к международному выходу.",
        "content": (
            "WAIC (World AI Conference) 2027 — стратегический дедлайн.\n\n"
            "К июлю 2027 AUREON должен:\n"
            "• Выручка: $100,000+\n"
            "• 10+ активных клиентов\n"
            "• Полностью автономная система\n"
            "• Кейсы для презентации\n"
            "• Готов к масштабированию или продаже\n\n"
            "Конференция — точка выхода на международный рынок и привлечения инвестиций."
        ),
        "tags": ["waic", "цель", "2027", "стратегия", "выручка"],
        "source": "manual",
        "importance": 5,
    },
    # ── Knowledge ─────────────────────────────────────────────────────────────
    {
        "type": "knowledge",
        "category": "brand",
        "title": "Бренд AUREON: цвета и стиль",
        "summary": "Золото (#D4AF37) + чёрный (#0A0A0B). Стеклянные карточки, минималистичный UI, Space Grotesk.",
        "content": (
            "Цветовая палитра:\n"
            "• Primary: #D4AF37 (золото)\n"
            "• Background: #0A0A0B (почти чёрный)\n"
            "• Surface: #111114\n"
            "• Border: rgba(255,255,255,0.08)\n"
            "• Green: #10B981 (успех)\n"
            "• Red: #EF4444 (ошибка)\n\n"
            "Типографика: Space Grotesk (заголовки), Inter (текст)\n\n"
            "Принцип дизайна: минимум декора, максимум данных. Золото только для ключевых акцентов.\n"
            "Стеклянный эффект (glassmorphism) для карточек."
        ),
        "tags": ["бренд", "дизайн", "цвета", "ui"],
        "source": "manual",
        "importance": 4,
    },
    {
        "type": "knowledge",
        "category": "service",
        "title": "Услуги AUREON: каталог",
        "summary": "AI Telegram Bot ($1,200), AI Content System ($800/мес), Business Automation ($2,500), CEO Agent ($5,000+).",
        "content": (
            "Основные услуги:\n\n"
            "1. AI Telegram Bot — $1,200\n"
            "   Кастомный бот с AI-ответами, лид-сбором, интеграцией CRM\n\n"
            "2. AI Content System — $800/мес\n"
            "   Автоматическая генерация постов, расписание, аналитика\n\n"
            "3. Business Automation — $2,500\n"
            "   Автоматизация процессов: продажи, поддержка, отчёты\n\n"
            "4. CEO Agent (White-label) — от $5,000\n"
            "   Полная AI Operating System для бизнеса клиента\n\n"
            "Маржинальность: 70-80%. Точка безубыточности: 2 клиента/месяц."
        ),
        "tags": ["услуги", "цены", "продукт", "прайс"],
        "source": "manual",
        "importance": 5,
    },
    {
        "type": "knowledge",
        "category": "mission",
        "title": "Миссия и видение AUREON",
        "summary": "Сделать AI-автоматизацию доступной для малого бизнеса в СНГ и на международном рынке.",
        "content": (
            "Миссия: Дать каждому малому бизнесу доступ к AI-системе управления, которая раньше "
            "была доступна только крупным корпорациям.\n\n"
            "Видение: К 2027 году стать ведущим AI-агентством для МСБ в СНГ с международным "
            "присутствием. Доказать, что один founder с AI может конкурировать с командами.\n\n"
            "Целевая аудитория: малый бизнес, Telegram-каналы, стартапы, одиночные предприниматели.\n\n"
            "Нишевое преимущество: фокус на Telegram-экосистеме СНГ, где конкуренция ниже, "
            "а рост выше среднего."
        ),
        "tags": ["миссия", "видение", "целевая-аудитория", "снг"],
        "source": "manual",
        "importance": 5,
    },
    {
        "type": "knowledge",
        "category": "roadmap",
        "title": "Roadmap AUREON до WAIC 2027",
        "summary": "4 фазы: Launch → Monetize → Scale → WAIC. Текущая фаза: Launch (Q3 2026).",
        "content": (
            "Фаза 1 — Launch (Q2-Q3 2026):\n"
            "• Запуск CEO Agent MVP\n"
            "• Первые 3 клиента\n"
            "• $5,000 выручки\n"
            "• Telegram-канал 500+ подписчиков\n\n"
            "Фаза 2 — Monetize (Q4 2026):\n"
            "• 10 активных клиентов\n"
            "• $20,000/мес стабильной выручки\n"
            "• Автоматизация продаж\n\n"
            "Фаза 3 — Scale (Q1-Q2 2027):\n"
            "• 30+ клиентов\n"
            "• $50,000/мес\n"
            "• Команда 2-3 человека\n\n"
            "Фаза 4 — WAIC (Q3 2027):\n"
            "• $100,000+ выручки\n"
            "• Международный выход\n"
            "• Публичный кейс"
        ),
        "tags": ["roadmap", "план", "фазы", "waic", "стратегия"],
        "source": "manual",
        "importance": 5,
    },
    # ── Experience ────────────────────────────────────────────────────────────
    {
        "type": "experience",
        "category": "sales",
        "title": "Короткие outreach-сообщения конвертируют лучше длинных",
        "summary": "Сообщения до 3 предложений дают отклик в 2-3 раза выше, чем развёрнутые презентации.",
        "content": (
            "Что сработало: короткое, персонализированное сообщение с одним конкретным вопросом.\n"
            "Пример: 'Привет [имя], вижу у вас [ниша]. Помогаем автоматизировать [процесс] с AI. "
            "Интересно посмотреть кейс?'\n\n"
            "Что не сработало: длинные сообщения с полным описанием услуг, прайсом и ссылками.\n\n"
            "Почему: люди в Telegram сканируют сообщения быстро. "
            "Длинный текст = спам. Короткий вопрос = диалог.\n\n"
            "Рекомендация: держать первое сообщение до 150 символов. Детали — в следующих сообщениях."
        ),
        "tags": ["outreach", "продажи", "telegram", "конверсия"],
        "source": "manual",
        "importance": 5,
    },
    {
        "type": "experience",
        "category": "sales",
        "title": "Telegram Bot для школ: конверсия выше чем для блогеров",
        "summary": "Ниша образования (школы, курсы) конвертирует в 2x лучше, чем блогеры — выше боль, есть бюджет.",
        "content": (
            "Тест: outreach одинакового формата для школ/курсов vs Telegram-блогеров.\n\n"
            "Результат:\n"
            "• Образование: 15% отклик, 8% в сделку\n"
            "• Блогеры: 7% отклик, 2% в сделку\n\n"
            "Почему работает для образования:\n"
            "• Конкретная боль: ответы на однотипные вопросы студентов\n"
            "• Есть бюджет на инструменты\n"
            "• Лица принимающие решения доступны напрямую\n\n"
            "Рекомендация: фокусировать cold outreach на образовательные ниши."
        ),
        "tags": ["школы", "образование", "блогеры", "конверсия", "outreach"],
        "source": "manual",
        "importance": 4,
    },
    {
        "type": "experience",
        "category": "product",
        "title": "Демо-данные в CRM снижают доверие клиентов",
        "summary": "Клиенты, видящие много 'тестовых' данных в системе, воспринимают её как нерабочую. Лучше показывать пустую систему с реальными данными.",
        "content": (
            "Проблема: при демо CEO Agent клиентам система показывала много демо-лидов, "
            "задач и сделок. Реакция: 'Это всё искусственное?' — потеря доверия.\n\n"
            "Решение: добавлен флаг is_demo во все объекты. В production-режиме демо-данные скрыты.\n\n"
            "Вывод: реальные данные (даже один настоящий лид) убеждают лучше, чем 50 искусственных.\n\n"
            "Рекомендация: при онбординге нового клиента сразу добавлять 1-2 реальных лида "
            "вместо показа демо-заглушек."
        ),
        "tags": ["демо", "доверие", "crm", "онбординг"],
        "source": "manual",
        "importance": 4,
    },
]


def seed_initial_memories(db: Session) -> None:
    if db.query(MemoryEntry).count() > 0:
        return
    for data in INITIAL_MEMORIES:
        entry = MemoryEntry(**data)
        db.add(entry)
    db.commit()
    print(f"Memory seeded: {len(INITIAL_MEMORIES)} initial entries.")


# ── Serialization ──────────────────────────────────────────────────────────────

def _serialize(entry: MemoryEntry) -> dict:
    return {
        "id": entry.id,
        "type": entry.type,
        "category": entry.category,
        "title": entry.title,
        "summary": entry.summary,
        "content": entry.content,
        "tags": entry.tags or [],
        "entities": entry.entities or [],
        "source": entry.source,
        "importance": entry.importance,
        "linked_objects": entry.linked_objects or [],
        "embedding_ready": entry.embedding_ready,
        "is_archived": entry.is_archived,
        "created_at": entry.created_at.isoformat() if entry.created_at else None,
        "updated_at": entry.updated_at.isoformat() if entry.updated_at else None,
    }


def serialize(entry: MemoryEntry) -> dict:
    return _serialize(entry)
