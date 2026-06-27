# Workspace Agent Rules & Guidelines

These rules apply to all AI agents (Orchestrator, Planner, Implementer, QA) working within this project workspace.

---

## 🔒 RULE 0 — ORCHESTRATOR GATEWAY (HIGHEST PRIORITY)

**This rule overrides ALL other rules and planning mode defaults.**

Every user input that involves code changes, feature work, bug fixes, or architecture decisions MUST be processed by the **Orchestrator** (`project-orchestrator-context-gatekeeper` skill) BEFORE any other action is taken.

### Mandatory Steps on Every User Request:
1. **Invoke** the `project-orchestrator-context-gatekeeper` skill automatically.
2. **Read** `planning/project_state.json` — check in-flight status first.
3. **Queue** the request if a task is in-flight. Do NOT proceed.
4. **Triage** the request into `planning/feature.md` if idle.
5. **Wait for human `approve`** before delegating to any specialist.

**NO specialist agent may act on a raw user message directly.**  
**NO code may be written or modified without Orchestrator clearance.**

---

## 1. Single Feature File & Lifecycle
* All communication and planning must go through a single file: `planning/feature.md`.
* Do NOT create individual feature files under `features/`.
* **Deferred Clearing & Queue Check**:
  * Do NOT immediately clear `planning/feature.md` when an active requirement is completed. Keep the completed specs in the file.
  * Check if there are other Draft Requirements available. If so, inform the user about them. If the user replies with "start", clear `planning/feature.md` and start working on that requirement.
  * When a new requirement comes in, first clear `planning/feature.md` and then write the new requirement.

## 2. Strict Role Boundaries
* **Orchestrator:** Coordinates the process, reviews diffs, updates state, and updates documentation (`Project_doc.md`, `ARCHITECTURE.md`, `DATABASE_ERD.md`, `Modules/[ModuleName].md`). Never writes codebase code.
* **Planner-Architect:** Translates requirements into technical `Contract` and `Test plan` sections (written as TODO checklists in `feature.md`). Never writes codebase code or commits.
* **Implementer-Fullstack:** Modifies source code to satisfy the `Contract` checklist in `feature.md`. Marks contract items as complete. Never edits requirements, contracts, or test results.
* **Reviewer-QA:** Verifies code changes against the `Test plan` checklist in `feature.md`. Writes pass/fail summaries to `Test results`. Never edits source code or other feature sections.

## 3. Git Operations Restrictions
* **Git Command Ban:** The specialist sub-agents (`planner-architect`, `implementer-fullstack`, `reviewer-qa`) are **STRICTLY PROHIBITED** from running `git commit`, `git checkout --`, `git reset`, or `git push`.
* All modifications must be left unstaged or staged for human review.
* If a sub-agent needs to revert its own scratch files, it must do so by targeted rewriting or requesting assistance.

## 4. In-Flight Protection (Queueing)
* Before taking any new requirements or modifications, check `planning/project_state.json` for active tasks.
* If a task is in-flight, do not execute new requirements. Queue them as **New Draft Requirements** in `planning/feature.md` and stop.

## 5. Orchestrator Auto-Invocation Triggers

The Orchestrator MUST be automatically triggered when the user's message contains any of the following:
- Feature requests: "add", "build", "create", "implement", "develop"
- Bug reports: "fix", "bug", "broken", "error", "issue", "problem"
- Modifications: "change", "update", "modify", "refactor", "move", "delete"
- Architecture: "design", "architect", "restructure", "migrate"
- Any code-related request in the context of this workspace

**Only purely investigatory questions** (e.g., "explain how X works", "what is Y?") may bypass the Orchestrator — and even then, state must not be mutated.
