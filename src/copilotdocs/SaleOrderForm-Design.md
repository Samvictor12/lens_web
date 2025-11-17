# Sale Order Form - Design Document

## Overview
This document outlines the design and structure for the Sale Order form UI, following the same pattern as the Lens Category module for consistency across the application.

## Design Pattern Reference
- **Base Pattern**: Lens Category Module (`src/pages/LensCategory/`)
- **Form Structure**: Vertical blocks with grouped information
- **Field Layout**: 2 fields per row within each block
- **Component Architecture**: 
  - Main page component for listing
  - Form component for add/edit/view modes
  - Separate filter and card components
  - Custom hooks for columns

---

## Page Structure

### 1. Sale Orders Main Page (`SaleOrderMain.jsx`)
**Purpose**: List all sale orders with search, filter, and pagination

**Features**:
- Search functionality by order number, customer name
- Filter by status, date range, customer
- Pagination with configurable page size
- Sorting by multiple columns
- Table view with action buttons (View, Edit, Delete)
- "Add New Order" button

**Layout**:
```
┌─────────────────────────────────────────────────────┐
│  Sale Orders                        [+ Add Order]   │
│  Manage all customer orders                         │
├─────────────────────────────────────────────────────┤
│  [🔍 Search...]                      [🔽 Filters]   │
├─────────────────────────────────────────────────────┤
│  Data Table                                         │
│  - Order #  | Customer | Date | Status | Amount    │
│  - Actions: View | Edit | Delete                   │
├─────────────────────────────────────────────────────┤
│  Pagination Controls                                │
└─────────────────────────────────────────────────────┘
```

---

### 2. Sale Order Form (`SaleOrderForm.jsx`)
**Purpose**: Create new or edit/view existing sale orders

**Modes**: 
- `add` - Create new order
- `edit` - Modify existing order
- `view` - View order details (with edit button)

**Header Section**:
```
┌─────────────────────────────────────────────────────┐
│  [← Back]  Add New Sale Order     [Cancel] [💾 Save]│
│  Fill in the sale order information below           │
└─────────────────────────────────────────────────────┘
```

**Header Section (View Mode with Status Actions)**:
```
┌──────────────────────────────────────────────────────────────────┐
│  [← Back]  View Sale Order     [Edit] [Status Action Button]    │
│  Order details and status information                            │
└──────────────────────────────────────────────────────────────────┘
```

**Status Action Buttons** (View Mode Only):
- When `status === 'DRAFT'` → Show **"Start Production"** button
- When `status === 'IN_PRODUCTION'` → Show **"Ready for Dispatch"** button  
- When `status === 'READY_FOR_DISPATCH'` → Show **"Mark as Delivered"** button
- When `status === 'DELIVERED'` → No status action button (final state)

**Price Calculation Button** (Add/Edit Mode):
- Shows **"Calculate Price"** button in form
- Fetches price based on current form data (lens, coating, customer, etc.)
- Updates `lensPrice` and `discount` fields automatically
- Position: Near lens information or billing section

---

## Form Block Structure

### Block 1: Order Information
**Fields** (2 per row, vertical arrangement):

| Row | Field 1 | Field 2 |
|-----|---------|---------|
| 1 | Customer* (Select/Autocomplete) | Customer Ref No (Auto-generated) |
| 2 | Date* (Date Picker) | Type* (Select: Normal/Rush/Premium) |
| 3 | Delivery Schedule (DateTime) | Status* (Select) |
| 4 | Remarks (Textarea - spans 2 columns) | - |
| 5 | Item Ref No (Input) | Free Lens (Checkbox) |

**Status Options**:
- DRAFT
- CONFIRMED
- IN_PRODUCTION
- READY_FOR_DISPATCH
- DELIVERED

**Validation**:
- Customer: Required
- Date: Required, cannot be in past
- Type: Required
- Status: Required

---

### Block 2: Lens Information
**Fields** (2 per row, vertical arrangement):

| Row | Field 1 | Field 2 |
|-----|---------|---------|
| 1 | Lens Name* (Select from LensProductMaster) | Category* (Select from LensCategoryMaster) |
| 2 | Type* (Select from LensTypeMaster) | Dia* (Select from LensDiaMaster) |
| 3 | Fitting Type* (Select from LensFittingMaster) | Tinting Name* (Select from LensTintingMaster) |
| 4 | Coating Type* (Select - general type) | Coating Name* (Select from LensCoatingMaster) | 
| 5 | [Calculate Price Button] (spans 2 columns or aligned right) | - |

