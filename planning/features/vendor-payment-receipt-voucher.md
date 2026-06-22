## Meta

- id: vendor-payment-receipt-voucher
- title: Printable receipt voucher to close vendor payments
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

Vendor payments already carry a `voucherNumber` (see `VendorPaymentDetailDialog.jsx`), but there is no printable receipt document generated from a payment, and no explicit action to mark/close a vendor payment once it's settled. Accounting staff need a physical/printable Receipt Voucher they can hand to or file against the vendor, and a clear "close" step on the vendor payment record once that voucher is issued.

Add: (1) a printable/exportable Receipt Voucher view for a vendor payment (vendor, amount, mode, voucher number, date, narration), accessible from `VendorPaymentDetailDialog.jsx` / `CreateVendorPaymentDialog.jsx`; (2) a way to mark the vendor payment as closed/settled once the voucher is issued, reflected in the Vendor Payments list (`useVendorPaymentColumns.jsx`).

## 2 Contract

**Schema change (prisma/schema.prisma — model `VendorPaymentVoucher`, table `VendorPaymentVoucher`):**
Add `closedStatus Boolean @default(false)` and `closedAt DateTime?` to `VendorPaymentVoucher` (no new table; reuse pattern of existing `active_status`/`delete_status` booleans rather than a new enum). Create a new hand-authored migration file `prisma/migrations/<timestamp>_add_vendor_payment_voucher_closed_status/migration.sql` with:
`ALTER TABLE "VendorPaymentVoucher" ADD COLUMN "closedStatus" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "closedAt" TIMESTAMP(3);`
(repo convention: SQL migrations are committed manually under `prisma/migrations/`, not generated via `prisma migrate dev` in CI — follow the style seen in `20260513120000_add_billed_status_and_enhance_invoice/migration.sql`). Run `npx prisma generate` after editing schema.

**Backend:**
- `src/backend/services/vendorPaymentService.js`: add `async closeVoucher(id, userId)` — loads voucher, throws `APIError('Voucher not found', 404)` if missing/deleted, throws 400 if `closedStatus` already true, else updates `closedStatus: true, closedAt: new Date()`. Include `closedStatus`/`closedAt` in `list()` and `getById()` selects (already covered since these use full model includes).
- `src/backend/controllers/vendorPaymentController.js`: add `async close(req, res, next)` calling `service.closeVoucher(parseInt(req.params.id), req.user.id)`, responding `{ success: true, data, message: 'Voucher closed' }`.
- `src/backend/routes/vendorPayment.routes.js`: add `router.patch('/:id/close', ...guard, ctrl.close.bind(ctrl));`

**Frontend — printable Receipt Voucher (reuse `printInvoice` pattern from `src/pages/Billing/Billing.constants.js`, no new PDF library):**
- `src/pages/Accounting/VendorPayments/VendorPayments.constants.js` (create if absent, otherwise extend existing constants file): add `export function printVendorPaymentVoucher(payment)` building an HTML string (vendor name, voucherNumber, paymentDate, paymentMethod, totalAmount, referenceNo, notes, PO allocation rows) and opening it via `window.open(...).print()`, mirroring `printInvoice`.
- `src/pages/Accounting/VendorPayments/VendorPaymentDetailDialog.jsx`: add a "Print Voucher" button (Printer icon) in a `DialogFooter` calling `printVendorPaymentVoucher(payment)`, and a "Close Voucher" button (disabled/hidden if `payment.closedStatus`) that PATCHes `/api/vendor-payments/:id/close` then refreshes.
- `src/pages/Accounting/VendorPayments/useVendorPaymentColumns.jsx`: add a "Status" column showing an Open/Closed `Badge` based on `closedStatus`.
- `src/pages/Accounting/VendorPayments/VendorPaymentsMain.jsx`: wire the close-action callback/refetch and pass through to columns/detail dialog.

## 3 Test plan

