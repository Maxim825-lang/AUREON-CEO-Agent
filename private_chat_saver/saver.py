"""
Telegram Private Chat Saver — личный локальный архиватор через Telethon.

Подключается к ВАШЕМУ аккаунту через MTProto (не BotFather-бот) после вашей
авторизации и в реальном времени сохраняет новые сообщения из личных чатов
вместе с медиа в SQLite + media/. Удалённое сообщение, которое сейвер уже
видел, помечается 🗑, но остаётся в базе. Всё хранится только локально.

Требует API_ID и API_HASH в .env (my.telegram.org).

Команды — в вашем чате «Saved Messages» (Избранное):
  /recent [N]   — последние сохранённые сообщения
  /deleted [N]  — удалённые сообщения
  /search текст — поиск по тексту / имени / чату
  /files [N]    — последние файлы и медиа
  /stats        — статистика базы
  /help         — справка
"""

import os
import html
import logging

from dotenv import load_dotenv

import db

load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("private_chat_saver")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

API_ID = int(os.getenv("API_ID", "0") or "0")
API_HASH = os.getenv("API_HASH", "").strip()
SESSION_NAME = os.getenv("SESSION_NAME", "private_saver")
MEDIA_DIR = os.path.join(BASE_DIR, os.getenv("MEDIA_DIR", "media"))
MAX_FILE_MB = float(os.getenv("MAX_FILE_MB", "50"))
SAVE_OUTGOING = os.getenv("SAVE_OUTGOING", "true").lower() != "false"

REPLY_MARK = "🗄"  # prefix of the saver's own replies in Saved Messages (not archived)

ME_ID: int | None = None


# ── Helpers ───────────────────────────────────────────────────────────────────

def _media_kind(message) -> str | None:
    if message.photo:
        return "photo"
    if message.video_note:
        return "video_note"
    if message.video:
        return "video"
    if message.voice:
        return "voice"
    if message.audio:
        return "audio"
    if message.sticker:
        return "sticker"
    if message.document:
        return "document"
    return None


async def _download_media(message, chat_id: int) -> tuple[str | None, str | None]:
    """Download media to media/<chat_id>/<msg_id>_<name>. Returns (kind, relative path)."""
    kind = _media_kind(message)
    if not kind:
        return None, None
    size_mb = (message.file.size or 0) / (1024 * 1024) if message.file else 0
    if size_mb > MAX_FILE_MB:
        logger.info(f"Пропускаю медиа {size_mb:.1f} МБ > лимита {MAX_FILE_MB} МБ (msg {message.id})")
        return f"{kind} (не скачано: {size_mb:.0f} МБ)", None

    chat_dir = os.path.join(MEDIA_DIR, str(chat_id))
    os.makedirs(chat_dir, exist_ok=True)
    name = (message.file.name if message.file and message.file.name else "media") if message.file else "media"
    ext = message.file.ext if message.file and message.file.ext else ""
    if not os.path.splitext(name)[1] and ext:
        name += ext
    target = os.path.join(chat_dir, f"{message.id}_{name}")
    try:
        path = await message.download_media(file=target)
        return kind, os.path.relpath(path, BASE_DIR) if path else None
    except Exception as e:
        logger.error(f"Ошибка скачивания медиа msg {message.id}: {e}")
        return kind, None


def _fmt(row: dict) -> str:
    who = row.get("sender_name") or "?"
    chat = row.get("chat_name") or "?"
    when = row.get("created_at") or ""
    text = row.get("text") or ""
    parts = [f"<b>{html.escape(who)}</b> → {html.escape(chat)}  <i>{when}</i>"]
    if text:
        preview = text if len(text) <= 300 else text[:300] + "…"
        parts.append(html.escape(preview))
    if row.get("edited_text"):
        edited = row["edited_text"]
        preview = edited if len(edited) <= 200 else edited[:200] + "…"
        parts.append(f"✏️ изменено: {html.escape(preview)}")
    if row.get("media_type"):
        media = row["media_type"]
        if row.get("media_path"):
            media += f" → <code>{html.escape(row['media_path'])}</code>"
        parts.append(f"📎 {media}")
    if row.get("deleted"):
        parts.append(f"🗑 удалено {row.get('deleted_at') or ''}")
    return "\n".join(parts)


def _fmt_list(rows: list[dict], title: str) -> str:
    if not rows:
        return f"{REPLY_MARK} {title}: пусто."
    body = "\n\n".join(_fmt(r) for r in rows)
    return f"{REPLY_MARK} <b>{title} ({len(rows)})</b>\n\n{body}"


def _parse_limit(args: str, default: int = 10, max_n: int = 30) -> int:
    try:
        return max(1, min(int(args.strip()), max_n))
    except (ValueError, AttributeError):
        return default


# ── Archiving handlers ────────────────────────────────────────────────────────

