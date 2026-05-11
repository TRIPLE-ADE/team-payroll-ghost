from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    DATABASE_URL: str
    ML_SERVICE_URL: str = "http://localhost:5000"
    SQUAD_API_KEY: str = ""
    SQUAD_SECRET_KEY: str = ""
    SQUAD_BASE_URL: str = "https://sandbox-api-d.squadco.com"
    JWT_SECRET: str = "dev-secret-change-in-prod"
    JWT_EXPIRE_MINUTES: int = 60
    ADMIN_EMAIL: str = "admin@ghostbuster.io"
    ADMIN_PASSWORD: str = "changeme123"
    ANON_SALT: str = "ghostguard-hackathon-2025-salt"


settings = Settings()
