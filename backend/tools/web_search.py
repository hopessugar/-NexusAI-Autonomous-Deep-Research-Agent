# ============================================
# NexusAI - Web Search Tool
# ============================================
# Uses DuckDuckGo (100% free, no API key needed) to search the web.

import asyncio
try:
    from ddgs import DDGS
except ImportError:
    from duckduckgo_search import DDGS
from backend.tools.base_tool import BaseTool


class WebSearchTool(BaseTool):
    """
    Searches the web using DuckDuckGo and returns relevant results.
    This is the primary information-gathering tool for the Researcher agent.
    """

    @property
    def name(self) -> str:
        return "web_search"

    @property
    def description(self) -> str:
        return "Search the web for information on any topic. Returns titles, URLs, and snippets."

    async def execute(self, query: str = "", max_results: int = 5) -> dict:
        """
        Search DuckDuckGo for the given query.
        
        Args:
            query: The search query string
            max_results: Maximum number of results to return
            
        Returns:
            Dict with list of search results (title, url, snippet)
        """
        if not query:
            return {"success": False, "data": [], "error": "No query provided"}

        try:
            # Run the synchronous DuckDuckGo search in a thread
            results = await asyncio.to_thread(self._search, query, max_results)

            # Format results cleanly
            formatted_results = []
            for r in results:
                formatted_results.append({
                    "title": r.get("title", "No title"),
                    "url": r.get("href", r.get("link", "")),
                    "snippet": r.get("body", r.get("snippet", "No description"))
                })

            return {
                "success": True,
                "data": formatted_results,
                "error": None
            }

        except Exception as e:
            return {
                "success": False,
                "data": [],
                "error": f"Search failed: {str(e)}"
            }

    def _search(self, query: str, max_results: int) -> list:
        """Synchronous search helper (runs in thread)."""
        with DDGS() as ddgs:
            results = list(ddgs.text(query, max_results=max_results))
        return results


# Singleton instance
web_search_tool = WebSearchTool()
