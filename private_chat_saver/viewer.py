"""
CLI-просмотрщик локальной базы Private Chat Saver (Telegram не нужен).

  python3 viewer.py recent [N]        последние сообщения
  python3 viewer.py deleted [N]       удалённые сообщения
  python3 viewer.py search "текст"    поиск по тексту / имени / чату
  python3 viewer.py files [N]         последние файлы и медиа
  python3 viewer.py chats             список чатов со счётчиками
  python3 viewer.py chat "название"   последние сообщения конкретного чата
  python3 viewer.py stats             статистика базы
"""

import sys

import db


def _print_messages(rows: list[dict]) -> None:
    if not rows:
        print("Пусто.")
        return
    for r in rows:
        direction = "→" if r.get("outgoing") else "←"
        mark = " 🗑DELETED" if r.get("deleted") else ""
        print(f"[{r['created_at']}] {direction} {r['sender_name']} ({r['chat_name']}){mark}")
        if r.get("text"):
            print(f"  {r['text']}")
        if r.get("edited_text"):
            print(f"  ✏️ изменено: {r['edited_text']}")
        if r.get("media_type"):
            print(f"  📎 {r['media_type']}" + (f" → {r['media_path']}" if r.get("media_path") else ""))
        print()


def _print_chats(rows: list[dict]) -> None:
    if not rows:
        print("Пусто. Запустите сейвер: python3 saver.py")
        return
    w = max((len(r["chat_name"] or "") for r in rows), default=10)
    print(f"{'Чат'.ljust(w)}  {'Сообщений':>9}  {'Медиа':>5}  {'Удалено':>7}  Последнее")
    for r in rows:
        print(f"{(r['chat_name'] or '?').ljust(w)}  {r['messages']:>9}  {r['media'] or 0:>5}  "
              f"{r['deleted'] or 0:>7}  {r['last_at'] or '—'}")


def main():
    db.init_db()
    cmd = sys.argv[1] if len(sys.argv) > 1 else "recent"
    arg = " ".join(sys.argv[2:]).strip()

    def limit(default=10):
        try:
            return max(1, int(arg))
        except ValueError:
            return default

    if cmd == "recent":
        _print_messages(db.recent(limit()))
    elif cmd == "deleted":
        _print_messages(db.deleted(limit()))
    elif cmd == "search":
        if not arg:
            print('Формат: python3 viewer.py search "текст"')
            return
        _print_messages(db.search(arg))
    elif cmd == "files":
        _print_messages(db.files(limit()))
    elif cmd == "chats":
        _print_chats(db.chats())
    elif cmd == "chat":
        if not arg:
            print('Формат: python3 viewer.py chat "название"')
            return
        rows = db.chat_messages(arg, limit=20)
        if not rows:
            print(f"Чат «{arg}» не найден. Список: python3 viewer.py chats")
            return
        print(f"— {rows[0]['chat_name']}, последние {len(rows)} —\n")
        _print_messages(rows)
    elif cmd == "stats":
        s = db.stats()
        print(f"Сообщений: {s['total']}")
        print(f"Чатов: {s['chats']}")
        print(f"С медиа: {s['media']}")
        print(f"Удалённых: {s['deleted']}")
        print(f"Изменённых: {s['edited']}")
    else:
        print(__doc__)


if __name__ == "__main__":
    main()
