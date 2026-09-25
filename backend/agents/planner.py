# ============================================
# NexusAI - Planner Agent
# ============================================
# The first agent in the pipeline. Takes the user's research query
# and breaks it down into a structured research plan with sub-queries.

from backend.agents.base_agent import BaseAgent
from backend.core.state import ResearchState, ResearchPlan
from backend.config import config


class PlannerAgent(BaseAgent):
    """
    The Planner agent decomposes a research query into actionable sub-tasks.
    
    This demonstrates the PLANNING capability of agentic behavior:
    - Analyzes the scope of the research question
    - Identifies key angles to investigate
    - Generates specific search queries
    - Outlines expected report sections
    """

    @property
    def name(self) -> str:
        return "Planner"

    @property
    def emoji(self) -> str:
        return "📋"

    @property
    def system_prompt(self) -> str:
        return """You are a strategic research planner. Your job is to break down 
research topics into clear, actionable sub-tasks.

You think methodically and consider multiple angles of investigation.
You create specific, targeted search queries that will yield high-quality results.
You anticipate what sections a comprehensive report should contain.

Always respond with well-structured JSON."""

    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Create a research plan from the user's query.
        
        Input: state.query (the user's research question)
        Output: state.plan (a structured ResearchPlan)
        """
        await self.emit(state, "start", f"Planning research strategy for: \"{state.query}\"")

        # Ask the LLM to create a research plan
        max_queries = config.MAX_SUB_QUERIES
        prompt = f"""Create a research plan for the following topic:

RESEARCH TOPIC: "{state.query}"

Break this down into a structured plan. Generate exactly {max_queries} specific search queries
that will help gather comprehensive information from different angles.

Respond as JSON:
{{
    "main_topic": "The core topic being researched",
    "sub_queries": [
        "specific search query 1",
        "specific search query 2",
        "specific search query 3",
        "specific search query 4"
    ],
    "research_angles": [
        "Angle 1: What aspect this covers",
        "Angle 2: What aspect this covers"
    ],
    "expected_sections": [
        "Executive Summary",
        "Section 1 Title",
        "Section 2 Title",
        "Key Findings",
        "Conclusion"
    ]
}}"""

        plan_data = await self.think_json(state, prompt)

        # Build the ResearchPlan from the LLM response
        state.plan = ResearchPlan(
            main_topic=plan_data.get("main_topic", state.query),
            sub_queries=plan_data.get("sub_queries", [state.query])[:max_queries],
            research_angles=plan_data.get("research_angles", []),
            expected_sections=plan_data.get("expected_sections", [
                "Executive Summary", "Key Findings", "Analysis", "Conclusion"
            ])
        )

        # Log the plan for the activity feed
        queries_str = "\n".join(f"  → {q}" for q in state.plan.sub_queries)
        await self.emit(
            state, "result",
            f"Research plan created with {len(state.plan.sub_queries)} sub-queries:\n{queries_str}"
        )

        return state


# Singleton instance
planner_agent = PlannerAgent()
