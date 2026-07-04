"""
Auto-summary and tag helpers for Memory Core.
"""
import re


def auto_summarize(text: str, max_len: int = 200) -> str:
    if not text:
        return ""
    text = text.strip()
    if len(text) <= max_len:
        return text
    truncated = text[:max_len]
    last_sentence = max(truncated.rfind(". "), truncated.rfind(".\n"))
    if last_sentence > max_len // 2:
        return truncated[: last_sentence + 1]
    return truncated.rstrip() + "…"


_STOP_WORDS = {
    "и", "в", "на", "с", "по", "для", "из", "от", "до", "к", "о", "об",
    "или", "но", "а", "как", "так", "это", "что", "то", "не", "да",
    "the", "a", "an", "of", "in", "to", "for", "and", "or", "is", "was",
}


def extract_tags(content: str, max_tags: int = 6) -> list[str]:
    if not content:
        return []
    words = re.findall(r"\b[a-zA-Zа-яА-Я]{4,}\b", content.lower())
    freq: dict[str, int] = {}
    for w in words:
        if w not in _STOP_WORDS:
            freq[w] = freq.get(w, 0) + 1
    return [w for w, _ in sorted(freq.items(), key=lambda x: -x[1])][:max_tags]


_CATEGORY_HINTS = {
    "client": ["клиент", "client", "покупатель", "заказчик"],
    "lead": ["лид", "lead", "prospect", "потенциал"],
    "task": ["задача", "task", "todo", "дело"],
    "deal": ["сделка", "deal", "контракт", "contract", "оплата"],
    "message": ["сообщение", "message", "outreach", "письмо"],
    "decision": ["решение", "decision", "принято", "выбрано"],
    "brand": ["бренд", "brand", "logo", "логотип", "цвет"],
    "service": ["услуга", "service", "сервис", "продукт", "product"],
    "architecture": ["архитектура", "architecture", "стек", "stack", "fastapi", "sqlite"],
    "mission": ["миссия", "mission", "цель", "goal", "vision", "вижн"],
    "roadmap": ["roadmap", "план", "план", "waic", "этап", "фаза"],
}


def detect_category(content: str) -> str:
    if not content:
        return "general"
    content_lower = content.lower()
    for cat, hints in _CATEGORY_HINTS.items():
        if any(h in content_lower for h in hints):
            return cat
    return "general"
