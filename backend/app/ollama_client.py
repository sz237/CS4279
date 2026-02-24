import httpx
from typing import List, Dict, Any


async def ollama_chat(
    base_url: str,
    model: str,
    messages: List[Dict[str, str]],
    timeout_s: float = 60.0,
) -> str:
    """
    Calls Ollama /api/chat and returns the assistant content.
    """
    url = f"{base_url.rstrip('/')}/api/chat"
    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "stream": False,
        # You can tune these as needed:
        "options": {
            "temperature": 0.6,
        },
    }

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        r = await client.post(url, json=payload)
        r.raise_for_status()
        data = r.json()
        # Expected: {"message": {"role":"assistant","content":"..."}, ...}
        return data.get("message", {}).get("content", "") or ""