# AUREON CEO Agent

A premium AI command center for autonomous project management. Built for AUREON's journey to WAIC 2027.

## Quick Start

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/state | Dashboard state |
| GET | /api/agents | All agents |
| GET | /api/tasks | All tasks |
| GET | /api/actions | Activity log |
| POST | /api/tasks | Create task |
| GET | /api/leads | CRM leads |
| POST | /api/leads | Add lead |
| GET | /api/content | Content posts |
| POST | /api/content/generate | Generate post |
| GET | /api/offers | Commercial offers |
| POST | /api/offers/generate | Generate offer |
| GET | /api/strategy | Strategy state |
| GET | /api/settings | App settings |
| PATCH | /api/settings | Update settings |
| POST | /api/run-cycle | Run autonomous CEO cycle |
| POST | /api/report | Generate report |

---

## Connect OpenAI API

1. Get API key from https://platform.openai.com
2. Add to backend/.env: `OPENAI_API_KEY=sk-...`
3. Update `services/content_generator.py` and `services/ceo_cycle.py` to use `openai` client
4. Example:
```python
from openai import OpenAI
client = OpenAI()
response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": prompt}]
)
```

---

## Connect Telegram Posting

1. Create bot via @BotFather, get token
2. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHANNEL_ID` to .env
3. Add `httpx` calls in `services/content_generator.py`:
```python
import httpx
async def post_to_telegram(text: str):
    url = f"https://api.telegram.org/bot{TOKEN}/sendMessage"
    await httpx.post(url, json={"chat_id": CHANNEL_ID, "text": text})
```

---

## Deploy to Render

### Backend
1. Create new Web Service on render.com
2. Build command: `pip install -r requirements.txt`
3. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add environment variables

### Frontend
1. Create new Static Site on render.com
2. Build command: `npm install && npm run build`
3. Publish dir: `dist`
4. Set `VITE_API_URL` to your backend URL

---

## Agent Boundaries

The agent operates safely within these constraints:

✅ Can: write posts, draft messages, prepare proposals, manage CRM, generate offers, create tasks, analyze data

❌ Cannot: send real messages, make payments, sign documents, impersonate humans, access external systems without approval
