# ============================================
# NexusAI - Base Agent (Abstract Interface)
# ============================================
# All agents inherit from this base class.

from abc import ABC, abstractmethod
from backend.core.state import ResearchState, AgentEvent
from backend.core.event_bus import event_bus
from backend.core.llm_engine import llm_engine


class BaseAgent(ABC):
    """
    Abstract base class for all agents in the NexusAI system.
    
    Each agent has:
    - A name and emoji (for display in the UI)
    - A system prompt (defines the agent's personality/role)
    - An execute method (performs the agent's specific task)
    - Event emission (streams activity to the frontend)
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name for this agent."""
        pass

    @property
    @abstractmethod
    def emoji(self) -> str:
        """Emoji icon for this agent (displayed in UI)."""
        pass

    @property
    @abstractmethod
    def system_prompt(self) -> str:
        """System prompt that defines this agent's role and behavior."""
        pass

    @abstractmethod
    async def execute(self, state: ResearchState) -> ResearchState:
        """
        Execute this agent's task, reading from and writing to the state.
        
        Args:
            state: The current research state (read/write)
            
        Returns:
            The updated research state
        """
        pass

    async def emit(self, state: ResearchState, action: str, detail: str):
        """
        Emit an event to the frontend via SSE.
        This is how the real-time activity feed gets its data.
        """
        event = state.add_event(
            agent=f"{self.emoji} {self.name}",
            action=action,
            detail=detail
        )
        await event_bus.emit(state.task_id, event)

    async def think(self, state: ResearchState, prompt: str, context: str = "") -> str:
        """
        Use the LLM to reason about something.
        Automatically emits a "thinking" event for the UI.
        """
        await self.emit(state, "thinking", f"Reasoning about the next step...")
        result = await llm_engine.generate_with_context(
            prompt=prompt,
            system_prompt=self.system_prompt,
            context=context
        )
        return result

    async def think_json(self, state: ResearchState, prompt: str) -> dict:
        """
        Use the LLM to generate structured JSON output.
        """
        await self.emit(state, "thinking", "Generating structured analysis...")
        result = await llm_engine.generate_json(prompt, self.system_prompt)
        return result
