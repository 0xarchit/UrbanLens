import asyncio
from collections import defaultdict
from datetime import datetime
from typing import Any, Callable, Coroutine, Optional, TypeVar
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class Event(BaseModel):
    event_id: UUID = Field(default_factory=uuid4)
    issue_id: UUID
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: dict[str, Any] = Field(default_factory=dict)
    
    @property
    def event_type(self) -> str:
        return self.__class__.__name__


class IssueCreated(Event):
    image_paths: list[str]
    latitude: float
    longitude: float
    description: Optional[str] = None


class IssueClassified(Event):
    category: str
    confidence: float
    detections_count: int


class IssuePrioritized(Event):
    priority: int
    reasoning: str


class IssueAssigned(Event):
    department: str
    ward: str
    sla_deadline: datetime


class IssueEscalated(Event):
    from_level: int
    to_level: int
    reason: str


class IssueResolved(Event):
    resolved_by: str
    resolution_notes: str


E = TypeVar("E", bound=Event)
Handler = Callable[[E], Coroutine[Any, Any, None]]


class EventBus:
    _instance: Optional["EventBus"] = None
    _lock: asyncio.Lock = asyncio.Lock()
    
    def __new__(cls) -> "EventBus":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._handlers = defaultdict(list)
            cls._instance._queue = asyncio.Queue()
            cls._instance._running = False
        return cls._instance
    
    def subscribe(self, event_type: type[E], handler: Handler[E]) -> None:
        self._handlers[event_type.__name__].append(handler)
    
    async def publish(self, event: Event) -> None:
        await self._queue.put(event)
    
    def publish_sync(self, event: Event) -> None:
        asyncio.create_task(self._queue.put(event))
    
    async def start(self) -> None:
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._process_events())
    
    async def stop(self) -> None:
        self._running = False
    
    async def _process_events(self) -> None:
        while self._running:
            try:
                event = await asyncio.wait_for(self._queue.get(), timeout=1.0)
                handlers = self._handlers.get(event.event_type, [])
                if handlers:
                    await asyncio.gather(
                        *[handler(event) for handler in handlers],
                        return_exceptions=True
                    )
                self._queue.task_done()
            except asyncio.TimeoutError:
                continue
            except Exception:
                continue


event_bus = EventBus()
