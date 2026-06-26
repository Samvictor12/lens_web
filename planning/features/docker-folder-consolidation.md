<!--
Template for a single feature/bug file. Copy to planning/features/{feature-id}.md.
Each phase owns exactly one section below — do not edit another phase's section.
-->

## Meta

- id: docker-folder-consolidation
- title: Consolidate Dev/Prod Docker setups under Docker/ + add Test environment
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-26

## 1 Requirement

User wants all Docker build/deploy setups managed from a single `Docker/` folder instead of scattered at repo root (`Dev_lens/`, `PROD_Lens/`), and wants a third **Test** environment added alongside Dev and Prod.

Decisions made with user:

1. **Folder layout**: `Dev_lens/` → `Docker/dev/`, `PROD_Lens/` → `Docker/prod/`, new `Docker/test/` created. Shared `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf` **stay at repo root** (already referenced via `context: ..` from each env folder's compose file — no path changes needed there).
2. **Fix prod naming bug**: `PROD_Lens/docker-compose.yml` was a copy-paste of dev's — containers/network/images are literally named `lens_dev_*` even in prod. As part of the move, rename to `lens_prod_postgres`/`lens_prod_backend`/`lens_prod_frontend`/`lens_prod_pgadmin`, network `lens_prod_network`, images `lens-prod-backend:latest` / `lens-prod-frontend:latest`. Update `Docker/prod/deploy.sh`'s `container="lens_dev_postgres"` var to match.
3. **New Test environment**: `Docker/test/docker-compose.yml` modeled on dev's compose (postgres + backend + frontend + pgadmin), named `lens_test_*` / network `lens_test_network`, on its own port block to avoid clashing with dev (6201–6204) and prod (6001–6004):
   - backend: 6301, frontend: 6302, postgres: 6303, pgadmin: 6304
   - New `Docker/test/.env` (sanitized — see point 4) and a deploy script (will mirror `deploy.bat`/`deploy.sh` per OS parity with dev/prod — Windows-style like dev since this is a local/dev-adjacent environment, unless told otherwise during contract phase).
4. **Stop tracking `.env` secrets in git**: `Dev_lens/.env` and `PROD_Lens/.env` are currently committed with real secrets (JWT secret, DB password, pgadmin password). After the move: `git rm --cached` the relocated `.env` files, add `Docker/dev/.env`, `Docker/prod/.env`, `Docker/test/.env` to `.gitignore`, and commit sanitized `Docker/dev/.env.example`, `Docker/prod/.env.example`, `Docker/test/.env.example` templates (placeholder values, same keys) in their place. Real `.env` files remain on disk locally/on the prod server untouched.

Out of scope (left as-is, not part of this feature):
- Stale root `docker-compose.yml` (dead absolute path from another machine) — not moved or fixed, just left at root since it appears unused. Flag for separate cleanup if user wants.
- `Dev_lens/backups/*.sql` (existing DB backup) — moves with the folder to `Docker/dev/backups/`, not deleted.
- `Dev_lens/Comments.txt` (scp cheat-sheet) — moves with the folder to `Docker/dev/Comments.txt`, paths inside not rewritten (informational only).
- The `deploy.bat` "Create Prod build and Tar file" flow (builds in prod dir, tars images, scp's to `187.127.182.76`, deletes tar) — path inside updates to point at `Docker/prod` instead of `../PROD_Lens`, otherwise behavior unchanged.

Acceptance: `docker-compose up` works from each of `Docker/dev/`, `Docker/prod/`, `Docker/test/` (using their own `.env`, copied from `.env.example` by the user before first run), all three can coexist without port/name collisions, and no real secrets remain tracked in git going forward.

## 2 Contract

<!-- planner-architect. API/DB/component contract: endpoints, schemas, types, file touch-list. Locked after CONTRACT_COMPLETE. -->

### Confirmed current state
- `Dev_lens/docker-compose.yml` and `PROD_Lens/docker-compose.yml` are byte-identical — both name everything `lens_dev_*`, network `lens_dev_network`, images `lens-dev-backend:latest`/`lens-dev-frontend:latest`. `context: ..` resolves to repo root today only because both folders are direct children of root.
- Tracked files (git): `Dev_lens/.env`, `Dev_lens/Comments.txt`, `Dev_lens/backups/lens_prod_backup_2026-06-23_061006.sql`, `Dev_lens/deploy.bat`, `Dev_lens/docker-compose.yml`, `PROD_Lens/.env`, `PROD_Lens/deploy.sh`, `PROD_Lens/docker-compose.yml`. `postgres_data/`, `pgadmin_data/`, `public/`, `uploads/` under both, plus `PROD_Lens/clair.tar`, are untracked/gitignored already.
- Root `.env`, `.env.prod`, `.env copy` are unrelated app-runtime env files (not Docker env files, different keys/ports) — **out of scope, must not be touched or newly gitignored.**
- Both `Dev_lens/.env` and `PROD_Lens/.env` already contain a `DATABASE_URL` key (confirmed by reading both files) — no parity gap, `.env.example` files mirror this for all three environments.
- `PROD_Lens/deploy.sh` line 14 (`container="lens_dev_postgres"`) is the only naming-bug reference inside that script.
- `Dev_lens/deploy.bat`'s `:CreateProdBuild` block (`pushd ..\PROD_Lens`, `docker save ... lens-dev-backend/frontend`, `Location: PROD_Lens\clair.tar`) needs both the path move and the renamed prod images.
- `Dev_lens/Comments.txt` has two `scp` lines referencing the absolute `PROD_Lens` path (informational only, not executed).
- `.dockerignore` has a bare `Dev_lens` line but no `PROD_Lens` line (gap closed as a side effect of this move).

### Critical bug this contract must fix: build context path
`context: ..` in the current compose files resolves to repo root **only** because `Dev_lens/`/`PROD_Lens/` are direct children of root. After moving to `Docker/dev/`, `Docker/prod/`, `Docker/test/` (one level deeper), `context: ..` would resolve to `Docker/` and the build would fail (`Dockerfile.backend` not found). **All three new compose files must use `context: ../..` for both `backend` and `frontend` build sections.** `dockerfile:` keys (`Dockerfile.backend`/`Dockerfile.frontend`) stay unchanged — those files stay at repo root, untouched.

### File-touch list

**Git moves first (`git mv`, so renames are tracked):**
1. `Dev_lens/docker-compose.yml` → `Docker/dev/docker-compose.yml`
2. `Dev_lens/.env` → `Docker/dev/.env`
3. `Dev_lens/deploy.bat` → `Docker/dev/deploy.bat`
4. `Dev_lens/Comments.txt` → `Docker/dev/Comments.txt`
5. `Dev_lens/backups/lens_prod_backup_2026-06-23_061006.sql` → `Docker/dev/backups/lens_prod_backup_2026-06-23_061006.sql`
6. `PROD_Lens/docker-compose.yml` → `Docker/prod/docker-compose.yml`
7. `PROD_Lens/.env` → `Docker/prod/.env`
8. `PROD_Lens/deploy.sh` → `Docker/prod/deploy.sh`

**Untracked runtime dirs, plain move (after git moves, so old folders can be removed):**
9. `Dev_lens/postgres_data/`, `pgadmin_data/`, `public/`, `uploads/` → equivalent `Docker/dev/...` paths
10. `PROD_Lens/postgres_data/`, `pgadmin_data/`, `public/`, `uploads/` → equivalent `Docker/prod/...` paths
11. `PROD_Lens/clair.tar` → `Docker/prod/clair.tar` (already `*.tar`-gitignored, not load-bearing)
12. Delete now-empty `Dev_lens/` and `PROD_Lens/` once the above complete.

**New files:**
13. `Docker/test/docker-compose.yml` — new, modeled on dev's.
14. `Docker/test/.env` — new, untracked, working local values, `POSTGRES_DB=lens_project_db_test`.
15. `Docker/test/deploy.bat` — new, mirrors dev's deploy.bat minus the `CreateProdBuild` option.
16. `Docker/dev/.env.example`, `Docker/prod/.env.example`, `Docker/test/.env.example` — same keys as each real `.env`, placeholder values only.

**Edits to moved/existing files:**
17. `.gitignore` — add `Docker/dev/.env`, `Docker/prod/.env`, `Docker/test/.env` (scoped, not bare `.env`, since root has unrelated `.env`/`.env.prod`/`.env copy`). Existing bare `postgres_data`/`pgadmin_data` lines already match new paths at any depth — no change needed there.
18. `.dockerignore` — replace bare `Dev_lens` line with `Docker/dev`, `Docker/prod`, `Docker/test`.
19. `Docker/dev/docker-compose.yml` — fix `context: ..` → `../..` (both backend and frontend), names unchanged.
20. `Docker/prod/docker-compose.yml` — fix `context: ..` → `../..`, and rename all `lens_dev_*` → `lens_prod_*` (see below).
21. `Docker/prod/deploy.sh` — line 14 `container="lens_dev_postgres"` → `"lens_prod_postgres"`; update folder-name references in comments/errors to `Docker/prod`.
22. `Docker/dev/deploy.bat` — `:CreateProdBuild`: `pushd ..\PROD_Lens` → `pushd ..\prod`; image names → `lens-prod-backend:latest lens-prod-frontend:latest`; location echo → `Docker\prod\clair.tar`; update folder-name references in comments/errors to `Docker/dev`.
23. `Docker/dev/Comments.txt` — update both `scp` lines' `PROD_Lens` segments to `Docker\prod`.
24. Root `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, root `docker-compose.yml`, root `.env`/`.env.prod`/`.env copy` — **no changes, out of scope.**

### New directory tree under `Docker/`
```
Docker/
  dev/   docker-compose.yml, .env, .env.example, deploy.bat, Comments.txt,
         backups/lens_prod_backup_2026-06-23_061006.sql,
         postgres_data/ pgadmin_data/ public/ uploads/  (untracked, runtime)
  prod/  docker-compose.yml, .env, .env.example, deploy.sh, clair.tar,
         postgres_data/ pgadmin_data/ public/ uploads/  (untracked, runtime)
  test/  docker-compose.yml, .env, .env.example, deploy.bat,
         postgres_data/ pgadmin_data/ public/ uploads/  (new, untracked, runtime — created on first `up`)
```

### docker-compose.yml field changes (all three keep the same 4-service shape: postgres, backend, frontend, pgadmin + one bridge network)

| Field | dev (post-move) | prod (post-move) | test (new) |
|---|---|---|---|
| `backend`/`frontend` `build.context` | `..` → `../..` | `..` → `../..` | `../..` |
| postgres container | `lens_dev_postgres` (unchanged) | `lens_dev_postgres` → `lens_prod_postgres` | `lens_test_postgres` |
| backend container/image | `lens_dev_backend` / `lens-dev-backend:latest` (unchanged) | → `lens_prod_backend` / `lens-prod-backend:latest` | `lens_test_backend` / `lens-test-backend:latest` |
| frontend container/image | `lens_dev_frontend` / `lens-dev-frontend:latest` (unchanged) | → `lens_prod_frontend` / `lens-prod-frontend:latest` | `lens_test_frontend` / `lens-test-frontend:latest` |
| pgadmin container | `lens_dev_pgadmin` (unchanged) | → `lens_prod_pgadmin` | `lens_test_pgadmin` |
| network (4x service refs + top-level key) | `lens_dev_network` (unchanged) | → `lens_prod_network` | `lens_test_network` |
| ports (via `.env`) | 6201/6202/6203/6204 (unchanged) | 6001/6002/6003/6004 (unchanged) | 6301/6302/6303/6304 (new) |

All other keys (volumes, healthcheck, `depends_on`, env var names, `restart: unless-stopped`) copied verbatim from dev's current structure for test.

### .gitignore — add exactly
```
Docker/dev/.env
Docker/prod/.env
Docker/test/.env
```

### .dockerignore — replace `Dev_lens` line with
```
Docker/dev
Docker/prod
Docker/test
```

### .env.example content (placeholder values only, never real secrets)
- `Docker/dev/.env.example`: same keys as current `Dev_lens/.env` (`IPADDRESS`, `PORT=6201`, `VITE_APP_PORT=6202`, `POSTGRES_PORT=6203`, `PGADMIN_PORT=6204`, `POSTGRES_USER`, `POSTGRES_PASSWORD=changeme`, `POSTGRES_DB`, `DATABASE_URL`, `VITE_BACKEND_URL`, `VITE_WEB_API_URL`, `PGADMIN_DEFAULT_EMAIL=admin@example.com`, `PGADMIN_DEFAULT_PASSWORD=changeme`, `JWT_SECRET=changeme`, `REFRESH_TOKEN_SECRET=changeme`, `JWT_EXPIRES_IN=15m`, `REFRESH_TOKEN_EXPIRES_IN=7d`, `NODE_ENV=development`).
- `Docker/prod/.env.example`: same key set, ports 6001-6004, `VITE_BACKEND_URL`/`VITE_WEB_API_URL` placeholder domain (not the real visionconnect URL).
- `Docker/test/.env.example`: same key set, ports 6301-6304, `POSTGRES_DB=lens_project_db_test`.
- `Docker/test/.env` (real, untracked) may reuse dev's working secret values locally, with `POSTGRES_DB=lens_project_db_test` for isolation.

### Deploy script edits
- **`Docker/dev/deploy.bat`**: folder-name references (comment, error message) → `Docker/dev`; `:CreateProdBuild` block per item 22 above; options 1–8 (backup/restore/full/etc.) unchanged otherwise.
- **`Docker/prod/deploy.sh`**: folder-name references → `Docker/prod`; line 14 container var fix per item 21.
- **`Docker/test/deploy.bat`** (new): same menu shape as dev (options 1–8 + 0 Exit), **drop** the `CreateProdBuild` option entirely (test has no prod-build/scp step). `:Full` URL echoes use test's ports. Backup/restore target container `lens_test_postgres` and filename pattern `lens_test_backup_*.sql`.

### Order of operations
1. `git mv` all 8 tracked items (file-touch 1–8).
2. Plain-move untracked runtime dirs (9–11), delete empty `Dev_lens/`/`PROD_Lens/` (12).
3. Edit `Docker/dev/docker-compose.yml` (context only) and `Docker/prod/docker-compose.yml` (context + full rename) in place.
4. Edit `Docker/prod/deploy.sh`, `Docker/dev/deploy.bat`, `Docker/dev/Comments.txt` in place.
5. Create `Docker/test/docker-compose.yml`, `Docker/test/deploy.bat`.
6. `git rm --cached Docker/dev/.env Docker/prod/.env` (untrack, keep on disk).
7. Edit `.gitignore` (3 new lines).
8. Create the three `.env.example` files and `Docker/test/.env`.
9. Edit `.dockerignore`.
10. Verify: from each `Docker/{dev,prod,test}/`, `docker-compose config` resolves cleanly (build context finds root Dockerfiles; no name/port collisions across the three environments).

### Known pre-existing issue, explicitly not touched by this contract
Dev's current `deploy.bat` backup/restore logic references container `postgres_postgres` (not `lens_dev_postgres`) — a pre-existing inconsistency unrelated to this feature. Not fixed here; the new test script uses the correct `lens_test_postgres` from the start rather than inheriting it.

## 3 Test plan

<!-- implementer-fullstack. -->

### What was built
- `git mv`'d all 8 tracked files (file-touch list items 1–8): `Docker/dev/{docker-compose.yml,.env,deploy.bat,Comments.txt,backups/lens_prod_backup_2026-06-23_061006.sql}` and `Docker/prod/{docker-compose.yml,.env,deploy.sh}`. Git recorded these as renames (`R`/`RM` in `git status`).
- Plain-`Move-Item`'d the untracked runtime dirs: `postgres_data/`, `pgadmin_data/`, `public/`, `uploads/` for both dev and prod, plus `PROD_Lens/clair.tar` → `Docker/prod/clair.tar`. Deleted the now-empty `Dev_lens/` and `PROD_Lens/` folders (confirmed empty before deletion).
- Created `Docker/test/docker-compose.yml` (modeled on dev's, names `lens_test_*`, network `lens_test_network`, ports 6301–6304) and `Docker/test/deploy.bat` (same menu shape as dev's minus the `CreateProdBuild` option; backup/restore targets `lens_test_postgres` / `lens_project_db_test` / `lens_test_backup_*.sql`).
- Edited `Docker/dev/docker-compose.yml`: `context: ..` → `../..` for both `backend` and `frontend` build sections only; names/ports unchanged.
- Rewrote `Docker/prod/docker-compose.yml`: `context: ..` → `../..`, plus full rename of every `lens_dev_*` → `lens_prod_*` (containers `lens_prod_postgres/backend/frontend/pgadmin`, network `lens_prod_network`, images `lens-prod-backend:latest`/`lens-prod-frontend:latest`).
- Edited `Docker/prod/deploy.sh`: header/error-message folder references `PROD_Lens` → `Docker/prod`; line 14 `container="lens_dev_postgres"` → `container="lens_prod_postgres"`.
- Edited `Docker/dev/deploy.bat`: header/error-message folder references `Dev_lens` → `Docker/dev`; `:CreateProdBuild` block: `pushd ..\PROD_Lens` → `pushd ..\prod`, image names → `lens-prod-backend:latest lens-prod-frontend:latest`, location echo → `Docker\prod\clair.tar`.
- Edited `Docker/dev/Comments.txt`: both `scp` lines' `PROD_Lens` path segments → `Docker\prod`.
- `git rm --cached Docker/dev/.env Docker/prod/.env` — untracked from git, both files confirmed still present on disk afterward (verified via `ls -la`).
- Added 3 lines to `.gitignore`: `Docker/dev/.env`, `Docker/prod/.env`, `Docker/test/.env` (scoped — root's unrelated `.env`/`.env.prod`/`.env copy` untouched and still tracked).
- Edited `.dockerignore`: replaced bare `Dev_lens` line with `Docker/dev`, `Docker/prod`, `Docker/test` (three lines).
- Created `Docker/dev/.env.example`, `Docker/prod/.env.example`, `Docker/test/.env.example` — same keys as each real `.env`, placeholder values only (`POSTGRES_PASSWORD=changeme`, `JWT_SECRET=changeme`, `PGADMIN_DEFAULT_EMAIL=admin@example.com`, prod's URLs set to `https://example.com`, etc.). No real secrets in any committed file.
- Created `Docker/test/.env` (real, untracked, working values) — reused dev's working secret values locally with `POSTGRES_DB=lens_project_db_test` and ports 6301–6304, per contract.

### Verification performed
1. **Build-context fix + name/port isolation** — ran `docker-compose config` from each of `Docker/dev/`, `Docker/prod/`, `Docker/test/`. All three exited with code 0 (confirmed explicitly via `$?` after redirecting stderr to a file). Resolved `build.context` for both `backend` and `frontend` correctly pointed at the repo root (`D:\Personal\workspace\Lens_Project\Sources\lens_web`) in all three — confirms the critical `../..` fix works post-move. Container names, image names, and network names came out correctly scoped per environment (`lens_dev_*` / `lens_prod_*` / `lens_test_*`), and ports resolved to the right non-overlapping blocks (6201-6204 / 6001-6004 / 6301-6304). The only diagnostic output was a pre-existing, harmless `version` attribute "obsolete" warning (present in the original files before this feature; not in scope to fix).
2. **Git rename tracking** — `git status --short` shows the 8 moved files as `R`/`RM` (rename, with `M` where post-move content edits were also made), not delete+add pairs.
3. **Untracked secrets handling** — confirmed `Docker/dev/.env` and `Docker/prod/.env` show as `D` (deleted from index) in `git status` while still present and readable on disk (`ls -la` after the `git rm --cached`).
4. **Out-of-scope files untouched** — `git diff --stat` against root `docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `.env`, `.env.prod`, `.env copy` returned empty (zero diff).
5. **Old folders removed** — `Dev_lens/` and `PROD_Lens/` no longer exist (`ls` against both fails with "No such file or directory" as expected); their contents are fully accounted for under `Docker/dev/` and `Docker/prod/` (`Comments.txt`, `backups/`, `deploy.bat`/`deploy.sh`, `docker-compose.yml`, `pgadmin_data/`, `postgres_data/`, `public/`, `uploads/`, `clair.tar`).

### Reviewer steps to re-verify
- `cd Docker/dev && docker-compose config` — should exit 0, build context shows repo root, names/ports are `lens_dev_*` / 6201-6204 (unchanged from before the move).
- `cd Docker/prod && docker-compose config` — should exit 0, build context shows repo root, names/ports are now correctly `lens_prod_*` / 6001-6004 (previously buggy `lens_dev_*`).
- `cd Docker/test && docker-compose config` — should exit 0, build context shows repo root, names/ports are `lens_test_*` / 6301-6304.
- Review `Docker/dev/.env.example`, `Docker/prod/.env.example`, `Docker/test/.env.example` — confirm placeholder values only, no real secrets. (`Docker/dev/.env` and `Docker/prod/.env` already exist with real values from before the move, so no copy step needed there; `Docker/test/.env` was created fresh by this implementation with working local values — review it directly since it's new.)
- `git status` — confirm the 8 files show as renames, `.env`s show as deleted-from-index but present on disk, and no commit has been made.
- Optionally, `git diff Docker/prod/docker-compose.yml` style review of the full rename diff, and `git diff .gitignore .dockerignore` for the exact added lines.

### Deviations / issues encountered
- None from the contract. One operational note: the Read/Edit tool required a fresh `Read` of `Docker/dev/docker-compose.yml` and `Docker/prod/docker-compose.yml` at their new paths before editing (the tool's file-state cache is path-keyed and didn't carry over from the pre-move `Dev_lens`/`PROD_Lens` reads) — this added one extra Read round-trip but did not change any output.
- Pre-existing `version: "3.8"` attribute in all compose files triggers a Compose v2 "obsolete" deprecation warning on `config`/`up`. This existed before the move and is out of scope per the contract (not part of file-touch list); flagging for a possible separate future cleanup.

## 4 Test results

- result: PASS
- rework_tag: —
- next: —

Orchestrator independently re-verified (not just re-reading implementer's claims):
- `docker-compose config` re-run fresh from `Docker/dev/`, `Docker/prod/`, `Docker/test/` — all three exit 0.
- Read `Docker/prod/docker-compose.yml` and `Docker/test/docker-compose.yml` in full: confirmed `context: ../..`, correct `lens_prod_*`/`lens_test_*` naming throughout (containers, images, network), correct port blocks.
- Read `.gitignore`: confirms scoped `Docker/dev/.env`/`Docker/prod/.env`/`Docker/test/.env` entries, no bare `.env` added.
- Read `Docker/dev/.env.example` and `Docker/prod/.env.example`: placeholder values only (`changeme`, `admin@example.com`, `https://example.com`), correct per-environment ports, no real secrets.
- Confirmed `Docker/dev/.env`, `Docker/prod/.env`, `Docker/test/.env` all still exist on disk with real working values despite being untracked from git.
- `git diff --stat` against root `docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`, `nginx.conf`, `.env`, `.env.prod`, `.env copy` — empty, confirming out-of-scope files untouched.
- `git status --short` matches the contract's expected rename/delete/new-file pattern exactly.

No issues found. Contract fully satisfied.

## 5 Delivery note

Consolidated Docker build/deploy setups into one `Docker/` folder: `Dev_lens/` → `Docker/dev/`, `PROD_Lens/` → `Docker/prod/`, plus a new `Docker/test/` environment (ports 6301-6304, `lens_test_*` naming) cloned from dev's compose shape.

Two real bugs fixed as part of the move:
1. **Build context** — `context: ..` would have silently broken every build post-move (resolves one level too shallow); fixed to `../..` in all three compose files.
2. **Prod naming bug** — `PROD_Lens/docker-compose.yml` was a dev copy-paste; containers/network/images were literally `lens_dev_*` in production. Now correctly `lens_prod_*`.

Also stopped tracking `Docker/dev/.env` and `Docker/prod/.env` in git (both had real secrets committed — JWT secret, DB password, pgadmin password). Added scoped `.gitignore` entries (not a bare `.env`, since root has unrelated `.env`/`.env.prod`/`.env copy` files that must stay tracked) and committed sanitized `.env.example` templates for all three environments instead. Real `.env` files are untouched on disk.

Shared `Dockerfile.backend`/`Dockerfile.frontend`/`nginx.conf` stay at repo root, unchanged. Root's stale `docker-compose.yml` left as-is (out of scope, appears unused).

Verified via `docker-compose config` (all three exit 0) — did not run a full `docker-compose up`/build, so first real build/run in each environment should be treated as the final smoke test. No commit made; everything is staged/unstaged for review.

Follow-up not done (flagged, not blocking): dev's `deploy.bat` backup/restore logic references container `postgres_postgres` instead of `lens_dev_postgres` (pre-existing bug, unrelated to this feature).
