from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://movie_agent:secret@localhost:5432/movie_agent_db"
    secret_key: str = "changeme"
    google_api_key: str = ""
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    class Config:
        env_file = ".env"


settings = Settings()
