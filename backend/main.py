from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
# from rag import stream_rag_HR_Policy
# from rag import stream_rag_Healthcare_Policy
from rag import stream_rag, HR_Policy_rag_chain, Healthcare_Policy_rag_chain

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Prompt(BaseModel):
    prompt: str

# @app.post("/ask-HR-Policy")
# def ask_question(prompt: Prompt):
#     generator = stream_rag_HR_Policy(prompt.prompt)
#     return StreamingResponse(generator, media_type="text/plain")

# @app.post("/ask-Healthcare-Policy")
# def ask_question(prompt: Prompt):
#     generator = stream_rag_Healthcare_Policy(prompt.prompt)
#     return StreamingResponse(generator, media_type="text/plain")


@app.post("/ask-HR-Policy")
def ask_hr(prompt: Prompt):

    return StreamingResponse(
        stream_rag(
            HR_Policy_rag_chain,
            prompt.prompt
        ),
        media_type="text/plain"
    )


@app.post("/ask-Healthcare-Policy")
def ask_healthcare(prompt: Prompt):

    return StreamingResponse(
        stream_rag(
            Healthcare_Policy_rag_chain,
            prompt.prompt
        ),
        media_type="text/plain"
    )
