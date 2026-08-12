# CodeSleuth — AI-Powered Code Security Audit & Sandboxed Test Execution Engine 🛡️⚡

[![Python Version](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF.svg)](https://vitejs.dev/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini%20API-4285F4.svg)](https://ai.google.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **Submission-Ready Prototype for International Hackathons**  
> *Grounded AI Reviews • Semgrep Static Rules • Isolated Pytest Sandbox Execution • Live GitHub PR Analysis*

---

## 🌟 Executive Summary & Problem Statement

Standard AI code review tools often hallucinate security vulnerabilities that don't exist, output unverified code fixes, or generate unit tests that fail to compile. 

**CodeSleuth** (GitMentor) solves this with a **Dual-Layer Grounded Intelligence Engine**:
1. **Static Analysis Grounding**: Integrates **Semgrep** rulesets (`p/security-audit`) to inject deterministic vulnerability evidence into Google Gemini AI prompts, eliminating AI security hallucinations.
2. **Real Pytest Sandbox Runner**: Generates unit test suites and executes them live in an **isolated temporary directory sandbox (`tempfile.TemporaryDirectory()`)**, capturing real-time terminal stdout/stderr logs and returning empirical execution proof (*e.g., "8 passed in 0.13s"*).
3. **GitHub Pull Request Fetcher**: Direct integration with public GitHub Pull Request URLs via `api.github.com`.

---

## 🏗️ System Architecture

```
┌────────────────────────────────┐      ┌────────────────────────────────────────────────────────┐      ┌─────────────────────────┐
│        React 18 + Vite UI      │─────▶│                    FastAPI Backend                     │─────▶│    Google Gemini AI     │
│ (Port 5173 / Glassmorphic UI)  │◀─────│                 (Port 8001 / Async)                    │◀─────│ (gemini-3.5/3.6-flash) │
└────────────────────────────────┘      │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │      └─────────────────────────┘
                                        │  │ GitHub PR    │  │ Semgrep      │  │ Pytest       │  │
                                        │  │ Fetcher      │  │ Rulesets     │  │ Sandbox      │  │
                                        │  └──────────────┘  └──────────────┘  └──────────────┘  │
                                        └────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                                        ┌────────────────────┐
                                        │   GitHub REST API  │
                                        └────────────────────┘
```

---

## ✨ Key Features & Technical Highlights

- **🛡️ Grounded AI Vulnerability Audit**: Combines static analysis rules with Gemini AI (`google-genai` SDK) to categorize findings into `CRITICAL`, `HIGH`, and `MEDIUM` severity levels with actionable fix suggestions.
- **🧪 Live Pytest Sandbox Execution**: Writes generated test suites to isolated temporary directories, executes `pytest` via subprocess with a 15-second safety timeout, and displays stdout/stderr terminal output.
- **🔗 GitHub Pull Request Analyzer**: Fetches changed diff hunks directly from any public GitHub PR (e.g. `https://github.com/pallets/flask/pull/5000` or `https://github.com/tiangolo/fastapi/pull/10000`).
- **⚡ Non-Blocking Concurrency**: Synchronous AI model calls are wrapped in `asyncio.to_thread`, keeping the FastAPI main event loop responsive so `GET /health` polling never drops.
- **🔑 Dynamic API Key Hot-Reloading**: Uses `get_gemini_client()` with `load_dotenv(override=True)` to instantly detect new Gemini API keys in `backend/.env` without requiring server restarts.
- **🎨 Glassmorphic Developer Interface**: Responsive dark theme dashboard, real-time subsystem status indicators (`Operational` / `Degraded`), 1-click **"Load Snippet"** demo button, and interactive terminal log inspectors.

---

## 📂 Repository File Structure

```text
CodeSleuth/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI server, endpoints (/review, /tests, /health), CORS
│   │   └── services/
│   │       ├── github_fetcher.py    # GitHub REST API pull request diff fetcher
│   │       ├── semgrep_runner.py    # Semgrep static security audit ruleset runner
│   │       └── sandbox_runner.py   # Isolated Pytest sandbox subprocess runner
│   ├── .env.example                 # Template environment configuration
│   └── requirements.txt             # Backend Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main dashboard layout, health pill, demo button
│   │   ├── components/
│   │   │   ├── DiffSubmitter.jsx    # Input tab controls (Raw Diff vs GitHub PR URL)
│   │   │   └── FindingsPanel.jsx    # Vulnerability cards, clean banners, Pytest terminal log inspector
│   │   └── index.css                # Inter & JetBrains Mono fonts, glassmorphism CSS
│   ├── package.json                 # Frontend Node dependencies
│   └── vite.config.js               # Vite dev server configuration
├── README.md                        # Master project documentation
├── architecture.md                  # Detailed architectural specification & error matrix
└── CodeSleuth_Hackathon_Pitch.pptx  # Widescreen PowerPoint pitch deck with graphics
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, TailwindCSS | Glassmorphic UI dashboard & real-time status indicators |
| **Backend** | FastAPI, Uvicorn, Python 3.10+ | Asynchronous REST API server & pipeline orchestration |
| **AI Model** | Google Gemini (`google-genai` SDK) | Grounded security audit, code flaw explanation & test generation |
| **Static Scanner** | Semgrep CLI (`p/security-audit`) | Deterministic vulnerability grounding context |
| **Sandbox Environment** | Pytest Subprocess Runner | Isolated unit test execution & terminal log capture |

---

## 🚀 Installation & Setup Guide

### Prerequisites
- **Python**: 3.10 or higher
- **Node.js**: 18.0 or higher
- **Gemini API Key**: Free API key from [Google AI Studio](https://aistudio.google.com/app/apikey)

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create & activate a virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Set your Gemini API key in `backend/.env`:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key...
GEMINI_MODEL=gemini-3.5-flash
```

Start the FastAPI backend server:
```bash
uvicorn app.main:app --reload --port 8001
```
> Backend API will run live at **`http://localhost:8001`**

---

### 2. Frontend Setup

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
> Frontend Dashboard will run live at **`http://localhost:5173`**

---

## 📡 API Endpoint Reference

| Endpoint | Method | Request Payload | Description |
|---|---|---|---|
| `/` | `GET` | None | API root metadata & running status |
| `/health` | `GET` | None | Real-time subsystem health status (`gemini`, `semgrep`, `sandbox`, `github`) |
| `/review` | `POST` | `{"source_type": "raw_diff", "diff_text": "..."}` | Grounded security audit, logic bugs & performance notes |
| `/tests` | `POST` | `{"source_type": "raw_diff", "diff_text": "..."}` | Generates Pytest unit tests & executes them inside sandbox |
| `/docs` | `GET` | None | Interactive OpenAPI Swagger UI documentation |


## 📄 License

MIT License © 2026 CodeSleuth Team
