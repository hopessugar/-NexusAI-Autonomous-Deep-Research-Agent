# ============================================
# NexusAI - Configuration Module
# ============================================
# Loads environment variables and provides app-wide settings.

import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Central configuration for the entire NexusAI application."""

    # --- LLM Settings ---
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

    # --- Agent Settings ---
    MAX_REFINEMENT_ITERATIONS: int = 2       # Max times the critic can send report back
    QUALITY_THRESHOLD: float = 7.0           # Min score (out of 10) to pass critic review
    MAX_SEARCH_RESULTS: int = 5              # Results per search query
    MAX_SCRAPE_LENGTH: int = 4000            # Max chars to extract per page
    MAX_SUB_QUERIES: int = 4                 # Max sub-queries the planner generates

    # --- Server Settings ---
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    OUTPUTS_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "outputs")

    @classmethod
    def validate(cls) -> bool:
        """Check that all required config values are present."""
        if not cls.GEMINI_API_KEY:
            print("❌ ERROR: GEMINI_API_KEY not found in .env file!")
            print("   Get your free key at: https://aistudio.google.com/apikey")
            return False
        return True


# Create a singleton config instance
config = Config()
