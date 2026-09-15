from policy_tools import query_healthcare_policy, query_hr_policy
from db_tools import (
    check_employee_attendance,
    get_employee_and_project_details,
    search_job_openings,
)
import os
from typing import AsyncIterator, Dict, List, Any

from dotenv import load_dotenv
from langchain_groq import ChatGroq
from langgraph.prebuilt import create_react_agent

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing. Please set it in backend/.env")


llm = ChatGroq(
    model_name="qwen/qwen3.8-27b",
    temperature=0.1,
    max_tokens=800,
    groq_api_key=GROQ_API_KEY,
)


tools = [
    get_employee_and_project_details,
    check_employee_attendance,
    search_job_openings,
    query_hr_policy,
    query_healthcare_policy,
]


SYSTEM_PROMPT = """
You are an enterprise AI assistant. Always produce ONE single, cohesive final response. NEVER repeat information or output two parallel drafts. Do NOT include phrases like 'Based on the retrieved context'. Use Markdown formatting: always insert two newlines (\n\n) before and after every heading (###), start every bullet point on a brand-new line with '- ', and insert a blank line before and after lists.

Use the correct tool when needed:
1. Employee or project information -> get_employee_and_project_details
2. Attendance status -> check_employee_attendance
3. Job openings -> search_job_openings
4. HR policy or workplace rules -> query_hr_policy
5. Healthcare coverage, claims, or medical policy questions -> query_healthcare_policy

Answer the user's question directly and clearly. Be accurate, concise, and professional. If the request requires data retrieval, use the appropriate tool first. Do not show raw tool output, raw SQL, or JSON dumps. Keep the final response natural and easy to read.
"""


agent = create_react_agent(llm, tools, prompt=SYSTEM_PROMPT)


async def stream_agent(message: str) -> AsyncIterator[str]:
    """Yield only the final assistant synthesis output and ignore tool-node events."""
    async for event in agent.astream_events(
        {"messages": [("user", message)]},
        version="v2",
    ):
        if event.get("event") != "on_chat_model_stream":
            continue

        chunk = event.get("data", {}).get("chunk")
        if chunk is None:
            continue

        if getattr(chunk, "tool_call_chunks", None):
            continue

        metadata = event.get("metadata", {})
        if metadata.get("langgraph_node") == "tools":
            continue

        content = getattr(chunk, "content", None)
        if not isinstance(content, str):
            continue

        if not content:
            continue

        yield content


__all__ = ["agent", "stream_agent"]
