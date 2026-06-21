## Meta

- id: invoice-preview
- title: Invoice preview before finalizing/printing
- type: feature
- status: DONE
- contract_version: 1
- last_updated: 2026-06-21

## 1 Requirement

Billing staff want to preview an invoice (`src/pages/Billing/InvoiceCard.jsx`, `InvoiceDetailDialog.jsx`) in its final, print-ready layout before committing to it, without leaving the Billing list. Today they only have the detail dialog with raw fields — there's no formatted "what will print/PDF" view.

Add a "Preview" action on each invoice (card and/or detail dialog) that opens a read-only, print-formatted view of the invoice — the same layout that would be printed/exported as PDF — so the user can check it looks correct before finalizing.

## 2 Contract

- Precedent: `src/components/LensPrint/PrintPreviewModal.jsx` already implements an in-app Dialog preview (separate from auto-print) for sale-order lens specs — follow this pattern rather than opening a new tab without auto-print.
- `src/pages/Billing/Billing.constants.js`: extract the existing HTML-string body of `printInvoice(invoice)` into a new exported helper `buildInvoiceHtml(invoice)` (returns the same full `<!DOCTYPE html>...</html>` string, unchanged markup/styles). `printInvoice(invoice)` becomes a thin wrapper: calls `buildInvoiceHtml`, opens the popup, writes, `.print()` — behavior unchanged, no regressions to existing Print button.
- New file `src/pages/Billing/InvoicePreviewDialog.jsx`: a Dialog (shadcn, matches `InvoiceDetailDialog.jsx` conventions) taking `{ invoice, open, onClose }`. Renders `buildInvoiceHtml(invoice)` inside an `<iframe srcDoc={...} />` (sized ~A4, scrollable container) so the embedded `@page`/`@media print` CSS stays isolated from app styles. Footer: "Print" button (`Printer` icon, calls `printInvoice(invoice)`, reuses existing function untouched) and "Close" button (`X` icon).
- `src/pages/Billing/InvoiceCard.jsx`: add a "Preview" button next to View/Pay/Quick Close, icon `FileText` (not `Eye` — `Eye` is already used for "View" raw-detail, reusing it would be ambiguous). New prop `onPreview(invoice)` passed down from parent list page.
- `src/pages/Billing/InvoiceDetailDialog.jsx`: add a "Preview" button in `DialogFooter`, placed before the existing "Print" button, same `FileText` icon, `variant="outline" size="sm"`, calling a new `onPreview(invoice)` prop (or local state toggling `InvoicePreviewDialog` directly, consistent with how `printInvoice`/`shareInvoice` are called inline today).
- Parent Billing list page (wherever `InvoiceCard`/`InvoiceDetailDialog` are composed, e.g. `src/pages/Billing.jsx`): add `previewInvoice` state (selected invoice) and render `<InvoicePreviewDialog invoice={...} open={...} onClose={...} />` alongside existing `InvoiceDetailDialog`/payment dialogs.
- No backend/API changes: the invoice object (with `customer`, `saleOrders`, `payments`) is already fully loaded client-side everywhere `printInvoice` is currently callable (confirmed via `InvoiceDetailDialog.jsx` line 185, which calls `printInvoice(invoice)` on the already-fetched `invoice` from `getInvoiceById`).

## 3 Test plan

### Changes made

