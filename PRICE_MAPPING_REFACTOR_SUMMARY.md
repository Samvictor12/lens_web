# Price Mapping Refactor Summary

## Date: November 15, 2025

## Overview
Successfully refactored the PriceMapping API to change its relationship from `LensProductMaster` to `LensPriceMaster` and added automatic discount price calculation.

---

## Changes Made

### 1. Database Schema Changes (`prisma/schema.prisma`)

#### PriceMapping Model Updates:
- **Changed Foreign Key**: `lensProduct_id` → `lensPrice_id`
- **Changed Relation**: References `LensPriceMaster` instead of `LensProductMaster`
- **Added New Field**: `discountPrice` (Float, default: 0)
  - Automatically calculated as: `basePrice - (basePrice × discountRate / 100)`
- **Updated Index**: `lensProduct_id` → `lensPrice_id`

#### LensProductMaster Model Updates:
- **Removed Relation**: Removed `priceMappings` relationship

#### LensPriceMaster Model Updates:
- **Added Relation**: Added `priceMappings PriceMapping[]` relationship

**Migration**: `20251115060618_change_price_mapping_to_lens_price_master_and_add_discount_price`

---

### 2. Controller Updates (`src/backend/controllers/priceMappingController.js`)

#### Changes in All Methods:
- Updated validation to check for `lensPrice_id` instead of `lensProduct_id`
- Updated error messages to reflect the new field name
- No breaking changes to API signatures

---

### 3. Service Updates (`src/backend/services/priceMappingService.js`)

#### `bulkCreatePriceMappings()`:
- Changed validation from `LensProductMaster` to `LensPriceMaster`
- Added automatic `discountPrice` calculation
- Fetches base price from `LensPriceMaster` before creating mappings
- Formula: `discountPrice = basePrice - (basePrice × discountRate / 100)`
- Updated include statements to return `lensPrice` with nested `lens` and `coating` data

#### `bulkUpdatePriceMappings()`:
- Added fetching of lens prices for recalculation
- Automatically recalculates `discountPrice` when discount rate is updated
- Updates both `discountRate` and `discountPrice` fields
- Updated response structure to include `lensPrice` data

#### `getPriceMappings()`:
- Changed query parameter from `lensProduct_id` to `lensPrice_id`
- Updated search to work with nested `lensPrice.lens` structure
- Updated include to return full lens price master data with coating

#### `getPriceMappingsByCustomer()`:
- Updated include statements for new relationship structure
- Returns `lensPrice` with nested lens and coating information

#### `getPriceMappingById()`:
- Updated to return `lensPrice` instead of `lensProduct`
- Includes full lens and coating details

#### `bulkUpsertPriceMappings()`:
- Changed from `lensProduct_id` to `lensPrice_id`
- Added validation for lens prices existence
- Calculates `discountPrice` for both create and update operations
- Updated to work with `LensPriceMaster` base prices

---

### 4. Routes Updates (`src/backend/routes/priceMappings.routes.js`)

#### Swagger Documentation Updates:
- Updated schema definition to include `discountPrice` field
- Changed `lensProduct_id` to `lensPrice_id` in all endpoint documentation
- Added description for automatic discount price calculation
- Updated query parameter documentation
- Added notes about automatic calculation

---

### 5. Documentation Updates (`PRICE_MAPPING_API_DOCS.md`)

#### Major Documentation Changes:
- Updated model structure to show `lensPrice_id` and `discountPrice`
- Added explanation of automatic price calculation
- Updated all request/response examples
- Changed all references from `lensProduct` to `lensPrice`
- Added notes about nested `lens` and `coating` data in responses
- Updated validations section
- Enhanced best practices with price calculation notes
- Updated database indexes documentation
- Modified all code examples and curl commands

---

## Key Features

### Automatic Discount Price Calculation
The system now automatically calculates and stores the discounted price whenever:
1. A new price mapping is created
2. An existing price mapping's discount rate is updated
3. Price mappings are upserted

**Formula**: 
```javascript
discountPrice = basePrice - (basePrice × discountRate / 100)
```

**Example**:
- Base Price: ₹2500
- Discount Rate: 10%
- Calculated Discount Price: ₹2250 (2500 - 250)

