# ============================================
# NexusAI - Critic Agent
# ============================================
# Reviews the generated report for quality and completeness.
# Can trigger a refinement loop if the report doesn't meet standards.

from backend.agents.base_agent import BaseAgent
from backend.core.state import ResearchState


class CriticAgent(BaseAgent):
    """
    The Critic agent evaluates report quality.
    
    This demonstrates the EVALUATION and ITERATIVE REFINEMENT capabilities:
    - Scores reports on multiple quality dimensions
    - Provides specific, actionable feedback
    - Can trigger re-writing if quality is below threshold
    - Ensures the final output meets professional standards
    """

    @property
    def name(self) -> str:
        return "Critic"

    @property
    def emoji(self) -> str:
        return "🔎"

    @property
    def system_prompt(self) -> str:
        return """You are a rigorous quality reviewer for research reports.
You evaluate reports on: completeness, accuracy, structure, citations, 
readability, and actionable insights.

You are fair but thorough — you give credit where it's due but always 
identify areas for improvement. You score on a 1-10 scale.

Always respond with structured JSON."""

    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Review the research report and assign a quality score.
        
        Input: state.report (the generated report)
        Output: state.quality_score, state.critic_feedback
        """
        if not state.report:
            await self.emit(state, "error", "No report to review!")
            state.quality_score = 0
            state.critic_feedback = "No report was generated."
            return state

        await self.emit(state, "start",
                       f"Reviewing report quality (iteration {state.iteration + 1})...")

        # Build review prompt
        prompt = f"""Review this research report and provide a quality assessment.

ORIGINAL QUERY: "{state.query}"

NUMBER OF SOURCES USED: {len(state.findings)}

REPORT:
{state.report[:4000]}

Evaluate the report on these criteria and provide a JSON response:
{{
    "overall_score": 8.5,
    "scores": {{
        "completeness": 8,
        "accuracy": 9,
        "structure": 8,
        "citations": 7,
        "readability": 9,
        "insights": 8
    }},
    "strengths": [
        "Strength 1",
        "Strength 2"
    ],
    "improvements_needed": [
        "Specific improvement 1",
        "Specific improvement 2"
    ],
    "summary": "Overall assessment in 1-2 sentences"
}}

Be fair and realistic in your scoring. A score of 7+ means the report is good quality."""

        review = await self.think_json(state, prompt)

        # Extract score (default to 7.5 if parsing fails)
        score = review.get("overall_score", 7.5)
        try:
            score = float(score)
        except (ValueError, TypeError):
            score = 7.5

        state.quality_score = score

        # Build feedback string
        strengths = review.get("strengths", [])
        improvements = review.get("improvements_needed", [])
        summary = review.get("summary", "Review completed.")

        feedback_parts = [f"Score: {score}/10 — {summary}"]
        if strengths:
            feedback_parts.append("Strengths: " + "; ".join(strengths[:3]))
        if improvements:
            feedback_parts.append("Improvements needed: " + "; ".join(improvements[:3]))

        state.critic_feedback = "\n".join(feedback_parts)

        # Emit the review results
        score_emoji = "🟢" if score >= 7 else "🟡" if score >= 5 else "🔴"
        await self.emit(state, "result",
                       f"{score_emoji} Quality Score: {score}/10\n{state.critic_feedback}")

        # Determine if refinement is needed
        from backend.config import config
        if score < config.QUALITY_THRESHOLD and state.iteration < state.max_iterations:
            state.critic_feedback = "\n".join(improvements) if improvements else "Improve overall quality"
            await self.emit(state, "decision",
                          f"⚠️ Score below threshold ({config.QUALITY_THRESHOLD}). "
                          f"Sending back for refinement (attempt {state.iteration + 1}/{state.max_iterations})...")
        else:
            if score >= config.QUALITY_THRESHOLD:
                await self.emit(state, "decision", "✅ Report meets quality standards! Approved.")
            else:
                await self.emit(state, "decision", "📋 Max refinement attempts reached. Delivering current version.")

        return state


# Singleton instance
critic_agent = CriticAgent()
