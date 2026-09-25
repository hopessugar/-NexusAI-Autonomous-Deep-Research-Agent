# ============================================
# NexusAI - State Management
# ============================================
# Defines the typed state objects that flow through the entire agent pipeline.
# Using dataclasses for clean, type-safe state management.

from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime
import uuid


class WorkflowStatus(str, Enum):
    """Tracks which phase the research workflow is currently in."""
    PENDING = "pending"
    PLANNING = "planning"
    RESEARCHING = "researching"
    ANALYZING = "analyzing"
    WRITING = "writing"
    REVIEWING = "reviewing"
    REFINING = "refining"
    COMPLETE = "complete"
    ERROR = "error"


@dataclass
class AgentEvent:
    """
    A single event emitted by an agent during the workflow.
    These events are streamed to the frontend via SSE for real-time updates.
    """
    agent: str              # Which agent emitted this (e.g., "planner", "researcher")
    action: str             # What the agent is doing (e.g., "thinking", "tool_call", "result")
    detail: str             # Human-readable description of what happened
    timestamp: str = ""     # ISO timestamp

    def __post_init__(self):
        if not self.timestamp:
            self.timestamp = datetime.now().isoformat()

    def to_dict(self) -> dict:
        """Convert to a dictionary for JSON serialization."""
        return {
            "agent": self.agent,
            "action": self.action,
            "detail": self.detail,
            "timestamp": self.timestamp
        }


@dataclass
class Finding:
    """A single piece of research data gathered from a source."""
    source_url: str          # Where this information came from
    source_title: str        # Title of the source page
    content: str             # Extracted text content
    summary: str = ""        # LLM-generated summary of the content
    relevance_score: float = 0.0  # How relevant this is to the query (0-1)

    def to_dict(self) -> dict:
        return {
            "source_url": self.source_url,
            "source_title": self.source_title,
            "content": self.content[:500],  # Truncate for JSON
            "summary": self.summary,
            "relevance_score": self.relevance_score
        }


@dataclass
class ResearchPlan:
    """The structured plan created by the Planner agent."""
    main_topic: str                        # The core research topic
    sub_queries: list[str] = field(default_factory=list)   # Search queries to execute
    research_angles: list[str] = field(default_factory=list)  # Different angles to investigate
    expected_sections: list[str] = field(default_factory=list)  # Expected report sections

    def to_dict(self) -> dict:
        return {
            "main_topic": self.main_topic,
            "sub_queries": self.sub_queries,
            "research_angles": self.research_angles,
            "expected_sections": self.expected_sections
        }


@dataclass
class Analysis:
    """The structured analysis produced by the Analyst agent."""
    key_themes: list[str] = field(default_factory=list)       # Major themes identified
    key_insights: list[str] = field(default_factory=list)     # Important insights
    statistics: dict = field(default_factory=dict)             # Any numerical data found
    comparisons: list[dict] = field(default_factory=list)      # Comparison data for charts
    chart_data: list[dict] = field(default_factory=list)       # Data formatted for chart generation
    knowledge_graph: dict = field(default_factory=lambda: {"nodes": [], "edges": []})  # Extracted entities & relations
    audio_briefing: dict = field(default_factory=dict)         # 2-host conversational podcast script
    debate: dict = field(default_factory=dict)                 # Adversarial Bull vs Bear debate & conviction matrix

    def to_dict(self) -> dict:
        return {
            "key_themes": self.key_themes,
            "key_insights": self.key_insights,
            "statistics": self.statistics,
            "comparisons": self.comparisons,
            "chart_data": self.chart_data,
            "knowledge_graph": self.knowledge_graph,
            "audio_briefing": self.audio_briefing,
            "debate": self.debate
        }


@dataclass
class ResearchState:
    """
    The MASTER STATE object that flows through the entire agent pipeline.
    Every agent reads from and writes to this state.
    This is the single source of truth for the entire research workflow.
    """
    # --- Core ---
    task_id: str = ""                     # Unique ID for this research task
    query: str = ""                       # Original user query
    status: WorkflowStatus = WorkflowStatus.PENDING

    # --- Pipeline Data ---
    plan: ResearchPlan | None = None      # Output of Planner agent
    findings: list[Finding] = field(default_factory=list)    # Output of Researcher agent
    analysis: Analysis | None = None      # Output of Analyst agent
    charts: list[str] = field(default_factory=list)          # Base64-encoded chart images
    knowledge_graph: dict = field(default_factory=lambda: {"nodes": [], "edges": []})
    audio_briefing: dict = field(default_factory=dict)
    debate: dict = field(default_factory=dict)
    report: str = ""                      # Final markdown report
    report_html: str = ""                 # HTML-rendered report

    # --- Quality Control ---
    quality_score: float = 0.0            # Score from Critic agent (0-10)
    critic_feedback: str = ""             # Detailed feedback from Critic
    iteration: int = 0                    # Current refinement iteration
    max_iterations: int = 2               # Maximum refinement attempts

    # --- Event Log ---
    events: list[AgentEvent] = field(default_factory=list)

    # --- Timestamps ---
    started_at: str = ""
    completed_at: str = ""

    def __post_init__(self):
        if not self.task_id:
            self.task_id = str(uuid.uuid4())[:8]
        if not self.started_at:
            self.started_at = datetime.now().isoformat()

    def add_event(self, agent: str, action: str, detail: str) -> AgentEvent:
        """Add a new event to the log and return it."""
        event = AgentEvent(agent=agent, action=action, detail=detail)
        self.events.append(event)
        return event

    def to_dict(self) -> dict:
        """Convert the full state to a JSON-serializable dictionary."""
        return {
            "task_id": self.task_id,
            "query": self.query,
            "status": self.status.value,
            "plan": self.plan.to_dict() if self.plan else None,
            "findings_count": len(self.findings),
            "findings": [f.to_dict() for f in self.findings],
            "analysis": self.analysis.to_dict() if self.analysis else None,
            "charts": self.charts,
            "knowledge_graph": self.knowledge_graph,
            "audio_briefing": self.audio_briefing,
            "debate": self.debate,
            "report": self.report,
            "quality_score": self.quality_score,
            "critic_feedback": self.critic_feedback,
            "iteration": self.iteration,
            "events": [e.to_dict() for e in self.events],
            "started_at": self.started_at,
            "completed_at": self.completed_at
        }
