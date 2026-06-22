# Lens Web — Planning Workflow

Rules for the lean orchestrator workflow (`project-orchestrator-context-gatekeeper` skill). Read once per session, then cache — only re-read if this file changes.

## Stack

Vite + React (JS/JSX, no TypeScript) · Express 5 (JS) · PostgreSQL + Prisma 6

## Files

| File | Purpose |
|------|---------|
| `planning/project_state.json` | Slim session state — active feature, phase, approval flag |
| `planning/Project_docs.md` | Index of modules/features — table only, no bodies |
| `planning/features/{id}.md` | One file per feature/bug, sections filled by phase |
| `planning/features/_TEMPLATE.md` | Template for new feature files |
| `planning/knowledge_base/lessons_learned.md` | `[KB-NNN]` entries for recurring patterns/bugs |

## Step 0 — Interrupt guard (every session start)

Read **only** `planning/project_state.json`.

| `phase` | Action |
|---------|--------|
| Not `DONE` + `HUMAN_APPROVED: true` | Show `active_feature_file` + phase. Ask: continue or park? |
| Not `DONE` + `HUMAN_APPROVED: false` | Show `## 1 Requirement` draft. Ask: continue / abandon / approve? |
| `DONE` | Accept new work |

Then read `planning/Project_docs.md` index table only.

## Step 1 — Triage

| Input | Action |
|-------|--------|
| New feature / enhancement | Compare against `Project_docs.md` → new vs modification. Create `planning/features/{feature-id}.md` from `_TEMPLATE.md` |
| Bug, trivial (1–3 lines, zero contract impact) | Fix in code + KB line + `recent_log` — no feature file |
| Bug, standard+ | Feature file `type: bug`, fast-track `## 1`, optional skip of heavy `## 2` |
| `approve` | `HUMAN_APPROVED: true`, `phase: CONTRACT`, delegate planner-architect |
| `continue` | Resume from `phase` + `active_feature_file` |
| QA FAIL signal | Read `## 4 Test results` → route per `rework_tag` |

**Rule:** if `phase != DONE` for another feature, finish or park it before starting new work.

## Pipeline

```
REQUIREMENT  → Orchestrator writes features/{id}.md ## 1 + Meta → STOP (wait approve)
CONTRACT     → Subagent planner-architect → ## 2 only
BUILD        → Subagent implementer-fullstack → code + ## 3 Test plan
QA           → Subagent reviewer-qa → ## 4 Test results
DONE         → Orchestrator → ## 5 Delivery note + Project_docs row + KB + project_state DONE
```

## Phase — Requirement (`DRAFT`)

1. Edit `planning/features/{feature-id}.md` — fill `## Meta` and `## 1 Requirement` only.
2. Add row to `planning/Project_docs.md` (status `DRAFT`).
3. Update `project_state.json`: `active_feature_file`, `phase: DRAFT`, `HUMAN_APPROVED: false`, `state_tag: PLAN_MODE`, `last_agent: orchestrator`.
4. Present `## 1` to user — STOP until `approve`.

## Phase — On `approve`

1. Set `HUMAN_APPROVED: true`, `phase: CONTRACT`, `Meta.status: APPROVED`.
2. Append one line to `recent_log` (max 5 entries, drop oldest).
3. Delegate planner-architect with `{ "feature_file": "planning/features/{id}.md" }`.

## Phase — On `CONTRACT_COMPLETE`

`phase: BUILD`, `state_tag: READY` (or keep rework tag on re-entry). Delegate implementer-fullstack.

## Phase — On `IMPLEMENTATION_COMPLETE`

`phase: QA`. Delegate reviewer-qa.

## Phase — QA FAIL

Read `## 4` fields: `result`, `rework_tag`, `next`.

| `rework_tag` | Route |
|--------------|-------|
| `REWORK_BACKEND` / `REWORK_UI` | implementer-fullstack |
| `REVIEW_CONTRACT` | planner-architect |
| `RETEST` | reviewer-qa |

Set `state_tag` to match. Set feature `Meta.status: REWORK`.

## Phase — QA PASS

1. Orchestrator writes `## 5 Delivery note` (5–15 lines).
2. `Meta.status: DONE`, `phase: DONE`.
3. Update `Project_docs.md` row → `DONE`.
4. Append `[KB-NNN]` to `lessons_learned.md` if new pattern/bug.
5. Clear or leave `active_feature_file` pointing at the completed file.

## Delegation

| Subagent | When | Pass |
|----------|------|------|
| planner-architect | After approve | `feature_file` path |
| implementer-fullstack | CONTRACT_COMPLETE | `feature_file` path |
| reviewer-qa | IMPLEMENTATION_COMPLETE | `feature_file` path |

Do not duplicate specialist work in the main thread.

## Legacy artifacts

The previous planning structure (`01_PROJECT_OVERVIEW.md`, `02_ARCHITECTURE.md`, ..., `contracts/`, `docs/`, `feature_specs/`, `README.md`) was removed from the working tree. Do not recreate files there — all new work uses `planning/features/` + `Project_docs.md` only.

## Non-negotiable rules

1. Interrupt guard + `Project_docs.md` index before new work.
2. No implementation without `HUMAN_APPROVED: true` (except trivial bugs).
3. One feature file — agents edit their own section only.
4. `## 2 Contract` locked after `CONTRACT_COMPLETE` — changes need a version bump in `Meta.contract_version`.
5. App code lives in `src/` / `prisma/` only; orchestrator never writes code.
6. Memory-first: re-read a file only if `Meta.last_updated` changed or phase transition requires it.
7. Edit > Write for all planning markdown.

## Efficiency

- Never read full `lessons_learned.md` history on startup — only on KB lookup.
- Never read completed `planning/features/*.md` except the active pointer.
- `approve` / `continue` / trivial bug-fix do not require re-invoking the skill if context is already loaded.
