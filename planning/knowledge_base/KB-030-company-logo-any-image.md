# KB-030 — Company logo any-image upload (1 MB)

**Refs:** req-company-logo-any-image (2026-09-19)

## Pattern

- Settings Company Logo: accept any `image/*` (plus extension fallback). **≤1 MB keep original** (PNG alpha intact). **>1 MB** canvas resize (max edge ~800px), export PNG or smaller WebP — never force JPEG.
- Stored budget 1 MB binary; backend data-URL string cap ~`ceil(1MB * 4/3) + 256`. Express JSON/urlencoded **2mb** so base64 save succeeds.
- Util: `src/utils/companyLogo.js` → `prepareCompanyLogo`.

## Reuse

- Same optimize helper for other base64 image fields if needed.
