# ============================================
# NexusAI - File Writer Tool
# ============================================
# Saves research reports to disk as Markdown files.

import os
from datetime import datetime
from backend.tools.base_tool import BaseTool
from backend.config import config


class FileWriterTool(BaseTool):
    """Saves generated reports to the outputs directory."""

    @property
    def name(self) -> str:
        return "file_writer"

    @property
    def description(self) -> str:
        return "Save a research report to a Markdown file."

    async def execute(self, content: str = "", filename: str = "") -> dict:
        """
        Save content to a file in the outputs directory.
        
        Args:
            content: The markdown content to save
            filename: Optional filename (auto-generated if not provided)
            
        Returns:
            Dict with the file path
        """
        if not content:
            return {"success": False, "data": None, "error": "No content to save"}

        try:
            # Ensure outputs directory exists
            os.makedirs(config.OUTPUTS_DIR, exist_ok=True)

            # Generate filename if not provided
            if not filename:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"research_report_{timestamp}.md"

            filepath = os.path.join(config.OUTPUTS_DIR, filename)

            # Write the file
            with open(filepath, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "success": True,
                "data": {"filepath": filepath, "filename": filename},
                "error": None
            }

        except Exception as e:
            return {"success": False, "data": None, "error": f"File write failed: {str(e)}"}


# Singleton instance
file_writer_tool = FileWriterTool()
