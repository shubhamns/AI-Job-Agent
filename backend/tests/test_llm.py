from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.core.config import Settings
from app.integrations.llm import LLMClient, LLMError, _parse_json_content


def test_parse_json_content_rejects_invalid_block() -> None:
    with pytest.raises(LLMError):
        _parse_json_content("Here is broken json {not valid}")


@pytest.mark.asyncio
async def test_complete_json_raises_llm_error_for_unexpected_response() -> None:
    settings = Settings(
        openai_api_key="test-key",
        jwt_secret_key="test-secret-key-with-32-chars-min",
    )
    client = LLMClient(settings)
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"choices": []}
    httpx_client = AsyncMock()
    httpx_client.post.return_value = response
    with patch("app.integrations.llm.httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = httpx_client
        with pytest.raises(LLMError, match="unexpected format"):
            await client.complete_json(system="sys", user="user")


@pytest.mark.asyncio
async def test_complete_json_raises_llm_error_for_empty_content() -> None:
    settings = Settings(
        openai_api_key="test-key",
        jwt_secret_key="test-secret-key-with-32-chars-min",
    )
    client = LLMClient(settings)
    response = MagicMock()
    response.status_code = 200
    response.json.return_value = {"choices": [{"message": {"content": "   "}}]}
    httpx_client = AsyncMock()
    httpx_client.post.return_value = response
    with patch("app.integrations.llm.httpx.AsyncClient") as mock_client_cls:
        mock_client_cls.return_value.__aenter__.return_value = httpx_client
        with pytest.raises(LLMError, match="empty"):
            await client.complete_json(system="sys", user="user")