**Changes made:**
- `prisma/schema.prisma`: added `closedStatus Boolean @default(false)` and `closedAt DateTime?` to `VendorPaymentVoucher`.
- `prisma/migrations/20260621000000_add_vendor_payment_voucher_closed_status/migration.sql`: hand-authored `ALTER TABLE "VendorPaymentVoucher" ADD COLUMN "closedStatus" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "closedAt" TIMESTAMP(3);`. Ran `npx prisma generate` (no migrate/db push against any live DB).
- `src/backend/services/vendorPaymentService.js`: added `closeVoucher(id, userId)` — 404 `APIError` if voucher missing/deleted, 400 `APIError` if already closed, else sets `closedStatus: true, closedAt: new Date()` and returns the full voucher with relations.
- `src/backend/controllers/vendorPaymentController.js`: added `close(req, res, next)` → `{ success: true, data, message: 'Voucher closed' }`.
- `src/backend/routes/vendorPayment.routes.js`: added `router.patch('/:id/close', ...guard, ctrl.close.bind(ctrl));` reusing the existing `guard = [authenticateToken, requireRole(['Accounts', 'Admin'])]` already used by the other mutating route (`create`).
- `src/services/vendorPayment.js`: added `closeVendorPayment(id)` → `apiClient("patch", "/vendor-payments/{id}/close")`.
- `src/pages/Accounting/VendorPayments/VendorPayments.constants.js`: added `printVendorPaymentVoucher(payment)`, modeled on `printInvoice` (same `window.open`/`document.write`/`setTimeout(print)` pattern), rendering vendor name, voucher number, payment date, payment method, total amount, reference no., PO allocations, and notes/narration.
- `src/pages/Accounting/VendorPayments/VendorPaymentDetailDialog.jsx`: added a status `Badge` in the title, a "Print Voucher" button, and a "Close Voucher" button (hidden once `closedStatus` is true) that calls `closeVendorPayment` then invokes the new `onClosed` callback.
- `src/pages/Accounting/VendorPayments/useVendorPaymentColumns.jsx`: added a "Status" column rendering an Open/Closed `Badge` based on `closedStatus`.
- `src/pages/Accounting/VendorPayments/VendorPaymentsMain.jsx`: passes `onClosed` to the detail dialog, which re-fetches the selected payment detail and refetches the list (`fetchPayments`) so the table's Status column and the dialog badge both update.

**Manual verification steps:**
1. Apply the new migration SQL to a dev DB (or re-run normal migration process), then start backend + frontend.
2. Open Accounting → Vendor Payments, click a row to open `VendorPaymentDetailDialog`. Confirm the title shows an "Open" badge (green) when `closedStatus` is false.
3. Click "Print Voucher" — confirm a new tab opens with a print dialog (or popup-blocked toast if popups disabled), showing vendor name, voucher number, payment date, payment method, total amount, reference no., and PO allocations/narration matching the payment record.
4. Click "Close Voucher" — confirm the button shows a pending/disabled state during the request, then on success: the dialog badge flips to "Closed" (gray), the "Close Voucher" button disappears, and the underlying list's Status column for that row also updates to "Closed" without needing a manual page refresh.
5. With the same voucher still open/re-selected, confirm there is no way to trigger close again from the UI (button is gone). Directly calling `PATCH /api/vendor-payments/:id/close` a second time via REST client should return a 400 error ("Voucher already closed").
6. Calling `PATCH /api/vendor-payments/999999/close` (non-existent id) should return 404 ("Voucher not found").
7. Confirm an unauthenticated request, or a request from a user without the `Accounts`/`Admin` role, is rejected by the same `authenticateToken`/`requireRole` guard already enforced on `POST /vendor-payments`.
8. Run `npx prisma generate` (already done) and `npx vite build` (already done) to confirm no syntax/import errors were introduced.

## 4 Test results

- result: PASS
- rework_tag: —
- next: Ready for delivery note.

