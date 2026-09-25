# ============================================
# NexusAI - Text Processor Tool
# ============================================
# Provides text summarization and key information extraction.
# Uses the LLM to intelligently process and condense text.

from backend.tools.base_tool import BaseTool


class TextProcessorTool(BaseTool):
    """
    Processes raw text to extract key information.
    Uses the LLM for intelligent summarization.
    """

    @property
    def name(self) -> str:
        return "text_processor"

    @property
    def description(self) -> str:
        return "Summarize and extract key points from text content."

    async def execute(self, text: str = "", task: str = "summarize") -> dict:
        """
        Process text based on the given task.
        
        Args:
            text: The text to process
            task: What to do — "summarize", "extract_facts", "extract_stats"
            
        Returns:
            Dict with processed text output
        """
        if not text:
            return {"success": False, "data": None, "error": "No text provided"}

        # Import here to avoid circular imports
        from backend.core.llm_engine import llm_engine

        try:
            if task == "summarize":
                prompt = (
                    f"Summarize the following text in 3-5 concise bullet points. "
                    f"Focus on the most important facts and insights.\n\n"
                    f"TEXT:\n{text[:3000]}"
                )
            elif task == "extract_facts":
                prompt = (
                    f"Extract the top 5-7 key facts from the following text. "
                    f"Return each fact as a single clear sentence.\n\n"
                    f"TEXT:\n{text[:3000]}"
                )
            elif task == "extract_stats":
                prompt = (
                    f"Extract any numerical data, statistics, percentages, dates, "
                    f"or quantifiable information from this text. "
                    f"Return as a bullet-point list.\n\n"
                    f"TEXT:\n{text[:3000]}"
                )
            else:
                prompt = f"Summarize:\n{text[:3000]}"

            result = await llm_engine.generate(prompt)

            return {
                "success": True,
                "data": {"processed_text": result, "task": task},
                "error": None
            }

        except Exception as e:
            return {"success": False, "data": None, "error": f"Processing failed: {str(e)}"}


# Singleton instance
text_processor_tool = TextProcessorTool()
