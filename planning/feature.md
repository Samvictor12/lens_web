# Active Feature Spec

This is the single shared feature document (`planning/feature.md`). Each phase owns exactly one section below. Specialist sub-agents must only edit their designated sections and must never commit code.

> **Status: COMPLETED** (2026-07-03) — "Invoice Accounting Timing Fix — Post at Issue, Reverse on Cancel". QA PASSED, first try. Docs synced to `planning/Modules/Sales.md`.

---

## Requirement

**Sprint: Invoice Accounting Timing Fix — Post at Issue, Reverse on Cancel**

### Context & Problem Statement

During the billing flow audit, one accounting gap was identified and deferred:

**Current (wrong) behaviour:**  
`invoiceService.createInvoice()` calls `postInvoice()` immediately when the invoice is created as a `DRAFT`. This means:
- Revenue (Cr Sales, Cr GST) and the AR debit (Dr Customer AR) are recognised the moment a draft invoice is saved — **before the invoice is issued or sent to the customer**.
- If the draft is **cancelled** before being issued, the Sales and AR ledger entries already posted are **never reversed**. The ledger shows phantom revenue and a phantom AR balance.

**Correct behaviour:**  
Revenue should be recognised only when the invoice is formally issued (`DRAFT → ISSUED`). Cancellation must reverse any accounting that was already posted.

### Functional Requirements

#### F1 — Move `postInvoice()` from `createInvoice()` to `issueInvoice()` (Backend)
- Remove the `postInvoice()` call (and its import if it becomes unused at the call site) from `createInvoice()` in `invoiceService.js`.
- Add `postInvoice()` call inside `issueInvoice()`, within the same Prisma transaction that sets the invoice status to `ISSUED` and sets linked SOs to `INVOICED`.
- The `postInvoice()` call needs: `{ invoiceId, invoiceNo, totalAmount: invoice.totalAmount, taxAmount: invoice.taxAmount, customer }`. The customer object must include `{ id, code, ledgerId }` — fetch the customer inside `issueInvoice()` before the transaction if not already loaded.

