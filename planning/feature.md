# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below.

---

## Requirement

### Feature: Per-Eye QC Rejection & Reprocess (2026-07-26)

**Source:** User workflow notes (Untitled-1) + gap clarifications (2026-07-26).  
**Prior feature:** COMPLETED — Invoice Numeric Empty → Show 0.

**Docs alignment:** Extends SO QC reject/reset (`TASK_SO_WORKFLOW.md`, `saleOrderStatusService`), Inward Queue QC returns (`InventoryQcReturn`, `dispositionQcReturn`), SO Request Queue issue (`issueToPreQc` / Stock Pick), and RX/Stock godown filtering (`godownType` on Inward Queue). Touches Sales + Inventory modules.

---

### Locked decisions (user-confirmed)

1. Per-eye reject applies at **both Pre-QC and Post-QC**.
2. Accepted (non-rejected) eye stays **issued / reserved on the SO until QC Pass** of the reprocessed cycle.
3. **Scrap chosen at QC** → scrap lenses are **not** shown in Inward Queue (write off / dispose immediately; no Dispose/Reuse queue row).
4. Inward Queue godown routing for returns: **filter by SO `procurementType` only** (RX → RX godown queue; STOCK → Stock godown queue). Do **not** relocate the physical item on reject solely for routing.
5. On Reuse: inventory person picks **location + tray**; item must carry a visible **REUSED** tag.
6. On reprocess Issue: UI/API must show which eyes need **Issue stock** vs **already has the lens**; Raise PO defaults to **missing/rejected eyes only**.

---

### Business rules

#### A. Per-eye reject (Pre-QC & Post-QC)

1. An SO with both Left and Right may reject **Left only**, **Right only**, or **both**.
2. Rejecting Left ⇒ Right is **accepted** (stays with the SO). Rejecting Right ⇒ Left accepted. Rejecting both ⇒ neither stays.
3. Single-eye SO: reject applies to that one eye only (full reject for that order’s issued stock).
4. QC actions at reject time:
   - **Reject (reusable / inventory return)** → rejected eye(s) enter Inward Queue as pending **Reuse or Dispose** (existing Dispose/Reuse disposition, enhanced with tray + REUSED tag on Reuse).
   - **Reject scrap** → rejected eye(s) are scrapped **immediately**; **no** Inward Queue row for those eyes.
5. Accepted eye(s) remain linked/reserved on the SO through `*_REJECTED` / reset / re-issue of the other eye, until a later **Pass** at the same QC stage (or completion of the QC pass path). They must not be released to Available or sent to Inward Queue by the partial reject.

#### B. SO status & reprocess

1. After any eye reject (partial or full), SO shows as **rejected** (existing `PRE_QC_REJECTED` / `POST_QC_REJECTED` or scrap variants as appropriate). Confirm Reset → `DRAFT` remains required before reprocess (unless Contract finds a safer equivalent already in code — preserve current reset gate).
2. On reprocess (Issue & Pre-QC / Stock Pick after reset):
   - If **both** eyes were rejected (or scrapped): both need **Issue stock**.
   - If only **Left** rejected: Left = Issue stock; Right = **already has the lens** (no pick required for Right).
   - If only **Right** rejected: mirror of above.
3. `issueToPreQc` must not require picking inventory for eyes that already have an accepted reserved lens.
4. Raise PO after partial reject: default eyes/qty = **rejected / missing eyes only** (accepted eye counts as covered).

#### C. Inward Queue (reusable rejects only)

1. Only **non-scrap** rejected lenses appear in Inward Queue (QC return pending).
2. Queue filter by SO type: RX-type SO returns list under **RX** godown Inward Queue; STOCK-type under **Stock** godown Inward Queue (filter by `saleOrder.procurementType`; no forced relocate on reject).
3. Inventory disposition:
   - **Dispose** → mark unusable (damaged/write-off); remove from pending queue.
   - **Reuse** → user selects **specific tray** (and location as needed); item becomes AVAILABLE with a persistent **REUSED** tag visible in inventory/stock-pick surfaces.

#### D. Out of scope (unless later approved)

- Accounting journal changes for scrap/reuse beyond existing stock bucket updates.
- Changing customer pricing because a reused lens was issued.
- Auto-relocate of rejected lenses between RX/Stock godown locations.

---

## Contract

_(Planner — pending Requirement approval)_

---

## Test plan

_(Planner — pending Requirement approval)_

---

## Test results

_(empty)_

---

## Delivery note

### Closed: Invoice Numeric Empty → Show 0 (2026-07-26)

**Status:** DONE — QA PASS (L1–L5).

**Shipped:**
1. `fmt` coerces null/empty/non-numeric → `₹0.00`.
2. Tax Invoice line Discount / totals Discount / Round Off show `0.00` / `₹0.00` when empty (not `—`).
3. Text/identity placeholders still use `dash()` → `—`.

**Docs updated:** `Project_doc.md`, `Modules/Sales.md`, KB-040.
