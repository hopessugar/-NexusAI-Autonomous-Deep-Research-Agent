# ============================================
# NexusAI - Base Tool (Abstract Interface)
# ============================================
# All tools inherit from this base class for consistency.

from abc import ABC, abstractmethod


class BaseTool(ABC):
    """
    Abstract base class for all tools in the NexusAI system.
    
    Each tool has:
    - A name (used for logging and display)
    - A description (used for agent reasoning)
    - An execute method (performs the actual work)
    """

    @property
    @abstractmethod
    def name(self) -> str:
        """Unique name for this tool."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """What this tool does (shown to agents for reasoning)."""
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> dict:
        """
        Execute the tool with the given parameters.
        
        Returns:
            A dictionary with the tool's output, always containing:
            - "success": bool
            - "data": the actual result data
            - "error": error message if success is False
        """
        pass

    async def safe_execute(self, **kwargs) -> dict:
        """
        Wrapper that catches any exceptions and returns a clean error response.
        Agents should call this instead of execute() directly.
        """
        try:
            return await self.execute(**kwargs)
        except Exception as e:
            return {
                "success": False,
                "data": None,
                "error": f"{self.name} failed: {str(e)}"
            }
