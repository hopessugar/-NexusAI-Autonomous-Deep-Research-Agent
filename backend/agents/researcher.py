# ============================================
# NexusAI - Researcher Agent
# ============================================
# The data-gathering agent. Executes search queries, scrapes web pages,
# and compiles raw findings for analysis.

from backend.agents.base_agent import BaseAgent
from backend.core.state import ResearchState, Finding
from backend.tools.web_search import web_search_tool
from backend.tools.url_scraper import url_scraper_tool
from backend.tools.text_processor import text_processor_tool
from backend.config import config


class ResearcherAgent(BaseAgent):
    """
    The Researcher agent gathers information from the web.
    
    This demonstrates the TOOL USE and EXECUTION capabilities:
    - Calls the web_search tool to find relevant sources
    - Calls the url_scraper tool to extract page content
    - Calls the text_processor tool to summarize findings
    - Maintains a list of all findings in the state
    """

    @property
    def name(self) -> str:
        return "Researcher"

    @property
    def emoji(self) -> str:
        return "🔍"

    @property
    def system_prompt(self) -> str:
        return """You are an expert web researcher. You methodically search for information,
evaluate source quality, and extract the most relevant facts and data.
You are thorough but efficient, focusing on high-quality sources."""

    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Execute all research sub-queries from the plan.
        
        Input: state.plan (the research plan with sub-queries)
        Output: state.findings (list of Finding objects with source data)
        """
        if not state.plan:
            await self.emit(state, "error", "No research plan found! Cannot proceed.")
            return state

        await self.emit(state, "start", f"Beginning research across {len(state.plan.sub_queries)} sub-queries...")

        all_findings = []

        # Execute each sub-query from the plan
        for i, query in enumerate(state.plan.sub_queries, 1):
            await self.emit(state, "tool_call",
                          f"🔎 Search [{i}/{len(state.plan.sub_queries)}]: \"{query}\"")

            # Step 1: Search the web
            search_result = await web_search_tool.safe_execute(
                query=query,
                max_results=config.MAX_SEARCH_RESULTS
            )

            if not search_result["success"]:
                await self.emit(state, "warning", f"Search failed: {search_result['error']}")
                continue

            results = search_result["data"]
            await self.emit(state, "result", f"Found {len(results)} results for \"{query}\"")

            # Step 2: Scrape top results for full content
            for j, result in enumerate(results[:3]):  # Scrape top 3 per query
                url = result.get("url", "")
                title = result.get("title", "Unknown")

                if not url:
                    continue

                await self.emit(state, "tool_call", f"📄 Scraping: {title[:60]}...")

                scrape_result = await url_scraper_tool.safe_execute(url=url)

                if scrape_result["success"]:
                    page_data = scrape_result["data"]
                    content = page_data.get("content", "")

                    # Step 3: Summarize the content
                    summary = result.get("snippet", "")
                    if content and len(content) > 200:
                        await self.emit(state, "tool_call", f"📝 Summarizing content...")
                        summary_result = await text_processor_tool.safe_execute(
                            text=content, task="summarize"
                        )
                        if summary_result["success"]:
                            summary = summary_result["data"]["processed_text"]

                    # Create a Finding object
                    finding = Finding(
                        source_url=url,
                        source_title=title,
                        content=content[:2000],  # Keep truncated raw content
                        summary=summary,
                        relevance_score=1.0 - (j * 0.2)  # Higher rank = higher relevance
                    )
                    all_findings.append(finding)

                else:
                    # If scraping fails, still save the search snippet
                    finding = Finding(
                        source_url=url,
                        source_title=title,
                        content=result.get("snippet", ""),
                        summary=result.get("snippet", ""),
                        relevance_score=0.5
                    )
                    all_findings.append(finding)

        # Store all findings in state
        state.findings = all_findings

        await self.emit(state, "result",
                       f"✅ Research complete! Gathered {len(all_findings)} findings from {len(state.plan.sub_queries)} queries")

        return state


# Singleton instance
researcher_agent = ResearcherAgent()
