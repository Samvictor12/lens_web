# Database Seed Summary

## 🎉 Successfully Loaded Dummy Data

The database has been reset and populated with comprehensive test data for manual testing.

---

## 🔐 Login Credentials

### Admin User
- **Email:** admin@lensbilling.com
- **Password:** demo123
- **Role:** Admin (Full access to all features)
- **User Code:** ADM001

### Sales User
- **Email:** sales@lensbilling.com
- **Password:** demo123
- **Role:** Sales (Create/manage sale orders, customers)
- **User Code:** SAL001

### Inventory User
- **Email:** inventory@lensbilling.com
- **Password:** demo123
- **Role:** Inventory (Manage purchase orders, vendors)
- **User Code:** INV001

### Accounts User
- **Email:** accounts@lensbilling.com
- **Password:** demo123
- **Role:** Accounts (View invoices, payments)
- **User Code:** ACC001

---

## 📊 Loaded Data Summary

### 👥 Users
- **System Admin** (System)
- **Admin User** (Administration Department)
- **Sales User** (Sales Department)
- **Inventory User** (Inventory Department)
- **Accounts User** (Accounts Department)

### 🏪 Business Categories
1. **Retail**
2. **Wholesale**
3. **Corporate**

### 👓 Lens Master Data

#### Categories
1. **Single Vision** - Standard single vision lenses
2. **Progressive** - Multi-focal progressive lenses
3. **Bifocal** - Bifocal lenses

#### Materials
1. **Plastic (CR-39)** - Standard plastic material
2. **Polycarbonate** - Impact resistant material
3. **High Index 1.67** - Thin and light material

#### Coatings
1. **Anti-Reflective Coating (AR)** - Reduces glare and reflections
2. **Blue Light Protection (BLP)** - Blocks harmful blue light
3. **UV Protection (UV)** - UV400 protection

#### Brands
1. **Essilor** - Premium French lens brand
2. **Zeiss** - German precision optics
3. **Hoya** - Japanese optical technology

#### Types
1. **Spherical** - Standard spherical design
2. **Aspheric** - Flatter, thinner profile

#### Fittings
1. **Standard Fitting (STD)**
2. **Premium Fitting (PRM)**

#### Diameters
1. **65mm** - Small diameter
2. **70mm** - Standard diameter
3. **75mm** - Large diameter

#### Tinting
1. **Clear (CLR)** - No tint
2. **Light Gray (LG)** - Light gray tint
3. **Brown (BRN)** - Brown tint

### 🔬 Lens Products
1. **Essilor Single Vision Standard** (ESS-SV-001)
   - Category: Single Vision
   - Material: Plastic (CR-39)
   - Type: Spherical
   - Index: 1.56

2. **Zeiss Progressive Premium** (ZIS-PRG-001)
   - Category: Progressive
   - Material: High Index 1.67
   - Type: Aspheric
   - Index: 1.67
   - Add power: 0.75 to 3.5

3. **Hoya Single Vision Aspheric** (HOY-SV-002)
   - Category: Single Vision
   - Material: Polycarbonate
   - Type: Aspheric
   - Index: 1.59

### 💰 Lens Prices
- Essilor SV + AR Coating: ₹1,500
- Essilor SV + Blue Light: ₹2,000
- Zeiss Progressive + AR: ₹5,000
- Zeiss Progressive + Blue Light: ₹6,500
- Hoya SV Aspheric + UV: ₹3,500

### 🏭 Vendors
1. **OptiLens Suppliers** (VEND-001)
   - Shop: OptiLens Store
   - Location: Mumbai, Maharashtra
   - Contact: +91-9876543210
   - Email: contact@optilens.com
   - Category: Lens Supplier

2. **Vision Care Products** (VEND-002)
   - Shop: Vision Care Hub
   - Location: Delhi
   - Contact: +91-9876543211
   - Email: sales@visioncare.com
   - Category: Eye Care Products

### 👥 Customers
1. **Rahul Kumar** (CUST-001)
   - Shop: Rahul Opticals
   - Category: Retail
   - Location: Chennai, Tamil Nadu
   - Contact: +91-9876543212
   - Email: rahul@rahulopticals.com
   - Credit Limit: ₹50,000
   - Outstanding: ₹15,000

2. **Priya Singh** (CUST-002)
   - Shop: Priya Eye Care
   - Category: Wholesale
   - Location: Bangalore, Karnataka
   - Contact: +91-9876543213
   - Email: priya@priyaeyecare.com
   - Credit Limit: ₹100,000
   - Outstanding: ₹25,000

3. **Amit Patel** (CUST-003)
   - Shop: Amit Vision Center
   - Category: Corporate
   - Location: Hyderabad, Telangana
   - Contact: +91-9876543214
   - Email: amit@amitvision.com
   - Credit Limit: ₹150,000
   - Outstanding: ₹45,000

