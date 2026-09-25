# ============================================
# NexusAI - Writer Agent
# ============================================
# Synthesizes all findings and analysis into a polished research report.

from backend.agents.base_agent import BaseAgent
from backend.core.state import ResearchState
from backend.tools.file_writer import file_writer_tool


class WriterAgent(BaseAgent):
    """
    The Writer agent creates the final research report.
    
    This demonstrates the SYNTHESIS capability:
    - Combines findings from multiple sources
    - Structures information logically
    - Creates properly cited, professional reports
    - Incorporates charts and data visualizations
    """

    @property
    def name(self) -> str:
        return "Writer"

    @property
    def emoji(self) -> str:
        return "✍️"

    @property
    def system_prompt(self) -> str:
        return """You are an expert research report writer. You create comprehensive,
well-structured reports that are both informative and engaging.

Your reports always include:
- Clear executive summaries
- Well-organized sections with logical flow
- Evidence-based insights with source citations
- Professional formatting in Markdown
- Actionable conclusions

Write in a professional but accessible tone. Use Markdown formatting extensively."""

    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Generate the final research report from all gathered data.
        
        Input: state.findings, state.analysis, state.charts, state.plan
        Output: state.report (Markdown string)
        """
        await self.emit(state, "start", "Composing the research report...")

        # Build the context from all our data
        context = self._build_report_context(state)

        # Determine sections from the plan
        sections = []
        if state.plan and state.plan.expected_sections:
            sections = state.plan.expected_sections

        sections_str = "\n".join(f"- {s}" for s in sections) if sections else "Use your best judgment for sections"

        # Handle critic feedback for refinement
        refinement_instruction = ""
        if state.critic_feedback and state.iteration > 0:
            refinement_instruction = f"""

IMPORTANT - REFINEMENT REQUEST (Iteration {state.iteration}):
The report was reviewed and needs improvement. Address this feedback:
{state.critic_feedback}

Previous report for reference:
{state.report[:2000]}
"""

        prompt = f"""Write a comprehensive research report on: "{state.query}"

Use the following research data to create the report:

{context}

REPORT STRUCTURE (suggested sections):
{sections_str}

FORMATTING REQUIREMENTS:
1. Use Markdown formatting (# for headings, ## for subheadings, etc.)
2. Start with a title using # heading
3. Include an Executive Summary section at the top
4. Use bullet points and numbered lists for clarity
5. Add a "Sources" section at the end listing all source URLs
6. Include a "Methodology" note explaining how the research was conducted
7. Use **bold** for key terms and findings
8. Use > blockquotes for important callouts
9. If numerical data exists, reference the key statistics
10. End with "Conclusions & Recommendations" section

Make the report thorough, professional, and insightful. Aim for 800-1500 words.
{refinement_instruction}"""

        # Generate the report
        report = await self.think(state, prompt, "")

        state.report = report

        await self.emit(state, "result",
                       f"📄 Report generated! ({len(report.split())} words, {len(state.findings)} sources cited)")

        # Save to file
        await self.emit(state, "tool_call", "💾 Saving report to file...")
        await file_writer_tool.safe_execute(content=report)

        return state

    def _build_report_context(self, state: ResearchState) -> str:
        """Compile all research data into a context string for the LLM."""
        context_parts = []

        # Add research plan
        if state.plan:
            context_parts.append("RESEARCH PLAN:")
            context_parts.append(f"  Topic: {state.plan.main_topic}")
            context_parts.append(f"  Angles: {', '.join(state.plan.research_angles)}")
            context_parts.append("")

        # Add findings summaries
        if state.findings:
            context_parts.append(f"RESEARCH FINDINGS ({len(state.findings)} sources):")
            for i, finding in enumerate(state.findings, 1):
                context_parts.append(f"\n  [{i}] {finding.source_title}")
                context_parts.append(f"      URL: {finding.source_url}")
                context_parts.append(f"      Summary: {finding.summary[:400]}")
            context_parts.append("")

        # Add analysis insights
        if state.analysis:
            context_parts.append("ANALYSIS RESULTS:")

            if state.analysis.key_themes:
                context_parts.append(f"  Key Themes: {', '.join(state.analysis.key_themes)}")

            if state.analysis.key_insights:
                context_parts.append("  Key Insights:")
                for insight in state.analysis.key_insights:
                    context_parts.append(f"    • {insight}")

            if state.analysis.statistics:
                context_parts.append("  Statistics:")
                for key, val in state.analysis.statistics.items():
                    context_parts.append(f"    • {key}: {val}")

            if state.analysis.comparisons:
                context_parts.append("  Comparisons:")
                for comp in state.analysis.comparisons:
                    context_parts.append(f"    • {comp.get('item', '?')}: {comp.get('metric', '?')} - {comp.get('detail', '')}")

        return "\n".join(context_parts)


# Singleton instance
writer_agent = WriterAgent()
