# Lens Enhancements & Fixes — Implementation Tasks

> Apply migration: `npx prisma migrate deploy` or `npx prisma migrate dev`
> Migration file: `prisma/migrations/20260624120000_lens_enhancements/migration.sql`

## 1. Database Schema & Seed
- [x] Add `LensIndexMaster` model + User relations
- [x] Add `index_id`, `add_extra_charge` to `LensProductMaster`; remove `index_value`
- [x] Add `brand_id`, `exchange_brand_id`, `coating_ids` to `LensOffers`
- [x] Add `EXCHANGE_BRAND_PRICE`, `COATING_PROMOTION` to `OfferType` enum
- [x] Create Prisma migration SQL
- [x] Update seed files (`1.56`, `1.59`, `1.61`, `1.67`, `1.74`)

## 2. Backend — Index Master
- [x] `lensIndexMasterService.js`
- [x] `lensIndexMasterController.js`
- [x] `lensIndexes.routes.js`
- [x] Register routes in `server.js`
- [x] DTO validators in `lensMastersDto.js`

## 3. Backend — Product & Offers
- [x] `lensProductMasterService.js` — `index_id`, `add_extra_charge`, `exactCode`/`exactName`
- [x] `lensOffersService.js` — brand fields, coating_ids, new offer types, `getApplicableOffers`

## 4. Frontend — Index Master
- [x] `src/services/lensIndex.js`
- [x] `LensIndexMaster` pages (Main, Form, Filter, Columns, constants)
- [x] Routes in `App.jsx` + sidebar in `AppSidebar.jsx`

## 5. Frontend — Product Form
- [x] `lensProduct.js` — mappers + exact uniqueness checks
- [x] `LensProductForm.jsx` — index dropdown, add extra charge, hide Addition for Single Vision

## 6. Frontend — Offers & Sale Order
- [x] `lensOffers.js` + `LensOffersForm.jsx` — new offer types & fields
- [x] `SaleOrderForm.jsx` — add charge, EXCHANGE_BRAND_PRICE, COATING_PROMOTION, EXCHANGE_PRODUCT fix

## 7. Scroll Fix
- [x] `AppLayout.jsx` + master page overflow normalization

## 8. Verification
- [x] `npm run build` passes
- [ ] `npm test` — vitest not installed in project (pre-existing)

## Manual steps for you
1. Run migration against your DB (drift detected on remote — review before reset):
   ```bash
   npx prisma migrate deploy
   ```
   Or apply the SQL in `prisma/migrations/20260624120000_lens_enhancements/migration.sql` manually.
2. Re-seed if needed: `npx prisma db seed`
