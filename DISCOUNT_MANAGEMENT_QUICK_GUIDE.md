# Customer-Specific Discount Management - Quick Start Guide

## 🎯 What is it?
A system to apply **customer-specific** percentage discounts at three levels: Brand → Product → Coating

## 🔗 Access
Navigate to: **`/system/discount-management`**

## 🆕 What's New?
- ✅ **Customer-Specific Pricing** - Discounts apply only to selected customer
- ✅ **Original Prices Safe** - Standard prices remain unchanged
- ✅ **Price Mapping** - Uses PriceMapping table for custom pricing
- ✅ **Flexible Management** - Different prices for different customers

---

## 📊 Visual Guide

### Step 0: Select Customer (NEW!)
```
┌────────────────────────────────────────┐
│  👤 Select Customer *                  │
│  ┌──────────────────────────────────┐  │
│  │ ABC Opticals (C001) - Main Store│  │
│  └──────────────────────────────────┘  │
│                                        │
│  Status: ✅ Has Custom Pricing         │
└────────────────────────────────────────┘
```
**Must select customer before applying discounts!**

---

### Level 1: Brand Discount
```
┌────────────────────────────────────────┐
│  🏷️  ESSILOR                          │
│                                        │
│  Apply to all products: [10] %  💾    │
│                                        │
│  ▼ Expand to see products              │
└────────────────────────────────────────┘
```
**Effect:** All products and coatings under Essilor get 10% discount

---

### Level 2: Product Discount
```
┌─ ESSILOR ─────────────────────────────┐
│                                        │
│  └─ 📦 Single Vision 1.5              │
│       ESS-SV-15                        │
│       Apply to all coatings: [15] %   │
│       ▼ Expand to see coatings         │
│                                        │
└────────────────────────────────────────┘
```
**Effect:** All coatings for "Single Vision 1.5" get 15% discount

---

### Level 3: Coating Discount
```
┌─ ESSILOR ─────────────────────────────┐
│  └─ 📦 Single Vision 1.5              │
│       └─ 🔷 Blue Cut                  │
│            Original: ₹2500 → ₹2000    │
│            Discount: [20] %  -20%     │
│                                        │
└────────────────────────────────────────┘
```
**Effect:** Only "Blue Cut" coating on this specific product gets 20% discount

---

## 🎮 How to Use

### Step 1: Select Customer (REQUIRED!)
```
┌────────────────────────────────────────┐
│  👤 [Select Customer dropdown...]      │
└────────────────────────────────────────┘
```
**Important:** You MUST select a customer first. Discounts are customer-specific!

### Step 2: Search (Optional)
```
┌────────────────────────────────────────┐
│  🔍 [Search brands or products...]     │
└────────────────────────────────────────┘
```

### Step 3: Enter Discount
- Type discount percentage (0-100) in any level
- See instant price preview
- Multiple discounts can be entered at once

### Step 4: Save
```
┌────────────────────────────────────────┐
│  ⚠️ 3 unsaved changes                 │
│  [🔄 Reset]  [💾 Save Discounts]      │
└────────────────────────────────────────┘
```

---

## 💡 Examples

### Example 1: Seasonal Sale (Brand Level)
**Scenario:** 10% off on all Essilor products for ABC Opticals

1. Select customer: "ABC Opticals"
2. Find "Essilor" brand card
3. Enter `10` in "Apply to all products" field
4. Click "Save Discounts"
5. ✅ ABC Opticals gets 10% off on all Essilor products
6. ✅ Other customers still see standard prices

---

### Example 2: Clearance (Product Level)
**Scenario:** 25% off specific lens product for XYZ Vision

1. Select customer: "XYZ Vision"
2. Expand "Essilor" brand
3. Find "Progressive 1.67" product
4. Enter `25` in "Apply to all coatings" field
5. Click "Save Discounts"
6. ✅ XYZ Vision gets 25% off Progressive 1.67 coatings
7. ✅ Other customers see regular prices

---

### Example 3: Promotion (Coating Level)
**Scenario:** 30% off Blue Cut coating for Premium Eyes

1. Select customer: "Premium Eyes"
2. Expand Brand → Expand Product
3. Find "Blue Cut" coating row
4. Enter `30` in coating discount field
5. Click "Save Discounts"
6. ✅ Premium Eyes gets 30% off this specific coating
7. ✅ Other customers and other coatings unaffected

---

### ⚠️ Important Warnings

### 🔴 Customer-Specific Pricing Alert
```
╔════════════════════════════════════════╗
║  ✅  ORIGINAL PRICES ARE SAFE         ║
║                                        ║
║  Discounts create customer-specific   ║
║  prices in PriceMapping table         ║
║  Standard prices remain unchanged     ║
║  Only affects selected customer       ║
╚════════════════════════════════════════╝
```

### � How It Works
When you apply discounts:
1. System creates/updates records in **PriceMapping** table
2. Links: Customer + Product + Coating → Custom Price
3. **Original prices in LensPriceMaster unchanged**
4. **Other customers unaffected**

---

## 🔢 Discount Calculation

### Formula
```
New Price = Original Price - (Original Price × Discount ÷ 100)
```

