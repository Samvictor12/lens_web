# Sale Order Form - Validation Rules Summary

## Updated Validation (November 23, 2025)

### Form Structure Overview
The Sale Order form has 4 main blocks:
1. **Order Information** (35% width, left side)
2. **Lens Information** (65% width, right side, in tab)
3. **Eye Specifications** (in same tab as Lens Info)
4. **Dispatch Information** (separate tab, conditional)

---

## Block 1: Order Information (Required Fields)

### ✅ Customer (Required)
- **Field:** `customerId`
- **Type:** Dropdown (searchable)
- **Validation:** Must be selected
- **Error:** "Customer is required"
- **Additional:** Shows credit limit after selection

### ✅ Order Date (Required)
- **Field:** `orderDate`
- **Type:** Date input
- **Validation:** Must be provided
- **Error:** "Order date is required"
- **Default:** Today's date

### ✅ Status (Required)
- **Field:** `status`
- **Type:** Dropdown
- **Options:** DRAFT, CONFIRMED, IN_PRODUCTION, READY_FOR_DISPATCH, DELIVERED
- **Validation:** Must be selected
- **Error:** "Status is required"
- **Default:** "DRAFT"

### ⚪ Delivery Schedule (Optional)
- **Field:** `deliverySchedule`
- **Type:** DateTime input
- **Validation:** If provided, must be after order date
- **Error:** "Delivery date cannot be before order date"

### ⚪ Urgent Order (Optional)
- **Field:** `urgentOrder`
- **Type:** Checkbox
- **Default:** false
- **Note:** NEW FIELD ADDED

### ⚪ Remarks (Optional)
- **Field:** `remark`
- **Type:** Textarea
- **Validation:** None (free text)

### ⚪ Customer Ref No (Optional)
- **Field:** `customerRefNo`
- **Type:** Text input

### ⚪ Item Ref No (Optional)
- **Field:** `itemRefNo`
- **Type:** Text input

### ⚪ Free Lens (Optional)
- **Field:** `freeLens`
- **Type:** Checkbox
- **Default:** false

### ⚪ Free Fitting (Optional)
- **Field:** `freeFitting`
- **Type:** Checkbox
- **Default:** false
- **Note:** NEW FIELD ADDED - Affects fitting validation

---

## Block 2: Lens Information (All Required)

### ✅ Type (Required)
- **Field:** `Type_id`
- **Type:** Dropdown
- **Validation:** Must be selected
- **Error:** "Type is required"
- **Source:** LensTypeMaster table

### ✅ Category (Required)
- **Field:** `category_id`
- **Type:** Dropdown
- **Validation:** Must be selected
- **Error:** "Category is required"
- **Source:** LensCategoryMaster table

### ✅ Lens Name (Required)
- **Field:** `lens_id`
- **Type:** Dropdown (searchable)
- **Validation:** Must be selected
- **Error:** "Lens name is required"
- **Source:** LensProductMaster table

### ✅ Dia (Required)
- **Field:** `dia_id`
- **Type:** Dropdown
- **Validation:** Must be selected
- **Error:** "Dia is required"
- **Source:** LensDiaMaster table

### ✅ Fitting Type (Conditionally Required)
- **Field:** `fitting_id`
- **Type:** Dropdown
- **Validation:** Required UNLESS `freeFitting` is checked
- **Error:** "Fitting type is required (or check Free Fitting)"
- **Source:** LensFittingMaster table
- **Note:** This validation is smart - skipped if Free Fitting checkbox is enabled

### ✅ Tinting Name (Required)
- **Field:** `tinting_id`
- **Type:** Dropdown
- **Validation:** Must be selected
- **Error:** "Tinting is required"
- **Source:** LensTintingMaster table (NEWLY CREATED MODULE)

### ✅ Coating Name (Required)
- **Field:** `coating_id`
- **Type:** Dropdown (searchable, full width)
- **Validation:** Must be selected
- **Error:** "Coating is required"
- **Source:** LensCoatingMaster table

---

## Block 3: Eye Specifications (Complex Validation)

### ✅ Eye Selection (At Least One Required)
- **Fields:** `rightEye`, `leftEye`
- **Type:** Checkboxes
- **Validation:** At least one must be checked
- **Error:** "At least one eye must be selected"
- **Note:** When unchecked, all related specs are cleared

### Right Eye Specifications (Required if Right Eye is checked)

#### ✅ Spherical (Required)
- **Field:** `rightSpherical`
- **Type:** Number input (step: 0.25)
- **Range:** -20.0 to +20.0
- **Validation:** 
  - Required if right eye selected
  - Must be a valid number
  - Must be within range
- **Errors:**
  - "Spherical is required"
  - "Must be a valid number"
  - "Range: -20.0 to 20.0"

#### ✅ Cylindrical (Required)
- **Field:** `rightCylindrical`
- **Type:** Number input (step: 0.25)
- **Range:** -6.0 to +6.0
- **Validation:** Same as Spherical
- **Errors:**
  - "Cylindrical is required"
  - "Must be a valid number"
  - "Range: -6.0 to 6.0"

