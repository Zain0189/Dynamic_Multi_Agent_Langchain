# Dynamic Multi-Service Agent

An internal employee-support assistant for company data, attendance, hiring, HR policies, and healthcare policies. It combines a FastAPI backend, a LangGraph ReAct agent, Groq chat models, SQLite data tools, FAISS policy retrieval, and a plain HTML/CSS/JavaScript interface.

## What It Does

### Autonomous chat

- Routes questions to the appropriate database or policy tool.
- Uses Groq `qwen/qwen3.8-27b` with `max_tokens=800`.
- Streams only the final assistant response to the browser.
- Keeps tool calls, SQL, JSON payloads, and intermediate tool output out of the UI.
- Renders GitHub-Flavored Markdown with normal list and heading spacing.

### Company data

- Searches employee, project, assignment, and status information from SQLite.
- Checks employee attendance by name and optional date.
- Searches open job roles by keywords.
- Uses read-only database connections for agent database tools.

### Live frontend data binding

- Loads active projects from `GET /api/projects` and displays them as clickable, scrollable sidebar cards.
- Loads employee profiles and attendance directly from `GET /api/employees/{employee_id}`.
- Accepts employee IDs such as `EMP009`, `emp009`, or `9`.
- Shows employee initials, role, department, contact data, joining date, projects, salary, status, and attendance bars.
- Uses a single `API_BASE` value in the frontend so API calls work when the UI is opened through the FastAPI server.

### Policy retrieval

- Answers HR questions from the HR Policy Manual PDF.
- Answers healthcare questions from the Healthcare Policy PDF.
- Uses Ollama `nomic-embed-text` embeddings and FAISS indexes.
- Restricts policy answers to retrieved document context and returns a clear fallback when information is unavailable.

### Interface

- Responsive chat layout with a collapsible sidebar.
- Keyword and employee-ID search controls.
- Dynamic single-column project list with vertical scrolling.
- New Chat clears the current conversation without adding an automated welcome message.
- The Documents and History sidebar views have been removed from the current interface.

## Architecture

```text
Browser
	|
	|  API_BASE = http://127.0.0.1:8000
	v
FastAPI (backend/main.py)
	|-- GET  /                         Serves frontend/
	|-- POST /chat                     Streams final agent response
	|-- GET  /api/projects             Returns active SQLite projects
	|-- GET  /api/employees/{id}       Returns live employee profile
	|
	+--> LangGraph ReAct agent
	|      |-- SQLite database tools
	|      +-- HR and healthcare RAG tools
	|
	+--> company.db
	+--> FAISS policy indexes + Ollama embeddings
```

## Project Structure

```text
backend/
	main.py                         FastAPI app, API routes, CORS, static frontend mount
	agent.py                        LangGraph ReAct agent and filtered streaming
	db_tools.py                     SQLite employee, project, attendance, and job tools
	policy_tools.py                 HR and healthcare LangChain tools
	rag.py                          PDF loading, embeddings, FAISS, and RAG chains
	export_db_to_json.py            Reflective database export utility
	db_seed.py                      SQLite database seed script
	apitest.py                      Groq model-listing utility
	company.db                      Local SQLite database
	database_dump.json              Generated database export
	documents/                      Policy PDF files
	faiss_index_HR_Policy/          HR FAISS index
	faiss_index_Healthcare_Policy/  Healthcare FAISS index
	requirements.txt                Python dependencies
	.env                            Local secrets, ignored by Git
frontend/
	index.html                      Application shell and chat markup
	script.js                       API calls, rendering, streaming, and UI events
	style.css                       Layout, responsive behavior, and chat styling
README.md
```

## Requirements

- Windows, macOS, or Linux.
- Python 3.11 or newer recommended.
- A Groq API key.
- Ollama installed and running at `http://127.0.0.1:11434`.
- Ollama model `nomic-embed-text` for policy embeddings.

## Setup

