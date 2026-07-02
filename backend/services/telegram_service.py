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
