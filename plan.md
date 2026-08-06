# plan.md — GitMentor / CodeSleuth

Assumes a **24–36 hour hackathon window**. Adjust hour markers to your
actual duration, but keep the ordering and — more importantly — keep the
**sync checkpoints**. Those checkpoints are what stop this from becoming
four people building four separate projects that happen to share a repo.

## Guiding rule
**Build the ugly end-to-end path first, in parallel.** Every role builds
against a mocked version of the others' output starting Hour 0 — nobody
waits idle for someone else to finish before they can start.

---

## Phase 0 (Hour 0–2) — Setup

| Member A (Backend/AI) | Member B (Security/Sandbox) | Member C (Integrations/Infra) | Member D (Frontend/Demo) |
|---|---|---|---|
| Scaffold FastAPI, hardcode one Gemini call to prove auth works | Get Semgrep running against a sample vulnerable file | Get GitHub PAT working, fetch one real PR's diff via API | Scaffold React app, build UI against the **static mock JSON** in `Api_specs.md` |
| Commit `.env.example` | Stand up + smoke-test sandbox (network disabled) | Commit shared `.env.example` (merge with A's) | Build split-diff view shell with placeholder data |

**Sync checkpoint (Hour 2):** all 4 demo their piece running in isolation.
`Api_specs.md` schema is frozen after this checkpoint — no more changes
without a flagged team message.

---

## Phase 1 (Hour 2–8) — Core Pipeline

| Member A | Member B | Member C | Member D |
|---|---|---|---|
| Build `/review`: diff in → Gemini review → structured JSON out | Wire Semgrep findings into the `/review` pipeline as grounding context for A's prompt | Build diff normalization (raw paste + GitHub PR → common `DiffPayload`) | Keep building against the mock; start wiring real `/review` calls once A has a working stub |
| Enforce JSON-only output from Gemini (strip fences, validate schema) | Hand off `SemgrepFindings` shape to A (must match `Api_specs.md`) | Hand off `DiffPayload` shape to A | Build error/loading states now, not later |

**Sync checkpoint (Hour 8):** run the **real** pipeline end-to-end,
all 4 present. `curl` a diff in, get correct structured JSON out. This
is the fallback demo if nothing else is ready later.

---

## Phase 2 (Hour 8–14) — Test Generation + Sandbox Execution

| Member A | Member B | Member C | Member D |
|---|---|---|---|
| Build `/tests`: generate pytest from reviewed diff | Execute generated tests in sandbox, return real pass/fail | Support: make sure sample repos have functions worth testing | Build test-results panel with pass/fail badges wired to mock, then real data |
| Hand off `GeneratedTests` shape to B | **Adversarial test:** try to break sandbox isolation (network call, infinite loop) before marking done | — | — |

**Sync checkpoint (Hour 14):** demo a generated test that **fails** on
purpose (seeded bug) and show the failure reason. This is your strongest
"not a wrapper" evidence — rehearse it now, not at Hour 30.

---

## Phase 3 (Hour 14–20) — GitHub Integration

| Member A | Member B | Member C | Member D |
|---|---|---|---|
| Support: adjust `/review` if PR-sourced diffs need different handling | Support: confirm Semgrep runs fine on GitHub-fetched files | Own this phase: PR URL → GitHub API → `DiffPayload`, rate-limit handling, private-repo messaging | Wire the "paste PR URL" input path into the UI |

**Sync checkpoint (Hour 20):** paste a real open-source PR URL live,
confirm identical output shape to the raw-diff path.

---

## Phase 4 (Hour 14–24, parallel with Phase 3) — Frontend

| Member A | Member B | Member C | Member D |
|---|---|---|---|
| Support: fix any schema mismatches D finds | Support: confirm sandbox results render correctly | Support: deploy/host if doing a live (not localhost) demo | Own this phase: split view, security panel, test panel, loading/error states polished |

**Sync checkpoint (Hour 24):** full flow, screen-share only, no terminal,
under 90 seconds, all 4 watching for breaks.

---

## Phase 5 (Last 4–6 hours) — Demo Hardening

| All 4 members |
|---|
| Pre-select and cache 2–3 demo PRs (Member C caches, Member D scripts around them) |
| Record a fallback video of a full successful run (after freeze, from the frozen build) |
| **Every member** rehearses the 5 hard questions from `Preparation.md` §3 out loud — not just the presenter |
| **Every member** runs the full demo script at least once — anyone should be able to present or debug live |
| Build freeze: no new features, only crash fixes, one designated approver for any hotfix |

---

## Explicit non-goals for this timeline
- Multi-language support beyond Python
- Auto-committing fixes back to GitHub
- User accounts / persistence beyond the session
- Full-repo (non-diff) analysis

## Git workflow (agree on this at Hour 0, not Hour 20)
- One feature branch per role (`feat/backend-review`, `feat/sandbox`, `feat/github-integration`, `feat/frontend`)
- No direct pushes to `main` — every merge needs one other member's review
- Schema changes to `Api_specs.md` require a message in the team channel before implementation starts, not after
