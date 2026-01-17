import logging
import sys
from contextvars import ContextVar
from datetime import datetime
from typing import Any, Optional
from uuid import UUID
import json

correlation_id: ContextVar[Optional[str]] = ContextVar("correlation_id", default=None)


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "correlation_id": correlation_id.get(),
        }
        
        if hasattr(record, "issue_id"):
            log_data["issue_id"] = str(record.issue_id)
        
        if hasattr(record, "agent"):
            log_data["agent"] = record.agent
        
        if hasattr(record, "decision"):
            log_data["decision"] = record.decision
        
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_data)


class AgentLogger(logging.LoggerAdapter):
    def __init__(self, logger: logging.Logger, agent_name: str):
        super().__init__(logger, {"agent": agent_name})
    
    def process(self, msg: str, kwargs: dict[str, Any]) -> tuple[str, dict[str, Any]]:
        extra = kwargs.get("extra", {})
        extra["agent"] = self.extra["agent"]
        kwargs["extra"] = extra
        return msg, kwargs
    
    def log_decision(
        self,
        issue_id: UUID,
        decision: str,
        reasoning: str,
        level: int = logging.INFO
    ) -> None:
        self.log(
            level,
            f"Decision: {decision} | Reasoning: {reasoning}",
            extra={"issue_id": issue_id, "decision": decision}
        )


def setup_logging(debug: bool = False) -> None:
    root = logging.getLogger()
    root.setLevel(logging.DEBUG if debug else logging.INFO)
    
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root.addHandler(handler)
    
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


def get_logger(name: str, agent_name: Optional[str] = None) -> logging.Logger | AgentLogger:
    logger = logging.getLogger(name)
    if agent_name:
        return AgentLogger(logger, agent_name)
    return logger
