from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://root:2007@localhost:5432/movie_agent_db"
    secret_key: str = "changeme"
    google_api_key: str = ""
    groq_api_key: str = ""
    groq_model: str = "groq/llama-3.3-70b-versatile"
    pexels_api_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24


settings = Settings()