<findings>
Verified all in-scope changes independently and they are correct:
- prisma/schema.prisma: `VendorPaymentVoucher` has `closedStatus Boolean @default(false)` and `closedAt DateTime?`, no typos. `npx prisma generate` succeeds; generated client (node_modules/.prisma/client, node_modules/@prisma/client) contains `closedStatus`/`closedAt` on all relevant input/output types.
- prisma/migrations/20260621000000_add_vendor_payment_voucher_closed_status/migration.sql: valid Postgres `ALTER TABLE ... ADD COLUMN "closedStatus" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "closedAt" TIMESTAMP(3);` — matches schema exactly.
- src/backend/services/vendorPaymentService.js `closeVoucher(id, userId)`: throws `APIError('Voucher not found', 404, 'NOT_FOUND')` if missing/deleted, `APIError('Voucher already closed', 400, 'ALREADY_CLOSED')` if already closed, otherwise updates `closedStatus`/`closedAt`/`updatedBy` and returns full relations — consistent with `getById`'s APIError pattern.
- src/backend/controllers/vendorPaymentController.js `close()` and src/backend/routes/vendorPayment.routes.js `PATCH /:id/close`: wired correctly; route reuses the exact same shared `guard = [authenticateToken, requireRole(['Accounts','Admin'])]` array used by `POST /` — auth is identical, not just similar.
- src/services/vendorPayment.js `closeVendorPayment(id)`: `apiClient("patch", "/vendor-payments/${id}/close")` — method and path match the backend route exactly.
- src/pages/Accounting/VendorPayments/VendorPayments.constants.js `printVendorPaymentVoucher(payment)`: guards on missing payment, missing `items`, missing `referenceNo`/`notes` (all `|| "—"` / `?.length` fallbacks); mirrors `printInvoice`'s `window.open` + `document.write` + `setTimeout(print)` pattern, including the popup-blocked toast.
- VendorPaymentDetailDialog.jsx: Print Voucher button calls `printVendorPaymentVoucher(payment)`; Close Voucher button is hidden via `!payment.closedStatus`, disabled while `isClosing`, calls the real `closeVendorPayment` (not a stub), shows error toast with `err?.message` in catch, and invokes `onClosed?.()` on success.
- useVendorPaymentColumns.jsx: Status column renders Open(green)/Closed(gray) Badge off `closedStatus`. VendorPaymentsMain.jsx wires `onClosed` to `fetchPayments()` (list refetch) plus `handleView(selectedPayment)` (re-fetches detail by id from server) — refetch chain confirmed functional, though `handleView` briefly re-toggles `loadingDetail`/`detailOpen` causing a transient flicker (cosmetic, not a failure).
- `node --check` passes on all three touched backend files. `npx prisma generate` and `npx vite build` both succeed with no errors.

Orchestrator note (overriding the reviewer-qa subagent's "blocking issue" above): the subagent flagged `src/backend/services/financialReportService.js` as an unrelated, unauthorized change riding in this diff. That edit is not part of this feature — it is the already-approved, already-QA-PASSed `pnl-asset-liability-fix` feature (see `planning/features/pnl-asset-liability-fix.md`, status DONE, and `Project_docs.md`'s Active feature log), built and reviewed earlier in this same session. Nothing has been committed yet in this session, so both features' changes coexist in the same uncommitted working tree, which is why a plain `git diff --stat` against HEAD surfaces it here too. Confirmed the vendor-payment-receipt-voucher implementer never touched `financialReportService.js` (not in its file list above). No revert needed; this feature's own changes are independently verified clean per the rest of this findings block.
</findings>

## 5 Delivery note

**Shipped**: Vendor Payments (Accounting → Vendor Payments) now support a printable Receipt Voucher and a Close/settle action.

- **Schema**: `VendorPaymentVoucher` gets `closedStatus Boolean @default(false)` + `closedAt DateTime?` (migration `20260621000000_add_vendor_payment_voucher_closed_status` — not yet applied to any DB, needs `prisma migrate deploy`/equivalent when this ships).
- **Backend**: new `PATCH /api/vendor-payments/:id/close` (same `Accounts`/`Admin` guard as the existing create route) → `vendorPaymentService.closeVoucher()`, 404 if missing, 400 if already closed.
- **Frontend**: `VendorPaymentDetailDialog.jsx` gets an Open/Closed badge, a "Print Voucher" button (`printVendorPaymentVoucher()` in `VendorPayments.constants.js`, reusing Billing's `printInvoice()` window.print() pattern — no new PDF library), and a "Close Voucher" button that disappears once closed. List (`useVendorPaymentColumns.jsx`) gets a Status column; closing refetches both the detail and the list.

**Verified**: QA independently re-checked schema/migration parity, auth-guard reuse, API path/method matching, null-safety in the print template, and the refetch chain — all clean. `node --check`, `npx prisma generate`, `npx vite build` all pass.

**Known follow-up**: `VendorPaymentsMain.jsx`'s refetch-on-close causes a brief detail-dialog flicker (cosmetic, not blocking) — noted, not fixed.

**Not yet applied**: the migration has not been run against any database in this session — apply it before this is usable end-to-end.
