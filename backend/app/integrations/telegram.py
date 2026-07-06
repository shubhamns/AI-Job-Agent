from __future__ import annotations

from typing import Any

import httpx

from app.schemas.job import JobMatch


class TelegramClient:
    def __init__(self, token: str) -> None:
        self.base_url = f"https://api.telegram.org/bot{token}"
        self._bot_username: str | None = None

    async def _post(self, method: str, payload: dict[str, Any]) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(f"{self.base_url}/{method}", json=payload)
            response.raise_for_status()
            data = response.json()
            if not data.get("ok"):
                raise RuntimeError(str(data.get("description", "Telegram API error")))
            return data["result"]

    async def get_me(self) -> dict[str, Any]:
        return await self._post("getMe", {})

    async def bot_username(self) -> str | None:
        if self._bot_username is None:
            try:
                self._bot_username = (await self.get_me()).get("username")
            except httpx.HTTPError:
                return None
        return self._bot_username

    async def send_message(
        self,
        chat_id: int,
        text: str,
        *,
        reply_markup: dict[str, Any] | None = None,
        disable_web_page_preview: bool = True,
    ) -> int:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "disable_web_page_preview": disable_web_page_preview,
        }
        if reply_markup:
            payload["reply_markup"] = reply_markup
        result = await self._post("sendMessage", payload)
        return int(result["message_id"])

    async def answer_callback_query(self, callback_query_id: str, text: str | None = None) -> None:
        payload: dict[str, Any] = {"callback_query_id": callback_query_id}
        if text:
            payload["text"] = text
        await self._post("answerCallbackQuery", payload)

    async def edit_message_text(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        *,
        reply_markup: dict[str, Any] | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "disable_web_page_preview": True,
        }
        if reply_markup is not None:
            payload["reply_markup"] = reply_markup
        await self._post("editMessageText", payload)

    async def get_updates(self, offset: int | None = None, timeout: int = 30) -> list[dict[str, Any]]:
        payload: dict[str, Any] = {"timeout": timeout}
        if offset is not None:
            payload["offset"] = offset
        return await self._post("getUpdates", payload)

    def job_keyboard(self, notification_id: int, redirect_url: str) -> dict[str, Any]:
        return {
            "inline_keyboard": [
                [
                    {"text": "Save", "callback_data": f"act:saved:{notification_id}"},
                    {"text": "Applied", "callback_data": f"act:applied:{notification_id}"},
                    {"text": "Skip", "callback_data": f"act:skipped:{notification_id}"},
                ],
                [{"text": "Open Job", "url": redirect_url}],
            ]
        }

    def format_job_message(self, match: JobMatch, *, header: str | None = None) -> str:
        job = match.job
        salary = ""
        if job.salary_min or job.salary_max:
            currency = job.salary_currency or "INR"
            if job.salary_min and job.salary_max:
                salary = f"\nSalary: {currency} {job.salary_min:,} - {job.salary_max:,}"
            elif job.salary_min:
                salary = f"\nSalary: {currency} {job.salary_min:,}+"
            else:
                salary = f"\nSalary: up to {currency} {job.salary_max:,}"
        skills = ", ".join(match.matched_skills[:6]) if match.matched_skills else "—"
        lines = [
            header or "New job match",
            f"Score: {match.score}/100",
            f"{job.title}",
            f"Company: {job.company_name or 'Unknown'}",
            f"Location: {job.location_display or 'Remote/Unknown'}",
            f"Skills: {skills}",
        ]
        if salary:
            lines.append(salary.strip())
        lines.append(f"\n{job.redirect_url}")
        return "\n".join(lines)

    async def send_job_alert(self, chat_id: int, match: JobMatch, notification_id: int) -> int:
        text = self.format_job_message(match)
        keyboard = self.job_keyboard(notification_id, match.job.redirect_url)
        return await self.send_message(chat_id, text, reply_markup=keyboard)
