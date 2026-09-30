# KB-033 — DC Customer Card layout (84×55)

**Refs:** req-dc-customer-card-layout (2026-09-19)

## Spec

- Size **84 × 55 mm**; **top 7 mm blank** (pre-printed thank line); fill remaining area with larger text.
- `Lens name: Name [index]` (name only if no index); `Coating:`; `Category:`; **`Customer name:`** (shop customer); **`Pt. Name:`** (`itemRefNo`, `-` if empty).
- QR top-right = **orderNo** (size unchanged); Rx table full width; FH = Dia.
- Add column only Bifocal/Progressive when any Add present.
- **No software 180°** — print artwork upright; user loads **card upside down** in Evolis
  (180° rotate in code/CSS is commented out; may recheck later).
- Preview matches print layout (both upright on screen).

## Code

- Payload + Chrome HTML: `src/utils/customerCardPrint.js`
- Preview: `src/components/LensPrint/previews/AuthenticityCardPreview.jsx`
- EXE image print: `print_service/service.py` (`_render_customer_card_image`, `_print_pil_image`)
- Requires `qrcode` in print_service; rebuild EXE after change.
