# Lens Web Application Design System Guide

> Complete design system and UI patterns for creating applications with the same look and feel as Lens Web Application

## Table of Contents
1. [Overview](#overview)
2. [Color Palette](#color-palette)
3. [Typography](#typography)
4. [Layout System](#layout-system)
5. [Component Library](#component-library)
6. [Animation & Transitions](#animation--transitions)
7. [Implementation Guide](#implementation-guide)

---

## Overview

This design system is built on **Tailwind CSS** with a **healthcare/optical industry theme** using professional blues and teals. The system follows **shadcn/ui** patterns with custom HSL color variables for consistent theming.

### Core Principles
- **Professional Medical/Healthcare Aesthetic**
- **Clean & Minimalist Design**
- **Responsive First Approach**
- **Consistent Component Patterns**
- **HSL Color System for Theme Support**

---

## Color Palette

### Primary Colors
```css
/* Healthcare/Optical Industry Theme - Professional Blues & Teals */
--primary: 217 91% 60%;           /* Medical Blue - Trust & Professionalism */
--primary-foreground: 0 0% 100%;  /* White text on primary */
--primary-hover: 217 91% 50%;     /* Darker blue on hover */

--accent: 186 94% 45%;            /* Teal Accent - Modern & Clean */
--accent-foreground: 0 0% 100%;   /* White text on accent */

--success: 142 76% 36%;           /* Emerald Success */
--success-foreground: 0 0% 100%;  /* White text on success */

--warning: 38 92% 50%;            /* Amber Warning */
--warning-foreground: 0 0% 100%;  /* White text on warning */

--destructive: 0 84% 60%;         /* Red Destructive */
--destructive-foreground: 0 0% 100%; /* White text on destructive */
```

### Background Colors
```css
--background: 210 20% 98%;        /* Light gray background */
--foreground: 215 25% 15%;        /* Dark text */

--card: 0 0% 100%;                /* Pure white cards */
--card-foreground: 215 25% 15%;   /* Dark text on cards */

--popover: 0 0% 100%;             /* White popovers */
--popover-foreground: 215 25% 15%; /* Dark text on popovers */
```

### Muted Colors
```css
--secondary: 214 15% 95%;         /* Soft gray for secondary actions */
--secondary-foreground: 215 25% 25%; /* Dark text on secondary */

--muted: 214 20% 96%;             /* Light muted backgrounds */
--muted-foreground: 215 15% 45%;  /* Gray text */
```

### Border & Interactive
```css
--border: 214 20% 88%;            /* Subtle borders */
--input: 214 20% 90%;             /* Input borders */
--ring: 217 91% 60%;              /* Focus ring color */
```

### Status Badge Colors
```javascript
// Badge colors for different statuses
const statusColors = {
  pending: "bg-warning/10 text-warning border-warning/20",
  "in-production": "bg-primary/10 text-primary border-primary/20",
  "ready-for-dispatch": "bg-accent/10 text-accent border-accent/20",
  dispatched: "bg-success/10 text-success border-success/20",
  delivered: "bg-success/10 text-success border-success/20",
  returned: "bg-destructive/10 text-destructive border-destructive/20",
}

// Action badge colors
const actionColors = {
  CREATE: "bg-green-100 text-green-800 border-green-200",
  READ: "bg-blue-100 text-blue-800 border-blue-200",
  UPDATE: "bg-yellow-100 text-yellow-800 border-yellow-200",
  DELETE: "bg-red-100 text-red-800 border-red-200",
}

// Severity colors
const severityColors = {
  INFO: "bg-blue-100 text-blue-800 border-blue-200",
  WARNING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  ERROR: "bg-red-100 text-red-800 border-red-200",
  CRITICAL: "bg-purple-100 text-purple-800 border-purple-200",
}
```

### Dark Mode Colors
```css
.dark {
  --background: 215 30% 10%;
  --foreground: 214 15% 95%;
  --card: 215 25% 14%;
  --card-foreground: 214 15% 95%;
  --popover: 215 25% 14%;
  --popover-foreground: 214 15% 95%;
  
  --primary: 217 91% 60%;
  --primary-foreground: 0 0% 100%;
  
  --secondary: 215 20% 20%;
  --secondary-foreground: 214 15% 90%;
  
  --muted: 215 20% 18%;
  --muted-foreground: 215 15% 60%;
  
  --border: 215 20% 22%;
  --input: 215 20% 22%;
}
```

---

## Typography

### Font System
- **Font Family**: System fonts (no custom fonts)
- **Base Font Size**: 14px (0.875rem)
- **Line Height**: 1.5

### Text Sizes
```css
/* Text sizing scale */
.text-xs     { font-size: 0.75rem; }   /* 12px */
.text-sm     { font-size: 0.875rem; }  /* 14px */
.text-base   { font-size: 1rem; }      /* 16px */
.text-lg     { font-size: 1.125rem; }  /* 18px */
.text-xl     { font-size: 1.25rem; }   /* 20px */
.text-2xl    { font-size: 1.5rem; }    /* 24px */
.text-3xl    { font-size: 1.875rem; }  /* 30px */
```

### Font Weights
```css
.font-normal    { font-weight: 400; }
.font-medium    { font-weight: 500; }
.font-semibold  { font-weight: 600; }
.font-bold      { font-weight: 700; }
```

### Text Colors
```css
.text-foreground        /* Primary text */
.text-muted-foreground  /* Secondary/helper text */
.text-primary          /* Primary branded text */
.text-success          /* Success messages */
.text-warning          /* Warning messages */
.text-destructive      /* Error messages */
```

---

## Layout System

### Application Layout Structure
```jsx
// Main application layout
<SidebarProvider>
  <div className="min-h-screen h-screen flex w-full bg-background overflow-hidden">
    <AppSidebar />
    <div className="flex-1 flex flex-col w-full min-w-0 h-full overflow-hidden">
      <AppHeader />
      <main className="flex-1 overflow-auto h-full">
        <div className="max-w-[1920px] mx-auto h-full">
          {children}
        </div>
      </main>
    </div>
  </div>
</SidebarProvider>
```

### Grid System
```css
/* Responsive grid patterns */
.grid-cols-1              /* Mobile: 1 column */
.sm:grid-cols-2          /* Small: 2 columns */
.lg:grid-cols-3          /* Large: 3 columns */
.xl:grid-cols-4          /* Extra large: 4 columns */

/* Common dashboard grid */
.grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
```

### Spacing Scale
```css
/* Consistent spacing scale */
.p-2     /* 8px padding */
.p-3     /* 12px padding */
.p-4     /* 16px padding */
.p-6     /* 24px padding */

.gap-1   /* 4px gap */
.gap-2   /* 8px gap */
.gap-3   /* 12px gap */
.gap-4   /* 16px gap */
.gap-6   /* 24px gap */

.space-y-3  /* 12px vertical space between children */
.space-y-4  /* 16px vertical space between children */
.space-y-6  /* 24px vertical space between children */
```

### Page Layout Pattern
```jsx
// Standard page layout
<div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 animate-in fade-in duration-500">
  {/* Header */}
  <div>
    <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
      Page Title
    </h1>
    <p className="text-xs text-muted-foreground mt-0.5">
      Page description
    </p>
  </div>
  
  {/* Content */}
  {children}
</div>
```

---

## Component Library

### 1. Buttons

#### Button Variants
```jsx
// Primary button
<Button variant="default" size="default">
  Primary Action
</Button>

// Secondary button
<Button variant="outline" size="default">
  Secondary Action
</Button>

// Destructive button
<Button variant="destructive" size="default">
  Delete
</Button>

// Ghost button (subtle)
<Button variant="ghost" size="default">
  Cancel
</Button>

// Link button
<Button variant="link" size="default">
  Learn More
</Button>
```

#### Button Sizes
```jsx
<Button size="xs">Extra Small</Button>    // h-7 px-2 text-xs
<Button size="sm">Small</Button>          // h-9 px-3
<Button size="default">Default</Button>   // h-10 px-4
<Button size="lg">Large</Button>          // h-11 px-8
<Button size="icon">Icon</Button>         // h-10 w-10
```

#### Button Patterns
```jsx
// Button with icon
<Button className="gap-1.5">
  <Plus className="h-4 w-4" />
  Add New
</Button>

// Loading button
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Loading...
    </>
  ) : (
    'Submit'
  )}
</Button>

// Destructive action button
<Button
  variant="ghost"
  size="xs"
  className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
  onClick={handleDelete}
>
  <Trash2 className="h-3.5 w-3.5" />
</Button>
```

### 2. Cards

#### Basic Card Structure
```jsx
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

<Card className="p-3 hover:shadow-md transition-shadow">
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description or subtitle</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Card content */}
  </CardContent>
</Card>
```

#### Card Grid Pattern
```jsx
// Responsive card grid
<div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => (
    <Card key={item.id} className="p-3 hover:shadow-md transition-shadow flex flex-col h-full">
      {/* Card content */}
    </Card>
  ))}
</div>
```

#### Dashboard Stats Card
```jsx
<Card>
  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
    <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
    <DollarSign className="h-4 w-4 text-muted-foreground" />
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">₹{totalSales.toLocaleString("en-IN")}</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### 3. Badges

```jsx
import { Badge } from "@/components/ui/badge";

// Status badges
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Pending</Badge>

// Custom colored badges
<Badge className="bg-success/10 text-success border-success/20">
  Success
</Badge>

<Badge className="bg-warning/10 text-warning border-warning/20">
  Warning
</Badge>
```

### 4. Data Tables

#### Basic DataTable Usage
```jsx
import { DataTable } from "@/components/ui/data-table";

// Column definitions
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
    cell: ({ value }) => (
      <span className="font-medium">{value}</span>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ value }) => (
      <Badge variant={value === 'active' ? 'default' : 'secondary'}>
        {value}
      </Badge>
    ),
  },
  {
    accessorKey: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-1">
        <Button variant="ghost" size="xs" onClick={() => handleEdit(row)}>
          <Edit className="h-3.5 w-3.5" />
        </Button>
        <Button 
          variant="ghost" 
          size="xs" 
          className="text-destructive hover:bg-destructive/10"
          onClick={() => handleDelete(row)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    ),
  },
];

// DataTable component
<DataTable
  columns={columns}
  data={paginatedData}
  totalCount={totalCount}
  currentPage={currentPage}
  pageSize={pageSize}
  onPageChange={setCurrentPage}
  onPageSizeChange={setPageSize}
  onSortChange={setSortConfig}
  isLoading={isLoading}
  emptyMessage="No data found"
/>
```

#### DataTable Features
- **Sticky Header**: Header stays visible while scrolling
- **Maximum Height**: 600px with internal scrolling
- **Loading States**: Skeleton rows + loading overlay
- **Sorting**: Column-based ascending/descending/none
- **Pagination**: Page controls + page size selector
- **Custom Cell Rendering**: Rich content in cells

### 5. Forms & Inputs

#### Form Input Pattern
```jsx
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Label } from "@/components/ui/label";

// Text input
<div className="space-y-1">
  <Label htmlFor="name">Name</Label>
  <FormInput
    id="name"
    name="name"
    value={formData.name}
    onChange={handleInputChange}
    placeholder="Enter name"
    required
  />
</div>

// Select dropdown
<div className="space-y-1">
  <Label htmlFor="status">Status</Label>
  <FormSelect
    id="status"
    name="status"
    value={formData.status}
    onChange={handleSelectChange}
    options={statusOptions}
    placeholder="Select status"
    required
  />
</div>
```

#### Form Layout Pattern
```jsx
// Two-column responsive form
<form className="space-y-4">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-1">
      <Label htmlFor="field1">Field 1</Label>
      <FormInput id="field1" name="field1" />
    </div>
    <div className="space-y-1">
      <Label htmlFor="field2">Field 2</Label>
      <FormInput id="field2" name="field2" />
    </div>
  </div>
  
  <div className="flex justify-end gap-2 pt-4">
    <Button variant="outline" type="button">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

### 6. Sidebar Navigation

#### Sidebar Structure
```jsx
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar 
} from "@/components/ui/sidebar";

export const AppSidebar = () => {
  const { state } = useSidebar();
  
  return (
    <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={state === "collapsed" ? "hidden" : ""}>
            Main Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url}>
                      <item.icon className="h-4 w-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};
```

#### Sidebar Colors
```css
/* Sidebar color system */
--sidebar-background: 215 30% 16%;
--sidebar-foreground: 214 15% 90%;
--sidebar-primary: 217 91% 60%;
--sidebar-primary-foreground: 0 0% 100%;
--sidebar-accent: 215 25% 22%;
--sidebar-accent-foreground: 214 15% 95%;
--sidebar-border: 215 20% 20%;
--sidebar-ring: 217 91% 60%;
```

### 7. Modals & Dialogs

#### Dialog Pattern
```jsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent className="sm:max-w-[425px]">
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description or instructions
      </DialogDescription>
    </DialogHeader>
    {/* Dialog content */}
    <DialogFooter>
      <Button variant="outline" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      <Button onClick={handleSubmit}>
        Save changes
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Sheet (Side Drawer) Pattern
```jsx
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

<Sheet open={open} onOpenChange={setOpen}>
  <SheetTrigger asChild>
    <Button variant="outline">
      <Filter className="h-4 w-4 mr-2" />
      Filters
    </Button>
  </SheetTrigger>
  <SheetContent>
    <SheetHeader>
      <SheetTitle>Filters</SheetTitle>
      <SheetDescription>
        Adjust filters to find what you're looking for
      </SheetDescription>
    </SheetHeader>
    {/* Filter content */}
  </SheetContent>
</Sheet>
```

### 8. Filter Components

#### Filter Sheet Pattern
```jsx
// Filter trigger button with active indicator
<Button
  variant="outline"
  onClick={() => setShowFilterDialog(true)}
  className={hasActiveFilters ? "border-primary text-primary" : ""}
>
  <Filter className="h-4 w-4 mr-2" />
  Filters
  {hasActiveFilters && (
    <Badge variant="secondary" className="ml-2 px-1.5 py-0 h-4 text-xs">
      {activeFilterCount}
    </Badge>
  )}
</Button>

// Active filters display
{hasActiveFilters && (
  <div className="flex flex-wrap gap-2">
    <span className="text-sm text-muted-foreground">Active filters:</span>
    {Object.entries(filters).map(([key, value]) => 
      value && (
        <Badge key={key} variant="secondary" className="text-xs">
          {key}: {value}
          <Button
            variant="ghost"
            size="sm"
            className="h-3 w-3 p-0 ml-1"
            onClick={() => clearFilter(key)}
          >
            <X className="h-2 w-2" />
          </Button>
        </Badge>
      )
    )}
    <Button
      variant="ghost"
      size="sm"
      onClick={clearAllFilters}
      className="h-5 px-2 text-xs"
    >
      Clear all
    </Button>
  </div>
)}
```

### 9. Toast Notifications

```jsx
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast();

// Success toast
toast({
  title: "Success",
  description: "Operation completed successfully",
});

// Error toast
toast({
  title: "Error",
  description: "Something went wrong",
  variant: "destructive",
});
```

### 10. View Toggle Component

```jsx
import { ViewToggle } from "@/components/ui/view-toggle";

<ViewToggle view={view} onViewChange={setView} />

// Renders toggle between card and table views
```

---

## Animation & Transitions

### Loading Animations
```jsx
// Spinner
<span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />

// Skeleton loading
import { Skeleton } from "@/components/ui/skeleton";
<Skeleton className="h-4 w-full" />

// Page entrance animation
<div className="animate-in fade-in duration-500">
  {content}
</div>
```

### Hover Effects
```css
/* Card hover */
.hover:shadow-md.transition-shadow

/* Button hover effects built into variants */
.hover:bg-primary/90     /* Primary button hover */
.hover:bg-accent         /* Ghost button hover */
.hover:bg-destructive/10 /* Destructive ghost hover */
```

### Transition Classes
```css
.transition-colors    /* Color transitions */
.transition-shadow   /* Shadow transitions */
.transition-all      /* All properties */
```

---

## Implementation Guide

### 1. Setup Tailwind CSS
```bash
npm install tailwindcss postcss autoprefixer
npm install tailwindcss-animate
npm install clsx tailwind-merge
```

### 2. Tailwind Config
```js
// tailwind.config.js
export default {
  darkMode: ["class"],
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        // ... other colors
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### 3. CSS Variables
```css
/* index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* All the CSS variables from the color palette section */
    --background: 210 20% 98%;
    --foreground: 215 25% 15%;
    /* ... etc */
  }
  
  .dark {
    /* Dark mode overrides */
  }
}
```

### 4. Utility Function
```js
// lib/utils.js
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
```

### 5. Required Dependencies
```bash
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select
npm install @radix-ui/react-toast
npm install @radix-ui/react-tooltip
npm install lucide-react
npm install react-router-dom
```

### 6. Project Structure
```
src/
  components/
    ui/                 # Reusable UI components
      button.jsx
      card.jsx
      badge.jsx
      data-table.jsx
      dialog.jsx
      form-input.jsx
      sidebar.jsx
      toast.jsx
    layout/             # Layout components
      AppLayout.jsx
      AppSidebar.jsx
      AppHeader.jsx
  lib/
    utils.js           # Utility functions
  hooks/
    use-toast.js       # Toast hook
  pages/               # Page components
  services/            # API services
```

### 7. Component Implementation Examples

Create each component following the patterns shown in the component library section. Each component should:

1. **Use forwardRef** for proper ref handling
2. **Accept className prop** and merge with default classes
3. **Use CSS variables** for theming
4. **Follow consistent prop patterns**
5. **Include proper TypeScript types** (if using TypeScript)

### 8. Page Template
```jsx
// Page component template
export default function PageName() {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState("card");
  const { toast } = useToast();

  return (
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
            Page Title
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Page description
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle view={view} onViewChange={setView} />
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </div>
      </div>

      {/* Content */}
      {view === "table" ? (
        <Card>
          <DataTable
            columns={columns}
            data={data}
            // ... other props
          />
        </Card>
      ) : (
        <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Card grid */}
        </div>
      )}
    </div>
  );
}
```

---

## Key Implementation Notes

1. **Always use HSL colors** with CSS variables for consistent theming
2. **Responsive design first** - all components should work on mobile
3. **Consistent spacing** - use the spacing scale throughout
4. **Loading states** - always provide loading feedback
5. **Error handling** - use toast notifications for user feedback
6. **Accessibility** - components should be keyboard navigable
7. **Performance** - use React.memo and useMemo where appropriate
8. **TypeScript** - Add proper types for better development experience

This design system provides all the patterns and components needed to create an application that matches the Lens Web Application's look and feel. Follow these guidelines consistently to maintain visual coherence across your application.