-- ==========================================
-- INITIAL SETUP SQL QUERIES
-- ==========================================
-- Run these queries to set up your application
-- with initial department, roles, and admin user
-- ==========================================

-- 1. CREATE DEPARTMENTS
-- ==========================================
INSERT INTO "DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt")
VALUES 
  (1, 'Administration', true, false, NOW(), 1, NOW()),
  (2, 'Sales', true, false, NOW(), 1, NOW()),
  (3, 'Accounts', true, false, NOW(), 1, NOW()),
  (4, 'Inventory', true, false, NOW(), 1, NOW()),
  (5, 'Production', true, false, NOW(), 1, NOW()),
  (6, 'Dispatch', true, false, NOW(), 1, NOW())
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
-- Default password: Admin@123
-- NOTE: Change this password immediately after first login!
INSERT INTO "User" (
  id,
  name, 
  email, 
  username, 
  usercode,
  password, 
  role_id, 
  department_id,
  active_status, 
  delete_status, 
  "createdAt", 
  "createdBy", 
  "updatedAt"
)
VALUES (
  1,
  'System Administrator',
  'admin@lensapp.com',
  'admin',
  'USR001',
  '$2b$10$YourHashedPasswordHere', -- Replace with actual bcrypt hash of 'Admin@123'
  1, -- Admin role
  1, -- Administration department
  true,
  false,
  NOW(),
  1,
  NOW()
)
ON CONFLICT (username) DO NOTHING;

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
-- TO GENERATE PASSWORD HASH
-- ==========================================
-- Use Node.js to generate the bcrypt hash:
-- 
-- const bcrypt = require('bcrypt');
-- const password = 'Admin@123';
-- bcrypt.hash(password, 10).then(hash => console.log(hash));
--
-- Then replace the password hash in the INSERT statement above
