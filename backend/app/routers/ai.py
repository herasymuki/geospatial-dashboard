from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import json

from app.services.ai_service import stream_analysis

router = APIRouter()

class AnalyzeRequest(BaseModel):
    context: dict
    provider: str = "athena"
    model:    str = "claude-sonnet-4-6"

@router.post("/analyze")
async def analyze(req: AnalyzeRequest):
    async def event_stream():
        async for chunk in stream_analysis(req.context, req.provider, req.model):
            yield f"data: {chunk}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
