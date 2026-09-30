# KB-034 — DC Customer Barcode layout (card-like)

**Refs:** req-dispatch-barcode-card-design (2026-09-19)

## Spec

- Physical label **75 mm wide × 50 mm tall** (landscape, W×H).
- **Preview = print:** single **75×50** canvas (`renderBarcodeArtworkCanvas`) for Chrome and on-screen preview.
- Meta: lens / coating / category / **Customer name** (no Pt. Name on label).
- Rx table: **no cell borders** (card keeps bordered table); **fixed row height** (no vertical stretch).
- R then L = 2 pages / 2 labels.
- **Chrome dialog:** Headers & footers **OFF**, Margins **None**, scale **100%**, paper **75×50**. On-screen hint in print HTML.
- **EXE:** PIL `_render_barcode_label_image(75, 50)` → TSPL `SIZE 75 mm, 50 mm` + bitmap + `PRINT 1`.

## Code

- `src/utils/dispatchLabelPrint.js` — `paintBarcodeLabel`, `renderBarcodeArtworkCanvas`, `chromePrintBarcodeLabels`, `BARCODE_CHROME_PRINT_HINT`
- `src/utils/printHtmlDocument.js` — optional `waitForImages`
- `src/components/LensPrint/previews/BarcodeLabelPreview.jsx`
- `print_service/service.py` — `_build_barcode_label_tspl_bitmap`
