# ============================================
# NexusAI - LLM Engine (Gemini API Wrapper)
# ============================================
# Provides a clean, reliable interface to the Google Gemini API
# with retry logic, model fallback, and structured output parsing.

import asyncio
import json
import re
import time
from google import genai
from google.genai import errors as genai_errors
from backend.config import config


# Fallback model chain — tries each one in order
FALLBACK_MODELS = [
    "gemini-3.1-flash-lite",   # Most available, lightning fast, 0 503 errors
    "gemini-3.5-flash-lite",   # High capacity
    config.GEMINI_MODEL,       # Primary configured model
    "gemini-3.7-flash",        # Alternative
    "gemini-3.6-flash",        # Another alternative
    "gemini-3.5-flash",        # Fallback
]


class LLMEngine:
    """
    Wrapper around Google Gemini API that provides:
    - Automatic retry with exponential backoff (handles rate limits & 503s)
    - Model fallback chain (if primary model is overloaded, tries alternatives)
    - Structured JSON output parsing
    - Clean async interface for use in the agent pipeline
    """

    def __init__(self):
        self.client = genai.Client(api_key=config.GEMINI_API_KEY)
        self.model_name = config.GEMINI_MODEL
        self.current_model = self.model_name
        print(f"   LLM Engine initialized with model: {self.model_name}")

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        """
        Generate a response from the LLM with automatic retry and model fallback.
        """
        if system_prompt:
            full_prompt = f"{system_prompt}\n\n---\n\n{prompt}"
        else:
            full_prompt = prompt

        # Try each model in the fallback chain
        last_error = None
        for model_name in FALLBACK_MODELS:
            # Try up to 4 times per model with increasing delays
            for attempt in range(4):
                try:
                    response = await asyncio.to_thread(
                        self.client.models.generate_content,
                        model=model_name,
                        contents=full_prompt,
                    )

                    if response and response.text:
                        self.current_model = model_name
                        return response.text.strip()
                    else:
                        return "No response generated."

                except genai_errors.ServerError as e:
                    last_error = e
                    wait_time = (attempt + 1) * 3  # 3s, 6s, 9s, 12s
                    print(f"   Model {model_name} overloaded (503), retry {attempt+1}/4 in {wait_time}s...")
                    await asyncio.sleep(wait_time)

                except genai_errors.ClientError as e:
                    last_error = e
                    error_msg = str(e)
                    if "404" in error_msg or "not available" in error_msg.lower():
                        print(f"   Model {model_name} not available, trying fallback...")
                        break  # Skip to next model
                    else:
                        # For other client errors (auth, etc.), don't retry
                        raise

                except Exception as e:
                    last_error = e
                    wait_time = (attempt + 1) * 2
                    print(f"   Error with {model_name}: {str(e)[:80]}, retry {attempt+1}/4 in {wait_time}s...")
                    await asyncio.sleep(wait_time)

        # All models and retries exhausted
        raise Exception(f"All models failed. Last error: {last_error}")

    async def generate_json(self, prompt: str, system_prompt: str = "") -> dict:
        """
        Generate a response and parse it as JSON.
        """
        json_instruction = (
            "\n\nIMPORTANT: Respond ONLY with valid JSON. "
            "No markdown formatting, no code blocks, no extra text. "
            "Just the raw JSON object."
        )

        raw_response = await self.generate(prompt + json_instruction, system_prompt)

        try:
            cleaned = raw_response.strip()
            cleaned = re.sub(r'^```(?:json)?\s*', '', cleaned)
            cleaned = re.sub(r'\s*```$', '', cleaned)
            cleaned = cleaned.strip()
            return json.loads(cleaned)
        except json.JSONDecodeError:
            json_match = re.search(r'\{[\s\S]*\}', raw_response)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except json.JSONDecodeError:
                    pass
            return {"raw_response": raw_response, "parse_error": True}

    async def generate_with_context(
        self, prompt: str, system_prompt: str = "", context: str = ""
    ) -> str:
        """Generate a response with additional context."""
        if context:
            full_prompt = f"CONTEXT:\n{context}\n\n---\n\nTASK:\n{prompt}"
        else:
            full_prompt = prompt
        return await self.generate(full_prompt, system_prompt)

    generate_text = generate


# Global singleton
llm_engine = LLMEngine()
