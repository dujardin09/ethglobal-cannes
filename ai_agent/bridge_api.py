from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import asyncio
from ai_agent.server import get_completion

app = FastAPI()

class ChatRequest(BaseModel):
    prompt: str
    context: str = ""

@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        result = await get_completion(req.context, req.prompt)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 