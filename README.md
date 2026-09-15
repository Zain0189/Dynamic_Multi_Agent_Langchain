# Dynamic Multi-Service Agent

An autonomous employee-support assistant for company data and internal policy questions. The backend uses FastAPI, LangGraph, LangChain, and Groq; the frontend is a plain HTML/CSS/JavaScript chat interface.

## Features

- Employee and project lookups from the local SQLite database.
- Employee attendance checks.
- Open job search.
- HR policy question answering with FAISS retrieval.
- Healthcare policy, coverage, and claims question answering with FAISS retrieval.
- Streaming Markdown responses through a single `/chat` endpoint.
- Groq model: `qwen/qwen3.8-27b`, capped at 800 output tokens.

## Project Structure

```text
backend/
	agent.py                         LangGraph ReAct agent and streaming logic
	db_tools.py                      SQLite query tools
	policy_tools.py                  HR and healthcare policy tools
	rag.py                           FAISS retrieval chains and embeddings
	main.py                          FastAPI application
	db_seed.py                       Database seed script
	company.db                       Local SQLite database
	documents/                       Policy PDF files
	faiss_index_*/                   Saved FAISS indexes
frontend/
	index.html                       Chat interface
	script.js                        UI behavior and response streaming
	style.css                        Interface styling
```

## Requirements

- Python 3.11 or newer recommended.
- A Groq API key.
- Ollama running locally at `http://127.0.0.1:11434`.
- Ollama embedding model `nomic-embed-text`.

## Setup

From the project root, create or activate a virtual environment and install the backend dependencies:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Create `backend/.env` and add your Groq key:

```env
GROQ_API_KEY=your_groq_api_key
```

The `.env` file is ignored by Git and must not be committed.

Install and start Ollama, then pull the embedding model:

```powershell
ollama pull nomic-embed-text
```

The policy PDF files and their FAISS indexes should be available under `backend/documents/` and `backend/faiss_index_*/`. If an index is missing, the application builds it when the RAG chain starts.

## Run the Backend

```powershell
cd backend
fastapi dev main.py
```

The API is available at `http://127.0.0.1:8000`.

## Run the Frontend

With the backend running, open [frontend/index.html](frontend/index.html) in a browser. The frontend sends chat requests to `http://127.0.0.1:8000/chat` and renders the plain-text Markdown stream as it arrives.

## API

### `POST /chat`

Request body:

```json
{
  "message": "Which projects is Ali Hassan assigned to?"
}
```

Example PowerShell request:

```powershell
Invoke-WebRequest `
	-Uri http://127.0.0.1:8000/chat `
	-Method Post `
	-ContentType "application/json" `
	-Body '{"message":"What is the HR leave policy?"}'
```

The response is streamed as `text/plain`. Tool execution details, SQL, and intermediate model output are not sent to the client; only the final assistant response is streamed.

## Agent Tools

The agent selects tools based on the request:

- `get_employee_and_project_details` for employee, project, and assignment information.
- `check_employee_attendance` for attendance status.
- `search_job_openings` for open roles.
- `query_hr_policy` for HR and workplace policies.
- `query_healthcare_policy` for healthcare coverage and medical policy questions.

## Development Notes

- Database tools use read-only SQLite connections.
- Policy answers are restricted to retrieved document context.
- Groq credentials are loaded with `python-dotenv` from `backend/.env`.
- The frontend uses `marked.js` with GitHub-Flavored Markdown and `breaks: false` to preserve normal Markdown list formatting.
