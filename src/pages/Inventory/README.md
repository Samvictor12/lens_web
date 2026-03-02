# Inventory Module

This module provides comprehensive inventory management functionality for the lens application.

## Features

- **Inventory Items Management**: Create, edit, view, and delete inventory items with detailed specifications
- **Transaction Management**: Track all inventory movements including inward, outward, transfers, and adjustments
- **Stock Summary**: Real-time view of stock levels across locations and trays
- **Dashboard Analytics**: Key metrics and statistics for inventory overview
- **Advanced Filtering**: Filter inventory by status, location, product, vendor, and date ranges
- **Eye Specifications**: Support for both right and left eye prescriptions with detailed parameters

## Components

### Core Components
- `InventoryMain.jsx` - Main inventory interface with tabbed navigation
- `InventoryForm.jsx` - Form for creating/editing inventory items
- `InventoryCard.jsx` - Card component for displaying inventory items
- `InventoryFilter.jsx` - Advanced filtering interface
- `InventoryTransactionForm.jsx` - Form for inventory transactions

### Configuration
- `Inventory.constants.js` - Constants, enums, and configuration
- `index.js` - Module exports

## Transaction Types

1. **INWARD_PO** - Purchase Order based inward
2. **INWARD_DIRECT** - Direct inward entry
3. **OUTWARD_SALE** - Sale order outward
4. **OUTWARD_RETURN** - Return outward
5. **TRANSFER** - Location to location transfer
6. **ADJUSTMENT** - Stock adjustment
7. **DAMAGE** - Damaged items

## API Integration

The module integrates with the backend inventory service through:
- `/src/services/inventory.js` - API service layer
- Backend endpoints for CRUD operations
- Real-time stock updates and validation

## Navigation

The inventory module is accessible through the sidebar with the following routes:
- `/inventory/items` - Inventory Items
- `/inventory/inward` - Inward Entry
- `/inventory/transactions` - Transactions
- `/inventory/stock` - Stock Summary
- `/inventory/reports` - Reports

## Eye Specification Support

The module supports detailed eye prescriptions including:
- Spherical power
- Cylindrical power  
- Axis
- Add power
- Separate specifications for right and left eyes

## Validation

Comprehensive form validation ensures:
- Required fields are filled
- Quantity constraints based on available stock
- Price validation (selling price >= cost price)
- Date validation (expiry > manufacture date)
- Location and tray combinations

## Stock Management

- Real-time stock level tracking
- Multi-location support
- Tray-level organization
- Quality grade classification
- Batch and serial number tracking
- Expiry date monitoring