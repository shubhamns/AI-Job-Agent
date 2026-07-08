from __future__ import annotations

import json
import re
from typing import Any

import httpx

from app.core.config import Settings

JSON_BLOCK_PATTERN = re.compile(r"\{[\s\S]*\}")


class LLMError(Exception):
    pass


class LLMClient:
    def __init__(self, settings: Settings):
        self.settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self.settings.openai_api_key)

    async def complete_json(self, *, system: str, user: str) -> dict[str, Any]:
        if not self.enabled:
            raise LLMError("OpenAI API key is not configured")
        payload = {
            "model": self.settings.openai_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        headers = {
            "Authorization": f"Bearer {self.settings.openai_api_key}",
            "Content-Type": "application/json",
        }
        url = f"{self.settings.openai_base_url.rstrip('/')}/chat/completions"
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(url, headers=headers, json=payload)
        if response.status_code >= 400:
            raise LLMError(f"LLM request failed: {response.status_code}")
        try:
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise LLMError("LLM response had unexpected format") from exc
        if not isinstance(content, str) or not content.strip():
            raise LLMError("LLM response content was empty")
        return _parse_json_content(content)


def _parse_json_content(content: str) -> dict[str, Any]:
    stripped = content.strip()
    try:
        parsed = json.loads(stripped)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass
    match = JSON_BLOCK_PATTERN.search(stripped)
    if match:
        try:
            parsed = json.loads(match.group(0))
        except json.JSONDecodeError:
            parsed = None
        if isinstance(parsed, dict):
            return parsed
    raise LLMError("LLM response was not valid JSON")
