# Enhanced Price Calculation Implementation

## Overview
Implemented comprehensive price calculation for sale orders that includes:
- Base lens pricing
- Extra charges for out-of-range sphere/cylinder values
- Coating, tinting, and fitting prices
- Free lens and free fitting deductions
- Discount percentage from customer business category
- Detailed price breakdown UI

## Implementation Details

### 1. New Service Functions (`src/services/saleOrder.js`)

Added three new API service functions:

```javascript
// Get lens product details including min/max ranges and extra charges
export const getLensProductById = async (lensId)

// Get fitting details including fitting price
export const getFittingById = async (fittingId)

// Get tinting details including tinting price
export const getTintingById = async (tintingId)
```

### 2. Enhanced `handleCalculatePrice` Function

The function now performs the following steps:

#### Step 1: Fetch Lens Product Details
- Retrieves lens product with sphere/cylinder ranges
- Gets `sphere_min`, `sphere_max`, `sphere_extra_charge`
- Gets `cyl_min`, `cyl_max`, `cylinder_extra_charge`

#### Step 2: Calculate Base Lens Price
- Fetches price from `LensPriceMaster` (lens + coating combination)
- Multiplies by number of eyes selected (right, left, or both)

#### Step 3: Calculate Extra Charges
Checks each eye specification against product ranges:

**Right Eye - Sphere:**
- If `rightSpherical > sphere_max` OR `rightSpherical < sphere_min`
- Add `sphere_extra_charge`

**Left Eye - Sphere:**
- If `leftSpherical > sphere_max` OR `leftSpherical < sphere_min`
- Add `sphere_extra_charge`

**Right Eye - Cylinder:**
- If `rightCylindrical > cyl_max` OR `rightCylindrical < cyl_min`
- Add `cylinder_extra_charge`

**Left Eye - Cylinder:**
- If `leftCylindrical > cyl_max` OR `leftCylindrical < cyl_min`
- Add `cylinder_extra_charge`

#### Step 4: Get Tinting Price
- If `tinting_id` is selected, fetch `tinting_price` from `LensTintingMaster`

#### Step 5: Get Fitting Price
- If `fitting_id` is selected AND `freeFitting` is false
- Fetch `fitting_price` from `LensFittingMaster`
- If `freeFitting` is true, fitting price is set to 0

#### Step 6: Calculate Subtotal
```
Subtotal = Base Lens Price + Extra Charges + Coating Price + Tinting Price + Fitting Price
```

Note: Coating price is included in the base lens price (from `LensPriceMaster`), so we don't add it separately.

#### Step 7: Apply Free Lens Deduction
- If `formData.freeLens` is checked
- `freeLensDeduction = baseLensPrice`

#### Step 8: Apply Free Fitting Deduction
- If `formData.freeFitting` is checked
- `freeFittingDeduction = fittingPrice`

#### Step 9: Calculate Subtotal After Deductions
```
Subtotal After Deductions = Subtotal - Free Lens Deduction - Free Fitting Deduction
```

#### Step 10: Get Discount Percentage
- Fetches from customer's business category via `calculateProductCost` API
- Falls back to form data if API call fails

#### Step 11: Calculate Final Total
```
Discount Amount = (Subtotal After Deductions × Discount Percentage) / 100
Final Total = Subtotal After Deductions - Discount Amount
```

### 3. Price Breakdown UI

Updated the pricing card to show detailed breakdown:

```
Base Lens Price:              ₹X,XXX.XX
  + Right Eye Sphere Extra:   ₹XXX.XX (if applicable)
  + Left Eye Sphere Extra:    ₹XXX.XX (if applicable)
  + Right Eye Cylinder Extra: ₹XXX.XX (if applicable)
  + Left Eye Cylinder Extra:  ₹XXX.XX (if applicable)
Extra Charges Total:          ₹XXX.XX
Tinting Price:                ₹XXX.XX
Fitting Price:                ₹XXX.XX
Additional Prices:            ₹XXX.XX (if any)
─────────────────────────────────────
Subtotal:                     ₹X,XXX.XX
Less: Free Lens              -₹X,XXX.XX (if applicable)
Less: Free Fitting           -₹XXX.XX (if applicable)
Less: Discount (XX%)         -₹XXX.XX
─────────────────────────────────────
Total Amount:                 ₹X,XXX.XX
```

### 4. State Management

Added new state for price breakdown:
```javascript
const [priceBreakdown, setPriceBreakdown] = useState(null);
```

The breakdown object contains:
```javascript
{
  baseLensPrice: 0,
  extraCharges: {
    rightSphere: 0,
    leftSphere: 0,
    rightCylinder: 0,
    leftCylinder: 0,
    total: 0
  },
  coatingPrice: 0,
  tintingPrice: 0,
  fittingPrice: 0,
  subtotal: 0,
  freeLensDeduction: 0,
  freeFittingDeduction: 0,
  subtotalAfterDeductions: 0,
  discountPercentage: 0,
  discountAmount: 0,
  finalTotal: 0
}
```

