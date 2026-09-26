# KB-032 — Memory-first orchestrator loads

## Pattern
Keep orchestrator/agent skills in session memory. Load them from disk only on `approve` / `continue`. `trivial`, `just answer`, `no pipeline`, `status`, `focus`, and Q&A must not Read skills or spawn planner/implementer/reviewer.

## Slice
Planning docs carry YAML `line`/`end`. Read front-matter, then `Read` that range only. Never ingest full PRD/TSD/DD/SD/FD. KB: index row → one file.

## Reuse
`.cursor/rules/orchestrator-v2-mandatory.mdc` is the always-on memory. Refresh `line`/`end` when a heading moves.
