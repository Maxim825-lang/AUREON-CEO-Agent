"""
Telegram DM Sender — sends direct messages via Bot API.

Limitation: Bot API can only send messages to users who have previously
started the bot (i.e., we have their chat_id). For usernames without
chat_id, we queue the message as 'manual_send_required'.
"""

import httpx


def send_dm(token: str, chat_id: str, text: str) -> dict:
    """Send a direct message to a Telegram user by chat_id."""
    if not token:
        return {"ok": False, "error": "TELEGRAM_BOT_TOKEN not configured"}
    if not chat_id:
        return {"ok": False, "error": "No chat_id for this lead"}

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}

    try:
        with httpx.Client(timeout=15) as client:
            resp = client.post(url, json=payload)
        data = resp.json()
        if resp.status_code == 200 and data.get("ok"):
            msg_id = data.get("result", {}).get("message_id")
            return {"ok": True, "telegram_message_id": str(msg_id)}
        return {"ok": False, "error": data.get("description", f"HTTP {resp.status_code}")}
    except Exception as e:
        return {"ok": False, "error": str(e)}


def can_send(token: str, chat_id: str) -> bool:
    return bool(token and chat_id)