**Calculate Price Button**:
- **Label**: "Calculate Price" or "Get Price"
- **Icon**: Calculator or DollarSign icon
- **Position**: Below lens information fields, right-aligned or centered
- **Functionality**: 
  - Validates that required lens fields are filled (Customer, Lens Name, Coating)
  - **Step 1**: Finds the `lensPrice_id` from LensPriceMaster table by matching `lens_id` and `coating_id`
  - **Step 2**: Calls existing `/api/v1/lens-products/calculate-cost` API with `customer_id` and `lensPrice_id`
  - Updates `lensPrice` and `discount` fields with response data
  - Shows loading state during API calls
  - Displays success/error toast notification with pricing details
- **Two-Step Process**: 
  ```javascript
  // Step 1: Get lensPrice_id
  GET /api/v1/lens-products/:lens_id/prices
  // Find the price record where coating_id matches
  
  // Step 2: Calculate cost with customer discount
  POST /api/v1/lens-products/calculate-cost
  {
    customer_id: formData.customerId,
    lensPrice_id: foundLensPriceId,
    quantity: 1
  }
  ```

**Notes**:
- All dropdowns should be populated from master tables via API
- Show both name and short_name where applicable
- Filter options based on active_status = true

**Validation**:
- All fields marked with * are required
- Coating Type should filter Coating Name options
- Calculate Price button disabled if required lens fields not filled

---

### Block 3: Eye Specifications
**Layout**: Horizontal split into 2 sections

#### Section 3.1: Right Eye Specifications
**Header**: 
```
☑️ Right Eye (Checkbox to enable/disable section)
```

**Fields** (2 per row):

| Row | Field 1 | Field 2 |
|-----|---------|---------|
| 1 | Spherical (Input, decimal) | Cylindrical (Input, decimal) |
| 2 | Axis (Input, integer 0-180) | Add (Input, decimal) |
| 3 | Dia (Input, decimal) | Base (Input, text) |
| 4 | Base Size (Input, text) | Bled (Input, text) |

#### Section 3.2: Left Eye Specifications
**Header**: 
```
☑️ Left Eye (Checkbox to enable/disable section)
```

**Fields** (2 per row):

| Row | Field 1 | Field 2 |
|-----|---------|---------|
| 1 | Spherical (Input, decimal) | Cylindrical (Input, decimal) |
| 2 | Axis (Input, integer 0-180) | Add (Input, decimal) |
| 3 | Dia (Input, decimal) | Base (Input, text) |
| 4 | Base Size (Input, text) | Bled (Input, text) |

**Visual Layout**:
```
┌──────────────────────────┬──────────────────────────┐
│ ☑️ Right Eye             │ ☑️ Left Eye              │
├──────────────────────────┼──────────────────────────┤
│ Spherical  | Cylindrical │ Spherical  | Cylindrical │
│ Axis       | Add         │ Axis       | Add         │
│ Dia        | Base        │ Dia        | Base        │
│ Base Size  | Bled        │ Base Size  | Bled        │
└──────────────────────────┴──────────────────────────┘
```

**Validation**:
- At least one eye (Right or Left) must be selected
- If eye checkbox is checked, all specification fields for that eye become required
- Spherical: Range -20.00 to +20.00
- Cylindrical: Range -6.00 to +6.00
- Axis: Integer 0 to 180
- Add: Range 0.00 to +4.00

**Behavior**:
- When eye checkbox is unchecked, disable and clear all fields for that eye
- Show visual indicator (blue for right, green for left)

---

### Block 4: Dispatch Information
**Visibility**: Only show when `status === 'READY_FOR_DISPATCH'`

**Fields** (2 per row, vertical arrangement):

| Row | Field 1 | Field 2 |
|-----|---------|---------|
| 1 | Dispatch ID (Auto-generated/Input) | - | 
| 2 | Dispatch Status* (Select) | Assigned Person (Select from User) |
| 3 | Estimated Date (Date Picker) | Estimated Time (Time Picker) |
| 4 | Actual Date (Date Picker) | Actual Time (Time Picker) |
| 5 | Dispatch Notes (Textarea - spans 2 columns) | - |