## Database Schema Dependencies

### LensProductMaster
```prisma
model LensProductMaster {
  sphere_min            Float?
  sphere_max            Float?
  sphere_extra_charge   Float?  @default(0)
  cyl_min               Float?
  cyl_max               Float?
  cylinder_extra_charge Float?  @default(0)
  ...
}
```

### LensPriceMaster
```prisma
model LensPriceMaster {
  lens_id     Int
  coating_id  Int
  price       Float   // Base price for lens + coating
  ...
}
```

### LensFittingMaster
```prisma
model LensFittingMaster {
  fitting_price Float?
  ...
}
```

### LensTintingMaster
```prisma
model LensTintingMaster {
  tinting_price Float?
  ...
}
```

## Example Calculation

### Scenario:
- Customer: Premium customer with 10% discount
- Lens: "Premium Progressive" (base price: ₹2000 per eye)
- Coating: "Anti-reflective" (included in lens price)
- Both eyes selected
- Right Eye Specifications:
  - Spherical: +6.00 (exceeds max of +4.00, extra charge: ₹500)
  - Cylindrical: -2.50 (exceeds max of -2.00, extra charge: ₹300)
- Left Eye Specifications:
  - Spherical: -3.00 (within range)
  - Cylindrical: -1.00 (within range)
- Tinting: "Photochromic" (₹800)
- Fitting: "Standard" (₹200)
- Free Lens: No
- Free Fitting: No

### Calculation:
```
Base Lens Price:              ₹4,000.00  (₹2000 × 2 eyes)
Extra Charges:
  Right Eye Sphere Extra:     ₹500.00
  Right Eye Cylinder Extra:   ₹300.00
  Total Extra Charges:        ₹800.00
Tinting Price:                ₹800.00
Fitting Price:                ₹200.00
─────────────────────────────────────
Subtotal:                     ₹5,800.00
Less: Discount (10%):        -₹580.00
─────────────────────────────────────
Final Total:                  ₹5,220.00
```

### With Free Lens and Free Fitting:
```
Subtotal:                     ₹5,800.00
Less: Free Lens:             -₹4,000.00
Less: Free Fitting:          -₹200.00
Subtotal After Deductions:    ₹1,600.00
Less: Discount (10%):        -₹160.00
─────────────────────────────────────
Final Total:                  ₹1,440.00
```

## Testing

### Manual Testing Steps:
1. Login to the system (admin/demo123)
2. Navigate to Sale Orders > Create Sale Order
3. Fill in the required fields:
   - Select a customer
   - Select both right and left eye
   - Enter sphere/cylinder values that exceed the lens product ranges
   - Select coating
   - Select tinting
   - Select fitting
4. Click "Calculate Price" button
5. Verify the price breakdown shows:
   - Base lens price
   - Extra charges (if specs exceed ranges)
   - Tinting price
   - Fitting price
   - Subtotal
   - Deductions (if free lens/fitting checked)
   - Discount
   - Final total

### Expected Behavior:
- ✅ Price calculation button is disabled until customer, lens, and coating are selected
- ✅ Extra charges appear only when sphere/cylinder values exceed product ranges
- ✅ Tinting price appears only when tinting is selected
- ✅ Fitting price appears only when fitting is selected and free fitting is not checked
- ✅ Free lens deduction equals the base lens price
- ✅ Free fitting deduction equals the fitting price
- ✅ Discount is applied to subtotal after deductions
- ✅ All prices are displayed in ₹X,XXX.XX format
- ✅ UI updates in real-time when selections change

## Files Modified

1. `src/services/saleOrder.js` - Added new service functions
2. `src/pages/SaleOrder/SaleOrderForm.jsx` - Enhanced price calculation and UI

## API Endpoints Used

- `GET /api/v1/lens-products/:id` - Get lens product details
- `GET /api/v1/lens-products/:id/prices` - Get lens prices
- `GET /api/v1/lens-fittings/:id` - Get fitting details
- `GET /api/v1/lens-tintings/:id` - Get tinting details
- `POST /api/sale-orders/calculate-costing` - Get customer discount

## Notes

1. The coating price is NOT added separately because `LensPriceMaster` already includes the lens + coating combination price
2. Extra charges are per-eye, so if both eyes exceed the range, the extra charge is applied twice
3. Free lens deduction is applied to the base lens price only, not to the extra charges or other components
4. Free fitting deduction is applied to the fitting price only
5. Discount percentage comes from the customer's business category mapping
6. The UI maintains backward compatibility - if `priceBreakdown` is null, it falls back to the old calculation

## Future Enhancements

Potential improvements:
1. Add GST/tax calculation
2. Add support for different extra charge rates per range tier
3. Add bulk discount for multiple pairs
4. Add seasonal/promotional discounts
5. Add price history tracking
6. Add price comparison across different lens products
