from abc import ABC, abstractmethod
from typing import Any, TypeVar
from uuid import UUID

from Backend.core.events import Event, EventBus, event_bus
from Backend.core.logging import AgentLogger, get_logger

E = TypeVar("E", bound=Event)


class BaseAgent(ABC):
    def __init__(self, name: str):
        self.name = name
        self.logger: AgentLogger = get_logger(f"agent.{name}", agent_name=name)
        self._event_bus = event_bus
    
    def subscribe(self, event_type: type[E]) -> None:
        self._event_bus.subscribe(event_type, self.handle)
    
    @abstractmethod
    async def handle(self, event: E) -> None:
        pass
    
    def log_decision(self, issue_id: UUID, decision: str, reasoning: str) -> None:
        self.logger.log_decision(issue_id, decision, reasoning)