**Dispatch Status Options**:
- Pending
- Assigned
- In Transit
- Delivered

**Validation**:
- Dispatch Status: Required when block is visible
- Estimated Date: Required, cannot be in past
- Assigned Person: Required if status is "Assigned" or beyond

**Conditional Display Logic**:
```javascript
if (formData.status === 'READY_FOR_DISPATCH') {
  // Show dispatch block
  dispatchBlockVisible = true;
} else {
  dispatchBlockVisible = false;
}
```

---

## Component Structure

### File Organization
```
src/pages/SaleOrder/
├── SaleOrderMain.jsx           // Main listing page
├── SaleOrderForm.jsx            // Form for add/edit/view
├── SaleOrderFilter.jsx          // Filter dialog component
├── SaleOrderCard.jsx            // Card view component (optional)
├── useSaleOrderColumns.jsx     // Table columns hook
└── SaleOrder.constants.js      // Constants and default values
```

### Constants File (`SaleOrder.constants.js`)
```javascript
export const defaultSaleOrder = {
  customerId: null,
  customerRefNo: "",
  orderDate: new Date().toISOString().split('T')[0],
  type: "",
  deliverySchedule: null,
  status: "DRAFT",
  remark: "",
  itemRefNo: "",
  freeLens: false,
  
  // Lens Information
  lens_id: null,
  category_id: null,
  Type_id: null,
  dia_id: null,
  fitting_id: null,
  coating_id: null,
  tinting_id: null,
  
  // Eye Selection
  rightEye: false,
  leftEye: false,
  
  // Right Eye Specs
  rightSpherical: "",
  rightCylindrical: "",
  rightAxis: "",
  rightAdd: "",
  rightDia: "",
  rightBase: "",
  rightBaseSize: "",
  rightBled: "",
  
  // Left Eye Specs
  leftSpherical: "",
  leftCylindrical: "",
  leftAxis: "",
  leftAdd: "",
  leftDia: "",
  leftBase: "",
  leftBaseSize: "",
  leftBled: "",
  
  // Dispatch Info (when status = READY_FOR_DISPATCH)
  dispatchStatus: "Pending",
  assignedPerson_id: null,
  dispatchId: "",
  estimatedDate: null,
  estimatedTime: "",
  actualDate: null,
  actualTime: "",
  dispatchNotes: "",
  
  // Billing
  lensPrice: 0,
  discount: 0,
};

export const orderStatusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "IN_PRODUCTION", label: "In Production" },
  { value: "READY_FOR_DISPATCH", label: "Ready for Dispatch" },
  { value: "DELIVERED", label: "Delivered" },
];

export const orderTypeOptions = [
  { value: "Normal Processing", label: "Normal Processing" },
  { value: "Rush Processing", label: "Rush Processing" },
  { value: "Premium Processing", label: "Premium Processing" },
];

export const dispatchStatusOptions = [
  { value: "Pending", label: "Pending" },
  { value: "Assigned", label: "Assigned" },
  { value: "In Transit", label: "In Transit" },
  { value: "Delivered", label: "Delivered" },
];

export const saleOrderFilters = {
  status: "all",
  startDate: null,
  endDate: null,
  customerId: null,
};
```

---

## Form Components to Use

### From UI Library:
- `FormInput` - For text/number inputs
- `FormSelect` - For dropdown selections with React Select
- `FormTextarea` - For multi-line text
- `FormCheckbox` - For boolean values
- `Card` / `CardContent` - For block containers
- `Button` - For actions
- `Alert` / `AlertDescription` - For validation messages
- `Badge` - For status display

### Custom Components Needed:
- `FormDateTimePicker` - For date and time selection
- `FormTimePicker` - For time only selection

---

## Validation Rules Summary

### Required Fields (All Modes):
- Customer
- Date
- Type
- Status
- Lens Name
- Category
- Type
- Dia
- Fitting Type
- Coating Name
- Tinting Name
- At least one eye selected (Right or Left)
- All specification fields for selected eye(s)

### Required Fields (When Dispatch Block Visible):
- Dispatch Status
- Estimated Date
- Assigned Person (if status is Assigned/In Transit/Delivered)

### Field Validations:
- Email format validation (if applicable)
- Numeric range validations for eye specifications
- Date logic (delivery date >= order date, actual date >= estimated date)
- Positive numbers for prices and discounts

