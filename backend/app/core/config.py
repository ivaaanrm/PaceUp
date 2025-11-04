from dotenv import load_dotenv
from pydantic_settings import BaseSettings

load_dotenv()


class Config(BaseSettings):
    app_name: str = "PaceUp"
    debug: bool = True
    
    # Database Configuration
    database_url: str = "postgresql://postgres:postgres@localhost:5432/paceup"
    
    # Redis Configuration
    redis_url: str = "redis://localhost:6379/0"
    redis_cache_ttl: int = 3600  # Default cache TTL in seconds (1 hour)
    redis_strava_cache_ttl: int = 300  # Strava API cache TTL (5 minutes)
    
    # Strava API Configuration
    strava_client_id: str = ""
    strava_client_secret: str = ""
    strava_refresh_token: str = ""
    strava_token_url: str = "https://www.strava.com/api/v3/oauth/token"
    strava_api_base_url: str = "https://www.strava.com/api/v3"
    
    # OpenAI API Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-3.5-turbo"  # or "gpt-3.5-turbo" for cheaper option

    class Config:
        env_file = ".env"
        case_sensitive = False


config = Config()
