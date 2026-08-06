# enhancement_plan.md — GitMentor / CodeSleuth

## What this file is

A pre-mortem, not a post-mortem. For each phase in `plan.md` / `phase.md`,
this imagines the realistic ways a **4-person team** — not a solo dev —
breaks the build, and gives the fix before it happens.

Two categories of mistake show up repeatedly in team hackathons and are
called out explicitly:
1. **Technical mistakes** — schema drift, security gaps, silent failures.
2. **Team-coordination mistakes** — the ones that turn a 4-person team
   back into a de facto solo project, which was the original concern.

This list is comprehensive but not exhaustive — treat it as a strong
starting checklist your team actively adds to during the hackathon, not
a guarantee that covers every failure mode.

---

## Phase 0 — Setup

**Scenario: environment drift.** Member A's Gemini call works locally
but Member D can't reproduce it — different Python version, different
env var name, key not shared securely.
- *Why it happens:* four people, four laptops, no single source of truth for setup.
- *Fix:* `.env.example` committed at Hour 0 with every required var name (no real secrets). Whoever hits an env issue first fixes the example file, not just their own machine.
- *Owner:* Member C (infra), but everyone checks their own setup against it.

**Scenario: sandbox works on one machine, not the others.**
- *Why it happens:* Docker Desktop vs. WSL vs. native Linux vs. Apple Silicon all behave differently for isolation flags.
- *Fix:* Member B tests the sandbox setup script on at least one other member's machine before Phase 0 checkpoint, not after.
- *Owner:* Member B.

**Scenario: schema bikeshedding eats the first 2 hours.**
- *Why it happens:* `Api_specs.md` gets debated field-by-field instead of shipped-then-iterated.
- *Fix:* Member A drafts it solo in the first 30 minutes from the version in this doc set, team reviews for 15 minutes max, freeze it. Perfect schema isn't the goal — a stable one is.
- *Owner:* Member A drafts, whole team time-boxes the review.

---

## Phase 1 — Core Pipeline

**Scenario: three people idle while Member A builds the pipeline.**
- *Why it happens:* B, C, D wait for A's `/review` endpoint to be "done" before starting their own work — this is the exact solo-project trap.
- *Fix:* B and C build against their own mocked inputs/outputs (a hardcoded `DiffPayload` and `SemgrepFindings` JSON file matching `Api_specs.md`). D builds against the static mock response, not the real endpoint, until A's stub exists. Nobody's blocked past Hour 2.
- *Owner:* whole team — this is enforced by the Phase 0 checkpoint producing mocks, not just a schema doc.

**Scenario: silent schema drift.**
- *Why it happens:* Member A adds a field or renames one mid-build to make the prompt easier, without telling anyone.
- *Fix:* any schema change is a message in the team channel *before* implementation, referencing the exact diff to `Api_specs.md`. D's frontend build breaking silently at Hour 20 is the cost of skipping this.
- *Owner:* Member A proposes, whole team acknowledges.

**Scenario: integration is only tested at the very end.**
- *Why it happens:* each role tests their own piece in isolation and assumes it'll "just connect" later.
- *Fix:* the joint sync checkpoint at the end of every phase in `phase.md` is mandatory, not optional — run the real, connected pipeline together, even if it's ugly, every single phase.
- *Owner:* whole team, no exceptions.

---

## Phase 2 — Test Generation + Sandbox Execution

**Scenario: sandbox isolation has a hole nobody found.**
- *Why it happens:* "it works" gets confused with "it's secure" — a generated test that never tries anything malicious doesn't prove isolation.
- *Fix:* Member B deliberately writes an adversarial test (attempt a network call, an infinite loop, excessive memory allocation) and confirms it's blocked/killed *before* Phase 2 is marked done. This is in `phase.md` as an explicit acceptance criterion — don't skip it under time pressure.
- *Owner:* Member B.

**Scenario: generated tests are suspiciously always green.**
- *Why it happens:* the LLM defaults to trivial, no-op-style tests that can't fail, which quietly undermines the entire "grounded, not hallucinated" claim of the project.
- *Fix:* seed at least one sample function with a real, known bug specifically so a generated test can catch it and fail. If your test suite never fails in rehearsal, that's a red flag to investigate, not a milestone to celebrate.
- *Owner:* Member A (prompt tuning) + Member C (seeding sample bugs).

**Scenario: test generation and sandbox execution built as one big untested step.**
- *Why it happens:* A and B build their halves separately and only connect them at the last minute.
- *Fix:* A commits a fixture of 2–3 generated-test examples early; B builds against that fixture immediately rather than waiting for live Gemini calls every time (also saves API quota during dev).
- *Owner:* Member A + Member B.

---

## Phase 3 — GitHub Integration

