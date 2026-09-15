import json
import os
import sqlite3

from langchain_core.tools import tool

DB_PATH = os.path.join(os.path.dirname(
    os.path.abspath(__file__)), "company.db")


def _connect_readonly():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA query_only = ON;")
    return conn


@tool
def get_employee_and_project_details(query_type: str, search_term: str) -> str:
    """Query employee, project, and assignment details from the company SQLite database.

    Supported query types include project lookup, employee lookup, and project status checks.
    Returns a JSON string containing matching records.
    """
    query_type = (query_type or "").strip().lower()
    search_term = (search_term or "").strip()

    if not search_term:
        return json.dumps({"error": "No search term provided."}, ensure_ascii=False)

    like_term = f"%{search_term}%"

    with _connect_readonly() as conn:
        if any(token in query_type for token in ["employee_project", "projects_for_employee", "employee_projects", "employee"]):
            rows = conn.execute(
                """
                SELECT
                    e.name AS employee_name,
                    p.name AS project_name,
                    p.client,
                    p.status AS project_status,
                    p.start_date,
                    p.deadline,
                    p.budget,
                    ep.role_in_project
                FROM employees e
                JOIN employee_projects ep ON ep.employee_id = e.id
                JOIN projects p ON p.id = ep.project_id
                WHERE e.name LIKE ? OR e.email LIKE ? OR p.name LIKE ?
                ORDER BY e.name, p.name
                """,
                (like_term, like_term, like_term),
            ).fetchall()

            if not rows:
                return json.dumps({"query_type": query_type, "search_term": search_term, "records": []}, ensure_ascii=False)

            payload = [
                {
                    "employee_name": row["employee_name"],
                    "project_name": row["project_name"],
                    "client": row["client"],
                    "project_status": row["project_status"],
                    "start_date": row["start_date"],
                    "deadline": row["deadline"],
                    "budget": row["budget"],
                    "role_in_project": row["role_in_project"],
                }
                for row in rows
            ]
            return json.dumps({"query_type": query_type, "search_term": search_term, "records": payload}, ensure_ascii=False)

        if any(token in query_type for token in ["project_employee", "employees_on_project", "project_employees", "project"]):
            rows = conn.execute(
                """
                SELECT
                    p.name AS project_name,
                    p.client,
                    p.status AS project_status,
                    p.start_date,
                    p.deadline,
                    p.budget,
                    e.name AS employee_name,
                    e.designation,
                    ep.role_in_project
                FROM projects p
                LEFT JOIN employee_projects ep ON ep.project_id = p.id
                LEFT JOIN employees e ON e.id = ep.employee_id
                WHERE p.name LIKE ? OR p.client LIKE ?
                ORDER BY p.name, e.name
                """,
                (like_term, like_term),
            ).fetchall()

            if not rows:
                return json.dumps({"query_type": query_type, "search_term": search_term, "records": []}, ensure_ascii=False)

            payload = [
                {
                    "project_name": row["project_name"],
                    "client": row["client"],
                    "project_status": row["project_status"],
                    "start_date": row["start_date"],
                    "deadline": row["deadline"],
                    "budget": row["budget"],
                    "employee_name": row["employee_name"],
                    "designation": row["designation"],
                    "role_in_project": row["role_in_project"],
                }
                for row in rows
            ]
            return json.dumps({"query_type": query_type, "search_term": search_term, "records": payload}, ensure_ascii=False)

        rows = conn.execute(
            """
            SELECT
                e.name AS employee_name,
                p.name AS project_name,
                p.status AS project_status,
                p.deadline,
                p.budget,
                ep.role_in_project
            FROM employees e
            JOIN employee_projects ep ON ep.employee_id = e.id
            JOIN projects p ON p.id = ep.project_id
            WHERE e.name LIKE ? OR p.name LIKE ? OR p.client LIKE ?
            ORDER BY e.name, p.name
            """,
            (like_term, like_term, like_term),
        ).fetchall()

        payload = [
            {
                "employee_name": row["employee_name"],
                "project_name": row["project_name"],
                "project_status": row["project_status"],
                "deadline": row["deadline"],
                "budget": row["budget"],
                "role_in_project": row["role_in_project"],
            }
            for row in rows
        ]

        return json.dumps({"query_type": query_type, "search_term": search_term, "records": payload}, ensure_ascii=False)


@tool
def check_employee_attendance(employee_name: str, date: str = None) -> str:
    """Fetch attendance status for an employee, optionally for a specific date."""
    employee_name = (employee_name or "").strip()
    if not employee_name:
        return json.dumps({"employee_name": "", "date": None, "status": "No employee name provided."}, ensure_ascii=False)

    with _connect_readonly() as conn:
        if date:
            row = conn.execute(
                """
                SELECT e.name AS employee_name, a.date, a.status
                FROM attendance a
                JOIN employees e ON e.id = a.employee_id
                WHERE e.name LIKE ? AND a.date = ?
                ORDER BY a.date DESC
                LIMIT 1
                """,
                (f"%{employee_name}%", date),
            ).fetchone()
        else:
            row = conn.execute(
                """
                SELECT e.name AS employee_name, a.date, a.status
                FROM attendance a
                JOIN employees e ON e.id = a.employee_id
                WHERE e.name LIKE ?
                ORDER BY a.date DESC
                LIMIT 1
                """,
                (f"%{employee_name}%",),
            ).fetchone()

    if row is None:
        return json.dumps({"employee_name": employee_name, "date": None, "status": "No attendance record found."}, ensure_ascii=False)

    payload = {
        "employee_name": row["employee_name"],
        "date": row["date"],
        "status": row["status"],
    }
    return json.dumps(payload, ensure_ascii=False)


@tool
def search_job_openings(keywords: str) -> str:
    """Search currently open job roles that match the supplied keywords."""
    keywords = (keywords or "").strip()
    tokens = [token.strip() for token in keywords.split() if token.strip()]

    with _connect_readonly() as conn:
        if not tokens:
            rows = conn.execute(
                """
                SELECT j.title, d.name AS department_name, j.experience_required, j.description
                FROM jobs j
                JOIN departments d ON d.id = j.department_id
                WHERE j.status = 'Open'
                ORDER BY j.posted_date DESC
                LIMIT 20
                """
            ).fetchall()
        else:
            clauses = []
            params = []
            for token in tokens:
                clauses.append(
                    "(j.title LIKE ? OR j.description LIKE ? OR j.experience_required LIKE ?)")
                like_term = f"%{token}%"
                params.extend([like_term, like_term, like_term])

            query = f"""
                SELECT j.title, d.name AS department_name, j.experience_required, j.description
                FROM jobs j
                JOIN departments d ON d.id = j.department_id
                WHERE j.status = 'Open' AND ({' OR '.join(clauses)})
                ORDER BY j.posted_date DESC
                LIMIT 20
            """
            rows = conn.execute(query, params).fetchall()

    payload = [
        {
            "title": row["title"],
            "department_name": row["department_name"],
            "experience_required": row["experience_required"],
            "summary": row["description"],
        }
        for row in rows
    ]

    return json.dumps(payload, ensure_ascii=False)


__all__ = ["get_employee_and_project_details",
           "check_employee_attendance", "search_job_openings"]
