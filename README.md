# CodeSleuth — AI-Powered Code Security Audit & Sandboxed Test Execution Engine 🛡️⚡

> **Submission-Ready Prototype for Hackathons**  
> *Grounded AI Code Reviews • Semgrep Static Rules • Isolated Pytest Sandbox Execution • GitHub PR Analysis*

---

## 📸 Overview

**CodeSleuth** (GitMentor) is a production-grade, AI-assisted code review and automated test execution platform. Standard AI code review tools often hallucinate security risks or output broken unit tests. CodeSleuth solves this by:

1. **Static Analysis Grounding**: Grounding Google Gemini AI using deterministic **Semgrep** security rulesets.
2. **Real Pytest Sandbox Execution**: Writing Pytest unit test suites and executing them live inside an **isolated temporary sandbox runner**.
3. **GitHub Pull Request Integration**: Fetching raw diff hunks directly from public GitHub PR URLs.

---

## 🏗️ System Architecture

```
┌────────────────────────┐      ┌────────────────────────────────────────────────────────┐      ┌────────────────────┐
│   React + Vite UI      │─────▶│                    FastAPI Backend                     │─────▶│  Google Gemini AI  │
│ (Port 5173 / Glass UI) │◀─────│                 (Port 8001 / Async)                    │◀─────│  (google-genai)    │
└────────────────────────┘      │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │      └────────────────────┘
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

## ✨ Key Features

- **🛡️ Grounded AI Security Audits**: Eliminates hallucinations by injecting Semgrep static analysis findings into Gemini system prompts.
- **🧪 Real Pytest Sandbox Runner**: Generates unit test suites, executes them in an isolated temporary directory, and captures live stdout/stderr terminal output.
- **🔗 GitHub PR URL Analyzer**: Paste any public Pull Request link (e.g. `https://github.com/pallets/flask/pull/5000`) to fetch changed diffs and perform instant security reviews.
- **⚡ Hot-Reloading Key Management**: Dynamic environment loading automatically detects newly updated Gemini API keys without requiring server restarts.
- **🎨 Glassmorphic Interface**: Dark theme visual design with real-time subsystem status indicators (`Operational` / `Degraded`), step-by-step progress tracking, and interactive terminal log inspectors.

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite, TailwindCSS | High-performance glassmorphism UI & status indicators |
| **Backend** | FastAPI, Uvicorn, Python 3.10+ | Asynchronous REST API server & pipeline orchestration |
| **AI Model** | Google Gemini (`google-genai` SDK) | Code review, vulnerability explanation, and test generation |
| **Static Scan** | Semgrep CLI (`p/security-audit`) | Deterministic security vulnerability grounding |
| **Sandbox** | Pytest Subprocess Runner | Isolated unit test execution & terminal log capture |

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.10+
- Node.js 18+
- Google Gemini API Key ([Get one free at Google AI Studio](https://aistudio.google.com/app/apikey))

---

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment (optional but recommended)
python -m venv venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Set your API key in `backend/.env`:
```env
GEMINI_API_KEY=AIzaSy...your_gemini_api_key...
GEMINI_MODEL=gemini-3.5-flash
```

Start the FastAPI backend server:
```bash
uvicorn app.main:app --reload --port 8001
```
*Backend will run at **`http://localhost:8001`***

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install Node dependencies
npm install

# Start Vite dev server
npm run dev
```
*Frontend will run at **`http://localhost:5173`***

---

## 📡 API Endpoint Reference

| Endpoint | Method | Description |
|---|---|---|
| `/` | `GET` | API root metadata & running status |
| `/health` | `GET` | Real-time subsystem health status (Gemini, Sandbox, Semgrep, GitHub) |
| `/review` | `POST` | Security audit & code flaw review for raw diffs or GitHub PR URLs |
| `/tests` | `POST` | Generates Pytest unit tests & executes them inside isolated sandbox |
| `/docs` | `GET` | Interactive OpenAPI Swagger UI documentation |

---

## 🎙️ 3-Minute Judge Presentation Script

1. **Open App**: Open [http://localhost:5173](http://localhost:5173) and point to the green **`Operational`** header pill.
2. **Load Snippet**: Click **`Load Snippet`** in the header to inject a Python snippet containing an `eval()` exploit and zero-division edge case.
3. **Analyze**: Click **`ANALYZE CODE`** to view the **CRITICAL** severity vulnerability card with proposed `json.loads()` fix.
4. **Pytest Sandbox**: Scroll to **Pytest Sandbox Execution** to show the generated unit tests, green `PASSED` badge, and live terminal stdout logs.
5. **GitHub PR**: Switch to **`GitHub PR URL`** tab and paste `https://github.com/pallets/flask/pull/5000` to demonstrate live GitHub API pull request auditing.

---

## 📄 License

MIT License © 2026 CodeSleuth Team
