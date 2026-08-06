# Api_specs.md — GitMentor / CodeSleuth

Backend: FastAPI. All responses are JSON. **This file is the contract
between all 4 roles** — frozen after the Phase 0 sync checkpoint (see
`plan.md`). Changing a schema after freeze requires a flagged message to
the team before implementation, not a silent local patch.

## Ownership
| Endpoint | Implemented by | Consumed by |
|---|---|---|
| `POST /review` | Member A (orchestration), using C's `DiffPayload` and B's `SemgrepFindings` | Member D |
| `POST /tests` | Member A, using B's `TestResults` | Member D |
| `GET /health` | Member C | Everyone, especially pre-demo |

---

## Base URL
```
http://localhost:8000  (local/demo)
```

---

## Internal schema: `DiffPayload` (Member C → Member A)

```json
{
  "files": [
    { "filename": "app/auth.py", "diff_hunk": "string", "language": "python" }
  ],
  "source_type": "raw_diff",   // "raw_diff" | "github_pr"
  "pr_url": "string | null"
}
```

## Internal schema: `SemgrepFindings` (Member B → Member A)

```json
[
  {
    "rule_id": "string",
    "severity": "low | medium | high | critical",
    "file": "app/auth.py",
    "line": 42,
    "raw_message": "string"
  }
]
```

## Internal schema: `TestResults` (Member B → Member A)

```json
[
  {
    "test_name": "string",
    "status": "passed | failed | error",
    "stdout": "string",
    "stderr": "string",
    "duration_ms": 214
  }
]
```

---

## POST /review

### Request
```json
{
  "source_type": "raw_diff",       // "raw_diff" | "github_pr"
  "diff_text": "string | null",    // required if source_type == raw_diff
  "pr_url": "string | null",       // required if source_type == github_pr
  "language": "python"
}
```

### Response `200 OK`
```json
{
  "request_id": "uuid",
  "meta": { "files_changed": 3, "lines_changed": 142, "truncated": false },
  "security_findings": [
    {
      "id": "semgrep-rule-id",
      "source": "semgrep",
      "severity": "high",
      "file": "app/auth.py",
      "line": 42,
      "raw_message": "string",
      "llm_explanation": "string",
      "suggested_fix": "string | null"
    }
  ],
  "bugs": [
    { "file": "app/utils.py", "line": 17, "severity": "medium", "description": "string", "suggested_fix": "string" }
  ],
  "performance_notes": [
    { "file": "app/utils.py", "line": 23, "description": "string", "suggestion": "string" }
  ],
  "test_generation_request_id": "uuid"
}
```

### Error responses
```json
// 400 — bad input
{ "error": "invalid_input", "detail": "diff_text required when source_type is raw_diff" }

// 413 — too large
{ "error": "diff_too_large", "detail": "Diff exceeds 2000 line limit", "lines_received": 5421 }

// 502 — upstream failure (Gemini, GitHub, or Semgrep)
{ "error": "upstream_failure", "detail": "Gemini API request failed", "upstream": "gemini" }
```

---

## POST /tests

### Request
```json
{ "request_id": "uuid" }
```

### Response `200 OK`
```json
{
  "request_id": "uuid",
  "tests": [
    {
      "test_name": "test_auth_rejects_empty_token",
      "target_function": "app.auth.validate_token",
      "generated_code": "string",
      "execution": { "status": "passed", "stdout": "string", "stderr": "string", "duration_ms": 214 }
    }
  ],
  "summary": { "total": 5, "passed": 4, "failed": 1 }
}
```

### Error response
```json
{ "error": "no_testable_functions", "detail": "No function-level changes found in diff" }
```

---

## GET /health
```json
{ "status": "ok", "gemini": "ok", "semgrep": "ok", "sandbox": "ok", "github": "ok" }
```
Each field reflects a real check (last successful call within N seconds),
not a hardcoded `"ok"` — this is what everyone `curl`s 30 seconds before
walking on stage. Owned by Member C, but everyone should know how to run it.

---

## Internal contract: Gemini prompt → JSON
The LLM must return **only** JSON matching the schemas above — no
markdown fences, no prose preamble. If the Gemini API version supports
JSON mode/response schema, use it. Otherwise strip fences defensively
and treat a parse failure as `502 upstream_failure` — never as a silent
empty array. A confidently-empty result on a demo PR with a known bug is
the most damaging failure mode possible; a visible error is safer.

## Rate limit / retry policy
- Single retry with backoff on Gemini/GitHub `429`/`5xx`
- No retry on `4xx` — surface immediately
- Semgrep failure on one file omits that file's findings and notes it in `meta`, doesn't fail the whole request
