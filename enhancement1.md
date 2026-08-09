# enhancement1.md — CodeSleuth Master Instructions

All instructions given by the project owner, compiled per-phase, per-file,
per-line. This is the single source of truth for what must be built, how,
and why. Every section references the originating document.

---

## Global Rules (apply to every change)

1. **Ask before every execution and change.** Give an overview first, then
   only proceed after approval.
2. **After every change explain:** WHY the change was needed, WHAT it does,
   HOW it works, WHERE it lives, WHEN it runs.
3. **Write only the lines needed.** Do not overwrite entire files. Do not
   inflate comprehensiveness.
4. **Git commit after every single change.** One commit per logical unit.
5. **Do not leak data.** When judges paste code or a PR URL, that code is
   someone's property. Handle it with care.
6. **Do not collapse.** Every page, every endpoint, every component must
   work without crashing.
7. **Elite-level standard.** This is an international hackathon. The output
   must look, feel, and behave like a professional product.

---

## Current Codebase State (Audit Summary)

### Two Competing Architectures

| Architecture | Entry Point | Status |
|---|---|---|
| **Scaffolded** (well-structured) | `backend/main.py` (root) | Broken — imports dead modules (`GeminiServiceError`, `reviewer_agent`). Routes return mock data only. |
| **Flat** (quick-fix) | `backend/app/main.py` | Running — but wrong model name, no retry, no health endpoint, duplicates models. |

### Dead Files to Remove

| File | Reason |
|---|---|
| `backend/agent.py` | Contains only a comment |
| `backend/agent/reviewer_agent.py` | Uses dead `gemini-2.5-flash` model via ADK, not imported by running server |
| `backend/agent/__init__.py` | Empty init for dead package |
| `backend/app/services/gemini_service.py` | Contains only a comment, but `backend/main.py` tries to import from it |
| `backend/test_gemini.py` | Old test file |
| `backend/main.py` (root) | Not the running entry point — `app/main.py` is |

### Critical Bugs

| # | Bug | File | Line |
|---|-----|------|------|
| 1 | API key leaked in `.env` | `backend/.env` | 8 |
| 2 | Model `gemini-2.0-flash` returns 404 on `v1beta` endpoint | `app/main.py` | 104 |
| 3 | Zero retry/backoff on 429 (required by `Api_specs.md` line 168) | `app/main.py` | 102–107 |
| 4 | `GITHUB_PAT` vs `GITHUB_TOKEN` mismatch | `github_fetcher.py:27` vs `.env:14` |
| 5 | No `/health` endpoint on running server | `app/main.py` | — |
| 6 | No diff size limit enforcement | `app/main.py` | — |
| 7 | CORS set to `*` wildcard | `app/main.py` | 23 |

---

## Phase 0 — Setup (DONE, but needs fixes)

**Source:** `plan.md` lines 15–24, `phase.md` lines 8–18

### What was required
- Scaffold FastAPI, hardcode one Gemini call to prove auth works
- Get Semgrep running against a sample vulnerable file
- Get GitHub PAT working, fetch one real PR's diff
- Scaffold React app, build UI against static mock JSON
- Commit `.env.example`
- `Api_specs.md` schema frozen after this checkpoint

### What was done
- [x] FastAPI scaffolded with two architectures (problem — see audit)
- [x] `.env.example` committed
- [x] React app scaffolded with Vite + TailwindCSS
- [x] `Api_specs.md` exists and is comprehensive

### What must be fixed now
- [ ] Delete dead architecture files (listed above)
- [ ] Fix the Gemini model name so auth actually works
- [ ] Fix `.env` key names to match what code reads
- [ ] Verify `.env` is in `.gitignore` and was never committed with real keys

---

## Phase 1 — Core Pipeline

**Source:** `plan.md` lines 28–38, `phase.md` lines 22–33