---

## API Integration

### Endpoints Required:
```javascript
// Sale Orders
GET    /api/sale-orders                       // List with pagination, search, filters
GET    /api/sale-orders/:id                   // Get single order
POST   /api/sale-orders                       // Create new order
PUT    /api/sale-orders/:id                   // Update existing order
PATCH  /api/sale-orders/:id/status            // Update only status (for status transition buttons)
DELETE /api/sale-orders/:id                   // Delete order

// Price Calculation (Existing API - Reuse)
POST   /api/v1/lens-products/calculate-cost   // Calculate price based on customer & lensPrice_id
GET    /api/v1/lens-products/:lensId/prices   // Get all coating prices for a lens (to find lensPrice_id)

// Master Data for Dropdowns
GET    /api/customers/dropdown                // For customer dropdown
GET    /api/lens-products/dropdown            // For lens name dropdown
GET    /api/lens-categories/dropdown          // For category dropdown
GET    /api/lens-types/dropdown               // For type dropdown
GET    /api/lens-dia/dropdown                 // For dia dropdown
GET    /api/lens-fittings/dropdown            // For fitting dropdown
GET    /api/lens-coatings/dropdown            // For coating dropdown
GET    /api/lens-tintings/dropdown            // For tinting dropdown
GET    /api/users/dropdown                    // For assigned person dropdown
```

### Calculate Price API Details:

**Endpoint**: `POST /api/v1/lens-products/calculate-cost` (Existing API)

**Request Payload**:
```javascript
{
  customer_id: number,         // Required - Customer ID
  lensPrice_id: number,        // Required - LensPriceMaster ID (lens + coating combination)
  quantity: number             // Optional - Default: 1
}
```

**Important**: The `lensPrice_id` is from the `LensPriceMaster` table which represents a specific lens + coating combination. In the sale order form, we need to:
1. Get the selected `lens_id` (LensProductMaster)
2. Get the selected `coating_id` (LensCoatingMaster)
3. Query `LensPriceMaster` to find the matching `lensPrice_id` where `lens_id` matches and `coating_id` matches
4. Use that `lensPrice_id` to call the calculate-cost API

**Response**:
```javascript
{
  success: true,
  message: "Product cost calculated successfully",
  data: {
    customer: {
      id: number,
      code: string,
      name: string,
      shopname: string
    },
    product: {
      id: number,
      product_code: string,
      lens_name: string,
      brand: { id: number, name: string },
      category: { id: number, name: string }
    },
    coating: {
      id: number,
      name: string,
      short_name: string
    },
    pricing: {
      lensPrice_id: number,
      basePrice: number,           // Base price per unit
      quantity: number,
      hasPriceMapping: boolean,    // Customer has special pricing
      discountRate: number,        // Discount percentage (0 if no mapping)
      discountAmount: number,      // Total discount in currency
      costWithoutDiscount: number, // Total before discount
      costWithDiscount: number,    // Total after discount
      finalCost: number,          // Final cost (same as costWithDiscount)
      savings: number             // Amount saved
    }
  }
}
```

**Business Logic**:
1. API automatically fetches base price from `LensPriceMaster` using `lensPrice_id`
2. Checks for customer-specific pricing in `PriceMapping` table
3. Applies discount rate if exists for this customer-lens combination
4. Returns detailed pricing breakdown with and without discount


### Service File (`src/services/saleOrder.js`):
```javascript
import apiClient from "./apiClient";

export const getSaleOrders = async (page, limit, search, filters, sortField, sortDirection) => {
  // Implementation
};

export const getSaleOrderById = async (id) => {
  // Implementation
};

export const createSaleOrder = async (data) => {
  // Implementation
};

export const updateSaleOrder = async (id, data) => {
  // Implementation
};

export const deleteSaleOrder = async (id) => {
  // Implementation
};

export const updateSaleOrderStatus = async (id, status) => {
  // PATCH request to update only status
  // Used by status transition buttons
};

export const getLensPriceId = async (lensId, coatingId) => {
  // GET request to find lensPrice_id from LensPriceMaster
  // Query params: lens_id and coating_id
  // Returns the price master record with id
};

export const calculateProductCost = async (data) => {
  // POST request to /api/v1/lens-products/calculate-cost
  // Used by Calculate Price button
  // Params: { customer_id, lensPrice_id, quantity }
};
```