#### F2 — Add `reverseInvoice()` to `accountingService.js` (Backend)
- Create a new exported function `reverseInvoice(tx, { invoiceId, invoiceNo, totalAmount, taxAmount, customer }, userId)`.
- This must post a **reversal** of `postInvoice()` — i.e. the exact opposite entries:
  - **Dr** Sales Revenue (`AC-3001`) — net amount (`totalAmount - taxAmount`)
  - **Dr** GST Output (`AC-2003`) — tax amount (only if `taxAmount > 0.001`)
  - **Cr** Customer AR ledger (customer's owned ledger) — full `totalAmount`
- Use `transactionType: 'JOURNAL'`, `referenceType: 'INVOICE'`, `referenceId: invoiceId`, `referenceNumber: invoiceNo`, `description: \`Invoice reversal — ${invoiceNo}\`` .

#### F3 — Call `reverseInvoice()` from `cancelInvoice()` (Backend)
- In `invoiceService.cancelInvoice()`, after the existing status checks, add logic to conditionally call `reverseInvoice()` inside the Prisma transaction:
  - Call `reverseInvoice()` only if `invoice.status` is `ISSUED` or `PARTIALLY_PAID` (those are the statuses that had `postInvoice()` run — only after the move in F1 is done, DRAFT cancellations will no longer have accounting to reverse).
  - The customer must be fetched with `{ id, code, ledgerId }` before the transaction (same pattern as `recordPayment()`).
- For `PARTIALLY_PAID` invoices: reverse the **full** invoice amount (not just the unpaid portion). The prior payment receipts (`postClientPayment()` entries: Dr Bank, Cr AR) remain intact — the bank physically received the money. The net effect leaves the customer AR with a credit balance equal to the payments received, which represents a refund owed. This is correct double-entry; the refund process is outside scope.

#### F4 — Import `reverseInvoice` in `invoiceService.js`
- Add `reverseInvoice` to the import from `'./accountingService.js'` in `invoiceService.js`.

### Scope Boundary
- No Prisma schema changes.
- No frontend changes.
- No changes to `postClientPayment()`, `recordPayment()`, or any other service.
- Existing invoices already in the DB (some may have been posted at DRAFT) are out of scope — this fix applies to all future invoices only.

---

## Contract

### `accountingService.js`
- [x] Add exported async function `reverseInvoice(tx, { invoiceId, invoiceNo, totalAmount, taxAmount, customer }, userId)` that posts the exact reversal of `postInvoice()`:
  - Resolve ledgers: `getOwnedLedger(tx, customer, 'Customer')` → `arLedger`; `getLedger(tx, 'AC-3001')` → `salesLedger`
  - Compute: `tax = parseFloat(taxAmount || 0)`, `net = parseFloat(totalAmount) - tax`
  - Build entries: `[{ ledgerId: salesLedger.id, entryType: 'DEBIT', amount: net, description: \`Sales revenue reversal — ${invoiceNo}\` }, { ledgerId: arLedger.id, entryType: 'CREDIT', amount: parseFloat(totalAmount), description: \`Invoice reversal — ${invoiceNo}\` }]`
  - If `tax > 0.001`: fetch `gstOutputLedger = getLedger(tx, 'AC-2003')` and **splice** (or insert before CR entry) `{ ledgerId: gstOutputLedger.id, entryType: 'DEBIT', amount: tax, description: 'GST Output reversal' }`
  - Call `postTransaction(tx, { transactionType: 'JOURNAL', referenceType: 'INVOICE', referenceId: invoiceId, referenceNumber: invoiceNo, description: \`Invoice reversal — ${invoiceNo}\` }, entries, userId)`

### `invoiceService.js`
- [x] **Import line (line 5):** Add `reverseInvoice` to the named import from `'./accountingService.js'` → `import { postInvoice, postClientPayment, reverseInvoice } from './accountingService.js';`
- [x] **`createInvoice()` (line 139):** Remove the call `await postInvoice(tx, { invoiceId: created.id, invoiceNo, totalAmount: created.totalAmount, taxAmount, customer }, userId);` entirely from the `prisma.$transaction` block. The comment `// Auto-post accounting entry` on the preceding line should also be removed.
- [x] **`issueInvoice()`:** Before the `prisma.$transaction(...)` call, fetch the customer:
  ```js
  const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId }, select: { id: true, code: true, ledgerId: true } });
  if (!customer) throw new APIError('Customer not found', 404, 'CUSTOMER_NOT_FOUND');
  ```
  Then, inside the transaction after the `saleOrder.updateMany` call, add:
  ```js
  await postInvoice(tx, { invoiceId, invoiceNo: invoice.invoiceNo, totalAmount: invoice.totalAmount, taxAmount: invoice.taxAmount, customer }, userId);
  ```
- [x] **`cancelInvoice()`:** In the initial `prisma.invoice.findUnique` call, expand the `include` to also fetch the customer — add `customer: { select: { id: true, code: true, ledgerId: true } }` to the `include` object. Then inside `prisma.$transaction`, after the `invoice.update` call, add a conditional reversal block:
  ```js
  if (['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status)) {
    await reverseInvoice(tx, { invoiceId, invoiceNo: invoice.invoiceNo, totalAmount: invoice.totalAmount, taxAmount: invoice.taxAmount, customer: invoice.customer }, userId);
  }
  ```

---

## Build Log

**2026-07-03 — implementer-fullstack**

1. **`accountingService.js`** — Added exported `reverseInvoice()` function immediately after `postInvoice()`. Posts a JOURNAL transaction that Dr Sales Revenue (AC-3001) and Dr GST Output (AC-2003, if tax > 0.001) and Cr Customer AR ledger for the full invoice amount — the exact mirror of `postInvoice()`.

2. **`invoiceService.js` — import** — Added `reverseInvoice` to the named import from `'./accountingService.js'`.

3. **`invoiceService.js` — `createInvoice()`** — Removed the `postInvoice()` call (and its "Auto-post accounting entry" comment) from inside the `prisma.$transaction` block. Invoices now start as DRAFT with no accounting entries.

4. **`invoiceService.js` — `issueInvoice()`** — Added `prisma.customer.findUnique` to fetch `{ id, code, ledgerId }` before the transaction. Inside the transaction, after `saleOrder.updateMany`, added `await postInvoice(...)` so accounting is posted exactly when the invoice is formally issued.

5. **`invoiceService.js` — `cancelInvoice()`** — Expanded the initial `findUnique` `include` to also load `customer: { select: { id, code, ledgerId } }`. Inside `prisma.$transaction`, after the customer credit reversal block, added a conditional `reverseInvoice()` call that fires only when `invoice.status` is `ISSUED` or `PARTIALLY_PAID`.

---

## QA / Test Plan

- [x] **TC1 — Create invoice → no FinancialTransaction posted**
  - **Test Data:** Two DELIVERED sale orders for the same customer; one with tax, one without.
  - **Steps:** Call `POST /api/invoices` (or `invoiceService.createInvoice()`). Query `FinancialTransaction` table filtered by `referenceType = 'INVOICE'` and the new `invoiceId`.
  - **Expected:** Zero `FinancialTransaction` rows exist for the new invoice. Invoice status is `DRAFT`.

- [x] **TC2 — Issue invoice → FinancialTransaction posted correctly**
  - **Test Data:** An existing DRAFT invoice with `totalAmount = 1180`, `taxAmount = 180` (net = 1000).
  - **Steps:** Call `PUT /api/invoices/:id/issue` (or `invoiceService.issueInvoice(invoiceId)`). Query `FinancialTransaction` and its `JournalEntry` rows for this invoice.
  - **Expected:** One `FinancialTransaction` with `transactionType = 'SALE'`, `referenceType = 'INVOICE'`. Three `JournalEntry` rows: Dr Customer AR ledger ₹1180, Cr AC-3001 (Sales) ₹1000, Cr AC-2003 (GST Output) ₹180. Invoice status is `ISSUED`.

- [x] **TC3 — Cancel DRAFT invoice → no reversal FinancialTransaction**
  - **Test Data:** A DRAFT invoice (TC1 invoice, no accounting posted).
  - **Steps:** Call `PUT /api/invoices/:id/cancel` (or `invoiceService.cancelInvoice(invoiceId)`). Query `FinancialTransaction` for this invoiceId.
  - **Expected:** Zero `FinancialTransaction` rows created by the cancellation. Invoice status is `CANCELLED`. Linked sale orders return to `DELIVERED`.

- [x] **TC4 — Cancel ISSUED invoice → full reversal FinancialTransaction posted**
  - **Test Data:** The ISSUED invoice from TC2 (`totalAmount = 1180`, `taxAmount = 180`). No payments recorded yet.
  - **Steps:** Call `cancelInvoice(invoiceId)`. Query `FinancialTransaction` rows for this invoiceId.
  - **Expected:** A second `FinancialTransaction` exists with `transactionType = 'JOURNAL'`, `description = 'Invoice reversal — <invoiceNo>'`. Its `JournalEntry` rows: Dr AC-3001 (Sales) ₹1000, Dr AC-2003 (GST Output) ₹180, Cr Customer AR ledger ₹1180. Net ledger balance for Customer AR is zero (original debit + reversal credit cancel out). Invoice status is `CANCELLED`.

- [x] **TC5 — Cancel PARTIALLY_PAID invoice → full reversal posted; payment entries untouched**
  - **Test Data:** An ISSUED invoice with `totalAmount = 1180`. Record a partial payment of ₹500 via `recordPayment()`. Then cancel.
  - **Steps:** Cancel the invoice. Query all `FinancialTransaction` rows for this invoiceId.
  - **Expected:** Three transactions total: (1) the original SALE posting (Dr AR ₹1180, Cr Sales ₹1000, Cr GST ₹180), (2) the RECEIPT posting (Dr Bank ₹500, Cr AR ₹500), (3) the JOURNAL reversal (Dr Sales ₹1000, Dr GST ₹180, Cr AR ₹1180). The RECEIPT entries are untouched. Net Customer AR balance = −₹500 (credit, representing refund owed). Invoice status is `CANCELLED`.

- [x] **TC6 — Normal payment flow unaffected**
  - **Test Data:** An ISSUED invoice with `totalAmount = 1000`, `taxAmount = 0`.
  - **Steps:** Call `recordPayment(invoiceId, { amount: 1000, bankLedgerId: <valid bank ledger id>, ... })`. Query `FinancialTransaction` for this invoice.
  - **Expected:** Two transactions: (1) SALE posting from `issueInvoice()` (Dr AR ₹1000, Cr Sales ₹1000), (2) RECEIPT posting from `recordPayment()` (Dr Bank ₹1000, Cr AR ₹1000). Invoice status is `PAID`. Linked sale orders move to `COMPLETED`.

---

## Test results

result: PASS
levels: L1 PASS, L2 PASS, L3 PASS, L4 PASS, L5 PASS

### Detail

**L1 — Build/Imports:** `reverseInvoice` is exported from `accountingService.js` (line 210) and correctly imported in `invoiceService.js` (line 5: `import { postInvoice, postClientPayment, reverseInvoice } from './accountingService.js'`). No Prisma schema changes required or present.

**L2 — Entry balance:** `reverseInvoice()` resolves `arLedger` via `getOwnedLedger(tx, customer, 'Customer')` and `salesLedger` via `getLedger(tx, 'AC-3001')`. Entries: Dr salesLedger (`net = totalAmount - tax`), Dr gstOutputLedger (`tax`, spliced at index 1 before CR when `tax > 0.001`), Cr arLedger (`totalAmount`). Balance: Dr = net + tax = totalAmount = Cr. `postTransaction()` enforces this with `Math.abs(totalDr - totalCr) > 0.01` guard.

**L3 — Guard logic:** `cancelInvoice()` checks `['ISSUED', 'PARTIALLY_PAID'].includes(invoice.status)` before calling `reverseInvoice()`. `DRAFT` cancellations do not trigger reversal. `PAID` and `CANCELLED` are already blocked by the pre-transaction status guards (`throw APIError`) — they never reach the reversal block.

**L4 — Business rules:**
- `issueInvoice()` reads `taxAmount: invoice.taxAmount` (the persisted DB value from the fetched `invoice` object, line 443) — not from `req.body`. The old `req?.body?.taxAmount` in `createInvoice()` is only used to store the value at DRAFT creation, not at posting.
- `cancelInvoice()` `findUnique` at lines 333–339 includes `customer: { select: { id: true, code: true, ledgerId: true } }`, so `invoice.customer` is fully populated when passed to `reverseInvoice()`.
- `reverseInvoice()` is called AFTER `tx.invoice.update({ status: 'CANCELLED' })` (line 364 updates status; lines 382–390 call reversal) — order is correct.

**L5 — KB regression:**
- `postInvoice()` (lines 178–204) is completely unchanged; `transactionType: 'SALE'` confirmed.
- `postClientPayment()` (lines 242–259) and `recordPayment()` (lines 233–326) are untouched.
- No `postInvoice` call exists anywhere inside `createInvoice()`'s `prisma.$transaction` block (lines 104–139) — only invoice create, SO link, and customer credit update remain.