### Requirements per Api_specs.md
- `POST /review` returns valid JSON matching `Api_specs.md` schema
- No markdown fences, no prose — only JSON
- Must work for at least 3 different sample diffs (clean, buggy, Semgrep-flaggable)
- `SemgrepFindings` handed to pipeline in agreed shape
- Findings visibly change Gemini prompt output
- `DiffPayload` normalization works for both raw-paste and GitHub-sourced diffs
- Frontend calls **real** `/review` endpoint and renders without crashing

### Backend (`app/main.py`) — Line-by-Line Instructions

| Line(s) | Current State | Required State |
|----------|--------------|----------------|
| 1–12 | Imports + `load_dotenv()` | Keep. Correct. |
| 14–16 | Import services | Keep. Correct. |
| 18–27 | FastAPI + CORS `*` | Change CORS to explicit origins: `localhost:5173`, `localhost:3000` |
| 29 | `genai.Client(api_key=...)` | Keep. Correct. |
| 34–60 | Inline Pydantic models | **DELETE.** Use existing `app/models/responses.py` instead. |
| 65–113 | `POST /review` endpoint | Rewrite: add retry logic, use correct model, validate diff size, use models from `app/models/` |
| 115–144 | `POST /tests` endpoint | Same fixes as `/review` |
| — | Missing | Add `GET /health` endpoint |
| — | Missing | Add proper error shapes matching `Api_specs.md` lines 105–115 |

### Semgrep Runner (`app/services/semgrep_runner.py`) — Line-by-Line

