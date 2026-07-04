"""
Telegram Memory Collector — saves any founder message into Memory Core.

Kinds and their Memory Core mapping:
  idea   -> knowledge memory (category "idea")
  task   -> Task + short memory (category "task")
  client -> long memory (category "client")
  note   -> founder memory (category "note")
"""

import logging
from datetime import datetime, date

from memory.models import MemoryEntry
from memory.service import serialize
from memory.summarizer import auto_summarize, extract_tags

logger = logging.getLogger(__name__)

SOURCE = "telegram_memory_collector"

KIND_MAP = {
    "idea":   {"type": "knowledge", "category": "idea",   "icon": "💡", "label": "Идея"},
    "task":   {"type": "short",     "category": "task",   "icon": "✅", "label": "Задача"},
    "client": {"type": "long",      "category": "client", "icon": "🤝", "label": "Клиентская заметка"},
    "note":   {"type": "founder",   "category": "note",   "icon": "📝", "label": "Заметка"},
}

# Free-text messages awaiting classification via inline buttons: chat_id -> {text, user_id, username}
_pending_notes: dict[str, dict] = {}

_TASK_HINTS = [
    "нужно", "надо", "сделать", "сделай", "не забыть", "не забудь", "todo",
    "запланировать", "созвон", "встреча", "дедлайн", "deadline", "завтра",
    "срочно", "fix", "починить", "исправить", "доделать", "подготовить",
]


def looks_like_task(text: str) -> bool:
    lower = (text or "").lower()
    return any(h in lower for h in _TASK_HINTS)


def _make_title(text: str, max_len: int = 80) -> str:
    first_line = (text or "").strip().splitlines()[0]
    return first_line if len(first_line) <= max_len else first_line[: max_len - 1] + "…"


def is_duplicate(db, text: str, telegram_user_id: str | None = None) -> bool:
    """True if the most recent collector entry (per user if known) has the same content."""
    q = db.query(MemoryEntry).filter(MemoryEntry.source == SOURCE)
    last = q.order_by(MemoryEntry.id.desc()).first()
    if not last or (last.content or "").strip() != (text or "").strip():
        return False
    if telegram_user_id:
        entities = last.entities or []
        saved_uid = next((e.get("value") for e in entities if e.get("type") == "telegram_user"), None)
        if saved_uid and str(saved_uid) != str(telegram_user_id):
            return False
    return True


def save_note(
    db,
    text: str,
    kind: str = "note",
    telegram_user_id: str | None = None,
    username: str | None = None,
    tags: list[str] | None = None,
) -> dict:
    """Save a note into Memory Core (and create a Task for kind='task')."""
    text = (text or "").strip()
    if not text:
        return {"ok": False, "error": "Пустое сообщение не сохраняю."}
    if kind not in KIND_MAP:
        kind = "note"
    if is_duplicate(db, text, telegram_user_id):
        return {"ok": False, "error": "Эта заметка уже сохранена (дубликат)."}

    meta = KIND_MAP[kind]
    entities = []
    if telegram_user_id:
        entities.append({"type": "telegram_user", "value": str(telegram_user_id)})
    if username:
        entities.append({"type": "username", "value": username})

    all_tags = list(dict.fromkeys((tags or []) + [kind, "telegram"] + extract_tags(text, max_tags=4)))

    linked_objects = []
    task_id = None
    if kind == "task":
        from models import Task
        task = Task(
            title=_make_title(text),
            description=text,
            agent="Memory Collector",
            status="pending",
            priority="medium",
            tags=["telegram", "memory-collector"],
        )
        db.add(task)
        db.flush()
        task_id = task.id
        linked_objects.append({"type": "task", "id": task.id, "label": task.title})

    entry = MemoryEntry(
        type=meta["type"],
        category=meta["category"],
        title=f"{meta['icon']} {_make_title(text)}",
        summary=auto_summarize(text),
        content=text,
        tags=all_tags,
        entities=entities,
        source=SOURCE,
        importance=3,
        linked_objects=linked_objects,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "entry": serialize(entry), "task_id": task_id, "kind": kind}