### 📝 Sale Orders
1. **SO-2024-001** (Rahul Kumar)
   - Status: **CONFIRMED**
   - Type: Standard
   - Lens: Essilor Single Vision Standard
   - Coating: Anti-Reflective
   - Both Eyes: Right (-2.00/-0.50 x 90°), Left (-2.25/-0.75 x 85°)
   - Price: ₹1,500 with 10% discount
   - Remark: Urgent delivery required

2. **SO-2024-002** (Priya Singh)
   - Status: **IN_PRODUCTION**
   - Type: Premium
   - Lens: Zeiss Progressive Premium
   - Coating: Blue Light Protection
   - Both Eyes: Right (-3.50/-1.00 x 180° Add +2.00), Left (-3.75/-1.25 x 175° Add +2.00)
   - Price: ₹6,500 with 15% discount
   - Remark: Progressive lenses for computer work

3. **SO-2024-003** (Amit Patel)
   - Status: **DRAFT**
   - Type: Standard
   - Lens: Hoya Single Vision Aspheric
   - Coating: UV Protection
   - Right Eye Only: (-1.50/-0.25 x 45°)
   - Price: ₹3,500 with 5% discount

4. **SO-2024-004** (Rahul Kumar)
   - Status: **DELIVERED**
   - Type: Standard
   - Lens: Essilor Single Vision Standard
   - Coating: Anti-Reflective
   - Both Eyes: Right (-4.00), Left (-4.25)
   - Price: ₹1,500 with no discount

---

## 🧪 Testing the System

### Server is Running
- **Backend API:** http://localhost:3001
- **Swagger API Docs:** http://localhost:3001/api-docs
- **Health Check:** http://localhost:3001/api/health

### API Endpoints to Test

#### Authentication
- POST `/api/auth/login` - Login with any user credentials above
- POST `/api/auth/logout` - Logout

#### Sale Orders
- GET `/api/sale-orders` - List all sale orders (with pagination)
- GET `/api/sale-orders/:id` - Get specific sale order
- POST `/api/sale-orders` - Create new sale order
- PUT `/api/sale-orders/:id` - Update sale order
- PATCH `/api/sale-orders/:id/status` - Update status only
- PATCH `/api/sale-orders/:id/dispatch` - Update dispatch info
- DELETE `/api/sale-orders/:id` - Delete sale order
- GET `/api/sale-orders/stats` - Get statistics

#### Customer Master
- GET `/api/customer-master` - List customers
- GET `/api/customer-master/:id` - Get specific customer
- POST `/api/customer-master` - Create new customer
- PUT `/api/customer-master/:id` - Update customer
- DELETE `/api/customer-master/:id` - Delete customer
- GET `/api/customer-master/dropdown` - Get dropdown list
- GET `/api/customer-master/stats` - Get statistics

#### Vendor Master
- Similar endpoints as customer master at `/api/vendor-master`

#### Business Categories
- GET `/api/business-category` - List categories
- POST `/api/business-category` - Create category
- PUT `/api/business-category/:id` - Update category

#### Lens Masters
- `/api/v1/lens-categories` - Lens categories
- `/api/v1/lens-materials` - Lens materials
- `/api/v1/lens-coatings` - Lens coatings
- `/api/v1/lens-brands` - Lens brands
- `/api/v1/lens-types` - Lens types
- `/api/v1/lens-products` - Lens products
- `/api/v1/lens-prices` - Lens prices
- `/api/lens-fittings` - Lens fittings
- `/api/lens-dias` - Lens diameters

---

## 🎯 What You Can Test

### 1. User Authentication
- Login with different user roles
- Test role-based access control

### 2. Sale Order Management
- View existing sale orders in different statuses
- Create new sale orders with customer selection
- Update order details
- Change order status (DRAFT → CONFIRMED → IN_PRODUCTION → READY_FOR_DISPATCH → DELIVERED)
- Update dispatch information
- View order statistics

### 3. Customer Management
- View customer list with filters
- Create new customers
- Update customer information
- Check credit limits and outstanding amounts

### 4. Master Data Management
- Browse lens products
- View lens prices
- Check available coatings, materials, brands

### 5. Search and Filters
- Filter sale orders by status
- Filter by customer
- Pagination testing
- Search customers by name, city, category

---

## 📝 Notes

- All authentication middleware is temporarily disabled for easy testing
- You can test APIs directly without JWT tokens
- Use Swagger UI for interactive API testing
- Database has foreign key relationships maintained
- All IDs are auto-generated

---

## 🔄 Reset Database

If you need to reset and reload the data:

```bash
npx prisma migrate reset --force
```

This will:
1. Drop all tables
2. Re-run all migrations
3. Automatically run the seed script
4. Populate fresh dummy data

---

**Happy Testing! 🚀**
