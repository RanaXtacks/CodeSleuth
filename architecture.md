# architecture.md — GitMentor / CodeSleuth

## 1. System overview

```
┌──────────────┐      ┌────────────────────────────────────────────┐      ┌──────────┐
│   React UI   │─────▶│               FastAPI Backend               │─────▶│  Gemini  │
│ (Member D)   │◀─────│                (Member A: core)             │◀─────│   API    │
└──────────────┘      │  ┌────────────┐  ┌───────────┐  ┌─────────┐ │      └──────────┘
       │               │  │ Diff/PR    │  │  Semgrep  │  │ Sandbox │ │
       │               │  │ Fetcher    │  │  Runner   │  │ Runner  │ │
       │               │  │(Member C)  │  │(Member B) │  │(Member B│ │
       │               │  └────────────┘  └───────────┘  └─────────┘ │
       │               └────────────────────────────────────────────┘
       │                          │
       ▼                          ▼
  (user pastes diff       ┌──────────────┐
   or GitHub PR URL)      │  GitHub API  │
                          │  (Member C)  │
                          └──────────────┘
```

**Why this shape:** the LLM (Member A's territory) is deliberately not
the only source of truth. Semgrep and the Sandbox (Member B's territory,
both deterministic/verifiable) ground the AI's output. This is the
direct architectural answer to "is this just a wrapper?" — and it's also
why the role split isn't arbitrary: A and B each own one half of the
"grounded vs. generated" story, and neither can fake the other's part.

---

## 2. Components & ownership

### 2.1 Diff/PR Fetcher — **Member C**
- Input: raw pasted diff **or** GitHub PR URL
- If URL: calls `GET /repos/{owner}/{repo}/pulls/{pr}/files` via PAT (MVP) or OAuth (stretch)
- Normalizes both paths into `DiffPayload` (see `Api_specs.md`)
- Enforces size limit before anything downstream runs
- **Delivers to Member A:** a stable `DiffPayload` shape, agreed before Phase 1

### 2.2 Semgrep Runner — **Member B**
- Runs against changed files with `p/security-audit` + `p/python` rulesets
- Output: findings with file, line, rule ID, severity, raw message
- **Delivers to Member A:** `SemgrepFindings` list, consumed as grounding context in the Gemini prompt — not replaced by it

### 2.3 Prompt Pipeline (Gemini) — **Member A**
- One structured prompt per review, composed of: the diff + Semgrep findings + a fixed system instruction ("cite specific line numbers, do not invent findings not supported by the diff or static analysis output")
- Forced JSON output schema — freeform prose is not accepted; a parse failure is a `502`, not a silent empty result
- Second, separate call for test generation
- **Delivers to Member D:** the `/review` and `/tests` response bodies, exactly matching `Api_specs.md`
- **Delivers to Member B:** generated test code, for sandbox execution

### 2.4 Sandbox Runner — **Member B**
- Executes Member A's generated pytest tests against the actual reviewed code
- **Isolation requirements (non-negotiable):** no network access (`--network none` or equivalent), CPU/memory/time limits, filesystem writes restricted to a throwaway temp dir
- **Delivers to Member A:** `TestResults` (pass/fail, stdout/stderr, duration) to merge into the `/tests` response

### 2.5 React Frontend — **Member D**
- Split view: original file vs. annotated diff with inline suggestions
- Panels: Security Findings, Suggested Tests (live pass/fail), Performance/Style Notes
- Keep state simple — component state/context, no Redux under time pressure
- **Consumes from Member A:** `/review` and `/tests` responses — nothing else. If D needs a field that doesn't exist in `Api_specs.md`, that's a flagged schema-change request to A, not a silent frontend workaround.

---

## 3. Interface contracts between roles

This is the part that actually prevents four people from building four
incompatible pieces. Each arrow below is a schema, frozen after the
Phase 0 sync checkpoint:

| From → To | Contract | Defined in |
|---|---|---|
| C → A | `DiffPayload` | `Api_specs.md` |
| B → A | `SemgrepFindings` | `Api_specs.md` |
| A → B | Generated test code (string, pytest format) | `Api_specs.md` |
| B → A | `TestResults` | `Api_specs.md` |
| A → D | `/review`, `/tests` response bodies | `Api_specs.md` |

**Rule:** nobody consumes another role's output by reading their source
code and guessing the shape. Everyone builds against the written schema.
If the schema is wrong or incomplete, that's raised and fixed in the
schema doc first — not patched around locally, which is exactly how
integration breaks silently until Hour 20.

---

## 4. Data flow (single request lifecycle)

1. D → `POST /review` (diff or PR URL)
2. A normalizes via C's `DiffPayload` logic
3. B runs Semgrep on changed files → `SemgrepFindings` (parallel with step 4)
4. A calls Gemini with diff + findings → `ReviewResult`
5. A calls Gemini again for test generation → `GeneratedTests`
6. B runs `GeneratedTests` in sandbox → `TestResults`
7. A merges `ReviewResult` + `TestResults` → response to D
8. D renders split view + panels

Steps 3 and 4 can run concurrently. Step 5 depends on step 4's output.

## 5. Constraints to state honestly
- **Diff size limit:** ~2,000 lines / ~30 files per request; return a clear "too large" message, don't silently truncate
- **Language support:** Python-only for test generation (matches the pytest claim); Semgrep can cover more languages for the security panel
- **Latency budget:** target under ~15s end-to-end for demo PRs; show a staged loading state (Semgrep → review → test-gen → sandbox), not a blank spinner

## 6. Security & data handling
- Private repo code sent to Gemini: stated explicitly in the UI before submit (Member D's responsibility to surface; Member A's responsibility to document what's actually sent)
- No generated test code is ever `eval`'d outside the sandbox (Member B enforces)
- GitHub PAT/OAuth token: never logged, held in memory for request lifecycle only (Member C enforces)
