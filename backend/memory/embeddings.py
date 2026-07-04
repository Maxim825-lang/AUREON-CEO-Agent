"""
Stub for future vector embeddings.
When OPENAI_API_KEY is set and a vector store is configured, replace these with real implementations.
"""


def prepare_embedding(text: str) -> list[float] | None:
    """Return a vector embedding for text. Currently a stub."""
    return None


def vector_search(query: str, entries: list, top_k: int = 10) -> list:
    """Rank entries by semantic similarity to query. Currently falls back to input order."""
    return entries[:top_k]


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = sum(x ** 2 for x in a) ** 0.5
    norm_b = sum(x ** 2 for x in b) ** 0.5
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)
