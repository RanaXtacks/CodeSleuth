# GitMentor / CodeSleuth

**A PR review copilot that grounds its claims instead of just generating them.**

Built by a 4-person team, each owning an independent, verifiable piece
of the pipeline.

## What it does

Paste a diff or a GitHub PR URL. GitMentor runs it through:
1. **Semgrep** (real static analysis) for security findings
2. **Gemini**, prompted as a senior reviewer, to explain and prioritize those findings and flag bugs/perf issues
3. A **sandboxed test runner** that executes Gemini-generated pytest tests against your actual code and reports real pass/fail

Two of the three stages are grounded in something deterministic (static
analysis, real execution). That's the direct answer to "how do I know
this isn't hallucinated?"

## Why this scope, not "review any repo for anything"

Narrowed to diff-only review with two grounded stages, because a
narrower, verifiable claim survives judge scrutiny better than a broad,
unverifiable one. Full reasoning: [`Preparation.md`](./Preparation.md) §2.

## Team & roles

| Member | Role | Owns |
|---|---|---|
| A — _[name]_ | Backend & AI Pipeline | FastAPI core, Gemini prompt engineering, schema enforcement |
| B — _[name]_ | Security & Sandbox | Semgrep integration, sandboxed test execution |
| C — _[name]_ | Integrations & Infra | GitHub API, deployment, secrets/env |
| D — _[name]_ | Frontend & Demo | React UI, panels, demo script, judge Q&A prep |

Full role breakdown and interface contracts: [`Preparation.md`](./Preparation.md) §1, [`architecture.md`](./architecture.md) §3.

## Architecture at a glance

```
React (Member D) → FastAPI (Member A) → [Semgrep | Sandbox (Member B)] + GitHub API (Member C) → Gemini
```

Full breakdown: [`architecture.md`](./architecture.md)

## Tech stack

- **Frontend:** React — split-screen original vs. annotated diff, security/test panels
- **Backend:** Python, FastAPI
- **Static analysis:** Semgrep (`p/security-audit`, `p/python` rulesets)
- **AI layer:** Gemini API, constrained to structured JSON output
- **Test execution:** sandboxed pytest runner (network-isolated, resource-limited)

## Repo docs

| File | Purpose |
|---|---|
| [`Preparation.md`](./Preparation.md) | Roles, scope decisions, hard judge questions, risk register |
| [`plan.md`](./plan.md) | Hour-by-hour plan, 4 parallel swimlanes with sync checkpoints |
| [`architecture.md`](./architecture.md) | System design, component ownership, interface contracts |
| [`phase.md`](./phase.md) | Definition-of-done per phase, per role |
| [`Api_specs.md`](./Api_specs.md) | Endpoint contracts and JSON schemas (the team's source of truth) |
| [`enhancement_plan.md`](./enhancement_plan.md) | Pre-mortem: realistic failure scenarios per phase and fixes |

## Local setup

```bash
# backend
cd backend
pip install -r requirements.txt
export GEMINI_API_KEY=...
export GITHUB_TOKEN=...       # optional for MVP if using raw-diff paste only
uvicorn main:app --reload

# frontend
cd frontend
npm install
npm run dev
```

## Git workflow
- One feature branch per role: `feat/backend-review`, `feat/sandbox`, `feat/github-integration`, `feat/frontend`
- No direct pushes to `main` — every merge needs review from one other member
- `Api_specs.md` changes require a flagged team message before implementation

## Demo

1. Paste a GitHub PR URL (or a raw diff) into the UI
2. Watch the pipeline: Semgrep → Gemini review → test generation → sandbox execution
3. See security findings (severity-tagged, plain-language), bug/perf notes, and generated tests with **real** pass/fail results

## Known limitations (stated honestly, not hidden)
- Python-only for test generation in this build
- Diff size capped (~2,000 lines) for the hackathon build
- Full-repo (non-diff) analysis is out of scope — see `Preparation.md`