- `src/pages/Billing/Billing.constants.js`: extracted the HTML-string body that was inline in `printInvoice(invoice)` into a new exported `buildInvoiceHtml(invoice)` (returns the identical `<!DOCTYPE html>...</html>` string — markup/styles untouched). `printInvoice(invoice)` is now a thin wrapper: `if (!invoice) return;` guard, `const html = buildInvoiceHtml(invoice);`, then the same `window.open` / `document.write` / `document.close` / `setTimeout(() => win.print(), 300)` sequence as before. No behavior change.
- `src/pages/Billing/InvoicePreviewDialog.jsx` (new): shadcn `Dialog` (pattern follows `src/components/LensPrint/PrintPreviewModal.jsx`) taking `{ invoice, open, onClose }`. Renders `buildInvoiceHtml(invoice)` inside an `<iframe srcDoc={html} />`, sized 210mm x 297mm (A4) inside a scrollable, centered `bg-gray-100` container, so the embedded `@page`/`@media print` CSS is isolated in the iframe document and never touches app styles. Footer has "Close" (`X` icon, `variant="outline"`) and "Print" (`Printer` icon, calls the existing untouched `printInvoice(invoice)`).
- `src/pages/Billing/InvoiceCard.jsx`: added `onPreview` prop; new "Preview" button (icon `FileText`, distinct from the existing `Eye` "View" button) placed first in the action row, before View/Pay/Quick Close.
- `src/pages/Billing/InvoiceDetailDialog.jsx`: added `onPreview` prop; new "Preview" button (`variant="outline" size="sm"`, icon `FileText`) added to `DialogFooter`, placed immediately before the existing "Print" button.
- `src/pages/Billing/BillingMain.jsx` (actual parent composing file — the contract's guess of `src/pages/Billing.jsx` was a separate, unrouted legacy file with its own self-contained copy of these components; the real, routed component is `BillingMain.jsx`, imported by `src/App.jsx` as `Billing`): added `previewInvoice` state, wired `onPreview={(inv) => setPreviewInvoice(inv)}` into both `InvoiceCard` (card view) and `InvoiceDetailDialog`, and rendered `<InvoicePreviewDialog invoice={previewInvoice} open={!!previewInvoice} onClose={() => setPreviewInvoice(null)} />` alongside the existing `CreateInvoiceDialog`/`InvoiceDetailDialog`/`RecordPaymentDialog`.
- `npx vite build` run: succeeded with 0 errors (pre-existing large-chunk warning only, unrelated to this change).

### Manual verification steps

1. Open Billing → Invoices tab → switch to Card view.
2. On any invoice card, click **Preview** (FileText icon). Confirm: a Dialog opens showing the formatted A4 invoice layout (header, Bill To, Sale Orders table, Payment History if any, Notes) rendered inside the iframe — and confirm the browser's native print dialog does NOT open.
3. Inside the preview dialog, click **Print**. Confirm this opens a new window/tab with the same invoice HTML and triggers the browser print dialog (via the unmodified `printInvoice` function) — i.e. preview and print are decoupled actions.
4. Click **Close** in the preview dialog. Confirm it dismisses cleanly with no print side effects and `previewInvoice` state resets (re-opening Preview on a different invoice shows the correct one).
5. Switch to Table view, click **View** on an invoice to open `InvoiceDetailDialog`. Click the new **Preview** button in the footer (before Print). Confirm the same `InvoicePreviewDialog` opens (stacked over the detail dialog) showing the formatted layout, without triggering print.
6. From within that stacked preview dialog, click **Print** — confirm it triggers the print popup/print dialog exactly as in step 3. Click **Close** — confirm only the preview dialog closes and the detail dialog remains open underneath.
7. Regression check: from `InvoiceDetailDialog`, click the original **Print** button directly (not via Preview). Confirm it behaves exactly as before the change — opens a new window with the invoice HTML and triggers `window.print()` after the same ~300ms delay, with no visual or markup differences in the printed output.
8. Regression check: confirm Share / WhatsApp / Issue Invoice / Record Payment / Quick Close / Cancel actions on both `InvoiceCard` and `InvoiceDetailDialog` are unaffected (button layout still renders correctly with the extra Preview button added).

## 4 Test results

- result: PASS
- rework_tag: —
- next: Ship as-is; no rework needed.

<findings>
Verified by reading code directly (not implementer summary):

1. Billing.constants.js: `buildInvoiceHtml` extraction confirmed byte-for-byte identical to the old printInvoice HTML body (diffed mentally and via `git diff`). `printInvoice` is now `if (!invoice) return;` → `buildInvoiceHtml(invoice)` → same `window.open("", "_blank")` / popup-blocked toast / `document.write` / `document.close` / `setTimeout(() => win.print(), 300)` sequence, unchanged. No regression.
2. InvoicePreviewDialog.jsx: renders `buildInvoiceHtml(invoice)` inside `<iframe srcDoc={html} />` (style-isolated, not innerHTML into app DOM) — matches contract. Handles null/undefined `invoice` gracefully: `html = invoice ? buildInvoiceHtml(invoice) : ""`, title guarded with `invoice ? ... : ""`, no crash. Print button calls real unmodified `printInvoice(invoice)`. Close button calls `onClose`.
3. InvoiceCard.jsx: new Preview button uses `FileText` icon, distinct from View's `Eye` icon. Calls `onPreview(invoice)` only — no print/navigation side effects. InvoiceDetailDialog.jsx: Preview button (`FileText`, `variant="outline" size="sm"`) placed immediately before the original Print button in DialogFooter, calls `onPreview(invoice)`.
4. BillingMain.jsx: `onPreview={(inv) => setPreviewInvoice(inv)}` wired to both InvoiceCard (card view) and InvoiceDetailDialog; `<InvoicePreviewDialog invoice={previewInvoice} open={!!previewInvoice} onClose={() => setPreviewInvoice(null)} />` rendered alongside other dialogs. Opening Preview from the detail dialog does not close the detail dialog (no `onClose()` call) — stacks as intended per test plan step 5, not a crash.
5. Original standalone Print button in InvoiceDetailDialog.jsx (line ~199) untouched — still calls `printInvoice(invoice)` directly, unaffected by the refactor.
6. Confirmed `src/pages/Billing.jsx` (legacy file) exists but App.jsx line 26 imports `Billing` from `./pages/Billing/BillingMain` (the routed component, line 163: `/billing` route). No file imports `src/pages/Billing.jsx`, and `git diff --stat` shows zero changes to it — implementer's claim verified true.
7. `npx vite build` succeeded: 3351 modules transformed, 0 errors, only the pre-existing >500kB chunk-size warning (unrelated).

Note: BillingMain.jsx diff also contains `quickCloseMutation`/`onQuickClose` wiring, which belongs to the separate already-DONE `invoice-quick-close` feature sharing this working tree (per session context) — not flagged as this feature's regression since it's explained by concurrent uncommitted work.

No regressions, no bugs found. PASS.
</findings>

## 5 Delivery note

**Shipped**: Invoices in Billing get a "Preview" action (card and detail dialog, `FileText` icon, distinct from the existing "View"/`Eye` button) that opens the print-ready layout in an in-app dialog (`InvoicePreviewDialog.jsx`, iframe `srcDoc` for style isolation) instead of immediately triggering the browser print dialog. A "Print" button inside the preview triggers the real, unchanged `printInvoice()`.

**Implementation**: extracted `printInvoice()`'s HTML body into `buildInvoiceHtml(invoice)` in `Billing.constants.js`; `printInvoice()` is now a thin wrapper, byte-for-byte same behavior — verified by QA with no regression to the existing standalone Print action.

**Side finding**: confirmed `src/pages/Billing.jsx` is dead/unrouted legacy code (App.jsx routes Billing through `BillingMain.jsx`) — left untouched, noted in KB-006 for future cleanup.

**No backend changes** — invoice data was already fully client-side loaded wherever Print already worked.
