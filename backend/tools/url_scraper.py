# ============================================
# NexusAI - URL Scraper Tool
# ============================================
# Extracts clean text content from web pages using httpx + BeautifulSoup.

import asyncio
import httpx
from bs4 import BeautifulSoup
from backend.tools.base_tool import BaseTool
from backend.config import config


class URLScraperTool(BaseTool):
    """
    Scrapes a web page and extracts its main text content.
    Removes scripts, styles, navigation, and other non-content elements.
    """

    @property
    def name(self) -> str:
        return "url_scraper"

    @property
    def description(self) -> str:
        return "Extract text content from a web page URL. Returns clean, readable text."

    async def execute(self, url: str = "") -> dict:
        """
        Fetch and extract text from a URL.
        
        Args:
            url: The web page URL to scrape
            
        Returns:
            Dict with extracted title and text content
        """
        if not url:
            return {"success": False, "data": None, "error": "No URL provided"}

        try:
            # Fetch the page with a reasonable timeout
            async with httpx.AsyncClient(
                timeout=15.0,
                follow_redirects=True,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                }
            ) as client:
                response = await client.get(url)
                response.raise_for_status()

            # Parse the HTML
            soup = BeautifulSoup(response.text, "html.parser")

            # Extract the page title
            title = soup.title.string.strip() if soup.title and soup.title.string else "No title"

            # Remove non-content elements
            for tag in soup(["script", "style", "nav", "footer", "header",
                           "aside", "form", "iframe", "noscript", "meta", "link"]):
                tag.decompose()

            # Extract clean text
            text = soup.get_text(separator="\n", strip=True)

            # Clean up excessive whitespace
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            clean_text = "\n".join(lines)

            # Truncate to prevent overwhelming the LLM's context window
            max_len = config.MAX_SCRAPE_LENGTH
            if len(clean_text) > max_len:
                clean_text = clean_text[:max_len] + "\n\n[... content truncated ...]"

            return {
                "success": True,
                "data": {
                    "title": title,
                    "url": url,
                    "content": clean_text,
                    "content_length": len(clean_text)
                },
                "error": None
            }

        except httpx.HTTPStatusError as e:
            return {"success": False, "data": None, "error": f"HTTP {e.response.status_code}: {url}"}
        except httpx.TimeoutException:
            return {"success": False, "data": None, "error": f"Timeout fetching: {url}"}
        except Exception as e:
            return {"success": False, "data": None, "error": f"Scrape failed: {str(e)}"}


# Singleton instance
url_scraper_tool = URLScraperTool()
