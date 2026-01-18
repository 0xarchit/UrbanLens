from functools import lru_cache
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )
    
    database_url: str
    
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str
    supabase_bucket: str = "city-issues"
    
    supabase_s3_endpoint: Optional[str] = None
    supabase_s3_region: str = "ap-southeast-1"
    supabase_s3_access_key: Optional[str] = None
    supabase_s3_secret_key: Optional[str] = None
    
    model_path: Path = Path("Backend/agents/vision/model.pt")
    model_confidence_threshold: float = 0.25
    model_input_size: int = 512
    
    local_temp_dir: Path = Path("static/temp")
    
    sla_critical_hours: int = 4
    sla_high_hours: int = 12
    sla_medium_hours: int = 48
    sla_low_hours: int = 168
    
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_workers: int = 4
    
    max_upload_size_mb: int = 10
    allowed_extensions: set[str] = {"jpg", "jpeg", "png", "webp"}
    
    duplicate_radius_meters: float = 50.0
    
    debug: bool = False
    
    resend_api_key: Optional[str] = None
    google_client_id: Optional[str] = None
    gemini_api_key: Optional[str] = None
    google_client_secret: Optional[str] = None
    project_id: Optional[str] = None
    sender_email: str = "noreply@urbanlens.city"
    admin_email: str = "admin@urbanlens.city"

    frontend_url: Optional[str] = None
    
    cors_origins: list[str] = []
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    
    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        if not v.startswith("postgresql"):
            raise ValueError("DATABASE_URL must be a PostgreSQL connection string")
        return v
    
    @field_validator("supabase_jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if len(v) < 32:
            raise ValueError("SUPABASE_JWT_SECRET must be at least 32 characters")
        return v


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
