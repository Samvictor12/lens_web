# DataTable Component Usage Guide

## Overview
The `DataTable` component is a reusable, feature-rich table component that provides:
- ✅ Column sorting (ascending, descending, none)
- ✅ Pagination with customizable page sizes
- ✅ Responsive layout
- ✅ **Loading states with skeleton loaders and overlay**
- ✅ **Sticky header with internal scrolling (max-height: 600px)**
- ✅ Empty state messages
- ✅ Custom cell rendering
- ✅ Column alignment (left, center, right)

## Installation
The component is located at: `/src/components/ui/data-table.jsx`

## Basic Usage

```jsx
import { DataTable } from "@/components/ui/data-table";
import { useState, useMemo } from "react";

function MyPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({ column: null, direction: null });

  // Your data
  const allData = [...]; // Your full dataset

  // Filter data (optional)
  const filteredData = useMemo(() => {
    return allData.filter(item => /* your filter logic */);
  }, [allData, /* your filter dependencies */]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.column) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aValue = a[sortConfig.column];
      let bValue = b[sortConfig.column];

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedData.slice(startIndex, startIndex + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Define columns
  const columns = [
    {
      accessorKey: "id",
      header: "ID",
      sortable: true,
    },
    {
      accessorKey: "name",
      header: "Name",
      sortable: true,
      cell: ({ value }) => <span className="font-medium">{value}</span>,
    },
    {
      accessorKey: "amount",
      header: "Amount",
      align: "right",
      sortable: true,
      cell: ({ value }) => `₹${value.toLocaleString("en-IN")}`,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={paginatedData}
      totalCount={sortedData.length}
      currentPage={currentPage}
      pageSize={pageSize}
      onPageChange={setCurrentPage}
      onPageSizeChange={(newSize) => {
        setPageSize(newSize);
        setCurrentPage(1); // Reset to first page
      }}
      onSortChange={setSortConfig}
      emptyMessage="No data found"
    />
  );
}
```

## Column Definition

Each column object can have the following properties:

### Required Properties
- `accessorKey` (string): The key to access data in the row object
- `header` (string): Display name for the column header

### Optional Properties
- `sortable` (boolean): Whether the column can be sorted. Default: `false`
- `align` (string): Text alignment - `"left"`, `"center"`, or `"right"`. Default: `"left"`
- `cell` (function): Custom render function for cell content
  - Receives: `{ row, value }`
  - `row`: The entire row object
  - `value`: The value at `row[accessorKey]`
  - Returns: JSX or string to render

## Props

### DataTable Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `columns` | Array | Yes | `[]` | Array of column definitions |
| `data` | Array | Yes | `[]` | Array of data objects to display (should be paginated) |
| `totalCount` | Number | Yes | `0` | Total number of records (for pagination calculation) |
| `currentPage` | Number | Yes | `1` | Current page number (1-indexed) |
| `pageSize` | Number | Yes | `10` | Number of items per page |
| `onPageChange` | Function | No | - | Callback when page changes: `(page: number) => void` |
| `onPageSizeChange` | Function | No | - | Callback when page size changes: `(pageSize: number) => void` |
| `onSortChange` | Function | No | - | Callback when sort changes: `({ column, direction }) => void` |
| `isLoading` | Boolean | No | `false` | **Shows skeleton loaders and loading overlay with spinner** |
| `emptyMessage` | String | No | `"No data available"` | Message when no data |
| `showPagination` | Boolean | No | `true` | Whether to show pagination controls |

### New Features

#### 📊 Scrollable Table
- Maximum height of **600px** with internal vertical scrolling
- **Sticky header** stays visible while scrolling through data
- Smooth scrolling experience with proper overflow handling

#### ⏳ Loading States
When `isLoading={true}`:
1. **Skeleton rows** - Shows placeholder skeleton loaders for each row
2. **Loading overlay** - Displays a semi-transparent overlay with animated spinner
3. **Loading message** - Shows "Loading data..." text below spinner

## Examples

### Example 1: Basic Table with Sorting

```jsx
const columns = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    sortable: true,
  },
  {
    accessorKey: "customer",
    header: "Customer",
    sortable: true,
  },
  {
    accessorKey: "amount",
    header: "Amount",
    align: "right",
    sortable: true,
  },
];
```

### Example 2: Custom Cell Rendering