---

## Benefits

1. **More Granular Control**: Price mappings now work at the lens+coating level instead of just lens level
2. **Performance**: Pre-calculated `discountPrice` eliminates need for runtime calculation
3. **Data Consistency**: Discount prices are stored and updated automatically
4. **Better Structure**: Aligns with the actual pricing model (LensPriceMaster)
5. **Richer Data**: Responses now include both lens product and coating information

---

## Breaking Changes

### API Request Changes:
- `lensProduct_id` → `lensPrice_id` in all request bodies
- Clients must update their API calls to use the new field name

### Response Structure Changes:
```javascript
// OLD Structure
{
  lensProduct_id: 5,
  lensProduct: {
    id: 5,
    product_code: "LP-001",
    lens_name: "Progressive Lens"
  }
}

// NEW Structure
{
  lensPrice_id: 5,
  discountPrice: 2250,  // NEW FIELD
  lensPrice: {
    id: 5,
    price: 2500,        // Base price
    lens: {             // Nested lens data
      id: 3,
      product_code: "LP-001",
      lens_name: "Progressive Lens"
    },
    coating: {          // NEW: Coating data
      id: 2,
      name: "Anti-Reflection",
      short_name: "AR"
    }
  }
}
```

---

## Migration Guide for Frontend/API Consumers

### 1. Update Request Bodies:
```javascript
// BEFORE
{
  customer_id: 1,
  mappings: [
    { lensProduct_id: 5, discountRate: 10 }
  ]
}

// AFTER
{
  customer_id: 1,
  mappings: [
    { lensPrice_id: 5, discountRate: 10 }
  ]
}
```

### 2. Update Response Handling:
```javascript
// BEFORE
const lensName = mapping.lensProduct.lens_name;

// AFTER
const lensName = mapping.lensPrice.lens.lens_name;
const coatingName = mapping.lensPrice.coating.name;
const discountPrice = mapping.discountPrice;
```

### 3. Update Query Parameters:
```javascript
// BEFORE
GET /api/price-mappings?lensProduct_id=5

// AFTER
GET /api/price-mappings?lensPrice_id=5
```

---

## Testing Checklist

- [x] Schema migration applied successfully
- [x] Prisma Client regenerated
- [x] All controller methods updated
- [x] All service methods updated
- [x] All route documentation updated
- [x] API documentation updated
- [x] No syntax errors in code
- [ ] Test bulk create with discount price calculation
- [ ] Test bulk update with price recalculation
- [ ] Test bulk upsert functionality
- [ ] Test all query endpoints with new field names
- [ ] Verify nested lens and coating data in responses
- [ ] Test error handling for non-existent lens prices

---

## Database Impact

### New Field:
- `PriceMapping.discountPrice` (Float) - Stores pre-calculated discount price

### Renamed Field:
- `PriceMapping.lensProduct_id` → `PriceMapping.lensPrice_id`

### Index Changes:
- Old index on `lensProduct_id` removed
- New index on `lensPrice_id` added

---

## Next Steps

1. **Backend Testing**: Test all API endpoints with the new structure
2. **Frontend Updates**: Update any frontend code that uses the PriceMapping API
3. **Data Migration**: If there's existing data, create a script to migrate old mappings
4. **Performance Testing**: Verify query performance with new relationship structure
5. **Documentation Review**: Ensure all team members are aware of the changes

---

## Files Modified

1. `prisma/schema.prisma` - Database schema
2. `src/backend/controllers/priceMappingController.js` - Controller logic
3. `src/backend/services/priceMappingService.js` - Service layer with calculations
4. `src/backend/routes/priceMappings.routes.js` - API routes and Swagger docs
5. `PRICE_MAPPING_API_DOCS.md` - Complete API documentation
6. `PRICE_MAPPING_REFACTOR_SUMMARY.md` - This summary document

---

## Support

For questions or issues related to this refactor, please refer to:
- API Documentation: `PRICE_MAPPING_API_DOCS.md`
- Schema Documentation: `prisma/schema.prisma`
- This Summary: `PRICE_MAPPING_REFACTOR_SUMMARY.md`
