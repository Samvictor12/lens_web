-- ==========================================
-- INITIAL SETUP SQL QUERIES
-- ==========================================
-- Run these queries to set up your application
-- with initial department, roles, and admin user
-- ==========================================

-- 1. CREATE DEPARTMENTS
-- ==========================================
INSERT INTO "DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy")
VALUES 
  (1, 'Administration', true, false, NOW(), 1, NOW(), NULL),
  (2, 'Sales', true, false, NOW(), 1, NOW(), NULL),
  (3, 'Accounts', true, false, NOW(), 1, NOW(), NULL),
  (4, 'Inventory', true, false, NOW(), 1, NOW(), NULL),
  (5, 'Production', true, false, NOW(), 1, NOW(), NULL),
  (6, 'Dispatch', true, false, NOW(), 1, NOW(), NULL)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence for DepartmentDetails
SELECT setval('"DepartmentDetails_id_seq"', (SELECT MAX(id) FROM "DepartmentDetails"));


-- 2. CREATE ROLES
-- ==========================================
INSERT INTO "Role" (id, name, "createdAt", "updatedAt")
VALUES 
  (1, 'Admin', NOW(), NOW()),
  (2, 'Sales', NOW(), NOW()),
  (3, 'Accounts', NOW(), NOW()),
  (4, 'Inventory', NOW(), NOW()),
  (5, 'Manager', NOW(), NOW()),
  (6, 'Viewer', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Reset sequence for Role
SELECT setval('"Role_id_seq"', (SELECT MAX(id) FROM "Role"));


-- 3. CREATE PERMISSIONS FOR ADMIN ROLE
-- ==========================================
INSERT INTO "Permission" (action, subject, role_id, "createdAt", "updatedAt")
VALUES 
  -- User Management
  ('manage', 'User', 1, NOW(), NOW()),
  ('create', 'User', 1, NOW(), NOW()),
  ('read', 'User', 1, NOW(), NOW()),
  ('update', 'User', 1, NOW(), NOW()),
  ('delete', 'User', 1, NOW(), NOW()),
  
  -- Role Management
  ('manage', 'Role', 1, NOW(), NOW()),
  ('create', 'Role', 1, NOW(), NOW()),
  ('read', 'Role', 1, NOW(), NOW()),
  ('update', 'Role', 1, NOW(), NOW()),
  ('delete', 'Role', 1, NOW(), NOW()),
  
  -- Department Management
  ('manage', 'Department', 1, NOW(), NOW()),
  ('create', 'Department', 1, NOW(), NOW()),
  ('read', 'Department', 1, NOW(), NOW()),
  ('update', 'Department', 1, NOW(), NOW()),
  ('delete', 'Department', 1, NOW(), NOW()),
  
  -- Customer Management
  ('manage', 'Customer', 1, NOW(), NOW()),
  ('create', 'Customer', 1, NOW(), NOW()),
  ('read', 'Customer', 1, NOW(), NOW()),
  ('update', 'Customer', 1, NOW(), NOW()),
  ('delete', 'Customer', 1, NOW(), NOW()),
  
  -- Vendor Management
  ('manage', 'Vendor', 1, NOW(), NOW()),
  ('create', 'Vendor', 1, NOW(), NOW()),
  ('read', 'Vendor', 1, NOW(), NOW()),
  ('update', 'Vendor', 1, NOW(), NOW()),
  ('delete', 'Vendor', 1, NOW(), NOW()),
  
  -- Sale Order Management
  ('manage', 'SaleOrder', 1, NOW(), NOW()),
  ('create', 'SaleOrder', 1, NOW(), NOW()),
  ('read', 'SaleOrder', 1, NOW(), NOW()),
  ('update', 'SaleOrder', 1, NOW(), NOW()),
  ('delete', 'SaleOrder', 1, NOW(), NOW()),
  
  -- Purchase Order Management
  ('manage', 'PurchaseOrder', 1, NOW(), NOW()),
  ('create', 'PurchaseOrder', 1, NOW(), NOW()),
  ('read', 'PurchaseOrder', 1, NOW(), NOW()),
  ('update', 'PurchaseOrder', 1, NOW(), NOW()),
  ('delete', 'PurchaseOrder', 1, NOW(), NOW()),
  
  -- Inventory Management
  ('manage', 'Inventory', 1, NOW(), NOW()),
  ('create', 'Inventory', 1, NOW(), NOW()),
  ('read', 'Inventory', 1, NOW(), NOW()),
  ('update', 'Inventory', 1, NOW(), NOW()),
  ('delete', 'Inventory', 1, NOW(), NOW()),
  
  -- Business Category Management
  ('manage', 'BusinessCategory', 1, NOW(), NOW()),
  ('create', 'BusinessCategory', 1, NOW(), NOW()),
  ('read', 'BusinessCategory', 1, NOW(), NOW()),
  ('update', 'BusinessCategory', 1, NOW(), NOW()),
  ('delete', 'BusinessCategory', 1, NOW(), NOW()),
  
  -- Lens Masters Management
  ('manage', 'LensMaster', 1, NOW(), NOW()),
  ('create', 'LensMaster', 1, NOW(), NOW()),
  ('read', 'LensMaster', 1, NOW(), NOW()),
  ('update', 'LensMaster', 1, NOW(), NOW()),
  ('delete', 'LensMaster', 1, NOW(), NOW())
ON CONFLICT DO NOTHING;


-- 4. CREATE ADMIN USER
-- ==========================================
-- Default password: demo123
-- NOTE: Change this password immediately after first login!
INSERT INTO "User" (
  id,
  name, 
  email, 
  phonenumber,
  alternatenumber,
  bloodgroup,
  usercode,
  username, 
  password, 
  is_login,
  role_id, 
  address,
  city,
  state,
  pincode,
  salary,
  department_id,
  active_status, 
  delete_status, 
  "createdAt", 
  "createdBy", 
  "updatedAt",
  "updatedBy"
)
VALUES (
  1,
  'System Administrator',
  'admin@lensbilling.com',
  NULL,
  NULL,
  NULL,
  'ADM001',
  'admin',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- bcrypt hash of 'demo123'
  false,
  1, -- Admin role
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  1, -- Administration department
  true,
  false,
  NOW(),
  1,
  NOW(),
  NULL
)
ON CONFLICT (username) DO UPDATE SET
  password = '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  email = 'admin@lensbilling.com',
  "updatedAt" = NOW();

-- Reset sequence for User
SELECT setval('"User_id_seq"', (SELECT MAX(id) FROM "User"));


-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================
-- Run these to verify the data was inserted correctly

-- Check Departments
SELECT * FROM "DepartmentDetails" ORDER BY id;

-- Check Roles
SELECT * FROM "Role" ORDER BY id;

-- Check Admin User
SELECT id, name, email, username, usercode, role_id, department_id, active_status 
FROM "User" 
WHERE username = 'admin';

-- Check Permissions for Admin Role
SELECT p.id, p.action, p.subject, r.name as role_name
FROM "Permission" p
JOIN "Role" r ON p.role_id = r.id
WHERE r.name = 'Admin'
ORDER BY p.subject, p.action;


-- ==========================================
-- PASSWORD HASH INFORMATION
-- ==========================================
-- The password hash above is for 'demo123'
-- Generated using: bcrypt.hash('demo123', 10)
-- Hash: $2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi
--
-- Credentials:
-- Username: admin
-- Password: demo123
