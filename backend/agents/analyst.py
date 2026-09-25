# ============================================
# NexusAI - Analyst Agent
# ============================================
# Analyzes research findings to extract insights, themes, and chart data.

from backend.agents.base_agent import BaseAgent
from backend.core.state import ResearchState, Analysis
from backend.tools.data_analyzer import data_analyzer_tool
from backend.tools.chart_generator import chart_generator_tool


class AnalystAgent(BaseAgent):
    """
    The Analyst agent processes raw findings into structured insights.
    
    This demonstrates the OBSERVATION and REASONING capabilities:
    - Identifies patterns and themes across multiple sources
    - Extracts key statistics and data points
    - Generates chart-ready data for visualization
    - Creates comparison matrices
    """

    @property
    def name(self) -> str:
        return "Analyst"

    @property
    def emoji(self) -> str:
        return "📊"

    @property
    def system_prompt(self) -> str:
        return """You are a senior data analyst. You excel at finding patterns,
extracting insights, and creating data visualizations.
You always support your conclusions with evidence from the source data.
You think critically and identify both opportunities and risks."""

    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Analyze all research findings and generate insights + charts.
        
        Input: state.findings (list of Finding objects)
        Output: state.analysis (Analysis object) + state.charts (base64 images)
        """
        if not state.findings:
            await self.emit(state, "warning", "No findings to analyze!")
            state.analysis = Analysis(
                key_themes=["No data available"],
                key_insights=["Research did not yield sufficient data for analysis"]
            )
            return state

        await self.emit(state, "start",
                       f"Analyzing {len(state.findings)} findings...")

        # Step 1: Run data analysis
        findings_data = [
            {
                "summary": f.summary or f.content[:500],
                "source_url": f.source_url,
                "source_title": f.source_title
            }
            for f in state.findings
        ]

        await self.emit(state, "tool_call", "🧮 Running deep analysis on all findings...")

        analysis_result = await data_analyzer_tool.safe_execute(
            findings=findings_data,
            query=state.query
        )

        if analysis_result["success"]:
            data = analysis_result["data"]
            state.analysis = Analysis(
                key_themes=data.get("key_themes", []),
                key_insights=data.get("key_insights", []),
                statistics=data.get("statistics", {}),
                comparisons=data.get("comparisons", []),
                chart_data=data.get("chart_data", []),
                knowledge_graph=data.get("knowledge_graph", {"nodes": [], "edges": []}),
                audio_briefing=data.get("audio_briefing", {}),
                debate=data.get("debate", {})
            )
            state.knowledge_graph = state.analysis.knowledge_graph
            state.audio_briefing = state.analysis.audio_briefing
            state.debate = state.analysis.debate

            themes_str = ", ".join(state.analysis.key_themes[:3])
            nodes_count = len(state.knowledge_graph.get("nodes", []))
            conviction = state.debate.get("conviction_score", 70)
            await self.emit(state, "result",
                          f"Extracted {len(state.analysis.key_themes)} strategic themes, {nodes_count} entity relations, & {conviction}% conviction debate matrix")

            # Step 2: Generate charts from the analysis data
            if state.analysis.chart_data:
                await self.emit(state, "tool_call",
                              f"📈 Generating {len(state.analysis.chart_data)} charts...")

                chart_result = await chart_generator_tool.safe_execute(
                    chart_data=state.analysis.chart_data
                )

                if chart_result["success"]:
                    charts = chart_result["data"].get("charts", [])
                    state.charts = [c["image"] for c in charts if c.get("image")]
                    await self.emit(state, "result",
                                  f"Generated {len(state.charts)} visualizations")
                else:
                    await self.emit(state, "warning", "Chart generation failed, continuing without visuals")
        else:
            await self.emit(state, "warning", f"Analysis had issues: {analysis_result['error']}")
            state.analysis = Analysis(
                key_themes=["Analysis encountered issues"],
                key_insights=["Please review raw findings for insights"]
            )

        await self.emit(state, "result", "✅ Analysis phase complete!")
        return state


# Singleton instance
analyst_agent = AnalystAgent()
