--
-- PostgreSQL database dump
--

\restrict jMRVykCHKOE5FGoefJl7R7Yk3iaoRQAa0u0nzASeIKsgCl7tcu4Ph0IJZX6Xg9t

-- Dumped from database version 15.18
-- Dumped by pg_dump version 15.18

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: DepartmentDetails; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (1, 'System', true, false, '2026-06-22 15:14:45.29', 1, '2026-06-22 15:14:45.29', NULL);
INSERT INTO public."DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (2, 'Sales', true, false, '2026-06-22 15:14:45.301', 1, '2026-06-22 15:14:45.301', NULL);
INSERT INTO public."DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (3, 'Accounts', true, false, '2026-06-22 15:14:45.302', 1, '2026-06-22 15:14:45.302', NULL);
INSERT INTO public."DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (4, 'Delivery', true, false, '2026-06-22 18:15:56.059', 1, '2026-06-22 18:15:56.059', 1);
INSERT INTO public."DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (6, 'Production', true, false, '2026-06-30 09:00:22.33', 1, '2026-06-30 09:00:22.33', 1);
INSERT INTO public."DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (5, 'QC', true, false, '2026-06-30 08:57:51.256', 1, '2026-07-08 04:17:28.487', 1);


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Role" (id, name, "createdAt", "updatedAt", active_status, description) VALUES (1, 'System', '2026-06-22 15:14:45.235', '2026-06-22 15:14:45.235', true, NULL);
INSERT INTO public."Role" (id, name, "createdAt", "updatedAt", active_status, description) VALUES (3, 'QC', '2026-07-03 11:04:33.916', '2026-07-03 11:04:33.916', true, NULL);
INSERT INTO public."Role" (id, name, "createdAt", "updatedAt", active_status, description) VALUES (2, 'Sales', '2026-07-03 10:42:35.865', '2026-07-08 04:18:32.596', true, NULL);
INSERT INTO public."Role" (id, name, "createdAt", "updatedAt", active_status, description) VALUES (5, 'Delivery', '2026-07-08 04:19:58.308', '2026-07-08 04:19:58.308', true, NULL);
INSERT INTO public."Role" (id, name, "createdAt", "updatedAt", active_status, description) VALUES (6, 'Production', '2026-07-08 04:22:35.595', '2026-07-08 04:22:35.595', true, NULL);
INSERT INTO public."Role" (id, name, "createdAt", "updatedAt", active_status, description) VALUES (4, 'Fitting', '2026-07-03 11:07:55.168', '2026-07-08 04:24:28.139', true, NULL);


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."User" (id, name, email, phonenumber, alternatenumber, bloodgroup, usercode, username, password, is_login, role_id, address, city, state, pincode, salary, department_id, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (1, 'System Admin', 'system@lensbilling.com', NULL, NULL, NULL, 'admin001', 'system', '$2b$10$hYZkIyvQ5XtUq2vdKb3siebKZb7/AQsVd210uyOMDyr0TpwOOXf7e', true, 1, NULL, NULL, NULL, NULL, NULL, 1, true, false, '2026-06-22 15:14:45.288', 1, '2026-06-22 15:14:45.288', NULL);
INSERT INTO public."User" (id, name, email, phonenumber, alternatenumber, bloodgroup, usercode, username, password, is_login, role_id, address, city, state, pincode, salary, department_id, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (4, 'Chinna', 'chinna@gmail.com', '8056159149', NULL, 'A+', 'USR003', 'user_USR003', '$2b$10$wBOIt0b7BKHeH3jefeenNuN5GNREtn6Aut5IsjzkMbUgHpyStKlMS', false, NULL, 'Dharmaraja', 'Chennai', 'Tamil Nadu', '600116', NULL, 6, true, false, '2026-06-30 09:01:22.36', 1, '2026-06-30 09:01:22.36', NULL);
INSERT INTO public."User" (id, name, email, phonenumber, alternatenumber, bloodgroup, usercode, username, password, is_login, role_id, address, city, state, pincode, salary, department_id, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (2, 'Pradeep', 'pradeepkumar@visionitech.in', NULL, NULL, 'A+', 'USR001', 'user_USR001', '$2b$10$sAj25kkmLJJa.bUwxQ0OZuLqvClf5J6yqLtMduVrLvqUxx9c8S9Ka', false, NULL, NULL, NULL, NULL, NULL, 25000, 2, true, false, '2026-06-29 06:09:31.83', 1, '2026-07-03 10:43:47.632', 1);
INSERT INTO public."User" (id, name, email, phonenumber, alternatenumber, bloodgroup, usercode, username, password, is_login, role_id, address, city, state, pincode, salary, department_id, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (3, 'Suresh', 'ranjithran@gmail.com', '8940437031', NULL, NULL, 'USR002', 'user_USR002', '$2b$10$lixSxmIlq666o0.VT8z/fenHn11Bp35EFLsi5sRVWj5SZlSGWHpcy', true, NULL, 'Dharmaraja', 'Chennai', 'Tamil Nadu', '600116', NULL, 5, true, false, '2026-06-30 08:59:06.048', 1, '2026-07-08 04:20:37.333', 1);


--
-- Data for Name: AccountGroup; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (1, 'GRP-ASSETS', 'Assets', 'ASSET', NULL, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 10, true, false, '2026-07-05 19:58:18.266', 1, '2026-07-05 19:58:18.266', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (2, 'GRP-LIABILITIES', 'Liabilities', 'LIABILITY', NULL, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 20, true, false, '2026-07-05 19:58:18.272', 1, '2026-07-05 19:58:18.272', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (3, 'GRP-CAPITAL', 'Capital', 'EQUITY', NULL, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 30, true, false, '2026-07-05 19:58:18.274', 1, '2026-07-05 19:58:18.274', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (4, 'GRP-INCOME', 'Income', 'INCOME', NULL, 'PROFIT_LOSS', 'NOT_APPLICABLE', true, 40, true, false, '2026-07-05 19:58:18.276', 1, '2026-07-05 19:58:18.276', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (5, 'GRP-EXPENSES', 'Expenses', 'EXPENSE', NULL, 'PROFIT_LOSS', 'NOT_APPLICABLE', true, 50, true, false, '2026-07-05 19:58:18.278', 1, '2026-07-05 19:58:18.278', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (6, 'GRP-CURRENT-ASSETS', 'Current Assets', 'ASSET', 1, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 11, true, false, '2026-07-05 19:58:18.28', 1, '2026-07-05 19:58:18.28', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (7, 'GRP-CASH', 'Cash-in-Hand', 'ASSET', 6, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 12, true, false, '2026-07-05 19:58:18.283', 1, '2026-07-05 19:58:18.283', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (8, 'GRP-BANK', 'Bank Accounts', 'ASSET', 6, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 13, true, false, '2026-07-05 19:58:18.285', 1, '2026-07-05 19:58:18.285', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (9, 'GRP-SUNDRY-DEBTORS', 'Sundry Debtors', 'ASSET', 6, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 14, true, false, '2026-07-05 19:58:18.287', 1, '2026-07-05 19:58:18.287', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (10, 'GRP-INVENTORY', 'Inventory / Stock', 'ASSET', 6, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 15, true, false, '2026-07-05 19:58:18.308', 1, '2026-07-05 19:58:18.308', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (11, 'GRP-GST-INPUT', 'GST Input Credit', 'ASSET', 6, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 16, true, false, '2026-07-05 19:58:18.311', 1, '2026-07-05 19:58:18.311', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (12, 'GRP-CURRENT-LIAB', 'Current Liabilities', 'LIABILITY', 2, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 21, true, false, '2026-07-05 19:58:18.314', 1, '2026-07-05 19:58:18.314', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (13, 'GRP-SUNDRY-CREDITORS', 'Sundry Creditors', 'LIABILITY', 12, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 22, true, false, '2026-07-05 19:58:18.316', 1, '2026-07-05 19:58:18.316', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (14, 'GRP-GST-OUTPUT', 'GST Output Payable', 'LIABILITY', 12, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 23, true, false, '2026-07-05 19:58:18.318', 1, '2026-07-05 19:58:18.318', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (15, 'GRP-TDS', 'TDS Payable', 'LIABILITY', 12, 'BALANCE_SHEET', 'NOT_APPLICABLE', true, 24, true, false, '2026-07-05 19:58:18.32', 1, '2026-07-05 19:58:18.32', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (16, 'GRP-DIRECT-INCOME', 'Direct Income', 'INCOME', 4, 'PROFIT_LOSS', 'DIRECT_INCOME', true, 41, true, false, '2026-07-05 19:58:18.322', 1, '2026-07-05 19:58:18.322', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (17, 'GRP-INDIRECT-INCOME', 'Indirect Income', 'INCOME', 4, 'PROFIT_LOSS', 'INDIRECT_INCOME', true, 42, true, false, '2026-07-05 19:58:18.323', 1, '2026-07-05 19:58:18.323', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (18, 'GRP-DIRECT-EXP', 'Direct Expenses (COGS)', 'EXPENSE', 5, 'PROFIT_LOSS', 'DIRECT_EXPENSE', true, 51, true, false, '2026-07-05 19:58:18.325', 1, '2026-07-05 19:58:18.325', NULL);
INSERT INTO public."AccountGroup" (id, "groupCode", "groupName", nature, "parentGroupId", "reportSection", "pnlClassification", "isSystemGroup", "sortOrder", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (19, 'GRP-INDIRECT-EXP', 'Indirect Expenses (Opex)', 'EXPENSE', 5, 'PROFIT_LOSS', 'INDIRECT_EXPENSE', true, 52, true, false, '2026-07-05 19:58:18.327', 1, '2026-07-05 19:58:18.327', NULL);


--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: CheckSheetMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: CheckSheetItem; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: CompanySettings; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (7, 'AC-2002', 'TDS Payable', 'LIABILITY', NULL, 0.00, 0.00, 'Tax deducted at source payable', false, NULL, true, false, '2026-06-25 11:57:58.107', 1, '2026-07-05 19:58:18.344', NULL, 15, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (8, 'AC-2003', 'GST Output Collected', 'LIABILITY', NULL, 0.00, 0.00, 'GST collected on sales', true, NULL, true, false, '2026-06-25 11:57:58.11', 1, '2026-07-05 19:58:18.345', NULL, 14, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (10, 'AC-3002', 'Other Income', 'INCOME', NULL, 0.00, 0.00, 'Miscellaneous income', false, NULL, true, false, '2026-06-25 11:57:58.114', 1, '2026-07-05 19:58:18.348', NULL, 17, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (11, 'AC-4001', 'Purchase / COGS', 'EXPENSE', NULL, 0.00, 0.00, 'Cost of goods purchased', true, NULL, true, false, '2026-06-25 11:57:58.116', 1, '2026-07-05 19:58:18.35', NULL, 18, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (19, 'AC-5001', 'Owner''s Capital', 'EQUITY', NULL, 0.00, 0.00, 'Owner investment', true, NULL, true, false, '2026-06-25 11:57:58.135', 1, '2026-07-05 19:58:18.351', NULL, 3, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (20, 'AC-5002', 'Retained Earnings', 'EQUITY', NULL, 0.00, 0.00, 'Accumulated profits', true, NULL, true, false, '2026-06-25 11:57:58.137', 1, '2026-07-05 19:58:18.352', NULL, 3, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (12, 'AC-4002', 'Salary & Wages', 'EXPENSE', NULL, 0.00, 0.00, 'Employee salaries', false, NULL, true, false, '2026-06-25 11:57:58.118', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (13, 'AC-4003', 'Rent Expense', 'EXPENSE', NULL, 0.00, 0.00, 'Shop and office rent', false, NULL, true, false, '2026-06-25 11:57:58.12', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (14, 'AC-4004', 'Utilities', 'EXPENSE', NULL, 0.00, 0.00, 'Electricity, water, internet', false, NULL, true, false, '2026-06-25 11:57:58.122', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (15, 'AC-4005', 'Transport & Logistics', 'EXPENSE', NULL, 0.00, 0.00, 'Delivery and freight costs', false, NULL, true, false, '2026-06-25 11:57:58.125', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (16, 'AC-4006', 'Marketing & Advertising', 'EXPENSE', NULL, 0.00, 0.00, 'Promotional spend', false, NULL, true, false, '2026-06-25 11:57:58.127', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (17, 'AC-4007', 'Office Supplies', 'EXPENSE', NULL, 0.00, 0.00, 'Stationery and consumables', false, NULL, true, false, '2026-06-25 11:57:58.13', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (18, 'AC-4008', 'Repairs & Maintenance', 'EXPENSE', NULL, 0.00, 0.00, 'Equipment upkeep', false, NULL, true, false, '2026-06-25 11:57:58.132', 1, '2026-07-05 19:58:18.355', NULL, 19, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (5, 'AC-1005', 'GST Input Credit', 'ASSET', NULL, 0.00, 0.00, 'GST paid on purchases', true, NULL, true, false, '2026-06-25 11:57:58.101', 1, '2026-07-09 04:57:33.09', NULL, 11, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (4, 'AC-1004', 'Inventory / Stock', 'ASSET', NULL, 0.00, 0.00, 'Lens stock value', true, NULL, true, false, '2026-06-25 11:57:58.099', 1, '2026-07-13 10:12:06.323', NULL, 10, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (21, 'AC-2001-V1', 'Bonzer (Vendor AP)', 'LIABILITY', 6, 0.00, 0.00, NULL, false, NULL, true, false, '2026-06-25 12:16:45.505', 1, '2026-07-13 10:12:06.325', 1, 13, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (6, 'AC-2001', 'Accounts Payable', 'LIABILITY', NULL, 0.00, 0.00, 'Vendor outstanding', true, NULL, true, false, '2026-06-25 11:57:58.104', 1, '2026-07-13 10:12:06.326', NULL, 13, true, false);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (2, 'AC-1003-C3', 'American Eye Care Centre (Customer AR)', 'ASSET', 3, 0.00, 0.00, NULL, false, NULL, true, false, '2026-07-02 05:13:35.33', 1, '2026-07-13 10:16:37.764', NULL, 9, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (9, 'AC-3001', 'Sales Revenue', 'INCOME', NULL, 0.00, 0.00, 'Net lens sales revenue', true, NULL, true, false, '2026-06-25 11:57:58.112', 1, '2026-07-13 10:16:37.768', NULL, 16, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (1, 'AC-1001', 'Petty Cash', 'ASSET', NULL, 0.00, 0.00, 'Physical cash at premises', true, NULL, true, false, '2026-06-25 11:57:58.073', 1, '2026-07-13 16:11:26.644', NULL, 7, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (22, 'AC-1003-C1', 'ABBAS OPTICALS (Customer AR)', 'ASSET', 3, 0.00, 0.00, NULL, false, NULL, true, false, '2026-06-25 12:16:45.536', 1, '2026-07-13 16:11:26.646', NULL, 9, false, true);
INSERT INTO public."Ledger" (id, "ledgerCode", "ledgerName", "ledgerType", "parentLedgerId", "openingBalance", "currentBalance", description, "isSystemLedger", "bankDetails", active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", "accountGroupId", "isGroupLedger", "allowsDirectPosting") VALUES (3, 'AC-1003', 'Accounts Receivable', 'ASSET', NULL, 0.00, 0.00, 'Customer outstanding', true, NULL, true, false, '2026-06-25 11:57:58.095', 1, '2026-07-13 16:11:26.647', NULL, 9, true, false);


--
-- Data for Name: businessCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."businessCategory" (id, name, "createdAt", "updatedAt", active_status, delete_status, "createdBy", "updatedBy") VALUES (1, 'CHAIN RETAIL', '2026-07-02 05:11:07.459', '2026-07-02 05:11:07.459', true, false, 1, 1);
INSERT INTO public."businessCategory" (id, name, "createdAt", "updatedAt", active_status, delete_status, "createdBy", "updatedBy") VALUES (2, 'Institution', '2026-07-02 05:11:21.402', '2026-07-02 05:11:21.402', true, false, 1, 1);
INSERT INTO public."businessCategory" (id, name, "createdAt", "updatedAt", active_status, delete_status, "createdBy", "updatedBy") VALUES (3, 'Retail', '2026-07-02 05:11:28.753', '2026-07-02 05:11:28.753', true, false, 1, 1);
INSERT INTO public."businessCategory" (id, name, "createdAt", "updatedAt", active_status, delete_status, "createdBy", "updatedBy") VALUES (4, 'Wholesale', '2026-07-02 05:11:35.41', '2026-07-02 05:11:35.41', true, false, 1, 1);


--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Customer" (id, code, name, shopname, phone, alternatephone, email, address, city, state, pincode, "businessCategory_id", gstin, credit_limit, outstanding_credit, notes, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", delivery_person_id, sale_person_id, portal_token, portal_pin_hash, portal_active, portal_activated_at, portal_pin_changed_at, portal_last_accessed, "ledgerId", reserved_amount, advance_credit) VALUES (3, 'VIT-002', 'American Eye Care Centre', 'AEO', NULL, NULL, 'chennai@aeo.com', NULL, NULL, NULL, NULL, 2, NULL, 150000, NULL, NULL, true, false, '2026-07-02 05:13:35.324', 1, '2026-07-13 10:15:47.298', NULL, 2, NULL, NULL, NULL, false, NULL, NULL, NULL, 2, 0, 0);
INSERT INTO public."Customer" (id, code, name, shopname, phone, alternatephone, email, address, city, state, pincode, "businessCategory_id", gstin, credit_limit, outstanding_credit, notes, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", delivery_person_id, sale_person_id, portal_token, portal_pin_hash, portal_active, portal_activated_at, portal_pin_changed_at, portal_last_accessed, "ledgerId", reserved_amount, advance_credit) VALUES (1, 'VIT 001', 'ABBAS OPTICALS', 'ABBAS OPTICALS', NULL, NULL, 'abbas@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, 350000, NULL, NULL, true, false, '2026-06-22 17:40:19.959', 1, '2026-07-13 16:11:26.603', 1, 2, NULL, NULL, NULL, false, NULL, NULL, NULL, 22, 0, 0);


--
-- Data for Name: CustomerPaymentVoucher; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: CustomerPaymentVoucherItem; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: DispatchCopy; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ErrorLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

--
-- Data for Name: ExpenseCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Expense; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ExpenseLog; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: FinancialTransaction; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: LensBrandMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 'Nexgen Ai', '8k Freeform Prog', true, false, '2026-06-22 15:50:51.469', '2026-06-22 15:50:51.469', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 'Pristine', 'Entry Level FF Prog', true, false, '2026-06-22 15:51:37.11', '2026-06-22 15:51:37.11', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, 'Ease Advance', 'Value FF Prog', true, false, '2026-06-22 15:52:44.32', '2026-06-22 15:52:44.32', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (4, 'Ewise ', 'Value FF Prog', true, false, '2026-06-22 15:53:21.601', '2026-06-22 15:53:21.601', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (5, 'Emax HD', 'HD FF Prog', true, false, '2026-06-22 15:53:41.431', '2026-06-22 15:53:41.431', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (6, 'Pixel+ HD', 'HD FF Prog', true, false, '2026-06-22 15:54:14.321', '2026-06-22 15:54:14.321', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (7, 'Viewsmart HD', 'HD FF Prog', true, false, '2026-06-22 15:54:45.486', '2026-06-22 15:54:45.486', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (8, 'Clair Rx Conventional', 'Conventional Rx', true, false, '2026-06-22 15:58:34.467', '2026-06-22 15:58:34.467', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (9, 'Skolar Myopia', 'Myopia Control Lens', true, false, '2026-06-22 16:02:51.699', '2026-06-22 16:02:51.699', 1, 1);
INSERT INTO public."LensBrandMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (10, 'Clair Stock', 'Stock Range Lenses', true, false, '2026-06-22 16:03:42.722', '2026-06-22 16:03:42.722', 1, 1);


--
-- Data for Name: LensCategoryMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensCategoryMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 'Single Vision', NULL, true, false, '2026-06-22 15:15:57.106', '2026-06-22 15:15:57.106', 1, 1);
INSERT INTO public."LensCategoryMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 'Bifocal', NULL, true, false, '2026-06-22 15:16:11.24', '2026-06-22 15:16:11.24', 1, 1);
INSERT INTO public."LensCategoryMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, 'Progressive', NULL, true, false, '2026-06-22 15:16:21.01', '2026-06-22 15:16:21.01', 1, 1);


--
-- Data for Name: LensIndexMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensIndexMaster" (id, index_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, '1.56', 'Standard index 1.56', true, false, '2026-06-27 11:18:00.996', '2026-06-27 11:18:00.996', 1, NULL);
INSERT INTO public."LensIndexMaster" (id, index_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, '1.59', 'Mid index 1.59', true, false, '2026-06-27 11:18:00.996', '2026-06-27 11:18:00.996', 1, NULL);
INSERT INTO public."LensIndexMaster" (id, index_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, '1.61', 'Mid-high index 1.61', true, false, '2026-06-27 11:18:00.996', '2026-06-27 11:18:00.996', 1, NULL);
INSERT INTO public."LensIndexMaster" (id, index_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (4, '1.67', 'High index 1.67', true, false, '2026-06-27 11:18:00.996', '2026-06-27 11:18:00.996', 1, NULL);
INSERT INTO public."LensIndexMaster" (id, index_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (5, '1.74', 'Ultra high index 1.74', true, false, '2026-06-27 11:18:00.996', '2026-06-27 11:18:00.996', 1, NULL);


--
-- Data for Name: LensMaterialMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensMaterialMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 'CR', 'CR-39', true, false, '2026-06-22 15:44:16.389', '2026-06-22 15:44:16.389', 1, 1);
INSERT INTO public."LensMaterialMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 'MR-8', 'Mitsui Resin ', true, false, '2026-06-22 15:44:42.066', '2026-06-22 15:44:42.066', 1, 1);
INSERT INTO public."LensMaterialMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, 'Poly', NULL, true, false, '2026-06-22 15:44:51.447', '2026-06-22 15:44:51.447', 1, 1);


--
-- Data for Name: LensTypeMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensTypeMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 'RX', NULL, true, false, '2026-06-22 15:16:29.054', '2026-06-22 15:16:29.054', 1, 1);
INSERT INTO public."LensTypeMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 'STOCK', NULL, true, false, '2026-06-22 15:16:34.986', '2026-06-22 15:16:34.986', 1, 1);


--
-- Data for Name: LensProductMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensProductMaster" (id, brand_id, category_id, material_id, type_id, product_code, lens_name, sphere_min, sphere_max, cyl_min, cyl_max, add_min, add_max, range_text, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", cylinder_extra_charge, sphere_extra_charge, "minThresholdQty", "maxThresholdQty", index_id, add_extra_charge) VALUES (3, 2, 3, 2, 1, 'PRV161', 'Pristine Digital 1.61 Mr-8 Prog', -6, 6, -4, 4, 1, 3, '', true, false, '2026-06-29 09:18:39.417', '2026-06-29 09:18:39.417', 1, 1, 200, 150, NULL, NULL, 3, 150);
INSERT INTO public."LensProductMaster" (id, brand_id, category_id, material_id, type_id, product_code, lens_name, sphere_min, sphere_max, cyl_min, cyl_max, add_min, add_max, range_text, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", cylinder_extra_charge, sphere_extra_charge, "minThresholdQty", "maxThresholdQty", index_id, add_extra_charge) VALUES (2, 10, 1, 1, 2, 'SHV57', 'Clair Blupro FSV(-)', -6, 0, -2, 0, NULL, NULL, '', true, false, '2026-06-22 17:38:24.09', '2026-07-03 10:37:47.284', 1, 1, 0, 0, NULL, NULL, 1, 0);
INSERT INTO public."LensProductMaster" (id, brand_id, category_id, material_id, type_id, product_code, lens_name, sphere_min, sphere_max, cyl_min, cyl_max, add_min, add_max, range_text, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", cylinder_extra_charge, sphere_extra_charge, "minThresholdQty", "maxThresholdQty", index_id, add_extra_charge) VALUES (1, 2, 3, 1, 1, 'PRV01', 'Pristine Digital Prog', -6, 6, -4, 4, 1, 3, '', true, false, '2026-06-22 16:16:21.452', '2026-07-08 05:58:33.041', 1, 1, 200, 100, NULL, NULL, 1, 200);


--
-- Data for Name: LocationMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LocationMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", "isVirtual") VALUES (1, 'GODOWN 1', 'MAIN LOCATION', true, false, '2026-06-23 13:13:21.704', '2026-06-23 13:13:21.704', 1, 1, false);
INSERT INTO public."LocationMaster" (id, name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", "isVirtual") VALUES (2, 'GODOWN 2', NULL, false, true, '2026-07-02 05:36:16.445', '2026-07-08 04:41:31.011', 1, 1, false);


--
-- Data for Name: InventoryAlert; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: LensCoatingMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensCoatingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 'Clarite', 'HMC', 'Green HMC Coating', true, false, '2026-06-22 15:45:31.828', '2026-06-22 15:45:31.828', 1, 1);
INSERT INTO public."LensCoatingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 'Clarite Dual', 'Dual Coat', 'Green & Blue Hmc', true, false, '2026-06-22 15:46:08.868', '2026-06-22 15:46:08.868', 1, 1);
INSERT INTO public."LensCoatingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, 'Blu+', 'Blu HMC', 'Blue Coat', true, false, '2026-06-22 15:46:29.908', '2026-06-22 15:46:29.908', 1, 1);
INSERT INTO public."LensCoatingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (4, 'Dusk', 'NV', 'Night Vision Sunset Gold', true, false, '2026-06-22 15:47:10.274', '2026-06-22 15:47:10.274', 1, 1);
INSERT INTO public."LensCoatingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (5, 'Luminight ', 'LN NV', 'Purple Night Vision', true, false, '2026-06-22 15:48:12.484', '2026-06-22 15:48:12.484', 1, 1);
INSERT INTO public."LensCoatingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (6, 'Hart', 'HC', 'Hard Scratch Resistance Coat', true, false, '2026-06-22 15:49:29.865', '2026-06-22 15:49:29.865', 1, 1);


--
-- Data for Name: LensDiaMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensDiaMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 55, '55', NULL, true, false, '2026-06-29 06:07:51.28', '2026-06-29 06:07:51.28', 1, 1);
INSERT INTO public."LensDiaMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 60, '60', NULL, true, false, '2026-06-29 06:07:57.322', '2026-06-29 06:07:57.322', 1, 1);
INSERT INTO public."LensDiaMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, 65, '65', NULL, true, false, '2026-06-29 06:08:01.841', '2026-06-29 06:08:01.841', 1, 1);
INSERT INTO public."LensDiaMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (4, 70, '70', NULL, true, false, '2026-06-29 06:08:06.95', '2026-06-29 06:08:06.95', 1, 1);


--
-- Data for Name: LensFittingMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensFittingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", fitting_price) VALUES (1, 'SUPRA', 'SP', NULL, true, false, '2026-06-22 16:51:07.634', '2026-06-22 16:51:07.634', 1, 1, 70);
INSERT INTO public."LensFittingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", fitting_price) VALUES (2, 'FULL Frame', 'FF', NULL, true, false, '2026-06-22 16:51:46.983', '2026-06-22 16:51:46.983', 1, 1, 60);
INSERT INTO public."LensFittingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", fitting_price) VALUES (3, 'RIMLESS', 'RM', NULL, true, false, '2026-06-22 16:52:03.806', '2026-06-22 16:52:03.806', 1, 1, 120);


--
-- Data for Name: LensOffers; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: LensTintingMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensTintingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", tinting_price) VALUES (1, 'SOLID TINT', 'SOLID', NULL, true, false, '2026-06-23 12:43:20.091', '2026-06-23 12:43:20.091', 1, 1, 150);
INSERT INTO public."LensTintingMaster" (id, name, short_name, description, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", tinting_price) VALUES (2, 'GRADIENT TINT', 'GRADIENT', NULL, true, false, '2026-06-23 12:44:37.69', '2026-06-23 12:44:37.69', 1, 1, 200);


--
-- Data for Name: SaleOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Vendor; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Vendor" (id, code, name, shopname, phone, alternatephone, email, address, city, state, pincode, gstin, active_status, delete_status, notes, "createdAt", "createdBy", "updatedAt", "updatedBy", "businessCategory_id", "ledgerId") VALUES (1, '001', 'Bonzer', NULL, NULL, NULL, 'chennai@bonzerlenses.com', NULL, 'NASHIK', 'Maharashtra', '422001', NULL, true, false, NULL, '2026-06-23 12:50:10.794', 1, '2026-06-23 12:50:10.794', NULL, NULL, 21);


--
-- Data for Name: PurchaseOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PurchaseOrderReceipt; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: TrayMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."TrayMaster" (id, name, description, capacity, location_id, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 'TRAY 1', 'RACK 1', 50, 1, true, false, '2026-06-23 13:14:09.808', '2026-06-23 13:14:09.808', 1, 1);
INSERT INTO public."TrayMaster" (id, name, description, capacity, location_id, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 'TRAY 14', 'Rack 5', 50, 1, true, false, '2026-07-02 05:36:42.962', '2026-07-02 05:37:13.487', 1, 1);


--
-- Data for Name: InventoryItem; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: InventoryStock; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: InventoryTransaction; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: LensPriceMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (1, 1, 6, 790, true, false, '2026-06-22 16:16:21.452', '2026-06-22 16:16:21.452', 1, 1);
INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (2, 1, 1, 940, true, false, '2026-06-22 16:16:21.452', '2026-06-22 16:16:21.452', 1, 1);
INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (3, 1, 3, 1040, true, false, '2026-06-22 16:16:21.452', '2026-06-22 16:16:21.452', 1, 1);
INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (4, 2, 1, 295, true, false, '2026-06-22 17:38:24.09', '2026-06-22 17:38:24.09', 1, 1);
INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (5, 3, 6, 1290, true, false, '2026-06-29 09:18:39.417', '2026-06-29 09:18:39.417', 1, 1);
INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (6, 3, 1, 1590, true, false, '2026-06-29 09:18:39.417', '2026-06-29 09:18:39.417', 1, 1);
INSERT INTO public."LensPriceMaster" (id, lens_id, coating_id, price, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy") VALUES (7, 3, 3, 1790, true, false, '2026-06-29 09:18:39.417', '2026-06-29 09:18:39.417', 1, 1);


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (27, 'Screen', 'dispatch', 3, '2026-07-03 11:04:33.918', '2026-07-03 11:04:33.918');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (28, 'View', 'dispatch', 3, '2026-07-03 11:04:33.918', '2026-07-03 11:04:33.918');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (29, 'Screen', 'pre_qc', 3, '2026-07-03 11:04:33.918', '2026-07-03 11:04:33.918');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (30, 'Screen', 'post_qc', 3, '2026-07-03 11:04:33.918', '2026-07-03 11:04:33.918');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (32, 'Screen', 'dashboard', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (33, 'Screen', 'sale_orders', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (34, 'Create', 'sale_orders', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (35, 'Edit', 'sale_orders', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (36, 'View', 'sale_orders', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (37, 'Screen', 'inventory', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (38, 'Create', 'inventory', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (39, 'View', 'inventory', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (40, 'Screen', 'dispatch', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (41, 'View', 'dispatch', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (42, 'Screen', 'fitting', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (43, 'Screen', 'pre_qc', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (44, 'Screen', 'post_qc', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (45, 'Screen', 'billing', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (46, 'View', 'billing', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (47, 'Screen', 'reports', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (48, 'Screen', 'lens_products', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (49, 'Create', 'lens_products', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (50, 'Edit', 'lens_products', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (51, 'View', 'lens_products', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (52, 'Delete', 'lens_products', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (53, 'Screen', 'price_mapping', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (54, 'Create', 'price_mapping', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (55, 'Edit', 'price_mapping', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (56, 'View', 'price_mapping', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (57, 'Delete', 'price_mapping', 2, '2026-07-08 04:18:32.6', '2026-07-08 04:18:32.6');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (58, 'Screen', 'dispatch', 5, '2026-07-08 04:19:58.31', '2026-07-08 04:19:58.31');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (59, 'View', 'dispatch', 5, '2026-07-08 04:19:58.31', '2026-07-08 04:19:58.31');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (60, 'Screen', 'sale_orders', 6, '2026-07-08 04:22:35.597', '2026-07-08 04:22:35.597');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (61, 'View', 'sale_orders', 6, '2026-07-08 04:22:35.597', '2026-07-08 04:22:35.597');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (62, 'View', 'dispatch', 6, '2026-07-08 04:22:35.597', '2026-07-08 04:22:35.597');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (63, 'Screen', 'fitting', 6, '2026-07-08 04:22:35.597', '2026-07-08 04:22:35.597');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (64, 'Screen', 'pre_qc', 6, '2026-07-08 04:22:35.597', '2026-07-08 04:22:35.597');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (65, 'Screen', 'post_qc', 6, '2026-07-08 04:22:35.597', '2026-07-08 04:22:35.597');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (66, 'View', 'sale_orders', 4, '2026-07-08 04:24:28.142', '2026-07-08 04:24:28.142');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (67, 'Screen', 'fitting', 4, '2026-07-08 04:24:28.142', '2026-07-08 04:24:28.142');
INSERT INTO public."Permission" (id, action, subject, role_id, "createdAt", "updatedAt") VALUES (68, 'Screen', 'post_qc', 4, '2026-07-08 04:24:28.142', '2026-07-08 04:24:28.142');


--
-- Data for Name: PriceMapping; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (1, 1, 10, '2026-06-28 04:19:57.432', 1, '2026-06-29 10:10:10.071', 1, 265.5, 4);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (2, 1, 15, '2026-06-28 04:19:57.438', 1, '2026-06-29 10:10:10.074', 1, 884, 3);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (3, 1, 15, '2026-06-28 04:19:57.441', 1, '2026-06-29 10:10:10.076', 1, 799, 2);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (4, 1, 15, '2026-06-28 04:19:57.443', 1, '2026-06-29 10:10:10.078', 1, 671.5, 1);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (5, 1, 15, '2026-06-29 10:10:10.081', 1, '2026-06-29 10:10:10.081', 1, 1521.5, 7);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (6, 1, 15, '2026-06-29 10:10:10.084', 1, '2026-06-29 10:10:10.084', 1, 1351.5, 6);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (7, 1, 15, '2026-06-29 10:10:10.088', 1, '2026-06-29 10:10:10.088', 1, 1096.5, 5);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (8, 3, 15, '2026-07-02 05:14:28.992', 1, '2026-07-02 05:14:28.992', 1, 250.75, 4);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (9, 3, 15, '2026-07-02 05:14:28.996', 1, '2026-07-02 05:14:28.996', 1, 1521.5, 7);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (10, 3, 15, '2026-07-02 05:14:29', 1, '2026-07-02 05:14:29', 1, 1351.5, 6);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (11, 3, 15, '2026-07-02 05:14:29.003', 1, '2026-07-02 05:14:29.003', 1, 1096.5, 5);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (12, 3, 15, '2026-07-02 05:14:29.005', 1, '2026-07-02 05:14:29.005', 1, 884, 3);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (13, 3, 15, '2026-07-02 05:14:29.007', 1, '2026-07-02 05:14:29.007', 1, 799, 2);
INSERT INTO public."PriceMapping" (id, customer_id, "discountRate", "createdAt", "createdBy", "updatedAt", "updatedBy", "discountPrice", "lensPrice_id") VALUES (14, 3, 15, '2026-07-02 05:14:29.01', 1, '2026-07-02 05:14:29.01', 1, 671.5, 1);


--
-- Data for Name: PrinterConfig; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PurchaseReceiptLog; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: SaleOrderItem; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: SaleOrderStatusLog; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: TransactionEntry; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: VendorPaymentVoucher; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: VendorPaymentVoucherItem; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('ed799ece-4290-4f10-8937-8ab248146955', 'f76e2f85b7359210f2a0725d930eeb02c5d86a7e605bb65d31e7a8119f2ab5ef', '2026-06-22 15:14:29.171717+00', '20251217201055_add_tinting_price_to_sale_order', NULL, NULL, '2026-06-22 15:14:29.168848+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('615144f2-997e-40a4-a3e4-a82113f7e478', 'f258d403052f1a6a118a257479e2732bca831507de18ece721db7e7af265eac7', '2026-06-22 15:14:28.963318+00', '20251114203416_make_updatedby_optional', NULL, NULL, '2026-06-22 15:14:28.696873+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('cb397ae1-51c8-4dea-a208-17b54a8f9c97', '72a7a8e746a4a15610bf2f74724422138b1152b3647f7cbc63fb063dba9c14e6', '2026-06-22 15:14:28.980989+00', '20251115060618_change_price_mapping_to_lens_price_master_and_add_discount_price', NULL, NULL, '2026-06-22 15:14:28.963897+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('6ab9cf62-128c-4c19-9b21-8ab98d743638', 'b228c0929f312008824d68941fa6ae0fc90226da9d71168473f19ad195527148', '2026-06-22 15:14:29.439649+00', '20260621120000_add_expense_category_classification', NULL, NULL, '2026-06-22 15:14:29.436273+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('dc6d9a50-6dcd-4d1d-acc8-da1d853e2a0d', 'cfa4cddb2e078cd0683a6032b6f4369017d75b88ea3e0746a482ec20524bdfe6', '2026-06-22 15:14:28.988235+00', '20251117170038_update_schema', NULL, NULL, '2026-06-22 15:14:28.981576+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('b98e34a5-1c1f-4125-95ab-4eb21df25360', '122d743a0403e77ad7e0ed9447f5b8826f2fbdbc55612d936eff004dd13c2eec', '2026-06-22 15:14:29.174199+00', '20251217201137_add_tinting_price_to_sale_order', NULL, NULL, '2026-06-22 15:14:29.172234+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('2ec3bf3a-6108-437a-be2e-8986b49237d6', '785ceab21cc120a1aef21e871fac295549558dabfff5ef1616bc7ad8dfdd1792', '2026-06-22 15:14:28.992326+00', '20251122212203_add_sale_order_urgent_and_free_fitting_flags', NULL, NULL, '2026-06-22 15:14:28.988762+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('bcf45ddb-050b-42f1-843b-93629aba69a8', '41860a67157e50ef4a6bb52410a3a4133bb75ce1e84ebd23c67d7d9a94a3837e', '2026-06-22 15:14:28.995893+00', '20251123170244_add_missing_dispatch_and_discount_fields', NULL, NULL, '2026-06-22 15:14:28.992878+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('b1abfc21-58e9-4ffd-aca9-e4e89dd9daa3', '5f0fd20c4704e1c8f82006d8ba98d17d06f8a7ed47be1a08c32910692d52cb09', '2026-06-22 15:14:29.245547+00', '20260506000000_add_stock_thresholds_to_lens_product', NULL, NULL, '2026-06-22 15:14:29.241659+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('856e4bbf-386d-432d-a913-1b78f42edf69', '47770ea5028bec642491f1e6cfc82cccd39802b36bdc9c0db355a24e8b4581e1', '2026-06-22 15:14:29.021374+00', '20251126172459_add_fitting_price_field', NULL, NULL, '2026-06-22 15:14:28.996394+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('94647779-9fca-4169-8ea6-54b52bc7d04f', 'e9b805c6d0072e44c971a8c5c48f22ab9294cacf5c37515d52057c56a22fd518', '2026-06-22 15:14:29.17895+00', '20251217210220_add_right_left_eye_extra_fields', NULL, NULL, '2026-06-22 15:14:29.174841+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('0e5f9a2e-27e2-48ec-9a8c-c0858e91c829', '69b9c517f5d7afbb2c3bc2afcdaf8373e8e6f097c4561f9d5890af0da109ef23', '2026-06-22 15:14:29.049674+00', '20251126191657_add_audit_and_error_log_tables', NULL, NULL, '2026-06-22 15:14:29.021947+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('d663eaef-b0a1-4ba1-aeab-cd8352ab12b5', '063f3ea7a7ee0594f8b4020be370e3652631cdd5f714817d08806110a6a198ea', '2026-06-22 15:14:29.057656+00', '20251127064900_inittt', NULL, NULL, '2026-06-22 15:14:29.050272+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('7b650d48-480d-4f58-838f-0d11dc3ad363', '9d645daf6bba0c8aa65c9e63701efae3ccc27095466839519d19806ffae3e727', '2026-06-22 15:14:29.089431+00', '20251128064238_po', NULL, NULL, '2026-06-22 15:14:29.058178+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('a6e7258f-637e-4313-9407-0b1c9849e290', '2cf2b5e5f603abbcd061993a1ed5f00575c86b2bd05fcbb031b0ded7de1cdf09', '2026-06-22 15:14:29.21474+00', '20260322163701_update', NULL, NULL, '2026-06-22 15:14:29.17951+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('cff2388f-b8db-40cf-a763-233e590e8e6a', '21e22e3597f90e5b22f0dcaedece14bc3253b163eca23d90426b47c1c8684bea', '2026-06-22 15:14:29.15755+00', '20251205180956_add_order_type_to_purchase_order', NULL, NULL, '2026-06-22 15:14:29.090071+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('1a27d57e-ac55-4d7d-a61a-6d71c0a0d7f3', '33312f6e0101d05f90f137d15b33a7c2887fb49dc52b4a16e9ff5e4e53232ab0', '2026-06-22 15:14:29.160824+00', '20251209174256_add_lens_bulk_selection_to_purchase_order', NULL, NULL, '2026-06-22 15:14:29.158124+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('49f08f22-e833-46f9-903c-f3eb2902df30', '39fc493c7fba081ffe3b02f695f4c716479b4f94bbbb5fdc8d7ca888fd8ebb99', '2026-06-22 15:14:29.348076+00', '20260513120000_add_billed_status_and_enhance_invoice', NULL, NULL, '2026-06-22 15:14:29.337677+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('488be3ae-de24-408c-be3b-ab996493a001', '2724695444f27c1a94e85f8dad6359975ef30e2d61f90c7997908f31ddafcf43', '2026-06-22 15:14:29.16833+00', '20251217180324_init', NULL, NULL, '2026-06-22 15:14:29.161323+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('c3bea948-16ee-4731-a5f9-58ba4c7009b9', '8f601a59e58f192f1ff545a2697df3b2d8f56c8501797d08f1d8cb51dc4f18b7', '2026-06-22 15:14:29.250444+00', '20260507000000_vendor_category_to_business_category', NULL, NULL, '2026-06-22 15:14:29.246066+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('b81737dd-dc7b-47ac-a1f5-ce362dbe32a1', '7e89447f421d985f762bfcc5702177dac649b25dfa144dddb7d828753d9be152', '2026-06-22 15:14:29.227331+00', '20260325000000_add_exchange_coating_price_offer_type', NULL, NULL, '2026-06-22 15:14:29.215245+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('09d529ed-f522-494c-84f0-6d3a643b988f', '6813dd8895a13c6722b9cbb35f9a028463c471228c5e5bd32fad6d131f589a59', '2026-06-22 15:14:29.231345+00', '20260325120000_add_delivery_signature_and_role', NULL, NULL, '2026-06-22 15:14:29.227911+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('e538d67b-126b-4d8f-9d62-0a8d146a29a3', '105c99c6e2c848550dc63561deb43b82dfb52299d29e5b732caaa7f27943a807', '2026-06-22 15:14:29.235843+00', '20260329120000_remove_location_tray_codes', NULL, NULL, '2026-06-22 15:14:29.231847+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('4f201cc5-4a7d-4fa8-ad63-b8f95ccb0267', 'f82dc376638522dc2e8c5879b77b25fb8b5d9a2e80effccfea3e8af06fb7d4b3', '2026-06-22 15:14:29.292981+00', '20260507120000_add_financial_ledger_and_transaction_tables', NULL, NULL, '2026-06-22 15:14:29.251011+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('cd211953-6b7b-4240-bff7-bacfe5c61708', 'cb71609a9d33150fea3576aab84fd27d44e97d4e91438b978e6835b706cdf0f2', '2026-06-22 15:14:29.238645+00', '20260414204133_add_on_hold_status', NULL, NULL, '2026-06-22 15:14:29.236372+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('2517748f-bd0b-4213-baff-42e6b72f37d6', '04f65dd1a23fe7de27794af34c1f4ff022691a7a3d4cb405a8fb98b930622078', '2026-06-22 15:14:29.241184+00', '20260414210000_add_awaiting_quality_status', NULL, NULL, '2026-06-22 15:14:29.239175+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('764e0b30-a7d8-4e3a-942d-01485d848327', 'db99540444a76c87ec986a968a02845ba2f4486b19d1ff982b688e4a06d643b3', '2026-06-22 15:14:29.29952+00', '20260512000000_add_customer_portal_fields', NULL, NULL, '2026-06-22 15:14:29.293529+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('e13ef2ac-971e-45bc-8a25-2515e169cf93', 'a29daffbaa723279f17bcd084132d98d278fe283ff3253a1089674d326a6e1e5', '2026-06-22 15:14:29.431352+00', '20260529041220_init', NULL, NULL, '2026-06-22 15:14:29.348622+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('e79f7755-3d42-4339-a839-a30592241da1', '33634c8a59a3b51b8fb6fe6a97be60837c638261263f3dd0f43b5da2cc8ccfe9', '2026-06-22 15:14:29.337084+00', '20260513070343_inti', NULL, NULL, '2026-06-22 15:14:29.30005+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('3e0b1eae-e9a8-4f77-99c7-b79a9be41736', '0e8df8c34f58abe36de6166505580c3226970504b85b2b7af9c806b82e98ef06', '2026-06-22 15:14:29.435677+00', '20260621000000_add_vendor_payment_voucher_closed_status', NULL, NULL, '2026-06-22 15:14:29.431926+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('f511da1f-bd52-46c1-9616-50fdbc9d0179', '20b6ea6553921b12314e5735f288df7e34c77ad12682dd0a76ea72d3befab85f', '2026-06-27 11:18:01.029383+00', '20260624120000_lens_enhancements', NULL, NULL, '2026-06-27 11:18:00.993583+00', 1);
INSERT INTO public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) VALUES ('0dd67f80-9854-46ab-a81c-a25cb87da5a7', 'd7b36a85bf5bc51e0f38575dbf54c7d8d7919cbc5fec4242e2d5b0758c5d61d3', NULL, '20260624180000_company_gst_and_customer_ref', 'A migration failed to apply. New migrations cannot be applied before the error is recovered from. Read more about how to resolve migration issues in a production database: https://pris.ly/d/migrate-resolve

Migration name: 20260624180000_company_gst_and_customer_ref

Database error code: 23505

Database error:
ERROR: could not create unique index "SaleOrder_customerRefNo_lower_unique"
DETAIL: Key (lower(TRIM(BOTH FROM "customerRefNo")))=(34568) is duplicated.

DbError { severity: "ERROR", parsed_severity: Some(Error), code: SqlState(E23505), message: "could not create unique index \"SaleOrder_customerRefNo_lower_unique\"", detail: Some("Key (lower(TRIM(BOTH FROM \"customerRefNo\")))=(34568) is duplicated."), hint: None, position: None, where_: None, schema: Some("public"), table: Some("SaleOrder"), column: None, datatype: None, constraint: Some("SaleOrder_customerRefNo_lower_unique"), file: Some("tuplesort.c"), line: Some(4423), routine: Some("comparetup_index_btree") }

   0: sql_schema_connector::apply_migration::apply_script
           with migration_name="20260624180000_company_gst_and_customer_ref"
             at schema-engine/connectors/sql-schema-connector/src/apply_migration.rs:113
   1: schema_commands::commands::apply_migrations::Applying migration
           with migration_name="20260624180000_company_gst_and_customer_ref"
             at schema-engine/commands/src/commands/apply_migrations.rs:95
   2: schema_core::state::ApplyMigrations
             at schema-engine/core/src/state.rs:244', NULL, '2026-06-27 11:18:01.029913+00', 0);


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Name: AccountGroup_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AccountGroup_id_seq"', 19, true);


--
-- Name: AuditLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."AuditLog_id_seq"', 1, false);


--
-- Name: CheckSheetItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CheckSheetItem_id_seq"', 1, false);


--
-- Name: CheckSheetMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CheckSheetMaster_id_seq"', 1, false);


--
-- Name: CompanySettings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CompanySettings_id_seq"', 1, false);


--
-- Name: CustomerPaymentVoucherItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CustomerPaymentVoucherItem_id_seq"', 1, false);


--
-- Name: CustomerPaymentVoucher_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."CustomerPaymentVoucher_id_seq"', 1, false);


--
-- Name: Customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Customer_id_seq"', 3, true);


--
-- Name: DepartmentDetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DepartmentDetails_id_seq"', 6, true);


--
-- Name: DispatchCopy_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DispatchCopy_id_seq"', 1, false);


--
-- Name: ErrorLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ErrorLog_id_seq"', 1, false);


--
-- Name: ExpenseCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ExpenseCategory_id_seq"', 1, false);


--
-- Name: ExpenseLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ExpenseLog_id_seq"', 1, false);


--
-- Name: Expense_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Expense_id_seq"', 1, false);


--
-- Name: FinancialTransaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."FinancialTransaction_id_seq"', 1, false);


--
-- Name: InventoryAlert_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventoryAlert_id_seq"', 1, false);


--
-- Name: InventoryItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventoryItem_id_seq"', 1, false);


--
-- Name: InventoryStock_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventoryStock_id_seq"', 1, false);


--
-- Name: InventoryTransaction_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."InventoryTransaction_id_seq"', 1, false);


--
-- Name: Invoice_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Invoice_id_seq"', 1, false);


--
-- Name: Ledger_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Ledger_id_seq"', 6, true);


--
-- Name: LensBrandMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensBrandMaster_id_seq"', 10, true);


--
-- Name: LensCategoryMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensCategoryMaster_id_seq"', 3, true);


--
-- Name: LensCoatingMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensCoatingMaster_id_seq"', 6, true);


--
-- Name: LensDiaMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensDiaMaster_id_seq"', 4, true);


--
-- Name: LensFittingMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensFittingMaster_id_seq"', 3, true);


--
-- Name: LensIndexMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensIndexMaster_id_seq"', 5, true);


--
-- Name: LensMaterialMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensMaterialMaster_id_seq"', 3, true);


--
-- Name: LensOffers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensOffers_id_seq"', 1, false);


--
-- Name: LensPriceMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensPriceMaster_id_seq"', 7, true);


--
-- Name: LensProductMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensProductMaster_id_seq"', 3, true);


--
-- Name: LensTintingMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensTintingMaster_id_seq"', 2, true);


--
-- Name: LensTypeMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensTypeMaster_id_seq"', 2, true);


--
-- Name: LocationMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LocationMaster_id_seq"', 2, true);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 1, false);


--
-- Name: Permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Permission_id_seq"', 68, true);


--
-- Name: PriceMapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PriceMapping_id_seq"', 14, true);


--
-- Name: PrinterConfig_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PrinterConfig_id_seq"', 1, false);


--
-- Name: PurchaseOrderReceipt_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PurchaseOrderReceipt_id_seq"', 1, false);


--
-- Name: PurchaseOrder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PurchaseOrder_id_seq"', 1, false);


--
-- Name: PurchaseReceiptLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PurchaseReceiptLog_id_seq"', 1, false);


--
-- Name: Role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Role_id_seq"', 6, true);


--
-- Name: SaleOrderItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."SaleOrderItem_id_seq"', 1, false);


--
-- Name: SaleOrderStatusLog_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."SaleOrderStatusLog_id_seq"', 1, false);


--
-- Name: SaleOrder_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."SaleOrder_id_seq"', 1, false);


--
-- Name: TransactionEntry_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TransactionEntry_id_seq"', 1, false);


--
-- Name: TrayMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."TrayMaster_id_seq"', 2, true);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 4, true);


--
-- Name: VendorPaymentVoucherItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."VendorPaymentVoucherItem_id_seq"', 1, false);


--
-- Name: VendorPaymentVoucher_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."VendorPaymentVoucher_id_seq"', 1, false);


--
-- Name: Vendor_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Vendor_id_seq"', 5, true);


--
-- Name: businessCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."businessCategory_id_seq"', 4, true);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict jMRVykCHKOE5FGoefJl7R7Yk3iaoRQAa0u0nzASeIKsgCl7tcu4Ph0IJZX6Xg9t

