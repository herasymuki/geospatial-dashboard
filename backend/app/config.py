from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # AI providers
    gcas_anthropic_key: str = ""
    gcas_openai_key:    str = ""
    gcas_gemini_key:    str = ""
    gcas_athena_key:    str = ""
    gcas_athena_base_url: str = "https://dev-reguser-ui-service-483756012645.us-east1.run.app/v1"

    # Data source API keys
    gcas_acled_key:     str = ""
    gcas_acled_email:   str = ""

    class Config:
        env_file = ".env"
        extra    = "ignore"

@lru_cache
def get_settings() -> Settings:
    return Settings()
