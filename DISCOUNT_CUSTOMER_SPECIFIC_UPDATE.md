# Customer-Specific Discount Management - Update Summary

## 🎯 What Changed?

The discount management system has been **upgraded** to support **customer-specific discounts** instead of global price modifications.

### Before vs After

#### ❌ BEFORE (Global Discounts)
- Discounts modified the `LensPriceMaster` table directly
- Changes affected **ALL customers**
- Original prices were lost
- No customer-specific pricing

#### ✅ AFTER (Customer-Specific Discounts)
- Discounts create/update entries in `PriceMapping` table
- Changes affect **ONLY the selected customer**
- Original prices remain intact in `LensPriceMaster`
- Full customer-specific pricing support

---

## 🔄 How It Works Now

### Step 1: Select Customer
```
┌──────────────────────────────────────────┐
│  👤 Select Customer *                    │
│  ┌────────────────────────────────────┐  │
│  │ ABC Opticals (C001) - Main Store  │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Status: ✅ Has Custom Pricing           │
│  or                                      │
│  Status: 📋 Standard Pricing             │
└──────────────────────────────────────────┘
```

### Step 2: System Checks Price Mapping

**Scenario A: Customer HAS Price Mapping**
```
Customer: ABC Opticals
Status: ✅ Has Custom Pricing

Displays:
- Custom prices from PriceMapping table
- Customer-specific discounted prices
- Apply further discounts to these prices
```

**Scenario B: Customer DOES NOT HAVE Price Mapping**
```
Customer: XYZ Vision
Status: 📋 Standard Pricing

Displays:
- Standard prices from LensPriceMaster table
- Catalog/base prices
- Apply discounts to create custom pricing
```

### Step 3: Apply Discounts

When you apply discounts:
1. System calculates: `New Price = Current Price - (Current Price × Discount%)`
2. Creates/updates records in `PriceMapping` table
3. Links: `Customer ID + LensPrice ID → Discounted Price`

---

## 📊 Database Structure

### PriceMapping Table
```sql
PriceMapping {
  id                INT
  customer_id       INT  → CustomerMaster
  lensPrice_id      INT  → LensPriceMaster
  discounted_price  DECIMAL(10,2)
  createdBy         INT
  updatedBy         INT
  createdAt         TIMESTAMP
  updatedAt         TIMESTAMP
  deleteStatus      BOOLEAN
  activeStatus      BOOLEAN
}
```

### Data Flow
```
┌─────────────────────┐
│  LensPriceMaster    │  ← Original/Standard Prices (unchanged)
│  (Base Prices)      │
└──────────┬──────────┘
           │
           │ Referenced by
           │
           ▼
┌─────────────────────┐
│  PriceMapping       │  ← Customer-Specific Prices
│  (Custom Prices)    │
└──────────┬──────────┘
           │
           │ For specific
           │
           ▼
┌─────────────────────┐
│  CustomerMaster     │
└─────────────────────┘
```

---

## 🎮 Usage Examples

### Example 1: New Customer - First Time Discount

**Customer:** New Vision Optical (No existing price mapping)

**Action:**
1. Select "New Vision Optical"
2. System shows: "📋 Standard Pricing"
3. System displays standard catalog prices
4. Apply 10% discount on "Essilor" brand
5. Click "Save Discounts"

**Result:**
- PriceMapping records created for all Essilor products
- Customer now has custom pricing
- Standard prices unchanged for other customers

### Example 2: Existing Customer - Additional Discount

**Customer:** ABC Opticals (Has existing price mapping)

**Action:**
1. Select "ABC Opticals"
2. System shows: "✅ Has Custom Pricing"
3. System displays customer's custom prices
4. Apply additional 5% discount on specific product
5. Click "Save Discounts"

**Result:**
- PriceMapping records updated with new prices
- Discount applied to already-discounted prices
- Only this customer affected

### Example 3: Brand-Level Discount

**Customer:** Premium Eyes

**Discount Applied:**
- Brand: Essilor → 15%

**What Happens:**
```
Before (Standard Prices):
  Essilor Single Vision 1.5
    ├─ Blue Cut: ₹2,500
    ├─ Anti-Glare: ₹2,200
    └─ UV Protection: ₹2,800

After (Customer-Specific Prices for Premium Eyes):
  Essilor Single Vision 1.5
    ├─ Blue Cut: ₹2,125 (15% off)
    ├─ Anti-Glare: ₹1,870 (15% off)
    └─ UV Protection: ₹2,380 (15% off)

Other Customers:
  Still see ₹2,500, ₹2,200, ₹2,800 (unchanged)
```

---

## 🔧 API Changes

### 1. Get Discount Hierarchy (Updated)

**Endpoint:** `GET /api/v1/lens-products/discount-hierarchy/:customerId`

**Parameters:**
- `customerId` (path parameter, required)

**Response:**
```json
{
  "success": true,
  "message": "Discount hierarchy retrieved successfully",
  "data": {
    "brands": [ /* hierarchical data */ ],
    "hasPriceMapping": true,
    "customer": {
      "id": 1,
      "code": "C001",
      "name": "ABC Opticals",
      "shopname": "Main Store"
    }
  }
}
```

**Key Changes:**
- Now requires `customerId` parameter
- Returns `hasPriceMapping` flag
- Returns customer information
- Prices reflect customer-specific pricing if available

### 2. Apply Discounts (Updated)

**Endpoint:** `POST /api/v1/lens-products/apply-discounts`

