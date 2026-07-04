"""
SQLite storage for Private Chat Saver. Everything stays local.
Filled by saver.py (Telethon Live Mode), viewed by viewer.py.
"""

import os
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "private_saver.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS messages (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    msg_id      INTEGER NOT NULL,
    chat_id     INTEGER NOT NULL,
    chat_name   TEXT,
    sender_id   INTEGER,
    sender_name TEXT,
    outgoing    INTEGER DEFAULT 0,
    text        TEXT,
    media_type  TEXT,
    media_path  TEXT,
    created_at  TEXT,
    edited_text TEXT,
    edited_at   TEXT,
    deleted     INTEGER DEFAULT 0,
    deleted_at  TEXT,
    UNIQUE(chat_id, msg_id)
);
CREATE INDEX IF NOT EXISTS idx_messages_deleted ON messages(deleted);
CREATE INDEX IF NOT EXISTS idx_messages_msg_id  ON messages(msg_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_chat    ON messages(chat_id);
"""


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.executescript(SCHEMA)


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def save_message(
    msg_id: int,
    chat_id: int,
    chat_name: str,
    sender_id: int | None,
    sender_name: str,
    outgoing: bool,
    text: str,
    media_type: str | None = None,
    media_path: str | None = None,
    created_at: str | None = None,
) -> bool:
    """Insert a message; duplicates (same chat_id+msg_id) are skipped. Returns True if inserted."""
    with _connect() as conn:
        cur = conn.execute(
            """INSERT INTO messages
               (msg_id, chat_id, chat_name, sender_id, sender_name, outgoing,
                text, media_type, media_path, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(chat_id, msg_id) DO NOTHING""",
            (msg_id, chat_id, chat_name, sender_id, sender_name,
             1 if outgoing else 0, text, media_type, media_path,
             created_at or _now()),
        )
        return cur.rowcount > 0


def mark_edited(msg_id: int, chat_id: int, new_text: str) -> bool:
    """Store the edited text; the original stays in `text`. Returns False if unknown message."""
    with _connect() as conn:
        cur = conn.execute(
            "UPDATE messages SET edited_text = ?, edited_at = ? WHERE chat_id = ? AND msg_id = ?",
            (new_text, _now(), chat_id, msg_id),
        )
        return cur.rowcount > 0


def mark_deleted(msg_ids: list[int]) -> int:
    """Mark messages as deleted by Telegram msg_id (Live Mode).

    Private (non-channel) messages share one global id space per account,
    so matching by msg_id alone is correct while we only store private chats.
    """
    if not msg_ids:
        return 0
    placeholders = ",".join("?" * len(msg_ids))
    with _connect() as conn:
        cur = conn.execute(
            f"UPDATE messages SET deleted = 1, deleted_at = ? "
            f"WHERE deleted = 0 AND msg_id IN ({placeholders})",
            [_now(), *msg_ids],
        )
        return cur.rowcount


# ── Queries for viewer / Saved Messages commands ──────────────────────────────

def _rows(query: str, params: tuple = ()) -> list[dict]:
    with _connect() as conn:
        return [dict(r) for r in conn.execute(query, params).fetchall()]


def recent(limit: int = 10) -> list[dict]:
    return _rows(
        "SELECT * FROM messages ORDER BY created_at DESC, id DESC LIMIT ?", (limit,)
    )


def deleted(limit: int = 10) -> list[dict]:
    return _rows(
        "SELECT * FROM messages WHERE deleted = 1 ORDER BY deleted_at DESC LIMIT ?",
        (limit,),
    )


def search(query: str, limit: int = 15) -> list[dict]:
    like = f"%{query}%"
    return _rows(
        """SELECT * FROM messages
           WHERE text LIKE ? OR edited_text LIKE ? OR sender_name LIKE ? OR chat_name LIKE ?
           ORDER BY created_at DESC, id DESC LIMIT ?""",
        (like, like, like, like, limit),
    )


def files(limit: int = 10) -> list[dict]:
    return _rows(
        "SELECT * FROM messages WHERE media_type IS NOT NULL "
        "ORDER BY created_at DESC, id DESC LIMIT ?",
        (limit,),
    )


def chats() -> list[dict]:
    return _rows(
        """SELECT chat_id, chat_name,
                  COUNT(*)                                        AS messages,
                  SUM(CASE WHEN media_type IS NOT NULL THEN 1 ELSE 0 END) AS media,
                  SUM(deleted)                                    AS deleted,
                  MAX(created_at)                                 AS last_at
           FROM messages
           GROUP BY chat_id
           ORDER BY last_at DESC"""
    )


def chat_messages(name: str, limit: int = 20) -> list[dict]:
    """Last `limit` messages of a chat matched by name (LIKE), chronological order."""
    like = f"%{name}%"
    rows = _rows(
        """SELECT * FROM messages WHERE chat_name LIKE ?
           ORDER BY created_at DESC, id DESC LIMIT ?""",
        (like, limit),
    )
    return list(reversed(rows))


def stats() -> dict:
    with _connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM messages").fetchone()[0]
        dele = conn.execute("SELECT COUNT(*) FROM messages WHERE deleted = 1").fetchone()[0]
        edit = conn.execute("SELECT COUNT(*) FROM messages WHERE edited_text IS NOT NULL").fetchone()[0]
        media = conn.execute("SELECT COUNT(*) FROM messages WHERE media_type IS NOT NULL").fetchone()[0]
        n_chats = conn.execute("SELECT COUNT(DISTINCT chat_id) FROM messages").fetchone()[0]
    return {"total": total, "deleted": dele, "edited": edit, "media": media, "chats": n_chats}