---

## Responsive Design

### Breakpoints:
- Mobile: < 640px (1 field per row)
- Tablet: 640px - 1024px (maintain 2 fields per row, reduce padding)
- Desktop: > 1024px (2 fields per row, full layout)

### Mobile Adjustments:
- Stack fields vertically (1 per row)
- Eye specification sections stack vertically instead of side-by-side
- Reduce font sizes and padding
- Sticky header with action buttons

---

## State Management

### Form State:
```javascript
const [formData, setFormData] = useState(defaultSaleOrder);
const [originalData, setOriginalData] = useState(defaultSaleOrder);
const [errors, setErrors] = useState({});
const [isLoading, setIsLoading] = useState(false);
const [isSaving, setIsSaving] = useState(false);
const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
const [isCalculating, setIsCalculating] = useState(false); // For price calculation loading state
```

### Master Data State:
```javascript
const [customers, setCustomers] = useState([]);
const [lensProducts, setLensProducts] = useState([]);
const [categories, setCategories] = useState([]);
const [lensTypes, setLensTypes] = useState([]);
const [dias, setDias] = useState([]);
const [fittings, setFittings] = useState([]);
const [coatings, setCoatings] = useState([]);
const [tintings, setTintings] = useState([]);
const [users, setUsers] = useState([]);
```

---

## User Experience

### Loading States:
- Show skeleton loaders while fetching data
- Disable form during save operation
- Show progress indicator for save action

### Success/Error Feedback:
- Toast notifications for successful operations
- Inline validation errors below fields
- Alert banner for form-level errors

### Navigation:
- Confirm before leaving with unsaved changes
- Breadcrumb navigation: Home > Sale Orders > [Add/Edit/View]
- Back button returns to listing page

### Edit Mode Toggle (View Mode):
- Show "Edit" button in view mode
- Convert to editable form when clicked
- Show "Cancel Edit" to revert changes
- Highlight changed fields

### Status Transition Buttons (View Mode Only):
- **Purpose**: Allow quick status updates without entering edit mode
- **Visibility**: Only shown in view mode (not in add/edit mode)
- **Button Logic**:
  ```javascript
  const getStatusActionButton = (currentStatus) => {
    switch(currentStatus) {
      case 'DRAFT':
        return {
          label: 'Start Production',
          nextStatus: 'IN_PRODUCTION',
          icon: 'Play',
          variant: 'default'
        };
      case 'IN_PRODUCTION':
        return {
          label: 'Ready for Dispatch',
          nextStatus: 'READY_FOR_DISPATCH',
          icon: 'Package',
          variant: 'default'
        };
      case 'READY_FOR_DISPATCH':
        return {
          label: 'Mark as Delivered',
          nextStatus: 'DELIVERED',
          icon: 'Check',
          variant: 'success'
        };
      case 'DELIVERED':
        return null; // No button for final state
      default:
        return null;
    }
  };
  ```
- **Confirmation**: Show confirmation dialog before status transition
- **Validation**: 
  - For "Ready for Dispatch": Ensure dispatch information is filled
  - For "Mark as Delivered": Ensure actual date/time is provided
- **API Call**: Update only the status field (PATCH request)
- **Success**: Show toast notification and refresh order data
- **Position**: Next to Edit button in header

### Price Calculation Button (Add/Edit Mode):
- **Purpose**: Automatically calculate and fetch the price for the sale order based on customer and lens selections
- **Visibility**: Only shown in add/edit mode (not in view mode)
- **Button Details**:
  - **Label**: "Calculate Price"
  - **Icon**: Calculator (`<Calculator className="h-4 w-4" />`)
  - **Variant**: Outline or secondary
  - **Position**: In Block 2 (Lens Information), below lens fields or as a separate row
