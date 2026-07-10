from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    app_name: str = "Sentinel — Identity Anomaly Detection"
    version: str = "1.0.0"
    synthetic_user_count: int = 20
    synthetic_event_count: int = 500
    anomaly_ratio: float = 0.05
    refresh_interval_seconds: int = 30

    class Config:
        env_file = ".env"

settings = Settings()