def get_today(db) -> list[dict]:
    today_start = datetime.combine(date.today(), datetime.min.time())
    entries = (
        db.query(MemoryEntry)
        .filter(MemoryEntry.source == SOURCE, MemoryEntry.created_at >= today_start)
        .order_by(MemoryEntry.id.desc())
        .all()
    )
    return [serialize(e) for e in entries]


def search_notes(db, query: str, limit: int = 20) -> list[dict]:
    q_like = f"%{query.lower()}%"
    entries = (
        db.query(MemoryEntry)
        .filter(
            MemoryEntry.source == SOURCE,
            MemoryEntry.is_archived == False,
            (
                MemoryEntry.title.ilike(q_like)
                | MemoryEntry.summary.ilike(q_like)
                | MemoryEntry.content.ilike(q_like)
            ),
        )
        .order_by(MemoryEntry.id.desc())
        .limit(limit)
        .all()
    )
    return [serialize(e) for e in entries]


def get_recent(db, kind: str | None = None, limit: int = 50) -> list[dict]:
    q = db.query(MemoryEntry).filter(MemoryEntry.source == SOURCE, MemoryEntry.is_archived == False)
    if kind and kind in KIND_MAP:
        q = q.filter(MemoryEntry.category == KIND_MAP[kind]["category"])
    entries = q.order_by(MemoryEntry.id.desc()).limit(limit).all()
    return [serialize(e) for e in entries]


def convert_to_task(db, entry_id: int) -> dict:
    from models import Task
    entry = db.query(MemoryEntry).filter(MemoryEntry.id == entry_id).first()
    if not entry:
        return {"ok": False, "error": "Запись не найдена"}
    existing = next((o for o in (entry.linked_objects or []) if o.get("type") == "task"), None)
    if existing:
        return {"ok": False, "error": f"Задача уже создана (Task #{existing.get('id')})"}
    task = Task(
        title=_make_title(entry.content or entry.title),
        description=entry.content or entry.summary or "",
        agent="Memory Collector",
        status="pending",
        priority="medium",
        tags=["telegram", "memory-collector"],
    )
    db.add(task)
    db.flush()
    entry.linked_objects = (entry.linked_objects or []) + [{"type": "task", "id": task.id, "label": task.title}]
    db.commit()
    db.refresh(entry)
    return {"ok": True, "task_id": task.id, "entry": serialize(entry)}


def pin_to_founder(db, entry_id: int) -> dict:
    entry = db.query(MemoryEntry).filter(MemoryEntry.id == entry_id).first()
    if not entry:
        return {"ok": False, "error": "Запись не найдена"}
    entry.type = "founder"
    entry.importance = max(entry.importance or 3, 4)
    db.commit()
    db.refresh(entry)
    return {"ok": True, "entry": serialize(entry)}


# ── Telegram command handlers ─────────────────────────────────────────────────

def _send(chat_id, text, keyboard=None):
    from services.telegram_bot import _send as tg_send
    tg_send(chat_id, text, keyboard=keyboard)


def _fmt_entry_line(e: dict) -> str:
    kind = e.get("category") or "note"
    icon = next((m["icon"] for m in KIND_MAP.values() if m["category"] == kind), "•")
    when = ""
    if e.get("created_at"):
        try:
            when = datetime.fromisoformat(e["created_at"]).strftime("%H:%M")
        except Exception:
            pass
    summary = (e.get("summary") or e.get("title") or "")[:120]
    return f"{icon} {when} — {summary}"


def cmd_save(chat_id: str, args: str, from_user: dict, db, kind: str = "note"):
    meta = KIND_MAP.get(kind, KIND_MAP["note"])
    if not args.strip():
        _send(chat_id, f"Формат: <code>/{ 'save' if kind == 'note' else kind } текст</code>")
        return
    result = save_note(
        db, args,
        kind=kind,
        telegram_user_id=str(from_user.get("id", "")) or None,
        username=from_user.get("username") or None,
    )
    if not result["ok"]:
        _send(chat_id, f"⚠️ {result['error']}")
        return
    lines = [f"✅ {meta['label']} сохранена в Memory Core."]
    if result.get("task_id"):
        lines.append(f"📋 Создана задача #{result['task_id']}.")
    elif kind != "task" and looks_like_task(args):
        entry_id = result["entry"]["id"]
        kb = {"inline_keyboard": [[{"text": "📋 Create Task", "callback_data": f"mc_totask_{entry_id}"}]]}
        _send(chat_id, "\n".join(lines) + "\n\n🤔 Похоже на задачу — создать Task?", keyboard=kb)
        return
    _send(chat_id, "\n".join(lines))


