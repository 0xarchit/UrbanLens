import asyncio
import json
from datetime import datetime
from typing import Optional, Callable, Any
from uuid import UUID
from dataclasses import dataclass, field, asdict

from Backend.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class AgentStep:
    agent_name: str
    status: str
    started_at: str
    completed_at: Optional[str] = None
    duration_ms: Optional[float] = None
    decision: Optional[str] = None
    reasoning: Optional[str] = None
    result: Optional[dict] = None
    error: Optional[str] = None


@dataclass
class PipelineFlow:
    issue_id: UUID
    started_at: str
    status: str = "running"
    completed_at: Optional[str] = None
    total_duration_ms: Optional[float] = None
    steps: list[AgentStep] = field(default_factory=list)
    final_result: Optional[dict] = None
    
    def to_dict(self) -> dict:
        return {
            "issue_id": str(self.issue_id),
            "started_at": self.started_at,
            "status": self.status,
            "completed_at": self.completed_at,
            "total_duration_ms": self.total_duration_ms,
            "steps": [asdict(s) for s in self.steps],
            "final_result": self.final_result,
        }


class FlowTracker:
    def __init__(self, issue_id: UUID):
        self.flow = PipelineFlow(
            issue_id=issue_id,
            started_at=datetime.utcnow().isoformat(),
        )
        self._start_time = datetime.utcnow()
        self._subscribers: list[asyncio.Queue] = []
    
    def subscribe(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        
        
        for step in self.flow.steps:
            if step.started_at:
                queue.put_nowait({
                    "type": "step_started",
                    "timestamp": step.started_at,
                    "data": {
                        "agent_name": step.agent_name, 
                        "step_index": self.flow.steps.index(step)
                    }
                })
            
            
            if step.status in ("completed", "error"):
                 queue.put_nowait({
                    "type": "step_completed" if step.status == "completed" else "step_error",
                    "timestamp": step.completed_at,
                    "data": {
                        "agent_name": step.agent_name,
                        "status": step.status,
                        "decision": step.decision,
                        "reasoning": step.reasoning,
                        "result": step.result,
                        "error": step.error
                    }
                })

        self._subscribers.append(queue)
        return queue
    
    def unsubscribe(self, queue: asyncio.Queue):
        if queue in self._subscribers:
            self._subscribers.remove(queue)
    
    async def _broadcast(self, event_type: str, data: dict):
        message = {
            "type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data,
        }
        for queue in self._subscribers:
            await queue.put(message)
    
    async def start_step(self, agent_name: str):
        step = AgentStep(
            agent_name=agent_name,
            status="running",
            started_at=datetime.utcnow().isoformat(),
        )
        self.flow.steps.append(step)
        
        await self._broadcast("step_started", {
            "agent_name": agent_name,
            "step_index": len(self.flow.steps) - 1,
        })
        
        return step
    
    async def complete_step(
        self,
        agent_name: str,
        decision: str,
        reasoning: str,
        result: Optional[dict] = None,
        error: Optional[str] = None
    ):
        step = next((s for s in self.flow.steps if s.agent_name == agent_name and s.status == "running"), None)
        if step:
            now = datetime.utcnow()
            step.completed_at = now.isoformat()
            step.status = "error" if error else "completed"
            step.decision = decision
            step.reasoning = reasoning
            step.result = result
            step.error = error
            
            started = datetime.fromisoformat(step.started_at)
            step.duration_ms = (now - started).total_seconds() * 1000
        
        await self._broadcast("step_completed", {
            "agent_name": agent_name,
            "status": step.status if step else "unknown",
            "decision": decision,
            "reasoning": reasoning,
            "duration_ms": step.duration_ms if step else 0,
            "result": result,
            "error": error,
        })
    
    async def complete_flow(self, final_result: dict):
        now = datetime.utcnow()
        self.flow.completed_at = now.isoformat()
        self.flow.status = "completed"
        self.flow.total_duration_ms = (now - self._start_time).total_seconds() * 1000
        self.flow.final_result = final_result
        
        await self._broadcast("flow_completed", self.flow.to_dict())
    
    async def error_flow(self, error: str):
        now = datetime.utcnow()
        self.flow.completed_at = now.isoformat()
        self.flow.status = "error"
        self.flow.total_duration_ms = (now - self._start_time).total_seconds() * 1000
        
        await self._broadcast("flow_error", {
            "error": error,
            "flow": self.flow.to_dict(),
        })


_active_flows: dict[UUID, FlowTracker] = {}


def get_flow_tracker(issue_id: UUID) -> Optional[FlowTracker]:
    return _active_flows.get(issue_id)


def create_flow_tracker(issue_id: UUID) -> FlowTracker:
    if issue_id in _active_flows:
        return _active_flows[issue_id]
    
    tracker = FlowTracker(issue_id)
    _active_flows[issue_id] = tracker
    return tracker


def remove_flow_tracker(issue_id: UUID):
    if issue_id in _active_flows:
        del _active_flows[issue_id]