- **Functionality**:
  ```javascript
  const handleCalculatePrice = async () => {
    // Validate required fields
    if (!formData.customerId || !formData.lens_id || !formData.coating_id) {
      toast({
        title: "Missing Information",
        description: "Please select Customer, Lens Name, and Coating to calculate price.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsCalculating(true);
      
      // Step 1: Get lensPrice_id from LensPriceMaster
      // Query: lens_id = formData.lens_id AND coating_id = formData.coating_id
      const lensPriceResponse = await getLensPriceId(
        formData.lens_id, 
        formData.coating_id
      );

      if (!lensPriceResponse.success || !lensPriceResponse.data) {
        toast({
          title: "Price Not Found",
          description: "No price configured for this lens and coating combination.",
          variant: "destructive"
        });
        return;
      }

      const lensPriceId = lensPriceResponse.data.id;

      // Step 2: Calculate cost using existing API
      const response = await calculateProductCost({
        customer_id: formData.customerId,
        lensPrice_id: lensPriceId,
        quantity: 1 // Single lens calculation
      });

      if (response.success) {
        // Update form with calculated values
        setFormData(prev => ({
          ...prev,
          lensPrice: response.data.pricing.basePrice,
          discount: response.data.pricing.discountRate
        }));

        toast({
          title: "Price Calculated",
          description: response.data.pricing.hasPriceMapping
            ? `Base: ₹${response.data.pricing.basePrice}, Discount: ${response.data.pricing.discountRate}%, Final: ₹${response.data.pricing.finalCost}`
            : `Price: ₹${response.data.pricing.finalCost} (No discount available)`,
          success: true
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate price",
        variant: "destructive"
      });
    } finally {
      setIsCalculating(false);
    }
  };
  ```
- **Validation**: Button disabled if required fields (Customer, Lens Name, Coating) are not filled
- **Loading State**: Show spinner/loader during API call
- **Success**: Update `lensPrice` and `discount` fields, show toast notification
- **Error Handling**: Display error message if API fails

---

## Testing Checklist

### Functional Testing:
- [ ] Create new sale order
- [ ] Edit existing sale order
- [ ] View sale order details
- [ ] Delete sale order
- [ ] Search functionality
- [ ] Filter functionality
- [ ] Pagination
- [ ] Sorting
- [ ] Form validation (all fields)
- [ ] Conditional dispatch block visibility
- [ ] Eye specification enable/disable
- [ ] Master data dropdown population
- [ ] Price calculation (if applicable)
- [ ] Status transition buttons (DRAFT → IN_PRODUCTION → READY_FOR_DISPATCH → DELIVERED)
- [ ] Status button visibility based on current status
- [ ] Confirmation dialog before status change
- [ ] Status update API call
- [ ] Refresh data after status update
- [ ] Calculate Price button functionality
- [ ] Price calculation API integration
- [ ] Price fields update after calculation
- [ ] Calculate button disabled state validation
- [ ] Loading state during price calculation

### Edge Cases:
- [ ] Handle empty dropdown lists
- [ ] Handle API errors gracefully
- [ ] Prevent double submission
- [ ] Handle browser back button
- [ ] Handle page refresh with unsaved data
- [ ] Test with minimum and maximum value ranges

### Responsive Testing:
- [ ] Mobile view (< 640px)
- [ ] Tablet view (640px - 1024px)
- [ ] Desktop view (> 1024px)
- [ ] Touch interactions on mobile

---

## Implementation Priority

### Phase 1: Core Structure
1. Create component files and folder structure
2. Set up constants and default values
3. Implement basic form layout with all blocks
4. Add field components (inputs, selects)

### Phase 2: Functionality
5. Implement form state management
6. Add validation logic
7. Connect to API endpoints
8. Implement conditional visibility (dispatch block)
9. Add eye specification enable/disable logic
10. Implement status transition buttons in view mode
11. Implement price calculation button and API integration

### Phase 3: Integration
11. Create service functions
12. Implement create/update/delete operations
13. Add search and filter functionality
14. Implement pagination and sorting

### Phase 4: Polish
15. Add loading states and error handling
16. Implement responsive design
17. Add toast notifications
18. Test all scenarios
19. Code review and optimization

---

## Notes

- Follow the same code style and naming conventions as LensCategory module
- Use existing UI components from `src/components/ui/`
- Maintain consistent spacing and padding (Tailwind classes)
- Ensure accessibility (ARIA labels, keyboard navigation)
- Keep components focused and reusable
- Document complex logic with comments
- Use TypeScript if project supports it

---

## Future Enhancements

- Bulk import from Excel
- PDF generation for order details
- Email notifications
- Order history tracking
- Advanced filters (multiple status, date ranges)
- Quick edit from listing page
- Duplicate order feature
- Order templates
- Print friendly view

---

**Document Version**: 1.0  
**Last Updated**: November 15, 2025  
**Status**: Ready for Implementation
