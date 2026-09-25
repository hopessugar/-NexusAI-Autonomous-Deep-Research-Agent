# ============================================
# NexusAI - Application Entry Point
# ============================================
# Single command to start the entire application: python run.py

import uvicorn
import os
import sys

# Fix Windows console encoding for unicode characters
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Ensure the project root is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.config import config


def main():
    """Start the NexusAI application."""
    print()
    print("  +================================================+")
    print("  |                                                |")
    print("  |     NexusAI v1.0                               |")
    print("  |     Autonomous Deep Research Agent             |")
    print("  |                                                |")
    print("  +================================================+")
    print()

    # Validate configuration
    if not config.validate():
        sys.exit(1)

    print(f"   [OK] API Key configured")
    print(f"   Model: {config.GEMINI_MODEL}")
    print(f"   Server: http://localhost:{config.PORT}")
    print(f"   Outputs: {config.OUTPUTS_DIR}")
    print()
    print("   >> Open http://localhost:8000 in your browser")
    print("   >> Press Ctrl+C to stop the server")
    print()

    # Create outputs directory
    os.makedirs(config.OUTPUTS_DIR, exist_ok=True)

    # Start the server
    uvicorn.run(
        "backend.main:app",
        host=config.HOST,
        port=config.PORT,
        reload=False,
        log_level="info"
    )


if __name__ == "__main__":
    main()
