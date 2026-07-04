import os
import httpx


def _token() -> str:
    return os.getenv("TELEGRAM_BOT_TOKEN", "").strip()


def _channel() -> str:
    return os.getenv("TELEGRAM_CHANNEL_ID", "").strip()


def _check_config():
    token = _token()
    channel = _channel()
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN не задан в backend/.env")
    if not channel:
        raise ValueError("TELEGRAM_CHANNEL_ID не задан в backend/.env")
    return token, channel


def test_connection() -> dict:
    token, _ = _check_config()
    url = f"https://api.telegram.org/bot{token}/getMe"
    with httpx.Client(timeout=10) as client:
        resp = client.get(url)
    resp.raise_for_status()
    data = resp.json()
    bot = data.get("result", {})
    return {"ok": True, "username": bot.get("username"), "name": bot.get("first_name")}


def send_message(text: str) -> dict:
    token, channel_id = _check_config()
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": channel_id, "text": text, "parse_mode": "HTML"}
    with httpx.Client(timeout=15) as client:
        resp = client.post(url, json=payload)
    resp.raise_for_status()
    return resp.json()


def is_configured() -> bool:
    return bool(_token() and _channel())


def get_updates(limit: int = 100) -> dict:
    token = _token()
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN не задан в backend/.env")

    url = f"https://api.telegram.org/bot{token}/getUpdates"
    with httpx.Client(timeout=15) as client:
        resp = client.get(url, params={"limit": limit, "offset": -limit})
    resp.raise_for_status()
    data = resp.json()
    if not data.get("ok"):
        raise Exception(data.get("description", "getUpdates failed"))

    updates = []
    for update in data.get("result", []):
        msg = update.get("message") or update.get("channel_post") or {}
        if not msg:
            continue
        chat = msg.get("chat", {})
        from_user = msg.get("from", {})
        updates.append({
            "update_id": update.get("update_id"),
            "chat_id": str(chat.get("id", "")),
            "username": from_user.get("username") or chat.get("username") or "",
            "first_name": from_user.get("first_name") or chat.get("first_name") or "",
            "last_name": from_user.get("last_name") or chat.get("last_name") or "",
            "message": msg.get("text") or "",
            "date": msg.get("date"),
        })
    return {"updates": updates, "count": len(updates)}
