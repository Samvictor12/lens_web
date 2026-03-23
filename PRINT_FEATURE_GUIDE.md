# Lens Specification Print Feature Documentation

## Overview
This feature allows users to create a sale order and immediately print lens specification details on an A5 sheet, or print specifications for existing orders.

## Components Created

### 1. **LensSpecificationPrint.jsx**
- **Location:** `src/components/LensPrint/LensSpecificationPrint.jsx`
- **Purpose:** Renders the lens specification in A5 format
- **Features:**
  - Two-column layout for Left and Right eye specifications
  - Displays: Spherical, Cylinder, Axis, Addition values
  - Shows coating information if enabled
  - Professional formatting suitable for A5 printing (148mm × 210mm)
  - Header with order number and date
  - Footer with print timestamp

### 2. **PrintPreviewModal.jsx**
- **Location:** `src/components/LensPrint/PrintPreviewModal.jsx`
- **Purpose:** Modal dialog showing print preview and controlling print operations
- **Features:**
  - Preview window showing scaled A5 layout
  - Three action buttons:
    - **Print**: Opens browser print dialog
    - **Confirm & Close**: Completes the print workflow
    - **Cancel**: Closes without changes
  - Responsive design for various screen sizes

### 3. **SaleOrderForm.jsx (Updated)**
- **Updates Made:**
  - Added `isPrintModalOpen`, `isPrinting`, and `printActionMode` state variables
  - Implemented `handleCreateAndPrint` function
  - Implemented `handlePrintOrder` function for existing orders
  - Implemented `closePrintModal` and `handlePrintConfirm` functions
  - Added "Print" button for view mode
  - Updated "Create & Print" button (previously disabled)
  - Integrated `PrintPreviewModal` component

## How to Use

### Creating and Printing a New Order

1. **Fill in Sale Order Details:**
   - Select customer
   - Choose lens type, category, material, coating, etc.
   - Enter lens specifications (Spherical, Cylinder, Axis, Addition)
   - Select which eyes need correction (Left, Right, or both)

2. **Calculate Price:**
   - Click the "Calculate Price" button in the pricing section
   - This is required before printing

3. **Click "Create & Print" Button:**
   - Located in the top right next to "Create & Rise Po"
   - Button is blue to distinguish it from other actions

4. **Review Print Preview:**
   - Modal opens showing how the A5 sheet will look
   - Two sections displayed side-by-side for Left and Right eye
   - All specifications clearly formatted with coating info

5. **Print the Document:**
   - Click "Print" button in the modal
   - Browser's print dialog opens
   - Select printer (normal printer with A5 capability)
   - Click "Print" to send to printer
   - Print settings will default to A5 size

6. **Confirm and Complete:**
   - Click "Confirm & Close" to complete the process
   - Order is saved in the database
   - Modal closes and success message appears

### Printing an Existing Order

1. **Open Sale Order:**
   - Navigate to a sale order in view mode
   - Order must have lens specifications entered

2. **Click "Print" Button:**
   - Located in the top right header
   - Only visible in view mode

3. **Follow Steps 4-6 above:**
   - Preview, print, and confirm as described above

## Data Displayed in Print

### Per Eye Section (Left/Right)
- **Spherical Value:** Lens focusing power
- **Cylinder Value:** Astigmatism correction power
- **Axis:** Direction of astigmatism (degrees)
- **Addition:** Extra magnification for progressive/bifocal lenses

### Coating Information
- If coating is selected, it displays prominently below the specs
- Color-highlighted background for easy visibility

## Technical Details

### A5 Sheet Specifications
- Width: 148mm
- Height: 210mm
- Margins: 10mm on all sides
- Font: Arial, 11px base size
- Optimized for thermal and inkjet printers

### Browser Print Features
- Uses HTML5 `window.open()` API
- Generates print-optimized CSS
- Sets page size to A5 automatically
- Works with all modern browsers

### State Flow
```
User clicks "Create & Print"
    ↓
Validate form & price calculation
    ↓
Save order to database (if new/edit mode)
    ↓
Open print preview modal
    ↓
User reviews and clicks "Print"
    ↓
Browser print dialog opens
    ↓
User clicks "Print" in browser dialog
    ↓
Confirm & Close in modal
    ↓
Success message & return to orders list
```

## Validation Requirements

Before printing, the system ensures:
1. ✅ Price has been calculated
2. ✅ At least one eye has specifications entered
3. ✅ All required form fields are filled
4. ✅ Numerical values are valid
5. ✅ Customer information is complete

## Error Handling

The feature includes error handling for:
- Missing price calculation
- No lens specifications entered
- Invalid eye data
- Database save failures
- Print dialog being blocked by browser

## Browser Compatibility

Works with:
- Chrome/Edge (recommended)
- Firefox
- Safari
- Opera

Note: Some browsers may require popup permission to be allowed.

## Customization Options

### Font Sizes
Adjust in `LensSpecificationPrint.jsx`:
```jsx
fontSize: "11px"  // Change base font size
fontSize: "12px"  // For table headers
fontSize: "9px"   // For footer text
```

### Layout
- Modify the flex layout in the main content
- Adjust gaps between sections: `gap: "6mm"`
- Change margins: `padding: "10mm"`

### Styling
- Table borders: Modify `border: "1px solid #ddd"`
- Background colors: Update `backgroundColor: "#f0f0f0"`
- Text colors: Change values in color properties

## Future Enhancements

Potential improvements:
1. Add customer details to the printout
2. Include order total and pricing info
3. Add barcode/QR code for order tracking
4. Multi-language support
5. Custom logo/header options
6. Print template selection
7. Batch printing for multiple orders
8. PDF generation option

## Troubleshooting

### Print Preview Not Opening
- Check browser console for errors
- Ensure popups are allowed in browser settings
- Try a different browser

### Incorrect Page Size
- Check printer supports A5 paper
- Verify printer settings aren't overriding page size
- Try "Fit to Page" option

### Missing Specifications
- Ensure both eye selections and values are entered
- Click "Calculate Price" before printing
- Validate form for any error messages

### Coating Not Showing
- Verify coating is selected in the form
- Check that coating_id is not null in formData
- Confirm coating exists in the database

## Testing Checklist

- [ ] Create and print entirely new order (add mode)
- [ ] Edit existing order and print (edit mode)
- [ ] Print existing order (view mode)
- [ ] Test with single eye specs (left only, right only)
- [ ] Test with both eyes
- [ ] Test with and without coating
- [ ] Verify preview modal closes properly
- [ ] Test with different paper sizes
- [ ] Test on different browsers
- [ ] Test form validation before print
