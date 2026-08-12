# CodeSleuth System Architecture & Component Specification 🏗️

---

## 1. High-Level Architectural Topology

```
                                  ┌───────────────────────────┐
                                  │      User Browser UI      │
                                  │  React + Vite (Port 5173) │
                                  └───────────────────────────┘
                                                │
                                                │ HTTP / REST / JSON
                                                ▼
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FastAPI Backend (Port 8001)                                   │
│                                                                                              │
│   ┌───────────────────────┐    ┌───────────────────────┐    ┌────────────────────────────┐   │
│   │   GitHub PR Fetcher   │    │    Semgrep Scanner    │    │   Pytest Sandbox Runner    │   │
│   │ (api.github.com diff) │    │  (Static Grounding)   │    │  (Isolated Subprocess)     │   │
│   └───────────────────────┘    └───────────────────────┘    └────────────────────────────┘   │
│                                           │                                                  │
│                                           ▼                                                  │
│                                ┌─────────────────────┐                                       │
│                                │   Gemini AI Client  │                                       │
│                                │ (asyncio.to_thread) │                                       │
│                                └─────────────────────┘                                       │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
                                ┌───────────────────────┐
                                │   Google Gemini API   │
                                │ (gemini-3.5-flash /   │
                                │  gemini-3.6-flash /   │
                                │  gemini-flash-latest) │
                                └───────────────────────┘
```

---

## 2. Component Design & Pipeline Execution Flow

### 2.1 Front-End Layer (React + Vite)
- **Port**: `5173`
- **Location**: `frontend/src/`
- **Key Modules**:
  - `App.jsx`: Top navigation header, live subsystem health status polling (`GET /health`), preset demo bug injector, and step progress state.
  - `DiffSubmitter.jsx`: Input tab controls (Raw Diff vs GitHub PR URL), form payload normalization, and submission dispatcher.
  - `FindingsPanel.jsx`: Glassmorphic cards rendering security vulnerabilities (`CRITICAL`, `HIGH`, `MEDIUM`), inline code fix blocks, and the Pytest Sandbox terminal output inspector.

### 2.2 API Orchestration Layer (FastAPI)
- **Port**: `8001`
- **Location**: `backend/app/main.py`
- **Key Features**:
  - **Non-Blocking Threading**: Synchronous Gemini API calls wrapped in `asyncio.to_thread` to ensure `GET /health` requests are served without delay during heavy model calls.
  - **Dynamic Environment Hot-Reloading**: `get_gemini_client()` automatically reloads `.env` changes on every incoming request via `load_dotenv(override=True)`.
  - **Active Model Fallback Chain**: Tries `gemini-3.5-flash` ➔ `gemini-3.6-flash` ➔ `gemini-flash-latest` with exponential backoff on transient errors (503/429).

### 2.3 Static Analysis Grounding (Semgrep)
- **Location**: `backend/app/services/semgrep_runner.py`
- **Ruleset**: `p/security-audit`
- **Purpose**: Runs deterministic static analysis on diff hunks before querying Gemini. Semgrep findings are injected into the Gemini system prompt to eliminate AI hallucinations.

### 2.4 Test Generation & Pytest Sandbox Execution
- **Location**: `backend/app/services/sandbox_runner.py`
- **Isolation Strategy**:
  1. Creates an isolated temporary directory via Python `tempfile.TemporaryDirectory()`.
  2. Extracts added/modified Python code lines into `source_code.py`.
  3. Writes Gemini-generated unit tests into `test_generated.py`.
  4. Spawns an isolated subprocess executing `pytest test_generated.py -v --tb=short` with a 15-second safety timeout.
  5. Captures return code, `stdout`, and `stderr` logs, returning structured pass/fail metrics.

---

## 3. Data Life Cycle for a Single Code Review Request

1. **User Submission**: User submits code or pastes a GitHub PR URL (e.g. `https://github.com/pallets/flask/pull/5000`) on the React UI.
2. **Input Normalization**: `DiffSubmitter` POSTs JSON payload to `http://localhost:8001/review`.
3. **Diff Retrieval**: If `source_type == "github_pr"`, `github_fetcher.py` queries `api.github.com`, fetching changed diff hunks.
4. **Semgrep Scanning**: `semgrep_runner.py` executes Semgrep rulesets against diff hunks.
5. **Grounded AI Inference**: `main.py` constructs a grounded prompt containing Semgrep findings and queries Gemini AI.
6. **Pytest Sandbox Execution**: `DiffSubmitter` automatically triggers `POST /tests`. `sandbox_runner.py` generates pytest test suites and executes them inside an isolated temporary directory.
7. **UI Rendering**: `FindingsPanel` renders security cards, suggested fixes, pass/fail counters, and terminal stdout logs.

---

## 4. Error Handling & Resilience Matrix

| Error Scenario | HTTP Status Code | System Behavior |
|---|---|---|
| Invalid or Missing API Key | `502 Bad Gateway` | Health pill displays `Degraded`, UI shows clean instructions to update `GEMINI_API_KEY` in `backend/.env`. |
| Gemini Daily Quota Limit | `429 Too Many Requests` | Returns clear notification guiding user to generate an API key in a new project on Google AI Studio. |
| PR Exceeds 300 Files | `406 Not Acceptable` | Backend catches GitHub API limit and prompts user to submit a smaller PR. |
| Diff Exceeds 2000 Lines | `413 Payload Too Large` | Rejects payload early to prevent API timeouts. |

---

## 5. Security & Isolation Constraints

- **No Global Mutation**: Sandbox execution runs strictly inside temporary directories (`tempfile.TemporaryDirectory()`) which are automatically purged from disk after execution.
- **Process Timeout**: Pytest subprocess calls are capped at a 15-second execution limit.
- **Secrets Protection**: `backend/.env` is excluded from git commits via `.gitignore`.
