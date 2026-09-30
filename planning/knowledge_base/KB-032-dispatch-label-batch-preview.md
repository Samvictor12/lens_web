# KB-032 — Dispatch label batch preview (EXE)

**Refs:** req-dispatch-label-batch-preview (2026-09-19)

## Behaviour

- **Cards first, then Barcodes** for a batch.
- Barcodes: **separate physical labels**, **Right then Left** per SO (only selected eyes).
- **EXE mode:** one in-app `DispatchLabelsPreviewModal` (Cards / Barcodes tabs) → confirm → print.
- **Chrome mode:** no in-app modal; system print dialog only (multi-page HTML for barcodes).
- **Mixed (A):** modal shows EXE types only; after Send, EXE jobs run then Chrome types.

## Entry points

- Ready for Dispatch → Print
- Create Dispatch (with Card/Barcode checked)
- DC view → Reprint Card / Reprint Barcode

## Code

- Plan/execute: `src/utils/dispatchLabelPrint.js` (`buildDispatchPrintPlan`, `executeDispatchPrintPlan`)
- Modal: `src/components/LensPrint/DispatchLabelsPreviewModal.jsx`
- EXE TSPL single-eye: `print_service/service.py` `_build_barcode_label_tspl`

## Note

- DC Customer Card layout still pending (placeholder in preview / 501 from EXE).
- Rebuild LensPrintService.exe after `service.py` changes; CORS must allow app origin.
