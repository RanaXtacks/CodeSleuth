# Preparation.md — GitMentor / CodeSleuth

## 0. Why this file exists
Before writing a line of code, this document forces four things:
1. Who owns what — clearly enough that no task has zero owners or two.
2. What exactly are we scoping to (and NOT building)?
3. What will a technical judge try to break in 3 minutes?
4. What's our fallback if the live demo fails?

---

## 1. Team & role split (read this first)

Four roles, mapped to the four independent components in `architecture.md`.
Independent means: each role can build and test their piece against a
**mocked** version of the others' output from Hour 0, without waiting on
anyone. That's what actually prevents this from collapsing into one
person carrying the project.

| Role | Owns | Primary risk they're responsible for |
|---|---|---|
| **Member A — Backend & AI Pipeline** | FastAPI core, Gemini prompt engineering, JSON schema enforcement, `/review` and `/tests` orchestration | Prompt reliability, response schema stability |
| **Member B — Security & Sandbox** | Semgrep integration, sandboxed test execution, isolation/resource limits | Sandbox actually being secure, not just appearing to work |
| **Member C — Integrations & Infra** | GitHub API (fetch, auth, rate limits), deployment, env/secrets management, `/health` endpoint | External API flakiness, demo-day infra uptime |
| **Member D — Frontend & Demo** | React UI, split-diff view, panels, demo script, judge Q&A prep | Whether a non-technical judge understands the value in 10 seconds |

**Rule:** if a task doesn't clearly belong to one row above, that's a
sign the task is either mis-scoped or needs to be split — don't let it
default to whoever's fastest, because that's how solo-project dynamics
sneak back in.

Assign real names to A/B/C/D before Phase 0 starts.

---

## 2. Scope decision

The original pitch ("connect any GitHub repo → full review → security
audit → auto-generated tests") is too broad for a hackathon window and
too easy for a judge to poke holes in ("did you just call an LLM and
hope?").

**Locked scope:**

| In scope | Out of scope (explicitly cut) |
|---|---|
| Review a single **PR diff** (paste or GitHub PR URL) | Full-repo ingestion / whole-codebase understanding |
| Security signal via **Semgrep** (real static analysis) + LLM explains/prioritizes findings | LLM inventing vulnerabilities from raw text alone |
| LLM-generated **pytest** unit tests | Multi-language test generation |
| Tests **actually executed** in a sandboxed runner, pass/fail shown | "Trust me" tests that are never run |
| Bugs/style/perf suggestions as a diff-annotated view | Auto-applying fixes / auto-committing to GitHub |

**Why this cut matters:** it converts three vague claims ("finds bugs",
"assesses security risk", "generates tests you can trust") into three
falsifiable, demoable claims. A judge can watch Semgrep run, watch a
generated test execute, and see a real pass/fail — that survives
skepticism. "The AI said so" does not.

If the team wants the broader scope, it changes all four other files —
flag it before Phase 0, not mid-build.

---

## 3. Hardest questions a technical judge will ask

1. **"Why not just use Semgrep/CodeQL directly? What does the LLM add?"**
   → Semgrep gives raw findings with no context for *this specific PR*;
   the LLM ranks/explains them and ties them to the diff lines.
2. **"How do you know the generated tests are correct, not just plausible?"**
   → We execute them in a sandbox and show real pass/fail — not just
   displayed code. (Member B's sandbox is the evidence for this answer.)
3. **"What happens on a 5,000-line diff?"**
   → State the explicit cap honestly (see `architecture.md` §4).
4. **"What stops this from leaking private repo code to Gemini?"**
   → Explicit data-handling statement, shown in the UI before submit.
5. **"Is this just a ChatGPT wrapper?"**
   → Point to Semgrep grounding + sandboxed execution — the two things
   that aren't "prompt in, prose out."

**All four members should be able to answer all five** — not just the
person who happens to present. See `enhancement_plan.md` Phase 5 for
why this specifically breaks teams that split work but never cross-train.

---

## 4. Pre-hackathon setup checklist

| Task | Owner |
|---|---|
| Gemini API key provisioned, quota checked | Member A |
| Semgrep installed, ruleset picked (`p/security-audit`, `p/python`) | Member B |
| Sandbox isolation approach decided (Docker `--network none` vs. locked subprocess) | Member B |
| GitHub PAT provisioned; OAuth app registered only if time allows | Member C |
| Shared `.env.example` committed (no real secrets) so all 4 machines match | Member C |
| 2–3 sample repos/PRs picked in advance with known bugs/vulnerabilities seeded in | Whole team, Member D compiles |
| `Api_specs.md` schema reviewed and signed off by all 4 **before Phase 1 starts** | Whole team |

---

## 5. Risk register

| Risk | Likelihood | Impact | Owner | Mitigation |
|---|---|---|---|---|
| Live GitHub API call fails/rate-limited during demo | Medium | High | C | Pre-fetch and cache the demo PR |
| Gemini latency kills demo pacing | Medium | Medium | A | Pre-warm the call before presenting |
| Sandboxed test execution is insecure/breaks | Medium | High | B | Resource-limit + network-isolate; adversarial test before sign-off |
| Frontend built against a schema that later drifts | High | High | A + D | Freeze `Api_specs.md`, changes require a flagged message to all 4 |
| Work silently concentrates on one person | Medium | High | Whole team | Role table in §1 + phase checkpoints in `plan.md` |
