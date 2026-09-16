from agent import stream_agent
import os
import re
import sqlite3

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles

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


@app.get("/api/projects")
async def get_projects():
    db_path = os.path.join(os.path.dirname(__file__), "company.db")
    status_colors = {
        "Active": "#10b981",
        "Completed": "#6b7280",
        "On Hold": "#f59e0b",
        "Inactive": "#ef4444",
    }

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        rows = connection.execute(
            """
            SELECT DISTINCT name, client, status
            FROM projects
            WHERE status = 'Active'
            ORDER BY name
            """
        ).fetchall()

    return [
        {
            "name": row["name"],
            "environment": row["client"] or "Active",
            "client": row["client"],
            "status": row["status"],
            "status_color": status_colors.get(row["status"], "#6b7280"),
        }
        for row in rows
    ]


@app.get("/api/employees/{employee_id}")
async def get_employee(employee_id: str):
    requested_id = employee_id.strip()
    normalized_id = requested_id.upper()
    match = re.fullmatch(r"EMP(\d+)|\d+", normalized_id)
    if not match:
        raise HTTPException(
            status_code=404,
            detail=f"Employee with ID '{requested_id}' not found",
        )

    numeric_id = int(match.group(1) or match.group(0))
    db_path = os.path.join(os.path.dirname(__file__), "company.db")

    with sqlite3.connect(db_path) as connection:
        connection.row_factory = sqlite3.Row
        employee = connection.execute(
            """
            SELECT
                e.id,
                e.name,
                e.email,
                e.designation,
                e.date_of_joining,
                e.salary,
                d.name AS department,
                GROUP_CONCAT(DISTINCT p.name) AS projects,
                GROUP_CONCAT(DISTINCT p.client) AS clients
            FROM employees e
            LEFT JOIN departments d ON d.id = e.department_id
            LEFT JOIN employee_projects ep ON ep.employee_id = e.id
            LEFT JOIN projects p ON p.id = ep.project_id
            WHERE e.id = ?
            GROUP BY e.id
            """,
            (numeric_id,),
        ).fetchone()

        if employee is None:
            raise HTTPException(
                status_code=404,
                detail=f"Employee with ID '{requested_id}' not found",
            )

        attendance = connection.execute(
            """
            SELECT
                COUNT(*) AS total_days,
                SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present,
                SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent,
                SUM(CASE WHEN status = 'On Leave' THEN 1 ELSE 0 END) AS leave_days
            FROM attendance
            WHERE employee_id = ?
            """,
            (numeric_id,),
        ).fetchone()

    name_parts = employee["name"].split()
    initials = "".join(part[0] for part in name_parts[:2]).upper()
    return {
        "id": f"EMP{employee['id']:03d}",
        "name": employee["name"],
        "initials": initials,
        "designation": employee["designation"],
        "department": employee["department"],
        "email": employee["email"],
        "phone": None,
        "join_date": employee["date_of_joining"],
        "project": employee["projects"] or "",
        "client": employee["clients"] or "",
        "salary": f"PKR {employee['salary']:,.0f}/mo" if employee["salary"] is not None else None,
        "status": "Active",
        "attendance": {
            "total_days": attendance["total_days"] or 0,
            "present": attendance["present"] or 0,
            "absent": attendance["absent"] or 0,
            "leave": attendance["leave_days"] or 0,
        },
    }


@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    return StreamingResponse(
        stream_agent(request.message),
        media_type="text/plain"
    )


FRONTEND_DIR = os.path.abspath(os.path.join(
    os.path.dirname(__file__), "..", "frontend"))
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")
