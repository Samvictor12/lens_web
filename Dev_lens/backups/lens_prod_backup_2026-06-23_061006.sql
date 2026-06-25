--
-- PostgreSQL database dump
--

\restrict KC9qfHeLPAbPx7hBLgWnJyugi2kkOeMejve1qhHYf1AGqVBhrF97rWs4TpvoPCr

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


--
-- Data for Name: Role; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Role" (id, name, "createdAt", "updatedAt") VALUES (1, 'System', '2026-06-22 15:14:45.235', '2026-06-22 15:14:45.235');


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."User" (id, name, email, phonenumber, alternatenumber, bloodgroup, usercode, username, password, is_login, role_id, address, city, state, pincode, salary, department_id, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy") VALUES (1, 'System Admin', 'system@lensbilling.com', NULL, NULL, NULL, 'admin001', 'system', '$2b$10$hYZkIyvQ5XtUq2vdKb3siebKZb7/AQsVd210uyOMDyr0TpwOOXf7e', true, 1, NULL, NULL, NULL, NULL, NULL, 1, true, false, '2026-06-22 15:14:45.288', 1, '2026-06-22 15:14:45.288', NULL);


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
-- Data for Name: businessCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Customer; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public."Customer" (id, code, name, shopname, phone, alternatephone, email, address, city, state, pincode, "businessCategory_id", gstin, credit_limit, outstanding_credit, notes, active_status, delete_status, "createdAt", "createdBy", "updatedAt", "updatedBy", delivery_person_id, sale_person_id, portal_token, portal_pin_hash, portal_active, portal_activated_at, portal_pin_changed_at, portal_last_accessed) VALUES (1, 'VIT 001', 'ABBAS OPTICALS', 'ABBAS OPTICALS', NULL, NULL, 'abbas@gmail.com', NULL, NULL, NULL, NULL, NULL, NULL, 350000, NULL, NULL, true, false, '2026-06-22 17:40:19.959', 1, '2026-06-22 17:40:19.959', NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL);


--
-- Data for Name: DispatchCopy; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: ErrorLog; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Ledger; Type: TABLE DATA; Schema: public; Owner: postgres
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

INSERT INTO public."LensProductMaster" (id, brand_id, category_id, material_id, type_id, product_code, lens_name, index_value, sphere_min, sphere_max, cyl_min, cyl_max, add_min, add_max, range_text, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", cylinder_extra_charge, sphere_extra_charge, "minThresholdQty", "maxThresholdQty") VALUES (1, 2, 3, 1, 1, 'PRV01', 'Pristine Digital Prog', NULL, -6, 6, -4, 4, 1, 3, '', true, false, '2026-06-22 16:16:21.452', '2026-06-22 16:16:21.452', 1, 1, 200, 100, NULL, NULL);
INSERT INTO public."LensProductMaster" (id, brand_id, category_id, material_id, type_id, product_code, lens_name, index_value, sphere_min, sphere_max, cyl_min, cyl_max, add_min, add_max, range_text, "activeStatus", "deleteStatus", "createdAt", "updatedAt", "createdBy", "updatedBy", cylinder_extra_charge, sphere_extra_charge, "minThresholdQty", "maxThresholdQty") VALUES (2, 10, 1, 1, 2, 'SHV57', 'Clair Blupro FSV(-)', NULL, -6, 0, -2, -0.25, NULL, NULL, '', true, false, '2026-06-22 17:38:24.09', '2026-06-22 17:38:24.09', 1, 1, 0, 0, NULL, NULL);


--
-- Data for Name: LocationMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: InventoryAlert; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Invoice; Type: TABLE DATA; Schema: public; Owner: postgres
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



--
-- Data for Name: SaleOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Vendor; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PurchaseOrder; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PurchaseOrderReceipt; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: TrayMaster; Type: TABLE DATA; Schema: public; Owner: postgres
--



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


--
-- Data for Name: Payment; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: Permission; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: PriceMapping; Type: TABLE DATA; Schema: public; Owner: postgres
--



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


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.refresh_tokens (id, "userId", token, "expiresAt", "createdAt", "updatedAt") VALUES (1, 1, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInRva2VuVHlwZSI6InJlZnJlc2giLCJpYXQiOjE3ODIxOTMwMDAsImV4cCI6MTc4Mjc5NzgwMCwiYXVkIjoibGVucy11c2VycyIsImlzcyI6ImxlbnMtbWFuYWdlbWVudCJ9.PtgRWWoBBQ5XXRFrhba3jIavEoZt4iPYgJ_VWDrAKKY', '2026-06-30 05:36:40.739', '2026-06-22 15:15:19.587', '2026-06-23 05:36:40.739');


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
-- Name: Customer_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Customer_id_seq"', 1, true);


--
-- Name: DepartmentDetails_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."DepartmentDetails_id_seq"', 4, true);


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

SELECT pg_catalog.setval('public."Ledger_id_seq"', 1, false);


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

SELECT pg_catalog.setval('public."LensDiaMaster_id_seq"', 1, false);


--
-- Name: LensFittingMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensFittingMaster_id_seq"', 3, true);


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

SELECT pg_catalog.setval('public."LensPriceMaster_id_seq"', 4, true);


--
-- Name: LensProductMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensProductMaster_id_seq"', 2, true);


--
-- Name: LensTintingMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensTintingMaster_id_seq"', 1, false);


--
-- Name: LensTypeMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LensTypeMaster_id_seq"', 2, true);


--
-- Name: LocationMaster_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."LocationMaster_id_seq"', 1, false);


--
-- Name: Payment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Payment_id_seq"', 1, false);


--
-- Name: Permission_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Permission_id_seq"', 1, false);


--
-- Name: PriceMapping_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."PriceMapping_id_seq"', 1, false);


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

SELECT pg_catalog.setval('public."Role_id_seq"', 1, true);


--
-- Name: SaleOrderItem_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."SaleOrderItem_id_seq"', 1, false);


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

SELECT pg_catalog.setval('public."TrayMaster_id_seq"', 1, false);


--
-- Name: User_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."User_id_seq"', 1, false);


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

SELECT pg_catalog.setval('public."Vendor_id_seq"', 1, false);


--
-- Name: businessCategory_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."businessCategory_id_seq"', 1, false);


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.refresh_tokens_id_seq', 16, true);


--
-- PostgreSQL database dump complete
--

\unrestrict KC9qfHeLPAbPx7hBLgWnJyugi2kkOeMejve1qhHYf1AGqVBhrF97rWs4TpvoPCr