async def _archive(message) -> None:
    from telethon import utils
    chat = await message.get_chat()
    sender = await message.get_sender()
    chat_id = message.chat_id
    kind, path = await _download_media(message, chat_id)
    db.save_message(
        msg_id=message.id,
        chat_id=chat_id,
        chat_name=utils.get_display_name(chat) or str(chat_id),
        sender_id=getattr(sender, "id", None),
        sender_name=utils.get_display_name(sender) or "me",
        outgoing=bool(message.out),
        text=message.text or "",
        media_type=kind,
        media_path=path,
        created_at=message.date.astimezone().strftime("%Y-%m-%d %H:%M:%S") if message.date else None,
    )
    logger.info(f"Сохранено: chat={chat_id} msg={message.id} media={kind or '—'}")


async def on_new_message(event):
    msg = event.message
    if msg.out and not SAVE_OUTGOING:
        return
    # Saved Messages: не архивируем команды и собственные ответы сейвера
    if event.chat_id == ME_ID and ((msg.text or "").startswith("/") or (msg.text or "").startswith(REPLY_MARK)):
        return
    try:
        await _archive(msg)
    except Exception as e:
        logger.error(f"Ошибка сохранения msg {msg.id}: {e}")


async def on_edited(event):
    msg = event.message
    try:
        if not db.mark_edited(msg.id, event.chat_id, msg.text or ""):
            await _archive(msg)  # правка сообщения, которого ещё нет в базе
        else:
            logger.info(f"Правка: chat={event.chat_id} msg={msg.id}")
    except Exception as e:
        logger.error(f"Ошибка обработки правки msg {msg.id}: {e}")


async def on_deleted(event):
    # Для личных чатов Telegram присылает только msg_ids (общее id-пространство аккаунта)
    try:
        n = db.mark_deleted(list(event.deleted_ids))
        if n:
            logger.info(f"Помечено удалёнными: {n} (ids={list(event.deleted_ids)[:10]})")
    except Exception as e:
        logger.error(f"Ошибка пометки удалённых: {e}")


# ── Command interface in Saved Messages ───────────────────────────────────────

async def on_command(event):
    if event.chat_id != ME_ID:
        return  # команды работают только в Saved Messages
    text = event.raw_text.strip()
    cmd, _, args = text.partition(" ")
    cmd = cmd.lower()

    if cmd == "/recent":
        reply = _fmt_list(db.recent(_parse_limit(args)), "Последние сообщения")
    elif cmd == "/deleted":
        reply = _fmt_list(db.deleted(_parse_limit(args)), "Удалённые сообщения")
    elif cmd == "/search":
        if not args.strip():
            reply = f"{REPLY_MARK} Формат: /search текст"
        else:
            reply = _fmt_list(db.search(args.strip()), f"Поиск «{html.escape(args.strip())}»")
    elif cmd == "/files":
        reply = _fmt_list(db.files(_parse_limit(args)), "Последние файлы")
    elif cmd == "/stats":
        s = db.stats()
        reply = (
            f"{REPLY_MARK} <b>Статистика</b>\n"
            f"Сообщений: {s['total']}\n"
            f"Удалённых: {s['deleted']}\n"
            f"Изменённых: {s['edited']}\n"
            f"С медиа: {s['media']}\n"
            f"Чатов: {s['chats']}"
        )
    else:
        reply = (
            f"{REPLY_MARK} <b>Private Chat Saver</b>\n"
            f"/recent [N] — последние сообщения\n"
            f"/deleted [N] — удалённые\n"
            f"/search текст — поиск\n"
            f"/files [N] — последние файлы\n"
            f"/stats — статистика"
        )

    # Telegram ограничивает сообщение ~4096 символами
    if len(reply) > 4000:
        reply = reply[:4000] + "…"
    await event.reply(reply, parse_mode="html")


# ── Entry point ───────────────────────────────────────────────────────────────

def build_client():
    """Create the Telethon client and register handlers. Requires API keys."""
    from telethon import TelegramClient, events
    client = TelegramClient(os.path.join(BASE_DIR, SESSION_NAME), API_ID, API_HASH)
    client.add_event_handler(on_new_message, events.NewMessage(func=lambda e: e.is_private))
    client.add_event_handler(on_edited, events.MessageEdited(func=lambda e: e.is_private))
    client.add_event_handler(on_deleted, events.MessageDeleted())
    client.add_event_handler(
        on_command,
        events.NewMessage(outgoing=True, pattern=r"^/(recent|deleted|search|files|stats|help)"),
    )
    return client


async def run(client):
    global ME_ID
    from telethon import utils
    await client.start()  # первый запуск: спросит телефон и код подтверждения
    me = await client.get_me()
    ME_ID = me.id
    logger.info(f"Вошли как {utils.get_display_name(me)} (id={me.id})")
    logger.info("Сохраняю личные чаты. Команды — в Saved Messages: /help")
    await client.run_until_disconnected()


def main():
    if not API_ID or not API_HASH:
        raise SystemExit(
            "Заполните API_ID и API_HASH в .env (https://my.telegram.org, см. README.md).\n"
            "Просмотр уже сохранённой базы работает без ключей: python3 viewer.py recent"
        )
    db.init_db()
    os.makedirs(MEDIA_DIR, exist_ok=True)
    client = build_client()
    client.loop.run_until_complete(run(client))


if __name__ == "__main__":
    main()
