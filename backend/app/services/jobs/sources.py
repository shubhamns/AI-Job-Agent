from __future__ import annotations

from abc import ABC, abstractmethod

from app.schemas.job import JobSearchQuery, NormalizedJob


class JobSource(ABC):
    @abstractmethod
    async def search_jobs(self, query: JobSearchQuery) -> list[NormalizedJob]:
        raise NotImplementedError