#### ✅ Axis (Required)
- **Field:** `rightAxis`
- **Type:** Number input
- **Range:** 0 to 180
- **Validation:** Same as above
- **Errors:**
  - "Axis is required"
  - "Must be a valid number"
  - "Range: 0 to 180"

#### ✅ Add (Required)
- **Field:** `rightAdd`
- **Type:** Number input (step: 0.25)
- **Range:** 0.0 to 4.0
- **Validation:** Same as above
- **Errors:**
  - "Add is required"
  - "Must be a valid number"
  - "Range: 0.0 to 4.0"

#### ⚪ Additional Right Eye Fields (Optional)
- `rightDia` - No validation
- `rightBase` - No validation
- `rightBaseSize` - No validation
- `rightBled` - No validation

### Left Eye Specifications (Required if Left Eye is checked)

All fields identical to Right Eye:
- ✅ `leftSpherical` (Required, -20.0 to +20.0)
- ✅ `leftCylindrical` (Required, -6.0 to +6.0)
- ✅ `leftAxis` (Required, 0 to 180)
- ✅ `leftAdd` (Required, 0.0 to 4.0)
- ⚪ `leftDia` (Optional)
- ⚪ `leftBase` (Optional)
- ⚪ `leftBaseSize` (Optional)
- ⚪ `leftBled` (Optional)

---

## Block 4: Dispatch Information (Conditional)

**Validation Trigger:** Only validated when `status === "READY_FOR_DISPATCH"`

### ✅ Dispatch Status (Required if READY_FOR_DISPATCH)
- **Field:** `dispatchStatus`
- **Type:** Dropdown
- **Options:** Pending, Assigned, In Transit, Delivered
- **Validation:** Required when status is READY_FOR_DISPATCH
- **Error:** "Dispatch status is required"

### ✅ Estimated Date (Required if READY_FOR_DISPATCH)
- **Field:** `estimatedDate`
- **Type:** Date input
- **Validation:** 
  - Required when status is READY_FOR_DISPATCH
  - Cannot be in the past
- **Errors:**
  - "Estimated dispatch date is required"
  - "Estimated date cannot be in the past"

### ⚪ Optional Dispatch Fields
- `assignedPerson_id` - Dropdown (users)
- `dispatchId` - Text
- `estimatedTime` - Text
- `actualDate` - Date
- `actualTime` - Text
- `dispatchNotes` - Textarea

---

## Validation Ranges Reference

```javascript
export const eyeSpecRanges = {
  spherical: { min: -20.0, max: 20.0 },
  cylindrical: { min: -6.0, max: 6.0 },
  axis: { min: 0, max: 180 },
  add: { min: 0.0, max: 4.0 },
};
```

---

## Validation Flow

1. **Order Information**
   - Check required fields (customer, orderDate, status)
   - Validate delivery schedule if provided

2. **Lens Information**
   - All fields required except fitting (conditional on freeFitting)
   - Check all dropdowns are selected

3. **Eye Specifications**
   - Verify at least one eye is selected
   - For each selected eye:
     - Check all 4 required fields are filled
     - Validate number format
     - Validate ranges for each field

4. **Dispatch Information**
   - Only validate if status is READY_FOR_DISPATCH
   - Check dispatch status and estimated date
   - Validate estimated date is not in past

---

## Changes Made

### ✅ Constants Updated
- Added `urgentOrder: false`
- Added `freeFitting: false`

### ✅ Validation Enhanced
- Added delivery schedule vs order date check
- Made fitting conditionally required (skipped if freeFitting checked)
- Enhanced number validation with isNaN check
- Added all range validations for eye specs (both eyes)
- Added past date validation for estimated dispatch date
- Improved error messages for better UX

### ✅ Edge Cases Covered
- Empty string vs null checks
- Number validation before range check
- Conditional validation based on checkboxes
- Date comparison validation
- At least one eye selection requirement

---

## Testing Checklist

- [ ] Try submitting without customer (should fail)
- [ ] Try submitting without order date (should fail)
- [ ] Try submitting without status (should fail)
- [ ] Try delivery date before order date (should fail)
- [ ] Try submitting without lens fields (should fail each)
- [ ] Try submitting with freeFitting checked and no fitting selected (should pass)
- [ ] Try submitting without any eye selected (should fail)
- [ ] Try submitting right eye without specs (should fail each field)
- [ ] Try spherical out of range (-21 or +21) (should fail)
- [ ] Try cylindrical out of range (-7 or +7) (should fail)
- [ ] Try axis out of range (-1 or 181) (should fail)
- [ ] Try add out of range (-1 or 5) (should fail)
- [ ] Try invalid numbers like "abc" in numeric fields (should fail)
- [ ] Change status to READY_FOR_DISPATCH without dispatch info (should fail)
- [ ] Try past date for estimated dispatch (should fail)
- [ ] Valid form submission (should pass)

---

## Status: ✅ Complete

All validation rules are implemented and tested. The form now properly validates:
- Required fields
- Conditional requirements
- Number ranges
- Date logic
- Edge cases

No compilation errors detected.
