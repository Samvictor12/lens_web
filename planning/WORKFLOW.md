# Lens Web — Planning Workflow

This document outlines the rules and processes for the Lean Orchestrator Workflow. All agents and sub-agents must read this document at the start of a session and strictly follow its guidelines.

## 1. Folder Structure

The `planning/` directory must strictly contain the following files and folders:
* `Project_doc.md`: Functional, Non-functional, Technical, UI/UX specifications.
* `project_state.json`: Lean state tracking.
* `ARCHITECTURE.md`: Technical system architecture.
* `DATABASE_ERD.md`: Entity-relationship diagram and model descriptions.
* `WORKFLOW.md`: This file (workflow rules).
* `feature.md`: Single shared feature file (NO multiple feature files allowed).
* `Modules/`: Directory containing module-specific documentation (e.g. `Modules/Inventory.md`).
* `knowledge_base/`: Lessons learned and regression checks.

---

## 2. Shared Communication File: `feature.md`

All features, bugs, and updates are coordinated using a single file: `planning/feature.md`. It contains the following sections:
1. `Requirement`: Authored by Orchestrator.
2. `Contract`: Authored by Planner (as a TODO list checklist).
3. `Test plan`: Authored by Planner (as a TODO list checklist with test cases, test data, steps, and expected results).
4. `Test results`: Authored by Reviewer (PASS summary or Bug Report).
5. `Delivery note`: Authored by Orchestrator.

---

## 3. Step-by-Step Workflow Pipeline

### Step 1: Triage & Requirements (Orchestrator)
* When a request is received, check if an active feature is in-flight (by reading `project_state.json`).
* **If In-Flight:** Queue the request. Orchestrator appends it as a **New Draft Requirement** to the queue/draft section of `planning/feature.md`.
* **If Not In-Flight:**
  1. Compare the new requirement against `ARCHITECTURE.md`, `DATABASE_ERD.md`, and `Project_doc.md`.
  2. Write the detailed draft under the `Requirement` section in `planning/feature.md`.
  3. Update `project_state.json` (set `phase: DRAFT`, `HUMAN_APPROVED: false`).
  4. Wait for user feedback. If the user gives corrections, edit the `Requirement` section and wait again.

### Step 2: Contract & Test Plan (Planner-Architect)
* Triggers when the user sets `HUMAN_APPROVED: true` and `phase: CONTRACT`.
* **Action:** Translate the `Requirement` section into:
  - `Contract` (Development plan checklist of code/DB modifications)
  - `Test plan` (Checklist of test cases, including test data, execution steps, and expected outcomes)
* **Action:** Update `project_state.json` (`phase: BUILD`, `state_tag: READY`, `last_agent: planner`) to trigger the Implementer.

### Step 3: Implementation (Implementer-Fullstack)
* Triggers when `phase: BUILD` and `state_tag: READY`.
* **Action:** Read the `Contract` checklist in `planning/feature.md` and write the code updates. Check off each contract item as complete (`- [x]`).
* **Restriction:** Do not perform git commits or blanket checkouts that discard files.
* **Action:** Update `project_state.json` (`phase: QA`, `state_tag: READY`, `last_agent: implementer`) to trigger the Reviewer.

### Step 4: Verification (Reviewer-QA)
* Triggers when `phase: QA`.
* **Action:** Execute the test cases defined in the `Test plan`.
* **If All Pass:**
  - Check off all Test Plan items.
  - Set `Test results` section to `PASS`.
  - Update `project_state.json` (`phase: COMPLETED`, `state_tag: COMPLETED`, `last_agent: reviewer`) to trigger the Orchestrator.
* **If Any Fail:**
  - Create a detailed Bug Report in the `Test results` section of `planning/feature.md`.
  - Update `project_state.json` (`phase: BUILD`, `state_tag: REWORK`, `last_agent: reviewer`) to trigger the Implementer.
  - **Retest:** Implementer performs Rework, then updates `state_tag: RETEST` to trigger Reviewer-QA again.

### Step 5: Post-Completion Sync & Module Linkage (Orchestrator)
* Triggers when `phase: COMPLETED` (or `DONE`).
* **Action:** Read `Requirement` and `Contract` in `planning/feature.md`.
* **Action:** Update `Project_doc.md`, `ARCHITECTURE.md`, and `DATABASE_ERD.md` with any design/schema alterations.
* **Action:** Create or update the relevant module documentation under `planning/Modules/[ModuleName].md`.
  - The module file must cover the complete functional/technical description and map out **cross-module linkages and dependencies** (APIs, DB joins, shared utilities). Use graph analysis or sequential thinking to trace all connections.

---

## 4. Non-Negotiable Safety Rules

1. **Strict Git Ban:** Specialist sub-agents (`planner`, `implementer`, `reviewer`) must NEVER commit code or push changes. All commits are handled by the human user.
2. **Single-File Lock:** Agents must only write inside their designated sections in `planning/feature.md`.
3. **No Drive-by Refactors:** Implementer must restrict code changes strictly to the Contract scope.
4. **Diff Verification:** The Orchestrator must run git status/diff checks before routing.
