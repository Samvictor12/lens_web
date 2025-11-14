-- ==========================================
-- TRUNCATE ALL TABLES - DATABASE RESET
-- ==========================================
-- ⚠️  WARNING: This will DELETE ALL DATA from your database!
-- ⚠️  Use with extreme caution - preferably only on development databases
-- ==========================================

-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Order matters: Delete child tables before parent tables to avoid FK violations

-- 1. Payments (child of Invoice)
TRUNCATE TABLE "Payment" RESTART IDENTITY CASCADE;

-- 2. Invoices (referenced by SaleOrder)
TRUNCATE TABLE "Invoice" RESTART IDENTITY CASCADE;

-- 3. Dispatch Copies (referenced by SaleOrder)
TRUNCATE TABLE "DispatchCopy" RESTART IDENTITY CASCADE;

-- 4. Purchase Orders (child of SaleOrder and Vendor)
TRUNCATE TABLE "PurchaseOrder" RESTART IDENTITY CASCADE;

-- 5. Sale Orders (references Customer, Invoice, DispatchCopy)
TRUNCATE TABLE "SaleOrder" RESTART IDENTITY CASCADE;

-- 6. Lens Price Master (references LensProductMaster, LensCoatingMaster)
TRUNCATE TABLE "LensPriceMaster" RESTART IDENTITY CASCADE;

-- 7. Lens Product Master (references multiple lens masters)
TRUNCATE TABLE "LensProductMaster" RESTART IDENTITY CASCADE;

-- 8. Lens Masters (no children now)
TRUNCATE TABLE "LensTypeMaster" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "LensBrandMaster" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "LensCoatingMaster" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "LensMaterialMaster" RESTART IDENTITY CASCADE;
TRUNCATE TABLE "LensCategoryMaster" RESTART IDENTITY CASCADE;

-- 9. Customers (referenced by SaleOrder, DispatchCopy)
TRUNCATE TABLE "Customer" RESTART IDENTITY CASCADE;

-- 10. Vendors (referenced by PurchaseOrder)
TRUNCATE TABLE "Vendor" RESTART IDENTITY CASCADE;

-- 11. Business Categories (referenced by Customer)
TRUNCATE TABLE "businessCategory" RESTART IDENTITY CASCADE;

-- 12. Refresh Tokens (child of User)
TRUNCATE TABLE "refresh_tokens" RESTART IDENTITY CASCADE;

-- 13. Permissions (child of Role)
TRUNCATE TABLE "Permission" RESTART IDENTITY CASCADE;

-- 14. Users (references Role, DepartmentDetails, and many others)
TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;

-- 15. Roles (referenced by User, Permission)
TRUNCATE TABLE "Role" RESTART IDENTITY CASCADE;

-- 16. Departments (referenced by User)
TRUNCATE TABLE "DepartmentDetails" RESTART IDENTITY CASCADE;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';

-- ==========================================
-- VERIFICATION - Check if all tables are empty
-- ==========================================

SELECT 'DepartmentDetails' as table_name, COUNT(*) as row_count FROM "DepartmentDetails"
UNION ALL
SELECT 'User', COUNT(*) FROM "User"
UNION ALL
SELECT 'Role', COUNT(*) FROM "Role"
UNION ALL
SELECT 'Permission', COUNT(*) FROM "Permission"
UNION ALL
SELECT 'RefreshToken', COUNT(*) FROM "refresh_tokens"
UNION ALL
SELECT 'businessCategory', COUNT(*) FROM "businessCategory"
UNION ALL
SELECT 'Customer', COUNT(*) FROM "Customer"
UNION ALL
SELECT 'Vendor', COUNT(*) FROM "Vendor"
UNION ALL
SELECT 'LensCategoryMaster', COUNT(*) FROM "LensCategoryMaster"
UNION ALL
SELECT 'LensMaterialMaster', COUNT(*) FROM "LensMaterialMaster"
UNION ALL
SELECT 'LensCoatingMaster', COUNT(*) FROM "LensCoatingMaster"
UNION ALL
SELECT 'LensBrandMaster', COUNT(*) FROM "LensBrandMaster"
UNION ALL
SELECT 'LensTypeMaster', COUNT(*) FROM "LensTypeMaster"
UNION ALL
SELECT 'LensProductMaster', COUNT(*) FROM "LensProductMaster"
UNION ALL
SELECT 'LensPriceMaster', COUNT(*) FROM "LensPriceMaster"
UNION ALL
SELECT 'SaleOrder', COUNT(*) FROM "SaleOrder"
UNION ALL
SELECT 'Invoice', COUNT(*) FROM "Invoice"
UNION ALL
SELECT 'Payment', COUNT(*) FROM "Payment"
UNION ALL
SELECT 'PurchaseOrder', COUNT(*) FROM "PurchaseOrder"
UNION ALL
SELECT 'DispatchCopy', COUNT(*) FROM "DispatchCopy"
ORDER BY table_name;

-- ==========================================
-- RESULT: All tables should show 0 rows
-- ==========================================
