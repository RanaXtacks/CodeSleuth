# phase.md — GitMentor / CodeSleuth

Definition-of-done per phase, broken out by role so "done" isn't a vibe
and isn't just one person's opinion.

---

## Phase 0 — Setup

| Role | Done when |
|---|---|
| A | Hardcoded Gemini call returns a response (auth + quota proven) |
| B | `semgrep --config=p/security-audit sample.py` returns findings on a deliberately vulnerable file; sandbox executes a trivial pytest file with network disabled |
| C | GitHub PAT successfully fetches one real PR's file diffs |
| D | React app scaffolded, renders the static mock JSON from `Api_specs.md` |

**Joint checkpoint:** each role runs their command/demo live in front of
the other 3. `Api_specs.md` is frozen after this point.

---

## Phase 1 — Core Pipeline

| Role | Done when |
|---|---|
| A | `POST /review` returns **valid JSON matching `Api_specs.md`** — no markdown fences, no prose — for at least 3 different sample diffs (clean, buggy, Semgrep-flaggable) |
| B | `SemgrepFindings` handed to A in the agreed shape; findings visibly change A's Gemini prompt output |
| C | `DiffPayload` normalization works for both raw-paste and GitHub-sourced diffs, handed to A in the agreed shape |
| D | Frontend successfully calls the **real** `/review` endpoint (not the mock) and renders it without crashing on at least one sample |

**Joint checkpoint:** `curl -X POST /review -d @sample_diff.json` produces
correct output live, screen-shared to all 4. This is the fallback demo
if later phases aren't ready.

---

## Phase 2 — Test Generation + Sandbox Execution

| Role | Done when |
|---|---|
| A | `/tests` generates pytest code targeting actual functions in the diff |
| B | Generated code executes in the sandbox; response includes **real** pass/fail, not fabricated "all passed"; adversarial break-attempt (network call, infinite loop, fork bomb) fails to escape the sandbox |
| C | Sample repos/PRs have at least one function with a seedable, catchable bug |
| D | Test panel shows pass/fail badges wired to real sandbox output |

**Joint checkpoint:** demo a test that **fails** on a seeded bug, show
the failure reason on screen. All 4 present — this is your strongest
"not a wrapper" evidence.

---

## Phase 3 — GitHub Integration

| Role | Done when |
|---|---|
| A | `/review` handles PR-sourced diffs identically to raw-paste diffs (same schema out) |
| B | Semgrep confirmed working on GitHub-fetched files (not just local samples) |
| C | Paste PR URL → diff fetched via GitHub API; rate-limit handling returns a clear message, not a silent failure; private-repo case explicitly handled |
| D | "Paste GitHub PR URL" input wired into the UI |

**Joint checkpoint:** live-paste an actual open-source PR URL, output
matches Phase 1's raw-diff path exactly in shape.

---

## Phase 4 — Frontend

| Role | Done when |
|---|---|
| A | Any schema mismatches D reports are fixed same-day, not deferred |
| B | Sandbox results confirmed rendering correctly end-to-end in the UI |
| C | Deployment/hosting stable if doing a live (non-localhost) demo |
| D | Split view renders correctly for a real PR; security panel shows severity-tagged, plain-language findings (not raw Semgrep JSON); loading/error states handled gracefully — no white screen on failure |

**Joint checkpoint:** full flow, screen-share only, no terminal, under
90 seconds.

---

## Phase 5 — Demo Hardening

| Role | Done when |
|---|---|
| A | Confirms Gemini calls are pre-warmed before presenting (no cold-start latency live) |
| B | Confirms sandbox is stable under repeated runs (no state leaking between requests) |
| C | 2–3 demo PRs cached; fallback video recorded from the **frozen** build |
| D | Demo script finalized; all 4 have rehearsed it, not just the presenter |
| **All 4** | Rehearsed the 5 hard judge questions from `Preparation.md` §3 out loud; build is frozen — only crash fixes, one designated approver |

**Joint checkpoint:** this phase's checkpoint *is* the actual hackathon demo.
