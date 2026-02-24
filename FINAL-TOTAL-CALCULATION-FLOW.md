# Price Calculation Flow - Final Total

## Complete Calculation Formula

The **Final Total** is calculated through multiple steps to ensure all components, extra charges, and deductions are properly included:

### Step-by-Step Calculation:

#### 1️⃣ **Base Components**
```
Base Lens Price = Lens Price per eye × Number of eyes selected
```
- Example: If lens costs ₹2,000 per eye and both eyes selected = ₹4,000

#### 2️⃣ **Extra Charges** (Added to base)
```
Extra Charges = 
  Right Eye Sphere Extra (if out of range) +
  Left Eye Sphere Extra (if out of range) +
  Right Eye Cylinder Extra (if out of range) +
  Left Eye Cylinder Extra (if out of range)
```
- Each charge is added only if the specification exceeds the lens product's min/max range
- Example: Right sphere exceeds max = +₹500, Right cylinder exceeds = +₹300 = ₹800 total

#### 3️⃣ **Additional Components**
```
Tinting Price = Selected tinting price (or 0 if none)
Fitting Price = Selected fitting price (or 0 if none/free fitting)
```

#### 4️⃣ **Initial Subtotal**
```
Subtotal = Base Lens Price + Extra Charges + Tinting Price + Fitting Price
```
- Example: ₹4,000 + ₹800 + ₹600 + ₹200 = ₹5,600

#### 5️⃣ **Free Lens Deduction** (if applicable)
```
Free Lens Deduction = Base Lens Price (if freeLens checkbox is checked)
                    = 0 (if unchecked)
```
- Example: If checked, deduct ₹4,000

#### 6️⃣ **Free Fitting Deduction** (if applicable)
```
Free Fitting Deduction = Fitting Price (if freeFitting checkbox is checked)
                       = 0 (if unchecked)
```
- Example: If checked, deduct ₹200

#### 7️⃣ **Subtotal After Deductions**
```
Subtotal After Deductions = Subtotal - Free Lens Deduction - Free Fitting Deduction
```
- Example: ₹5,600 - ₹4,000 - ₹200 = ₹1,400

#### 8️⃣ **Discount Calculation**
```
Discount Amount = (Subtotal After Deductions × Discount Percentage) ÷ 100
```
- Discount percentage comes from customer's business category
- Example: ₹1,400 × 10% = ₹140

#### 9️⃣ **FINAL TOTAL** ✅
```
FINAL TOTAL = Subtotal After Deductions - Discount Amount
```
- Example: ₹1,400 - ₹140 = **₹1,260**

---

## Complete Example

### Scenario:
- **Base Lens**: ₹2,000/eye × 2 eyes = **₹4,000**
- **Extra Charges**:
  - Right Eye Sphere Extra: **₹500** (sphere +6.00 exceeds max +4.00)
  - Right Eye Cylinder Extra: **₹300** (cylinder -2.50 exceeds max -2.00)
  - Total Extra: **₹800**
- **Tinting**: Photochromic = **₹600**
- **Fitting**: Standard = **₹200**
- **Free Lens**: ✅ Checked
- **Free Fitting**: ✅ Checked
- **Customer Discount**: 10%

### Calculation:
```
1. Base Lens Price:              ₹4,000.00
2. Extra Charges:                ₹  800.00
3. Tinting Price:                ₹  600.00
4. Fitting Price:                ₹  200.00
   ─────────────────────────────────────
   Subtotal:                     ₹5,600.00

5. Less: Free Lens              -₹4,000.00
6. Less: Free Fitting           -₹  200.00
   ─────────────────────────────────────
   Subtotal After Deductions:    ₹1,400.00

7. Less: Discount (10%)         -₹  140.00
   ─────────────────────────────────────
   FINAL TOTAL:                  ₹1,260.00
```

---

## Important Notes:

✅ **What IS included in Final Total:**
- Base lens price (adjusted for number of eyes)
- ALL extra charges for out-of-range specifications
- Tinting price (if selected)
- Fitting price (if selected and not free)
- Additional manual prices (if any added)

✅ **What IS deducted from Final Total:**
- Free lens amount (entire base lens price)
- Free fitting amount (entire fitting price)
- Discount percentage (applied to subtotal after deductions)

❌ **What is NOT separately added:**
- Coating price (already included in base lens price from LensPriceMaster)

---

## Code Reference:

In `SaleOrderForm.jsx`, the calculation happens in the `handleCalculatePrice` function:

```javascript
// Step 7: Calculate subtotal
breakdown.subtotal = 
    breakdown.baseLensPrice + 
    breakdown.extraCharges.total + 
    breakdown.coatingPrice + 
    breakdown.tintingPrice + 
    breakdown.fittingPrice;

// Step 8-9: Apply deductions
if (formData.freeLens) {
    breakdown.freeLensDeduction = breakdown.baseLensPrice;
}
if (formData.freeFitting && formData.fitting_id) {
    breakdown.freeFittingDeduction = fittingPrice;
}

// Step 10: Subtotal after deductions
breakdown.subtotalAfterDeductions = 
    breakdown.subtotal - 
    breakdown.freeLensDeduction - 
    breakdown.freeFittingDeduction;

// Step 12: Final total
breakdown.discountAmount = (breakdown.subtotalAfterDeductions * breakdown.discountPercentage) / 100;
breakdown.finalTotal = breakdown.subtotalAfterDeductions - breakdown.discountAmount;
```

---

## Testing Your Calculation:

To verify the calculation is working:

1. Open browser console (F12)
2. Create a sale order
3. Fill in all details
4. Click "Calculate Price"
5. Check console for detailed breakdown:

```
=== PRICE CALCULATION BREAKDOWN ===
Base Lens Price: 4000
Extra Charges: 800
Tinting Price: 600
Fitting Price: 200
Subtotal: 5600
Free Lens Deduction: 4000
Free Fitting Deduction: 200
Subtotal After Deductions: 1400
Discount Percentage: 10
Discount Amount: 140
FINAL TOTAL: 1260
=====================================
```

The Final Total shown in the UI should match the console log! ✨