def cmd_today(chat_id: str, db):
    entries = get_today(db)
    if not entries:
        _send(chat_id, "📭 Сегодня ещё ничего не сохранено.")
        return
    lines = [f"<b>Сохранено сегодня ({len(entries)}):</b>\n"]
    lines += [_fmt_entry_line(e) for e in entries[:15]]
    _send(chat_id, "\n".join(lines))


def cmd_search(chat_id: str, args: str, db):
    if not args.strip():
        _send(chat_id, "Формат: <code>/search запрос</code>")
        return
    results = search_notes(db, args.strip(), limit=10)
    if not results:
        _send(chat_id, f"🔍 Ничего не найдено по запросу «{args.strip()}».")
        return
    lines = [f"<b>Найдено ({len(results)}):</b>\n"]
    lines += [_fmt_entry_line(e) for e in results]
    _send(chat_id, "\n".join(lines))


def cmd_memory(chat_id: str, db):
    entries = get_recent(db, limit=10)
    if not entries:
        _send(chat_id, "📭 Память коллектора пуста. Отправьте /save, /idea, /task или /client.")
        return
    lines = ["<b>Последние записи памяти:</b>\n"]
    lines += [_fmt_entry_line(e) for e in entries]
    _send(chat_id, "\n".join(lines))


# ── Free text → classification via inline buttons ────────────────────────────

def offer_classification(chat_id: str, text: str, from_user: dict, db):
    text = (text or "").strip()
    if not text:
        return
    _pending_notes[chat_id] = {
        "text": text,
        "user_id": str(from_user.get("id", "")),
        "username": from_user.get("username") or "",
    }
    kb = {
        "inline_keyboard": [
            [
                {"text": "💡 Save as Idea", "callback_data": "mc_kind_idea"},
                {"text": "✅ Save as Task", "callback_data": "mc_kind_task"},
            ],
            [
                {"text": "🤝 Save as Client Note", "callback_data": "mc_kind_client"},
                {"text": "📝 Save as Founder Note", "callback_data": "mc_kind_note"},
            ],
            [{"text": "🚫 Ignore", "callback_data": "mc_ignore"}],
        ]
    }
    hint = "\n\n🤔 Похоже на задачу." if looks_like_task(text) else ""
    preview = text if len(text) <= 200 else text[:200] + "…"
    _send(chat_id, f"💾 Сохранить это в Memory Core?\n\n<i>{preview}</i>{hint}", keyboard=kb)


def handle_callback(chat_id: str, data: str, from_user: dict, db) -> bool:
    """Handle mc_* callbacks. Returns True if the callback was consumed."""
    if not data.startswith("mc_"):
        return False

    if data == "mc_ignore":
        _pending_notes.pop(chat_id, None)
        _send(chat_id, "🚫 Ок, не сохраняю.")
        return True

    if data.startswith("mc_kind_"):
        kind = data[len("mc_kind_"):]
        pending = _pending_notes.pop(chat_id, None)
        if not pending:
            _send(chat_id, "⚠️ Сообщение не найдено — отправьте его ещё раз.")
            return True
        result = save_note(
            db, pending["text"],
            kind=kind,
            telegram_user_id=pending.get("user_id") or str(from_user.get("id", "")) or None,
            username=pending.get("username") or from_user.get("username") or None,
        )
        if not result["ok"]:
            _send(chat_id, f"⚠️ {result['error']}")
            return True
        meta = KIND_MAP.get(kind, KIND_MAP["note"])
        msg = f"✅ {meta['label']} сохранена в Memory Core."
        if result.get("task_id"):
            msg += f"\n📋 Создана задача #{result['task_id']}."
        _send(chat_id, msg)
        return True

    if data.startswith("mc_totask_"):
        try:
            entry_id = int(data[len("mc_totask_"):])
        except ValueError:
            return True
        result = convert_to_task(db, entry_id)
        if result["ok"]:
            _send(chat_id, f"📋 Задача #{result['task_id']} создана.")
        else:
            _send(chat_id, f"⚠️ {result['error']}")
        return True

    return True