From the project root, create and activate a backend virtual environment:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Install and prepare the embedding model:

```powershell
ollama pull nomic-embed-text
```

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
```

Never commit the `.env` file or expose the API key in frontend code. The repository `.gitignore` excludes `backend/.env`, virtual environments, Python caches, and editor metadata.

The application expects these policy files under `backend/documents/`:

```text
backend/documents/HR Policy Manual.pdf
backend/documents/Healthcare Policy.pdf
```

Existing FAISS indexes are loaded from `backend/faiss_index_HR_Policy/` and `backend/faiss_index_Healthcare_Policy/`. Missing indexes are built when the RAG chains initialize.

## Run the Application

Start the backend from its directory:

```powershell
cd backend
fastapi dev main.py
```

Open the application at:

http://127.0.0.1:8000

````

Serve the UI through FastAPI instead of opening `frontend/index.html` directly with `file://`. The frontend is configured to call `http://127.0.0.1:8000` through `API_BASE`, and FastAPI also enables permissive CORS for local development.

## API Reference

### `POST /chat`

Request:

```json
{
	"message": "What is the HR leave policy?"
}
````

Response: streamed `text/plain` containing only the final assistant answer.

PowerShell example:

```powershell
Invoke-WebRequest `
	-Uri http://127.0.0.1:8000/chat `
	-Method Post `
	-ContentType "application/json" `
	-Body '{"message":"Which projects are assigned to this employee?"}'
```

### `GET /api/projects`

Returns active projects from SQLite:

```json
[
  {
    "name": "Dynamic AI Portal",
    "environment": "Enterprise Core",
    "client": "Enterprise Core",
    "status": "Active",
    "status_color": "#10b981"
  }
]
```

### `GET /api/employees/{employee_id}`

Returns an employee profile and attendance summary. IDs are case-insensitive and may include or omit the `EMP` prefix:

```json
{
  "id": "EMP009",
  "name": "Employee Name",
  "initials": "EN",
  "designation": "Role",
  "department": "Department",
  "email": "employee@example.com",
  "phone": null,
  "join_date": "2023-01-15",
  "project": "Project Name",
  "client": "Client Name",
  "salary": "PKR 95,000/mo",
  "status": "Active",
  "attendance": {
    "total_days": 10,
    "present": 5,
    "absent": 0,
    "leave": 0
  }
}
```

The current SQLite schema does not contain phone or employee-status columns, so `phone` is `null` and status is currently reported as `Active`. A missing employee returns HTTP 404 with a descriptive `detail` message.

## Agent Tools

The LangGraph agent selects from these tools:

- `get_employee_and_project_details`: employee, project, client, assignment, deadline, and budget queries.
- `check_employee_attendance`: latest or date-specific attendance status by employee name.
- `search_job_openings`: open roles filtered by title, description, or experience keywords.
- `query_hr_policy`: HR rules, leave, conduct, work-from-home, and workplace policy retrieval.
- `query_healthcare_policy`: medical coverage, claims, limits, and treatment exclusion retrieval.

## Database Export

Export every SQLite table to formatted JSON with SQLAlchemy reflection:

```powershell
cd backend
python export_db_to_json.py
```

The script:

- Uses `DATABASE_URL` from `.env` when present.
- Defaults to `sqlite:///backend/company.db`.
- Discovers tables with `MetaData.reflect(bind=engine)`.
- Converts rows to dictionaries.
- Serializes dates/times, `Decimal`, `UUID`, and bytes safely.
- Logs the number of exported rows per table.
- Writes `backend/database_dump.json`.

## Development Notes

- API routes are declared before the root `StaticFiles` mount.
- CORS allows all origins, methods, and headers for local development.
- Groq secrets are loaded with `python-dotenv` and validated at startup.
- Database agent tools use read-only SQLite connections.
- The frontend uses `marked.js` with `gfm: true` and `breaks: false`.
- Do not expose `.env`, API keys, or generated local data in a public deployment.
