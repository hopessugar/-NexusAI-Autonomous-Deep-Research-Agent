# ============================================
# NexusAI - Supervisor Agent (Orchestrator)
# ============================================
# The master agent that coordinates the entire research workflow.
# Routes tasks to specialized agents and manages the pipeline flow.

import asyncio
from datetime import datetime

from backend.agents.base_agent import BaseAgent
from backend.agents.planner import planner_agent
from backend.agents.researcher import researcher_agent
from backend.agents.analyst import analyst_agent
from backend.agents.writer import writer_agent
from backend.agents.critic import critic_agent
from backend.core.state import ResearchState, WorkflowStatus
from backend.core.event_bus import event_bus
from backend.config import config


class SupervisorAgent(BaseAgent):
    """
    The Supervisor (Orchestrator) agent manages the entire research pipeline.
    
    This demonstrates the ORCHESTRATION and CONDITIONAL ROUTING capabilities:
    - Routes tasks to the right agent in the right order
    - Manages workflow state transitions
    - Implements the iterative refinement loop (Critic → Writer → Critic)
    - Handles errors gracefully
    - Emits status events for the real-time dashboard
    
    Workflow:
        User Query → Planner → Researcher → Analyst → Writer → Critic
                                                         ↑         |
                                                         └─────────┘
                                                      (if score < threshold)
    """

    @property
    def name(self) -> str:
        return "Supervisor"

    @property
    def emoji(self) -> str:
        return "🧠"

    @property
    def system_prompt(self) -> str:
        return "You are the orchestrator of a multi-agent research system."

    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Execute the full research pipeline from start to finish.
        
        This is the main entry point — it runs all agents in sequence
        and manages the refinement loop.
        """
        try:
            await self.emit(state, "start",
                          f"🚀 Starting NexusAI research pipeline for: \"{state.query}\"")

            # ═══════════════════════════════════════════
            # PHASE 1: PLANNING
            # ═══════════════════════════════════════════
            state.status = WorkflowStatus.PLANNING
            await event_bus.emit_status(state.task_id, "planning")
            await self.emit(state, "phase", "━━━ Phase 1: Research Planning ━━━")

            state = await planner_agent.execute(state)

            if not state.plan or not state.plan.sub_queries:
                await self.emit(state, "error", "Planning failed — no sub-queries generated")
                state.status = WorkflowStatus.ERROR
                await event_bus.emit_complete(state.task_id, state.to_dict())
                return state

            # ═══════════════════════════════════════════
            # PHASE 2: RESEARCH
            # ═══════════════════════════════════════════
            state.status = WorkflowStatus.RESEARCHING
            await event_bus.emit_status(state.task_id, "researching")
            await self.emit(state, "phase", "━━━ Phase 2: Web Research ━━━")

            state = await researcher_agent.execute(state)

            if not state.findings:
                await self.emit(state, "warning",
                              "No findings gathered — report will be limited")

            # ═══════════════════════════════════════════
            # PHASE 3: ANALYSIS
            # ═══════════════════════════════════════════
            state.status = WorkflowStatus.ANALYZING
            await event_bus.emit_status(state.task_id, "analyzing")
            await self.emit(state, "phase", "━━━ Phase 3: Data Analysis ━━━")

            state = await analyst_agent.execute(state)

            # ═══════════════════════════════════════════
            # PHASE 4 & 5: WRITE → REVIEW → REFINE LOOP
            # ═══════════════════════════════════════════
            while state.iteration <= state.max_iterations:
                # --- WRITE ---
                if state.iteration == 0:
                    state.status = WorkflowStatus.WRITING
                else:
                    state.status = WorkflowStatus.REFINING
                await event_bus.emit_status(state.task_id, state.status.value)

                phase_label = "Phase 4: Report Writing" if state.iteration == 0 else f"Phase 4: Refinement (Round {state.iteration})"
                await self.emit(state, "phase", f"━━━ {phase_label} ━━━")

                state = await writer_agent.execute(state)

                # --- REVIEW ---
                state.status = WorkflowStatus.REVIEWING
                await event_bus.emit_status(state.task_id, "reviewing")
                await self.emit(state, "phase", "━━━ Phase 5: Quality Review ━━━")

                state = await critic_agent.execute(state)

                # Check if report passes quality threshold
                if state.quality_score >= config.QUALITY_THRESHOLD:
                    await self.emit(state, "decision",
                                  f"✅ Report approved with score {state.quality_score}/10!")
                    break
                elif state.iteration >= state.max_iterations:
                    await self.emit(state, "decision",
                                  f"📋 Max iterations reached. Delivering best version (score: {state.quality_score}/10)")
                    break
                else:
                    state.iteration += 1
                    await self.emit(state, "decision",
                                  f"🔄 Refinement round {state.iteration} — improving report based on feedback")

            # ═══════════════════════════════════════════
            # COMPLETION
            # ═══════════════════════════════════════════
            state.status = WorkflowStatus.COMPLETE
            state.completed_at = datetime.now().isoformat()

            # Build a summary of what was accomplished
            duration = "completed"
            try:
                start = datetime.fromisoformat(state.started_at)
                end = datetime.fromisoformat(state.completed_at)
                seconds = (end - start).total_seconds()
                if seconds >= 60:
                    duration = f"{int(seconds // 60)}m {int(seconds % 60)}s"
                else:
                    duration = f"{int(seconds)}s"
            except (ValueError, TypeError):
                pass

            await self.emit(state, "complete",
                          f"🎉 Research complete!\n"
                          f"   📊 Sources analyzed: {len(state.findings)}\n"
                          f"   📈 Charts generated: {len(state.charts)}\n"
                          f"   ⭐ Quality score: {state.quality_score}/10\n"
                          f"   ⏱️ Duration: {duration}\n"
                          f"   🔄 Refinement iterations: {state.iteration}")

            await event_bus.emit_status(state.task_id, "complete")
            await event_bus.emit_complete(state.task_id, state.to_dict())

        except Exception as e:
            state.status = WorkflowStatus.ERROR
            error_msg = f"Pipeline error: {str(e)}"
            await self.emit(state, "error", error_msg)
            await event_bus.emit_complete(state.task_id, state.to_dict())
            print(f"❌ Supervisor error: {e}")
            import traceback
            traceback.print_exc()

        return state


# Singleton instance
supervisor_agent = SupervisorAgent()