### Example Calculation
```
Original Price:  ₹2,500.00
Discount:        20%
Calculation:     ₹2,500 - (₹2,500 × 20 ÷ 100)
                 = ₹2,500 - ₹500
New Price:       ₹2,000.00
Savings:         ₹500.00
```

---

## 🎯 Priority Rules

### When Multiple Discounts Applied
More specific discount takes priority:

```
Priority Hierarchy:
  1️⃣  Coating Level (highest priority)
  2️⃣  Product Level
  3️⃣  Brand Level (lowest priority)
```

### Example Scenario
```
Brand:    10% discount on Essilor
Product:  15% discount on Single Vision 1.5
Coating:  20% discount on Blue Cut

Result for Blue Cut coating:
  ✅ 20% applied (coating level wins)
  ❌ 15% ignored (product level)
  ❌ 10% ignored (brand level)
```

---

## 🛠️ Troubleshooting

### Problem: Discount not saving
**Solutions:**
- ✅ Check internet connection
- ✅ Verify you're logged in
- ✅ Ensure discount is between 0-100
- ✅ Check console for errors (F12)

### Problem: Wrong discount amount
**Solutions:**
- ✅ Check if multiple discounts applied
- ✅ Verify discount percentage entered correctly
- ✅ Refresh page and re-check

### Problem: Can't see products/coatings
**Solutions:**
- ✅ Click brand card to expand
- ✅ Ensure products exist for brand
- ✅ Check activeStatus of products
- ✅ Clear search filter

---

## 📋 Checklist: Before Applying Discounts

- [ ] Backup current price list
- [ ] Verify discount percentages
- [ ] Test on one product first
- [ ] Check affected record count
- [ ] Inform team about price changes
- [ ] Update marketing materials
- [ ] Verify with sample calculation

---

## 🔐 Permissions

### Who Can Apply Discounts?
Currently: All authenticated users

### Recommended Access Control
- **Admin:** Full access
- **Manager:** Apply up to 25% discount
- **Sales:** View only
- **Clerk:** No access

---

## 📞 Support

### Need Help?
1. Check this guide first
2. Review DISCOUNT_MANAGEMENT_SUMMARY.md
3. Contact system administrator
4. Check backend logs for errors

### Report Issues
Include:
- What you tried to do
- Discount level (brand/product/coating)
- Error message (if any)
- Screenshot of the issue

---

## ✨ Pro Tips

### 💡 Tip 1: Use Search
Don't scroll through hundreds of brands - use search box!
```
🔍 "essilor" → Shows only Essilor brand
🔍 "progressive" → Shows all progressive products
```

### 💡 Tip 2: Reset is Your Friend
Made mistakes? Click "Reset" before saving:
```
[🔄 Reset] ← Discards ALL unsaved changes
```

### 💡 Tip 3: Check Preview
Look at price preview before saving:
```
Original Price: ₹2500.00 → ₹2000.00
                           ↑
                    Check this first!
```

### 💡 Tip 4: Small Test First
Test with 1% discount on single product:
```
1. Apply 1% to one coating
2. Verify calculation correct
3. Then apply actual discounts
```

---

## 📊 Sample Workflow

### Weekly Promotion Setup
```
Monday:
  ✅ Backup current prices
  ✅ Plan discount strategy
  ✅ Get approval from manager

Tuesday:
  ✅ Apply discounts in system
  ✅ Test few products manually
  ✅ Verify in sale order

Wednesday-Sunday:
  ✅ Monitor sales
  ✅ Adjust if needed

Next Monday:
  ✅ Review results
  ✅ Reset or adjust discounts
```

---

## 🎓 Training Exercise

### Exercise 1: Brand Discount
1. Navigate to discount management
2. Find any brand (e.g., Essilor)
3. Apply 5% discount at brand level
4. Click save
5. Verify prices reduced by 5%

### Exercise 2: Product Discount
1. Expand Essilor brand
2. Find "Single Vision" product
3. Apply 10% discount at product level
4. Click save
5. Check only that product affected

### Exercise 3: Coating Discount
1. Expand brand and product
2. Find "Blue Cut" coating
3. Apply 15% discount
4. Click save
5. Verify only that coating affected

---

## 📈 Expected Results

### After Applying 10% Brand Discount for Customer ABC

```
Standard Prices (LensPriceMaster) - UNCHANGED:
  ├─ Product A: Coating 1 = ₹1000
  ├─ Product A: Coating 2 = ₹1500
  ├─ Product B: Coating 1 = ₹2000
  └─ Product B: Coating 2 = ₹2500

Customer ABC's Custom Prices (PriceMapping) - NEW:
  ├─ Product A: Coating 1 = ₹900   (-10%)
  ├─ Product A: Coating 2 = ₹1350  (-10%)
  ├─ Product B: Coating 1 = ₹1800  (-10%)
  └─ Product B: Coating 2 = ₹2250  (-10%)

Other Customers - See Standard Prices:
  ├─ Product A: Coating 1 = ₹1000  (unchanged)
  ├─ Product A: Coating 2 = ₹1500  (unchanged)
  ├─ Product B: Coating 1 = ₹2000  (unchanged)
  └─ Product B: Coating 2 = ₹2500  (unchanged)
```

---

**Need more help? Check DISCOUNT_MANAGEMENT_SUMMARY.md for detailed technical documentation.**
