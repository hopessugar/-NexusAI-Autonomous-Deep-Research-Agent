# ============================================
# NexusAI - Event Bus (Real-time Streaming)
# ============================================
# Provides an async event system that allows agents to emit events
# which are then streamed to the frontend via Server-Sent Events (SSE).

import asyncio
import json
from typing import AsyncGenerator
from backend.core.state import AgentEvent


class EventBus:
    """
    Central event bus for real-time agent activity streaming.
    
    How it works:
    1. Each research task gets its own list of subscriber queues
    2. When an agent emits an event, it's pushed to ALL subscriber queues for that task
    3. The SSE endpoint subscribes and yields events as they arrive
    4. When a task completes, a special "done" event is sent
    """

    def __init__(self):
        # Maps task_id -> list of asyncio.Queue subscribers
        self._subscribers: dict[str, list[asyncio.Queue]] = {}

    def subscribe(self, task_id: str) -> asyncio.Queue:
        """
        Subscribe to events for a specific task.
        Returns an asyncio.Queue that will receive events as they happen.
        """
        queue = asyncio.Queue()
        if task_id not in self._subscribers:
            self._subscribers[task_id] = []
        self._subscribers[task_id].append(queue)
        return queue

    def unsubscribe(self, task_id: str, queue: asyncio.Queue):
        """Remove a subscriber queue for a task."""
        if task_id in self._subscribers:
            self._subscribers[task_id] = [
                q for q in self._subscribers[task_id] if q is not queue
            ]
            # Clean up empty lists
            if not self._subscribers[task_id]:
                del self._subscribers[task_id]

    async def emit(self, task_id: str, event: AgentEvent):
        """
        Emit an event to all subscribers of a task.
        This is called by agents whenever they do something noteworthy.
        """
        if task_id in self._subscribers:
            event_data = event.to_dict()
            for queue in self._subscribers[task_id]:
                await queue.put(event_data)

    async def emit_status(self, task_id: str, status: str, data: dict = None):
        """Emit a status change event (used for workflow phase transitions)."""
        event_data = {
            "agent": "system",
            "action": "status_change",
            "detail": status,
            "data": data or {},
            "timestamp": ""
        }
        if task_id in self._subscribers:
            for queue in self._subscribers[task_id]:
                await queue.put(event_data)

    async def emit_complete(self, task_id: str, final_data: dict = None):
        """Emit a completion event — tells the SSE stream to close."""
        complete_event = {
            "agent": "system",
            "action": "complete",
            "detail": "Research complete",
            "data": final_data or {},
            "timestamp": ""
        }
        if task_id in self._subscribers:
            for queue in self._subscribers[task_id]:
                await queue.put(complete_event)
            # Small delay to ensure event is sent before cleanup
            await asyncio.sleep(0.1)

    async def event_stream(self, task_id: str) -> AsyncGenerator[str, None]:
        """
        Async generator that yields SSE-formatted events.
        Used by the FastAPI endpoint to stream events to the frontend.
        """
        queue = self.subscribe(task_id)
        try:
            while True:
                # Wait for the next event (with timeout to prevent hanging)
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=120.0)
                except asyncio.TimeoutError:
                    # Send a heartbeat to keep the connection alive
                    yield f"data: {json.dumps({'agent': 'system', 'action': 'heartbeat', 'detail': 'keepalive'})}\n\n"
                    continue

                # Format as SSE
                yield f"data: {json.dumps(event_data)}\n\n"

                # If this is the completion event, stop streaming
                if event_data.get("action") == "complete":
                    break
        finally:
            self.unsubscribe(task_id, queue)


# Global singleton event bus — shared across the entire application
event_bus = EventBus()