**Request Body:**
```json
{
  "customerId": 1,
  "discounts": [
    {
      "type": "brand",
      "brandId": 1,
      "discount": 10
    }
  ]
}
```

**Key Changes:**
- Now requires `customerId` field
- Creates/updates PriceMapping records instead of modifying LensPriceMaster
- Returns customer information in response

---

## 🎨 UI Changes

### New Customer Selection Component

**Location:** Top of the page, before brand hierarchy

**Features:**
- Searchable dropdown with all customers
- Shows customer code, name, and shop name
- Displays pricing status badge:
  - "Has Custom Pricing" (blue) - Customer has price mappings
  - "Standard Pricing" (gray) - Customer uses catalog prices

### Updated Info Card

Now displays customer-specific information:
```
Customer: ABC Opticals

• Brand level: Applies to all products and coatings under the brand
• Product level: Applies to all coatings for that specific product  
• Coating level: Applies to that specific coating only

Note: Discounts will be applied to customer-specific prices
      (or create custom pricing if using standard prices)
```

### Empty State

When no customer is selected:
```
┌──────────────────────────────────────┐
│           👤                         │
│                                      │
│  Please select a customer            │
│  to manage discounts                 │
│                                      │
│  Choose a customer from the          │
│  dropdown above to view and          │
│  apply discounts                     │
└──────────────────────────────────────┘
```

---

## ✅ Benefits of Customer-Specific Discounts

### 1. **Safe Price Management**
- Original prices never modified
- Can experiment with discounts safely
- Easy to revert by deleting PriceMapping records

### 2. **Customer Flexibility**
- Different prices for different customers
- Volume discounts for loyal customers
- Promotional pricing for new customers

### 3. **Audit Trail**
- Track who applied discounts
- See when discounts were applied
- Customer-specific pricing history

### 4. **No Impact on Other Customers**
- Discounts only affect selected customer
- Other customers see standard prices
- No accidental global price changes

---

## 🔄 Migration Notes

### If You Have Existing Global Discounts

**Problem:** Previous system modified LensPriceMaster directly

**Solution:**
1. **Backup current prices** before using new system
2. **Create price mappings** for existing customers with special pricing
3. **Restore standard prices** in LensPriceMaster table
4. **Apply customer-specific discounts** using new system

### SQL to Restore Standard Prices (if needed)

```sql
-- Backup current prices first!
CREATE TABLE LensPriceMaster_backup AS 
SELECT * FROM LensPriceMaster;

-- Restore from backup or manual update
-- Then use the UI to create customer-specific discounts
```

---

## 📝 Important Notes

### ⚠️ Breaking Changes

1. **API Signature Changed**
   - `getDiscountHierarchy()` now requires `customerId`
   - `applyDiscounts()` now requires `customerId` as first parameter

2. **Frontend Requires Customer Selection**
   - Cannot apply discounts without selecting customer
   - Old routes without customer selection will not work

### 🔐 Permissions

- Same authentication required
- Consider adding role-based restrictions:
  - Who can apply discounts for which customers?
  - Maximum discount percentage limits per role

### 📊 Reporting Considerations

- Sale orders should use PriceMapping prices when available
- Reports should distinguish between standard and custom pricing
- Price history should track customer-specific changes

---

## 🧪 Testing Checklist

### Test Scenario 1: New Customer
- [ ] Select customer without price mapping
- [ ] Verify standard prices displayed
- [ ] Apply brand-level discount
- [ ] Verify PriceMapping records created
- [ ] Verify standard prices unchanged

### Test Scenario 2: Existing Customer
- [ ] Select customer with price mapping
- [ ] Verify custom prices displayed
- [ ] Apply additional discount
- [ ] Verify PriceMapping records updated
- [ ] Verify other customers unaffected

### Test Scenario 3: Multiple Discount Levels
- [ ] Apply brand discount (10%)
- [ ] Apply product discount (15%)  
- [ ] Apply coating discount (20%)
- [ ] Verify correct prices calculated
- [ ] Verify all PriceMapping records correct

### Test Scenario 4: Search and Filter
- [ ] Search for specific brand
- [ ] Search for specific product
- [ ] Verify filtered results correct
- [ ] Apply discount to filtered items
- [ ] Verify correct items affected

---

## 📁 Files Modified

### Frontend
- ✅ `src/pages/DiscountManagement/DiscountManagement.jsx`
  - Added customer selection state
  - Added customer dropdown UI
  - Updated API calls to include customerId
  - Added price mapping status display

### Backend
- ✅ `src/backend/routes/lensProducts.routes.js`
  - Updated route to include :customerId parameter
  - Updated request body schema

- ✅ `src/backend/controllers/lensProductMasterController.js`
  - Updated getDiscountHierarchy to extract customerId
  - Updated applyDiscounts to validate and pass customerId

- ✅ `src/backend/services/lensProductMasterService.js`
  - Rewrote getDiscountHierarchy to support customer-specific pricing
  - Rewrote applyDiscounts to create/update PriceMapping records
  - Added upsertPriceMapping helper method

---

## 🚀 Next Steps

### Immediate
1. Test with sample customer
2. Verify price mappings created correctly
3. Check sale order integration

### Short Term
1. Add bulk discount import from Excel
2. Add discount approval workflow
3. Add discount history view

### Long Term
1. Add customer group discounts
2. Add time-based discount campaigns
3. Add discount analytics dashboard

---

**Version:** 2.0.0  
**Date:** November 28, 2024  
**Status:** ✅ Customer-Specific Discounts Implemented