| Line(s) | Current State | Required State |
|----------|--------------|----------------|
| 1–8 | Imports + logger | Keep. Correct. |
| 10 | `run_semgrep(code_content, language)` | Keep signature. |
| 30–33 | Writes to temp file | Add: use `SEMGREP_TIMEOUT` from `.env` (default 30s) instead of hardcoded 15s |
| 38–43 | Runs `semgrep` CLI | Keep. But add graceful fallback if `semgrep` is not installed (return empty list + log warning, don't crash the whole request — per `Api_specs.md` line 170) |
| 55–60 | Parses findings | Match `SemgrepFinding` model from `app/models/internal.py` exactly |

### GitHub Fetcher (`app/services/github_fetcher.py`) — Line-by-Line

| Line(s) | Current State | Required State |
|----------|--------------|----------------|
| 27 | `os.environ.get("GITHUB_PAT")` | **Change to `GITHUB_TOKEN`** to match `.env` and `.env.example` |
| 31–32 | `httpx.AsyncClient()` timeout 10s | Increase to 15s for large PRs |
| 34–39 | Error handling | Good. Keep. |
| 43–55 | `normalize_diff()` | Currently a stub with `pass`. Either implement properly or remove. |

### Sandbox Runner (`app/services/sandbox_runner.py`) — Line-by-Line

| Line(s) | Current State | Required State |
|----------|--------------|----------------|
| 43 | `model='gemini-2.0-flash'` | **Fix model name** (same fix as main.py) |
| 37 | `response_schema=list[TestGenerationResult]` | Verify this works with the SDK. `list[...]` generic may not be supported — may need a wrapper model. |
| 72 | Diff-to-source heuristic | Keep but add a comment that this is a hackathon shortcut. Add try/except so a bad parse doesn't crash the endpoint. |
| 87 | `subprocess.run` timeout 10s | Use `SANDBOX_TIMEOUT` from `.env` (default 15s) |

---

## Phase 2 — Test Generation + Sandbox Execution

**Source:** `plan.md` lines 41–49, `phase.md` lines 37–48

### Requirements
- `/tests` generates pytest code targeting actual functions in the diff
- Generated code executes in sandbox; real pass/fail, not fabricated
- Adversarial test: network call, infinite loop, fork bomb must fail to escape
- Sample repos have at least one function with a seedable, catchable bug
- Test panel shows pass/fail badges wired to real sandbox output

### Instructions
- The `/tests` endpoint in `app/main.py` currently works conceptually but:
  - Uses wrong model name
  - Has no retry logic
  - Has no adversarial protection
- The sandbox runner must have explicit timeout enforcement (already has 10s, should use `.env` value)
- Add a `conftest.py` or monkeypatch to block network calls inside sandbox

---

## Phase 3 — GitHub Integration

**Source:** `plan.md` lines 54–62, `phase.md` lines 52–63

### Requirements
- PR URL → GitHub API → `DiffPayload`, rate-limit handling, private-repo messaging
- `/review` handles PR-sourced diffs identically to raw-paste diffs
- Semgrep confirmed working on GitHub-fetched files
- Clear error message on rate limit (not silent failure)
- Private-repo case explicitly handled

### Instructions
- `github_fetcher.py` is functionally correct but:
  - Fix `GITHUB_PAT` → `GITHUB_TOKEN`
  - The `normalize_diff()` function is a stub — either wire it properly or inline the logic in the route handler (current approach in `app/main.py` is acceptable)
- Add: if GitHub returns 403 rate limit, catch specifically and return `Api_specs.md` error shape with `"upstream": "github"`

---

## Phase 4 — Frontend

**Source:** `plan.md` lines 65–73, `phase.md` lines 66–76

### Requirements
- Split view renders correctly for a real PR
- Security panel shows severity-tagged, plain-language findings (not raw Semgrep JSON)
- Loading/error states handled gracefully — no white screen on failure
- Full flow under 90 seconds, screen-share only, no terminal

### Current Frontend Files

| File | Lines | Status |
|------|-------|--------|
| `App.jsx` | 64 | Basic two-column layout. Works but generic. |
| `DiffSubmitter.jsx` | 116 | Has raw/PR toggle. Works. |
| `FindingsPanel.jsx` | 153 | Renders findings + test results. Works. |
| `index.css` | 15 | Minimal Tailwind setup. |
| `App.css` | 1 | Empty. |

### Frontend Redesign Instructions
- **User explicitly said:** "change the frontend react ui i personally dont like it"
- **Required:** Premium glassmorphism design, gradient accents, smooth animations, code syntax highlighting, proper branding
- **Required:** Favicon, meta tags, page title — browser tab must not say "Vite + React"
- **Required:** Error messages must be human-readable, not raw API JSON dumps
- **Required:** The 429 rate-limit error must say something like "API rate limit reached. Please wait a moment." — not a wall of JSON
- **Required:** Code input should have syntax highlighting or at least line numbers
- **Required:** The GitHub PR input should not leave a massive empty space

### Security for Frontend
- Per `architecture.md` §6: "Private repo code sent to Gemini: stated explicitly in the UI before submit"
- Add a small disclaimer near the submit button: "Code submitted will be analyzed by Google Gemini AI."

---

## Phase 5 — Demo Hardening

**Source:** `plan.md` lines 76–85, `phase.md` lines 80–91

### Requirements
- Pre-select and cache 2–3 demo PRs
- Record a fallback video of a full successful run
- Every member rehearses the 5 hard questions from `Preparation.md` §3
- Every member runs the full demo script at least once
- Build freeze: no new features, only crash fixes

### Instructions
- Since you are the only member, you need:
  - [ ] 2–3 cached demo inputs (raw code snippets + one GitHub PR URL) saved as fixtures
  - [ ] The `/health` endpoint working and returning all "ok" before demo
  - [ ] A 90-second screen recording of the full flow saved as fallback
  - [ ] Written answers to the 5 hard questions from `Preparation.md`

---

## Execution Order

Changes will be executed in this exact sequence:

| # | Change | Impact |
|---|--------|--------|
| 1 | Fix model name + add retry logic | Nothing works without this |
| 2 | Fix API key leak / verify `.gitignore` | Security critical |
| 3 | Fix `GITHUB_TOKEN` mismatch | GitHub integration broken |
| 4 | Delete all dead files | Clean repo for judges |
| 5 | Add `/health` endpoint | Required by `Api_specs.md` |
| 6 | Add input validation + security | Protects against judge abuse |
| 7 | Humanize error messages in frontend | UX critical |
| 8 | Full frontend redesign | Visual wow factor |

**Every change gets a git commit. Every change gets explained before execution.**
