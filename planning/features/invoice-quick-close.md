## Meta

- id: invoice-quick-close
- title: Faster invoice close/settle action
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

Closing an invoice today goes through `RecordPaymentDialog.jsx` / `InvoiceDetailDialog.jsx` in Billing, which the user finds too many steps for the common case of "fully paid, just close it." They want a one-click/easy-entry way to close an invoice directly from the Billing list (`InvoiceCard.jsx` / `BillingMain.jsx`) when there's nothing complex to record (e.g. full payment in one mode), reserving the full Record Payment dialog for partial/split payments.

Add a quick "Close Invoice" action on the invoice card/list that settles the invoice in one step for the simple full-payment case, without requiring the full Record Payment flow.

## 2 Contract

**No new backend endpoint, no schema change.** `invoiceService.recordPayment()` (`src/backend/services/invoiceService.js:221`) already handles the exact "full payment" path natively: it computes `newPaidAmount`, sets `status: 'PAID'` when `newPaidAmount >= totalAmount`, marks all linked sale orders `BILLED`, and writes the `Payment` row — all in one `$transaction`. General Ledger posting (`postClientPayment`) only runs if the caller passes `bankLedgerId`, which quick-close will omit (same as today's default Record Payment flow), so there is no ledger-duplication risk and nothing to reuse differently. The existing route `POST /api/invoices/:id/payments` (guard `requireRole({ module: 'Invoice', actions: ['create'] })`, `src/backend/routes/invoices.routes.js:208-212`) and existing frontend call `recordPayment(id, data)` (`src/services/invoice.js:42-43`) are reused verbatim — quick-close is purely a frontend UX shortcut that calls this same endpoint with sensible defaults and skips the dialog.

**Quick-close payload (defaults, no prompt):** `{ amount: invoice.totalAmount - invoice.paidAmount, method: "CASH", referenceNo: undefined, notes: "Quick close" }`. Date is implicit (server sets `Payment.createdAt`/`updatedAt` on insert; no client-supplied date field exists today). `method` defaults to `"CASH"` from `PAYMENT_METHODS` (`Billing.constants.js:32`) since it requires no reference number, matching `RecordPaymentDialog`'s own default state (`useState("CASH")`).

**UI guard conditions** — quick-close button/action only renders when invoice is eligible for one-shot settlement:
- `!["PAID", "CANCELLED"].includes(invoice.status)` (same guard already used for the "Pay" button in `InvoiceCard.jsx:82` and "Record Payment" in `InvoiceDetailDialog.jsx:212`).
- `invoice.paidAmount === 0` (no partial payment already in progress — if a previous part-payment exists, force the full dialog so the user sees payment history/mode choice instead of silently picking a mode for the remainder).
- `invoice.totalAmount - invoice.paidAmount > 0.01` (there is an actual remaining balance to settle).

**Files to touch:**
- `src/pages/Billing/InvoiceCard.jsx`: add a second action button "Quick Close" (icon `Zap` or `CheckCircle2` from `lucide-react`) next to "Pay", shown only when the guard above passes; calls a new `onQuickClose(invoice)` prop (no dialog).
- `src/pages/Billing/BillingMain.jsx`: add a `useMutation` wrapping `recordPayment` (mirroring the one inside `RecordPaymentDialog.jsx:34-44` — same `onSuccess` invalidations: `["invoices"]`, `["invoices-stats"]`, `["invoice", id]`, plus a `toast.success("Invoice closed")`); pass `onQuickClose={(inv) => quickCloseMutation.mutate({ id: inv.id, data: { amount: inv.totalAmount - inv.paidAmount, method: "CASH", notes: "Quick close" } })}` into `<InvoiceCard>` (around line 394-398, alongside the existing `onPay` prop).
- `src/pages/Billing/InvoiceDetailDialog.jsx`: optionally add the same quick-close button in the footer next to "Record Payment" (line ~214-223), reusing the identical mutation pattern, gated by the same guard plus `invoice.paidAmount === 0`.
- No changes to `src/backend/**`, `prisma/schema.prisma`, `src/services/invoice.js`, or `Billing.constants.js`.

## 3 Test plan

**Files changed:**
- `src/pages/Billing/InvoiceCard.jsx` — imports `Zap` from `lucide-react`; added `onQuickClose` prop; added `canQuickClose` guard (`!["PAID","CANCELLED"].includes(invoice.status) && invoice.paidAmount === 0 && remaining > 0.01`); renders an outline "Quick Close" button (`Zap` icon) next to "Pay", calling `onQuickClose(invoice)` directly with no dialog.
- `src/pages/Billing/BillingMain.jsx` — imports `useMutation`, `useQueryClient`, `recordPayment`; added `qc = useQueryClient()`; added `quickCloseMutation` (`recordPayment(id, data)`) with `onSuccess` invalidating `["invoices"]`, `["invoices-stats"]`, `["invoice", variables.id]` and `toast.success("Invoice closed")`, `onError` toasts the error; passes `onQuickClose={(inv) => quickCloseMutation.mutate({ id: inv.id, data: { amount: inv.totalAmount - inv.paidAmount, method: "CASH", notes: "Quick close" } })}` into `<InvoiceCard>` (card view) and into `<InvoiceDetailDialog>`.
- `src/pages/Billing/InvoiceDetailDialog.jsx` — imports `Zap`; added `onQuickClose` prop and `canQuickClose` guard (same three conditions); renders an outline "Quick Close" button in the footer next to "Record Payment", gated by `canQuickClose`, calling `onQuickClose(invoice)` directly (dialog stays open; underlying query invalidation refreshes the displayed invoice).
- No backend/schema files touched. `npx vite build` passes with no new errors/warnings (only pre-existing chunk-size warning).

**Manual verification steps:**
1. Start the app, go to Billing → Invoices tab → switch to Card view.
2. Find an invoice with status `ISSUED`/`DRAFT`/`PARTIALLY_PAID`-but-`paidAmount === 0` and `totalAmount > 0` outstanding. Confirm a "Quick Close" button (lightning icon) renders next to "Pay".
3. Open Network tab, click "Quick Close". Confirm a single `POST /api/invoices/:id/payments` request fires with body `{ amount: <totalAmount - paidAmount>, method: "CASH", notes: "Quick close" }` and no dialog/modal opens at any point.
4. Confirm response succeeds, toast shows "Invoice closed", and the invoice card status flips to `PAID` (badge updates) with Outstanding removed, paid amount equal to total, without a page reload (via query invalidation).
5. Open an already-`PAID` invoice and an already-`CANCELLED` invoice — confirm "Quick Close" does NOT render on either card.
6. Find/create an invoice with a prior partial payment (`paidAmount > 0`, status `PARTIALLY_PAID`) — confirm "Quick Close" does NOT render; only "Pay" (Record Payment) is shown.
7. Repeat steps 2–6 by opening `InvoiceDetailDialog` (click "View" on an eligible invoice) — confirm the "Quick Close" button appears in the footer next to "Record Payment" under the same guard, and clicking it closes the invoice without opening `RecordPaymentDialog`.
8. Confirm table view (non-card) is unchanged — no Quick Close button added there (out of contract scope).

## 4 Test results

- result: PASS
- rework_tag: —
- next: Merge / mark DONE — no rework needed.

Verified independently against source, not implementer summary:
- `InvoiceCard.jsx`: guard `!["PAID","CANCELLED"].includes(invoice.status) && invoice.paidAmount === 0 && remaining > 0.01` matches contract exactly; `Zap` icon, outline `size="sm" gap-1` `Button` consistent with existing "Pay"/"View" buttons; calls `onQuickClose(invoice)` with no dialog.
- `BillingMain.jsx`: `quickCloseMutation` calls `recordPayment(id, {amount: inv.totalAmount - inv.paidAmount, method: "CASH", notes: "Quick close"})`; `onSuccess` invalidates `["invoices"]`, `["invoices-stats"]`, `["invoice", variables.id]` (identical to `RecordPaymentDialog`'s mutation) plus `toast.success("Invoice closed")`; `onError` toasts `err?.message || "Failed to close invoice"` — no silent failure. Table view confirmed unchanged (Quick Close only wired into card view + detail dialog).
- `InvoiceDetailDialog.jsx`: identical guard (`canQuickClose`) and same `onQuickClose(invoice)` callback chain passed down from `BillingMain` — no divergent second implementation.
- Backend/schema isolation confirmed via `git diff`: `src/backend/services/invoiceService.js`, `src/backend/routes/invoices.routes.js`, `src/backend/controllers/invoiceController.js`, `src/services/invoice.js`, and `Billing.constants.js` all show zero diff for this feature. The `prisma/schema.prisma` diff present in the working tree (`VendorPaymentVoucher.closedStatus`/`closedAt`) belongs to the already-DONE `vendor-payment-receipt-voucher` feature per its own contract — unrelated to invoice-quick-close, not flagged.
- Traced `invoiceService.recordPayment` (`src/backend/services/invoiceService.js:221`): destructures `{ amount, method, referenceNo, notes, bankLedgerId }`; quick-close supplies `amount` + `method: "CASH"`, omits `bankLedgerId` and `referenceNo` (both optional) — `postClientPayment` (GL posting) only runs when `bankLedgerId` is truthy (line 280), so it's correctly skipped. No required field is missing; no runtime validation failure risk. `CASH` is a valid enum value per the swagger doc on the route.
- `npx vite build` — succeeded, 3350 modules transformed, only the pre-existing chunk-size warning (no new errors/warnings).
- Staleness check: `invoices`/`invoice` query data flows from `useQuery(["invoices", ...])` / `["invoice", id]` in `BillingMain`/`InvoiceDetailDialog`; mutation's `onSuccess` invalidates both keys, forcing a refetch so `InvoiceCard`/`InvoiceDetailDialog` re-render with fresh `invoice.status`/`paidAmount` post-close — guard will not flicker or show stale eligibility.

## 5 Delivery note

**Shipped**: Billing invoices get a one-click "Quick Close" action (in `InvoiceCard.jsx` and `InvoiceDetailDialog.jsx`) for the simple full-payment case, bypassing `RecordPaymentDialog` entirely.

- **No backend/schema changes** — reuses the existing `POST /invoices/:id/payments` endpoint with `{ amount: totalAmount - paidAmount, method: "CASH", notes: "Quick close" }`, omitting `bankLedgerId` so GL posting is skipped exactly like the default Record Payment flow does today.
- **Guard**: only shown when status isn't `PAID`/`CANCELLED`, no partial payment exists yet (`paidAmount === 0`), and there's an actual remaining balance — invoices with a payment history in progress still go through the full dialog so payment mode/history stays visible.
- **Verified**: QA independently traced the guard, the mutation's query invalidation, and the backend's `recordPayment` field requirements (no missing-field runtime risk); confirmed no backend/schema files were touched by this feature (correctly distinguished from the unrelated, already-DONE `vendor-payment-receipt-voucher` schema diff sitting in the same uncommitted tree). `npx vite build` clean.

**Scope note**: table (non-card) view intentionally has no Quick Close button — out of contract scope, card view and detail dialog only.
