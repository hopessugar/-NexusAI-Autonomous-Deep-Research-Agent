# ============================================
# NexusAI - FastAPI Backend Server
# ============================================
# The API server that connects the frontend dashboard to the agent pipeline.
# Provides REST endpoints and SSE streaming for real-time updates.

import asyncio
import os
from fastapi import FastAPI, BackgroundTasks
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.config import config
from backend.core.state import ResearchState, WorkflowStatus
from backend.core.event_bus import event_bus
from backend.agents.supervisor import supervisor_agent


# ═══════════════════════════════════════════
# APP INITIALIZATION
# ═══════════════════════════════════════════

app = FastAPI(
    title="NexusAI",
    description="Autonomous Deep Research Agent with Multi-Agent Architecture",
    version="1.0.0"
)

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory task storage (maps task_id → ResearchState)
active_tasks: dict[str, ResearchState] = {}

def load_golden_showcases():
    """Tier 3: Preload golden showcase intelligence dossiers for instant stage demo."""
    import json
    showcase_path = os.path.join(os.path.dirname(__file__), "core", "showcase_ev.json")
    if os.path.exists(showcase_path):
        try:
            with open(showcase_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            from backend.core.state import Analysis, Finding
            state = ResearchState(
                task_id="showcase-ev",
                query=data.get("query", "Top Electric Vehicles Comparison 2026-2027"),
                status=WorkflowStatus.COMPLETE,
                report=data.get("report", ""),
                quality_score=data.get("quality_score", 9.2),
                charts=data.get("charts", []),
                knowledge_graph=data.get("knowledge_graph", {}),
                audio_briefing=data.get("audio_briefing", {}),
                debate=data.get("debate", {}),
                findings=[
                    Finding(source_url=s.get("url", ""), source_title=s.get("title", "Reference"), summary=s.get("title", ""), content=s.get("title", ""))
                    for s in data.get("sources", [])
                ],
                analysis=Analysis(
                    key_themes=data.get("analysis", {}).get("key_themes", []),
                    key_insights=data.get("analysis", {}).get("key_insights", []),
                    statistics=data.get("analysis", {}).get("statistics", {}),
                    comparisons=data.get("analysis", {}).get("comparisons", []),
                    chart_data=data.get("analysis", {}).get("chart_data", []),
                    knowledge_graph=data.get("knowledge_graph", {}),
                    audio_briefing=data.get("audio_briefing", {}),
                    debate=data.get("debate", {})
                )
            )
            active_tasks["showcase-ev"] = state
            print("   [OK] Loaded Tier 3 Golden Showcase: showcase-ev")
        except Exception as e:
            print(f"   [!] Failed to load showcase: {e}")

load_golden_showcases()


# ═══════════════════════════════════════════
# REQUEST / RESPONSE MODELS
# ═══════════════════════════════════════════

class ResearchRequest(BaseModel):
    """The request body for starting a new research task."""
    query: str    # The user's research question


class TaskResponse(BaseModel):
    """Response returned when a task is created."""
    task_id: str
    status: str
    message: str


# ═══════════════════════════════════════════
# API ENDPOINTS
# ═══════════════════════════════════════════

@app.post("/api/research", response_model=TaskResponse)
async def start_research(request: ResearchRequest, background_tasks: BackgroundTasks):
    """
    Start a new research task.
    
    1. Creates a new ResearchState
    2. Launches the supervisor agent in the background
    3. Returns the task_id for SSE streaming
    """
    # Create a new research state
    state = ResearchState(query=request.query)
    active_tasks[state.task_id] = state

    # Launch the research pipeline as a background task
    background_tasks.add_task(run_research_pipeline, state)

    return TaskResponse(
        task_id=state.task_id,
        status="started",
        message=f"Research started for: {request.query}"
    )


async def run_research_pipeline(state: ResearchState):
    """Background task that runs the full research pipeline."""
    try:
        # Small delay to let the SSE connection establish
        await asyncio.sleep(0.5)
        # Run the supervisor (which runs all other agents)
        updated_state = await supervisor_agent.execute(state)
        # Update the stored state
        active_tasks[state.task_id] = updated_state
    except Exception as e:
        print(f"❌ Pipeline error: {e}")
        state.status = WorkflowStatus.ERROR
        await event_bus.emit_complete(state.task_id, state.to_dict())


@app.get("/api/research/{task_id}/stream")
async def stream_events(task_id: str):
    """
    Server-Sent Events (SSE) endpoint.
    
    The frontend connects here to receive real-time updates
    as agents work through the research pipeline.
    """
    return StreamingResponse(
        event_bus.event_stream(task_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@app.get("/api/research/{task_id}/status")
async def get_task_status(task_id: str):
    """Get the current status of a research task."""
    state = active_tasks.get(task_id)
    if not state:
        return JSONResponse(
            status_code=404,
            content={"error": "Task not found"}
        )
    return state.to_dict()


@app.get("/api/research/{task_id}/report")
async def get_report(task_id: str):
    """Get the final report for a completed research task."""
    state = active_tasks.get(task_id)
    if not state:
        return JSONResponse(
            status_code=404,
            content={"error": "Task not found"}
        )

    return {
        "task_id": task_id,
        "query": state.query,
        "status": state.status.value,
        "report": state.report,
        "charts": state.charts,
        "knowledge_graph": state.knowledge_graph or (state.analysis.knowledge_graph if state.analysis else {"nodes": [], "edges": []}),
        "audio_briefing": state.audio_briefing or (state.analysis.audio_briefing if state.analysis else {}),
        "debate": state.debate or (state.analysis.debate if state.analysis else {}),
        "quality_score": state.quality_score,
        "critic_feedback": state.critic_feedback,
        "findings_count": len(state.findings),
        "analysis": state.analysis.to_dict() if state.analysis else None,
        "plan": state.plan.to_dict() if state.plan else None,
        "started_at": state.started_at,
        "completed_at": state.completed_at,
        "sources": [
            {"title": f.source_title, "url": f.source_url}
            for f in state.findings
        ]
    }


@app.get("/api/showcase/{name}")
async def get_showcase(name: str):
    """
    Tier 3 Feature: Stage Demo Mode.
    Instantly returns pre-synthesized golden research dossiers for zero-latency presentation.
    """
    task_id = "showcase-ev"
    state = active_tasks.get(task_id)
    if not state:
        return JSONResponse(status_code=404, content={"error": "Showcase dossier not found"})

    return {
        "task_id": state.task_id,
        "query": state.query,
        "status": state.status.value,
        "report": state.report,
        "charts": state.charts,
        "knowledge_graph": state.knowledge_graph,
        "audio_briefing": state.audio_briefing,
        "debate": state.debate,
        "quality_score": state.quality_score,
        "critic_feedback": state.critic_feedback,
        "findings_count": len(state.findings),
        "analysis": state.analysis.to_dict() if state.analysis else None,
        "plan": state.plan.to_dict() if state.plan else None,
        "started_at": state.started_at,
        "completed_at": state.completed_at,
        "sources": [
            {"title": f.source_title, "url": f.source_url}
            for f in state.findings
        ]
    }


class ChatRequest(BaseModel):
    message: str
    history: list = []


@app.post("/api/research/{task_id}/chat")
async def chat_with_dossier(task_id: str, request: ChatRequest):
    """
    Tier 2 Feature: Grounded Research Copilot.
    Allows user to ask follow-up questions directly to the research context.
    """
    state = active_tasks.get(task_id)
    if not state:
        return JSONResponse(status_code=404, content={"error": "Research session not found"})

    user_msg = request.message.strip()
    if not user_msg:
        return JSONResponse(status_code=400, content={"error": "Message is empty"})

    from backend.core.llm_engine import llm_engine

    themes_str = ", ".join(state.analysis.key_themes if state.analysis else [])
    bull_title = state.debate.get("bull_thesis", {}).get("title", "") if state.debate else ""
    bear_title = state.debate.get("bear_thesis", {}).get("title", "") if state.debate else ""

    dossier_context = f"""Topic: {state.query}
Executive Report Summary:
{state.report[:3500]}

Key Themes: {themes_str}
Bull Case: {bull_title}
Bear Case: {bear_title}
Conviction Score: {state.debate.get("conviction_score", "75") if state.debate else "75"}%
"""

    prompt = f"""You are the NexusAI Research Copilot, an elite strategic intelligence advisor.
The user is reviewing the research dossier for "{state.query}".
Answer the user's question directly, precisely, and concisely using the research findings.
Cite specific vehicle models, metrics, benchmarks, or arguments from the research where applicable.

RESEARCH CONTEXT:
{dossier_context}

USER QUESTION:
{user_msg}

Answer in 2-3 structured, authoritative paragraphs or bullet points."""

    try:
        reply = await llm_engine.generate(
            prompt,
            system_prompt="You are NexusAI Research Copilot. You provide grounded, high-conviction strategic analysis."
        )
        return {
            "task_id": task_id,
            "reply": reply,
            "sources_count": len(state.findings)
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Copilot error: {str(e)}"})


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "NexusAI",
        "version": "1.0.0",
        "model": config.GEMINI_MODEL,
        "active_tasks": len(active_tasks)
    }


# ═══════════════════════════════════════════
# STATIC FILE SERVING (Frontend)
# ═══════════════════════════════════════════

# Serve the frontend files
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.get("/")
async def serve_frontend():
    """Serve the main dashboard page."""
    index_path = os.path.join(frontend_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return JSONResponse(
        content={"message": "NexusAI API is running. Frontend not found."},
        status_code=200
    )