```jsx
const columns = [
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ value }) => (
      <Badge className={statusColors[value]}>
        {value}
      </Badge>
    ),
  },
  {
    accessorKey: "date",
    header: "Date",
    sortable: true,
    cell: ({ value }) => new Date(value).toLocaleDateString(),
  },
];
```

### Example 3: Actions Column

```jsx
const columns = [
  // ... other columns
  {
    accessorKey: "actions",
    header: "Actions",
    align: "right",
    cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={() => handleEdit(row.id)}>
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
          Delete
        </Button>
      </div>
    ),
  },
];
```

### Example 4: Nested Data Access

```jsx
const columns = [
  {
    accessorKey: "customerName", // Virtual key for sorting
    header: "Customer",
    sortable: true,
    cell: ({ row }) => row.customer?.name, // Access nested property
  },
];

// In your sort logic:
const sortedData = useMemo(() => {
  if (!sortConfig.column) return filteredData;

  return [...filteredData].sort((a, b) => {
    let aValue = a[sortConfig.column];
    let bValue = b[sortConfig.column];

    // Handle nested customer name
    if (sortConfig.column === "customerName") {
      aValue = a.customer?.name || "";
      bValue = b.customer?.name || "";
    }

    // ... rest of sort logic
  });
}, [filteredData, sortConfig]);
```

## Pages Using DataTable

The following pages have been updated to use the DataTable component:

1. **SaleOrders** (`/src/pages/SaleOrders.jsx`)
   - Columns: Order #, Customer, Date, Items, Amount, Status, Actions
   - Sortable: Order #, Customer, Date, Amount

2. **Inventory** (`/src/pages/Inventory.jsx`)
   - Columns: SKU, Lens Type, Variant, Stock, Reorder Level, Cost Price, Status
   - Sortable: SKU, Lens Type, Variant, Stock, Reorder Level, Cost Price

3. **PurchaseOrders** (`/src/pages/PurchaseOrders.jsx`)
   - Columns: PO Number, Vendor, Created Date, Items, Total Amount, Status, Actions
   - Sortable: PO Number, Vendor, Created Date, Total Amount

4. **Expenses** (`/src/pages/Expenses.jsx`)
   - Columns: Date, Category, Description, Type, Amount
   - Sortable: Date, Category, Type, Amount

## Loading State Example

To simulate or use loading state (e.g., when fetching data from an API):

```jsx
import { useEffect } from "react";

function MyPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState([]);

  // Simulate API call
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <DataTable
      columns={columns}
      data={paginatedData}
      isLoading={isLoading}  // Pass loading state
      // ... other props
    />
  );
}
```

### Testing Loading State

To test the loading state in development, you can temporarily set:
```jsx
const [isLoading, setIsLoading] = useState(true); // Set to true to see loading state
```

Or simulate a loading delay:
```jsx
useEffect(() => {
  setIsLoading(true);
  setTimeout(() => {
    setIsLoading(false);
  }, 2000); // Show loading for 2 seconds
}, []);
```

## Scrolling Behavior

The table automatically handles scrolling when:
- Data exceeds the 600px maximum height
- Many rows are displayed
- Content is taller than the viewport

**Features:**
- Smooth scrolling with proper scroll bars
- Header remains fixed at the top
- Pagination controls always visible at the bottom

## Best Practices

1. **Always use useMemo for data processing** to avoid unnecessary re-renders
2. **Reset page to 1 when changing page size** to avoid being on an invalid page
3. **Provide meaningful empty messages** for better UX
4. **Use proper alignment** for numeric columns (right-align amounts, quantities)
5. **Keep accessorKey consistent** with your data structure
6. **Handle nested data** in both cell rendering and sort logic
7. **Set isLoading={true} during data fetching** for better user feedback
8. **Test with large datasets** to ensure scrolling works properly

## Styling

The component uses Tailwind CSS classes and follows the shadcn/ui design system. The table is:
- Fully responsive with horizontal scrolling on small screens
- Styled with proper borders, hover states, and spacing
- Accessible with proper semantic HTML

## Performance Considerations

- Pagination is client-side, so all filtering and sorting happens in the browser
- For large datasets (>10,000 rows), consider implementing server-side pagination
- Use `useMemo` for filtering, sorting, and pagination to optimize performance
- The component re-renders only when props change

## Future Enhancements

Potential improvements for future versions:
- Multi-column sorting
- Column resizing
- Column visibility toggle
- Row selection with checkboxes
- Export to CSV/Excel
- Search/filter per column
- Server-side pagination support
- Virtualization for very large datasets
