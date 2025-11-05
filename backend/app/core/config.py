from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import field_validator

load_dotenv()


class Config(BaseSettings):
    app_name: str = "PaceUp"
    
    # Debug mode: Set to False in production to reduce logging
    # Controls logging level: True = INFO+, False = ERROR+ only
    debug: bool = True
    
    # Database Configuration
    database_url: str = "postgresql://postgres:postgres@localhost:5432/paceup"
    
    # JWT Authentication Configuration
    jwt_secret_key: str = ""  # Must be set via environment variable
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    @field_validator('jwt_secret_key')
    @classmethod
    def validate_jwt_secret_key(cls, v: str) -> str:
        """Validate that JWT secret key is not empty"""
        if not v or v.strip() == "":
            raise ValueError(
                "JWT_SECRET_KEY must be set in environment variables. "
                "Get a secret key by running: openssl rand -hex 32"
            )
        return v
    
    # Strava API Configuration
    strava_client_id: str = ""
    strava_client_secret: str = ""
    strava_refresh_token: str = ""
    strava_token_url: str = "https://www.strava.com/api/v3/oauth/token"
    strava_api_base_url: str = "https://www.strava.com/api/v3"
    
    # OpenAI API Configuration
    openai_api_key: str = ""
    openai_model: str = "gpt-3.5-turbo"  # or "gpt-3.5-turbo" for cheaper option
    
    # CORS Configuration
    # Comma-separated list of allowed origins (e.g., "http://localhost:3000,https://paceup-site.vercel.app")
    # For production, include your Vercel frontend URL
    allowed_origins: str = "http://localhost:3000,http://localhost:8000,http://localhost"

    class Config:
        env_file = ".env"
        case_sensitive = False


config = Config()
