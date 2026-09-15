from agent import stream_agent
import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please set it in backend/.env")


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_agent(request.message),
        media_type="text/plain"
    )