**Scenario: team burns shared GitHub API rate limit during dev.**
- *Why it happens:* four people all testing against random repos/PRs on the same PAT.
- *Fix:* agree on 2–3 shared sample PRs early (same ones used for the demo — see `Preparation.md` §4) and cache fetched diffs locally after first fetch, so repeated testing doesn't re-hit the API.
- *Owner:* Member C.

**Scenario: OAuth scope creep eats hours meant for core features.**
- *Why it happens:* OAuth "feels" more polished than a PAT, so someone starts building it without checking if there's time.
- *Fix:* PAT-only is the committed MVP path (see `plan.md` non-goals). OAuth is only attempted if Phases 1–2 finished ahead of schedule — check the plan before starting it, don't assume.
- *Owner:* Member C, with a gut-check from the whole team before starting.

**Scenario: private-repo handling is left ambiguous.**
- *Why it happens:* it's an edge case that's easy to defer, then a judge tries it live.
- *Fix:* explicitly decide and implement one clear behavior (supported with auth, or clearly rejected with a message) — no undefined middle state.
- *Owner:* Member C.

---

## Phase 4 — Frontend

**Scenario: frontend was built against an assumption that shifted.**
- *Why it happens:* this is what happens when the Phase 1 "silent schema drift" mistake isn't actually prevented — it surfaces here, at the worst possible time (right before the demo).
- *Fix:* if this happens despite the safeguards, the fix is the same joint-checkpoint discipline from earlier phases, just under more time pressure. Don't patch the frontend to match a wrong assumption — fix the source (`Api_specs.md`) and regenerate.
- *Owner:* Member A + Member D together, immediately, not deferred.

**Scenario: loading/error states get treated as "polish for later" and never happen.**
- *Why it happens:* they're not visually interesting to build, so they lose priority against panels and layout.
- *Fix:* build the loading/error state alongside the happy path from the start of Phase 4, not after — `phase.md` lists this as an explicit Phase 4 acceptance criterion for exactly this reason.
- *Owner:* Member D.

---

## Phase 5 — Demo Hardening

**Scenario: only the presenter knows the demo flow.**
- *Why it happens:* natural division of labor means D built the UI, so D "owns" the demo by default — but if D freezes on stage, nobody else can step in.
- *Fix:* all 4 members run the full demo script themselves at least once. Anyone should be able to present or take over troubleshooting live.
- *Owner:* whole team.

**Scenario: judge Q&A answers exist on paper but were never said out loud.**
- *Why it happens:* writing an answer in `Preparation.md` feels like preparation, but reading it live under pressure is a different skill.
- *Fix:* run a mock Q&A — one member plays a skeptical judge and fires the 5 hard questions at whoever's presenting, twice, before the actual demo.
- *Owner:* whole team.

**Scenario: someone pushes a "quick fix" after the freeze and breaks the pipeline.**
- *Why it happens:* it's tempting to fix a small thing right before presenting; that's also the highest-risk moment to introduce a new bug with zero time to catch it.
- *Fix:* enforce the freeze from `plan.md` literally — one designated approver for any post-freeze change, and it must be a crash fix, not an improvement.
- *Owner:* whole team agrees on the approver in advance (suggest: whoever is NOT presenting).

**Scenario: fallback recording doesn't reflect the actual final build.**
- *Why it happens:* it gets recorded early "to be safe" and then the build changes afterward.
- *Fix:* record it last, immediately after freeze, from the exact frozen build — not before.
- *Owner:* Member C or D, whoever's free at freeze time.

---

## Cross-cutting mistakes (not tied to one phase)

**Scenario: workload silently concentrates on one person.**
- *Why it happens:* the fastest or most experienced member starts absorbing others' tasks "to save time," and the team ends up back at a de facto solo project — the exact outcome you're trying to avoid.
- *Fix:* the role table in `Preparation.md` §1 and the per-phase, per-role tables in `plan.md`/`phase.md` exist specifically to make imbalance visible. If one person's row is empty for two phases running, that's the signal to rebalance, not a sign things are going well.

**Scenario: decisions get made in side conversations and never reach the whole team.**
- *Why it happens:* two people pair up to solve something and just... keep going, without looping in the other two.
- *Fix:* one shared channel, and any schema/scope decision gets posted there even if it was resolved 1:1. `Api_specs.md`'s freeze rule already requires this for schema changes — extend the habit to scope decisions too.

**Scenario: merge conflicts eat hours late in the hackathon.**
- *Why it happens:* everyone pushing to `main` directly, or branches diverging for too long without merging.
- *Fix:* the branch-per-role + required-review workflow in `plan.md`/`readme.md`, merged frequently (at minimum, at every joint sync checkpoint) rather than all at once at the end.
