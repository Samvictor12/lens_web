# KB-031 — Ready for Dispatch order card fields

**Refs:** req-ready-dispatch-order-fields (2026-09-19)

## Pattern

- Ready list cards show: SO (`orderNo`), SO date (`orderDate`), Customer ref (`customerRefNo`), Patient ref (`itemRefNo`), Lens category (`category.name` → fallback `lensProduct.category.name`), Lens name (`lensProduct.lens_name`).
- Do **not** use `lensProduct.name` — master field is `lens_name`.
- `SALE_ORDER_INCLUDE` must include `category` + `lensProduct.category` for the ready API.

## Reuse

- Same field map for other dispatch order summaries.
