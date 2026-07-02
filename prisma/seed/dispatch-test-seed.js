/**
 * Dispatch Module Test Seed
 * ─────────────────────────
 * Self-contained seed that creates ALL required master data + dispatch test
 * records WITHOUT deleting existing records.
 * Safe to re-run — uses upsert / findFirst + conditional-create patterns.
 *
 * Run:  node prisma/seed/dispatch-test-seed.js
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── helpers ───────────────────────────────────────────────────────────────
async function findOrCreate(model, where, createData) {
    const existing = await model.findFirst({ where });
    if (existing) return existing;
    return model.create({ data: createData });
}

// ─── main ──────────────────────────────────────────────────────────────────
async function main() {
    console.log('🚚 Starting Dispatch Test Seed…\n');

    // ── 1. System user (id=1) — required createdBy base ────────────────────
    const systemUser = await prisma.user.findUnique({ where: { id: 1 } });
    if (!systemUser) throw new Error('System user (id=1) not found. Ensure the DB was initialised with prisma db push.');
    console.log(`✅ System user found: ${systemUser.name}\n`);

    // ── 1b. Reset auto-increment sequences that may be out of sync after raw SQL inserts
    console.log('🔧 Syncing DB sequences…');
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"User"', 'id'), COALESCE(MAX(id), 1)) FROM "User"`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"Role"', 'id'), COALESCE(MAX(id), 1)) FROM "Role"`;
    await prisma.$executeRaw`SELECT setval(pg_get_serial_sequence('"DepartmentDetails"', 'id'), COALESCE(MAX(id), 1)) FROM "DepartmentDetails"`;
    console.log('   ✅ Sequences synced\n');

    // ── 2. Ensure all required Roles exist ──────────────────────────────────
    console.log('👥 Ensuring roles…');
    const adminRole = await prisma.role.upsert({
        where: { name: 'Admin' },
        update: {},
        create: { name: 'Admin', permissions: { create: [{ action: 'create', subject: 'all' }, { action: 'read', subject: 'all' }, { action: 'update', subject: 'all' }, { action: 'delete', subject: 'all' }] } },
    });
    const salesRole = await prisma.role.upsert({
        where: { name: 'Sales' },
        update: {},
        create: { name: 'Sales', permissions: { create: [{ action: 'create', subject: 'SaleOrder' }, { action: 'read', subject: 'SaleOrder' }, { action: 'update', subject: 'SaleOrder' }] } },
    });
    const deliveryRole = await prisma.role.upsert({
        where: { name: 'Delivery Person' },
        update: {},
        create: { name: 'Delivery Person', permissions: { create: [{ action: 'read', subject: 'Dispatch' }, { action: 'update', subject: 'Dispatch' }, { action: 'read', subject: 'SaleOrder' }] } },
    });
    console.log(`   ✅ Roles: Admin(${adminRole.id}), Sales(${salesRole.id}), Delivery Person(${deliveryRole.id})\n`);

    // ── 3. Ensure Department for admin + delivery staff ─────────────────────
    console.log('🏢 Ensuring departments…');
    const adminDept = await findOrCreate(prisma.departmentDetails,
        { department: 'Administration' },
        { department: 'Administration', active_status: true, delete_status: false, createdBy: systemUser.id });
    const deliveryDept = await findOrCreate(prisma.departmentDetails,
        { department: 'Delivery' },
        { department: 'Delivery', active_status: true, delete_status: false, createdBy: systemUser.id });
    const salesDept = await findOrCreate(prisma.departmentDetails,
        { department: 'Sales' },
        { department: 'Sales', active_status: true, delete_status: false, createdBy: systemUser.id });
    console.log(`   ✅ Departments ready\n`);

    // ── 4. Ensure Admin user exists ─────────────────────────────────────────
    console.log('👤 Ensuring admin user…');
    const hashedPwdAdmin = await bcrypt.hash('admin123', 10);
    const adminUser = await prisma.user.upsert({
        where: { email: 'admin@lensbilling.com' },
        update: {},
        create: {
            name: 'Admin User',
            email: 'admin@lensbilling.com',
            phonenumber: '+91-9000000001',
            usercode: 'ADM001',
            username: 'admin.user',
            password: hashedPwdAdmin,
            role_id: adminRole.id,
            department_id: adminDept.id,
            active_status: true,
            delete_status: false,
            createdBy: systemUser.id,
        },
    });
    console.log(`   ✅ Admin: ${adminUser.email}\n`);

    // ── 6. Create Delivery Person users ────────────────────────────────────
    console.log('🛵 Creating delivery persons…');
    const hashedPwd = await bcrypt.hash('delivery123', 10);

    const deliveryPerson1 = await prisma.user.upsert({
        where: { email: 'ramesh@lensbilling.com' },
        update: {},
        create: {
            name: 'Ramesh Kumar',
            email: 'ramesh@lensbilling.com',
            phonenumber: '+91-9876541001',
            usercode: 'DEL001',
            username: 'ramesh.kumar',
            password: hashedPwd,
            role_id: deliveryRole.id,
            department_id: deliveryDept.id,
            address: '12 MG Road',
            city: 'Mumbai',
            state: 'Maharashtra',
            active_status: true,
            delete_status: false,
            createdBy: adminUser.id,
        },
    });

    const deliveryPerson2 = await prisma.user.upsert({
        where: { email: 'suresh@lensbilling.com' },
        update: {},
        create: {
            name: 'Suresh Sharma',
            email: 'suresh@lensbilling.com',
            phonenumber: '+91-9876541002',
            usercode: 'DEL002',
            username: 'suresh.sharma',
            password: hashedPwd,
            role_id: deliveryRole.id,
            department_id: deliveryDept.id,
            address: '45 Station Road',
            city: 'Pune',
            state: 'Maharashtra',
            active_status: true,
            delete_status: false,
            createdBy: adminUser.id,
        },
    });

    console.log(`   ✅ Delivery persons: ${deliveryPerson1.name}, ${deliveryPerson2.name}\n`);

    // ── 7. Ensure Lens master data exists (create if missing) ───────────────
    console.log('👓 Ensuring lens master data…');

    const lensCategory = await prisma.lensCategoryMaster.upsert({
        where: { name: 'Single Vision' },
        update: {},
        create: { name: 'Single Vision', description: 'Standard single vision lenses', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });
    const lensMaterial = await prisma.lensMaterialMaster.upsert({
        where: { name: 'Plastic (CR-39)' },
        update: {},
        create: { name: 'Plastic (CR-39)', description: 'Standard plastic material', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });
    const lensBrand = await prisma.lensBrandMaster.upsert({
        where: { name: 'Essilor' },
        update: {},
        create: { name: 'Essilor', description: 'Premium French lens brand', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });
    const lensType = await prisma.lensTypeMaster.upsert({
        where: { name: 'Spherical' },
        update: {},
        create: { name: 'Spherical', description: 'Standard spherical design', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });
    const coating = await prisma.lensCoatingMaster.upsert({
        where: { name: 'Anti-Reflective Coating' },
        update: {},
        create: { name: 'Anti-Reflective Coating', short_name: 'AR', description: 'Reduces glare', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });
    const fitting = await prisma.lensFittingMaster.upsert({
        where: { name: 'Standard Fitting' },
        update: {},
        create: { name: 'Standard Fitting', short_name: 'STD', description: 'Standard lens fitting', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });

    // Lens Product
    const index156 = await prisma.lensIndexMaster.upsert({
        where: { index_name: '1.56' },
        update: {},
        create: { index_name: '1.56', description: 'Standard index 1.56', activeStatus: true, deleteStatus: false, createdBy: adminUser.id },
    });

    let lensProduct = await prisma.lensProductMaster.findFirst({ where: { product_code: 'ESS-SV-001', deleteStatus: false } });
    if (!lensProduct) {
        lensProduct = await prisma.lensProductMaster.create({
            data: {
                brand_id:    lensBrand.id,
                category_id: lensCategory.id,
                material_id: lensMaterial.id,
                type_id:     lensType.id,
                product_code: 'ESS-SV-001',
                lens_name:   'Essilor Single Vision Standard',
                index_id: index156.id,
                sphere_min:  -6.0,
                sphere_max:   4.0,
                cyl_min:     -2.0,
                cyl_max:      2.0,
                activeStatus: true,
                deleteStatus: false,
                createdBy:   adminUser.id,
            },
        });
    }
    console.log(`   ✅ Lens product: ${lensProduct.lens_name}, coating: ${coating.name}\n`);

    // ── 8. Ensure Business Category & Customers ─────────────────────────────
    console.log('🏪 Ensuring business category…');
    const businessCat = await prisma.businessCategory.upsert({
        where: { name: 'Retail' },
        update: {},
        create: { name: 'Retail', active_status: true, delete_status: false, createdBy: adminUser.id },
    });

    const cust1 = await prisma.customer.upsert({
        where: { code: 'TEST-CUST-001' },
        update: { delivery_person_id: deliveryPerson1.id },
        create: {
            code: 'TEST-CUST-001',
            name: 'Mohan Lal',
            shopname: 'City Opticals',
            phone: '+91-9876550001',
            email: 'mohan@cityopticals.com',
            address: '88 Linking Road, Bandra',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            businessCategory_id: businessCat?.id ?? null,
            credit_limit: 80000,
            outstanding_credit: 12000,
            delivery_person_id: deliveryPerson1.id,
            active_status: true,
            delete_status: false,
            createdBy: adminUser.id,
        },
    });

    const cust2 = await prisma.customer.upsert({
        where: { code: 'TEST-CUST-002' },
        update: { delivery_person_id: deliveryPerson2.id },
        create: {
            code: 'TEST-CUST-002',
            name: 'Sunita Desai',
            shopname: 'Vision Plus',
            phone: '+91-9876550002',
            email: 'sunita@visionplus.com',
            address: '14 Fergusson College Road',
            city: 'Pune',
            state: 'Maharashtra',
            pincode: '411004',
            businessCategory_id: businessCat?.id ?? null,
            credit_limit: 60000,
            outstanding_credit: 8000,
            delivery_person_id: deliveryPerson2.id,
            active_status: true,
            delete_status: false,
            createdBy: adminUser.id,
        },
    });

    const cust3 = await prisma.customer.upsert({
        where: { code: 'TEST-CUST-003' },
        update: {},
        create: {
            code: 'TEST-CUST-003',
            name: 'Arun Kulkarni',
            shopname: 'Eye World',
            phone: '+91-9876550003',
            email: 'arun@eyeworld.com',
            address: '7 Sitabuldi Main Road',
            city: 'Nagpur',
            state: 'Maharashtra',
            pincode: '440012',
            businessCategory_id: businessCat?.id ?? null,
            credit_limit: 40000,
            outstanding_credit: 5000,
            delivery_person_id: deliveryPerson1.id,
            active_status: true,
            delete_status: false,
            createdBy: adminUser.id,
        },
    });

    console.log(`   ✅ Customers: ${cust1.shopname}, ${cust2.shopname}, ${cust3.shopname}\n`);

    // ── 9. Helper to build a SaleOrder data object ──────────────────────────
    const soBase = (overrides) => ({
        lens_id:      lensProduct.id,
        category_id:  lensCategory.id,
        Type_id:      lensType.id,
        coating_id:   coating.id,
        fitting_id:   fitting.id,
        rightEye:     true,
        leftEye:      true,
        rightSpherical: '-2.00',
        rightCylindrical: '-0.50',
        rightAxis:    '90',
        leftSpherical: '-2.25',
        leftCylindrical: '-0.75',
        leftAxis:     '85',
        lensPrice:    1500,
        discount:     10,
        activeStatus: true,
        deleteStatus: false,
        createdBy:    adminUser.id,
        ...overrides,
    });

    // ── 9. READY_FOR_DISPATCH sale orders (free / unassigned to a dispatch) ─
    console.log('📦 Creating READY_FOR_DISPATCH sale orders…');

    // cust1 / Ramesh — 4 orders (3 with Ramesh, 1 unassigned)
    const readyOrders = await Promise.all([
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R001' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R001', customerId: cust1.id, status: 'READY_FOR_DISPATCH', assignedPerson_id: deliveryPerson1.id, lensPrice: 1500 }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R002' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R002', customerId: cust1.id, status: 'READY_FOR_DISPATCH', assignedPerson_id: deliveryPerson1.id, lensPrice: 2000, remark: 'Handle with care' }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R003' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R003', customerId: cust1.id, status: 'READY_FOR_DISPATCH', assignedPerson_id: deliveryPerson1.id, lensPrice: 1800, urgentOrder: true }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R004' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R004', customerId: cust1.id, status: 'READY_FOR_DISPATCH', lensPrice: 1200 }) }),

        // cust2 / Suresh — 3 orders
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R005' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R005', customerId: cust2.id, status: 'READY_FOR_DISPATCH', assignedPerson_id: deliveryPerson2.id, lensPrice: 5000 }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R006' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R006', customerId: cust2.id, status: 'READY_FOR_DISPATCH', assignedPerson_id: deliveryPerson2.id, lensPrice: 6500, remark: 'Progressive — double check Rx' }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R007' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R007', customerId: cust2.id, status: 'READY_FOR_DISPATCH', assignedPerson_id: deliveryPerson2.id, lensPrice: 3200 }) }),

        // cust3 / no person — 2 orders
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R008' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R008', customerId: cust3.id, status: 'READY_FOR_DISPATCH', lensPrice: 1100 }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-R009' }, update: {}, create: soBase({ orderNo: 'TEST-SO-R009', customerId: cust3.id, status: 'READY_FOR_DISPATCH', lensPrice: 900 }) }),
    ]);

    console.log(`   ✅ ${readyOrders.length} READY_FOR_DISPATCH orders created\n`);

    // ── 10. Other-status sale orders ────────────────────────────────────────
    console.log('📋 Creating other-status sale orders…');
    await Promise.all([
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-C001' }, update: {}, create: soBase({ orderNo: 'TEST-SO-C001', customerId: cust1.id, status: 'FITTING_READY', lensPrice: 1500 }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-C002' }, update: {}, create: soBase({ orderNo: 'TEST-SO-C002', customerId: cust2.id, status: 'IN_FITTING', lensPrice: 5500 }) }),
        prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-C003' }, update: {}, create: soBase({ orderNo: 'TEST-SO-C003', customerId: cust3.id, status: 'AWAITING_QUALITY', lensPrice: 2200 }) }),
    ]);
    console.log('   ✅ 3 other-status orders created\n');

    // ── 11. Sale orders that will be LINKED to dispatches ───────────────────
    console.log('🔗 Creating sale orders for dispatch records…');

    // For DC PENDING (ready but dispatched pending pickup)
    const dSO1 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D001' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D001', customerId: cust1.id, status: 'READY_FOR_DISPATCH', dispatchStatus: 'Pending', assignedPerson_id: deliveryPerson1.id, lensPrice: 1500 }) });
    const dSO2 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D002' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D002', customerId: cust1.id, status: 'READY_FOR_DISPATCH', dispatchStatus: 'Pending', assignedPerson_id: deliveryPerson1.id, lensPrice: 2000 }) });

    // For DC IN_TRANSIT
    const dSO3 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D003' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D003', customerId: cust2.id, status: 'READY_FOR_DISPATCH', dispatchStatus: 'In Transit', assignedPerson_id: deliveryPerson2.id, lensPrice: 5000 }) });
    const dSO4 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D004' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D004', customerId: cust2.id, status: 'READY_FOR_DISPATCH', dispatchStatus: 'In Transit', assignedPerson_id: deliveryPerson2.id, lensPrice: 3500 }) });

    // For DC DELIVERED
    const dSO5 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D005' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D005', customerId: cust3.id, status: 'DELIVERED', dispatchStatus: 'Delivered', assignedPerson_id: deliveryPerson1.id, lensPrice: 1200 }) });
    const dSO6 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D006' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D006', customerId: cust3.id, status: 'DELIVERED', dispatchStatus: 'Delivered', assignedPerson_id: deliveryPerson1.id, lensPrice: 900 }) });

    // For DC ON_HOLD
    const dSO7 = await prisma.saleOrder.upsert({ where: { orderNo: 'TEST-SO-D007' }, update: {}, create: soBase({ orderNo: 'TEST-SO-D007', customerId: cust1.id, status: 'READY_FOR_DISPATCH', dispatchStatus: 'On Hold', assignedPerson_id: deliveryPerson1.id, lensPrice: 1800 }) });

    console.log('   ✅ 7 dispatch-linked orders created\n');

    // ── 12. DispatchCopy records ────────────────────────────────────────────
    console.log('🚚 Creating DispatchCopy records…');

    const today     = new Date();
    const tomorrow  = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date(today); twoDaysAgo.setDate(today.getDate() - 2);
    const threeDaysAgo = new Date(today); threeDaysAgo.setDate(today.getDate() - 3);

    // DC PENDING ─────────────────────────────────────────────────────────────
    const dcPending = await prisma.dispatchCopy.upsert({
        where: { dcNumber: 'TEST-DC-2026-0001' },
        update: {},
        create: {
            dcNumber: 'TEST-DC-2026-0001',
            customerId: cust1.id,
            deliveryPersonId: deliveryPerson1.id,
            expectedDeliveryDate: tomorrow,
            status: 'PENDING',
            vehicleNumber: 'MH-01-AB-1234',
            driverName: 'Ramesh Kumar',
            driverContact: '+91-9876541001',
            deliveryNotes: 'Call before arriving',
            createdBy: adminUser.id,
            saleOrders: { connect: [{ id: dSO1.id }, { id: dSO2.id }] },
        },
    });

    // DC IN_TRANSIT ──────────────────────────────────────────────────────────
    const dcInTransit = await prisma.dispatchCopy.upsert({
        where: { dcNumber: 'TEST-DC-2026-0002' },
        update: {},
        create: {
            dcNumber: 'TEST-DC-2026-0002',
            customerId: cust2.id,
            deliveryPersonId: deliveryPerson2.id,
            expectedDeliveryDate: today,
            status: 'IN_TRANSIT',
            vehicleNumber: 'MH-12-CD-5678',
            driverName: 'Suresh Sharma',
            driverContact: '+91-9876541002',
            deliveryNotes: 'Fragile — progressive lenses',
            createdBy: adminUser.id,
            saleOrders: { connect: [{ id: dSO3.id }, { id: dSO4.id }] },
        },
    });

    // DC DELIVERED ───────────────────────────────────────────────────────────
    const dcDelivered = await prisma.dispatchCopy.upsert({
        where: { dcNumber: 'TEST-DC-2026-0003' },
        update: {},
        create: {
            dcNumber: 'TEST-DC-2026-0003',
            customerId: cust3.id,
            deliveryPersonId: deliveryPerson1.id,
            expectedDeliveryDate: twoDaysAgo,
            actualDeliveryDate: yesterday,
            status: 'DELIVERED',
            vehicleNumber: 'MH-01-AB-1234',
            driverName: 'Ramesh Kumar',
            driverContact: '+91-9876541001',
            deliveryNotes: 'Deliver to shop owner only',
            deliverySignature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            createdBy: adminUser.id,
            saleOrders: { connect: [{ id: dSO5.id }, { id: dSO6.id }] },
        },
    });

    // DC ON_HOLD ─────────────────────────────────────────────────────────────
    const dcOnHold = await prisma.dispatchCopy.upsert({
        where: { dcNumber: 'TEST-DC-2026-0004' },
        update: {},
        create: {
            dcNumber: 'TEST-DC-2026-0004',
            customerId: cust1.id,
            deliveryPersonId: deliveryPerson1.id,
            expectedDeliveryDate: yesterday,
            status: 'ON_HOLD',
            vehicleNumber: 'MH-01-AB-1234',
            driverName: 'Ramesh Kumar',
            driverContact: '+91-9876541001',
            notes: 'Customer not available at shop — will retry tomorrow',
            createdBy: adminUser.id,
            saleOrders: { connect: [{ id: dSO7.id }] },
        },
    });

    // One more PENDING in the future ─────────────────────────────────────────
    const futureDate = new Date(today); futureDate.setDate(today.getDate() + 3);
    const dcPending2 = await prisma.dispatchCopy.upsert({
        where: { dcNumber: 'TEST-DC-2026-0005' },
        update: {},
        create: {
            dcNumber: 'TEST-DC-2026-0005',
            customerId: cust2.id,
            deliveryPersonId: deliveryPerson2.id,
            expectedDeliveryDate: futureDate,
            status: 'PENDING',
            vehicleNumber: 'MH-12-CD-5678',
            driverName: 'Suresh Sharma',
            driverContact: '+91-9876541002',
            deliveryNotes: 'Morning delivery preferred',
            createdBy: adminUser.id,
        },
    });

    console.log('   ✅ 5 DispatchCopy records created\n');

    // ── 13. Update dispatchCopyId on linked sale orders ─────────────────────
    // (Needed so SaleOrder → DispatchCopy relation is bi-directionally correct)
    await prisma.saleOrder.updateMany({ where: { orderNo: { in: ['TEST-SO-D001', 'TEST-SO-D002'] } }, data: { dispatchCopyId: dcPending.id   } });
    await prisma.saleOrder.updateMany({ where: { orderNo: { in: ['TEST-SO-D003', 'TEST-SO-D004'] } }, data: { dispatchCopyId: dcInTransit.id } });
    await prisma.saleOrder.updateMany({ where: { orderNo: { in: ['TEST-SO-D005', 'TEST-SO-D006'] } }, data: { dispatchCopyId: dcDelivered.id } });
    await prisma.saleOrder.updateMany({ where: { orderNo: { in: ['TEST-SO-D007']               } }, data: { dispatchCopyId: dcOnHold.id    } });

    console.log('   ✅ dispatchCopyId set on linked sale orders\n');

    // ── Summary ─────────────────────────────────────────────────────────────
    console.log('🎉 Dispatch Test Seed Complete!\n');
    console.log('📊 Summary:');
    console.log('   Delivery persons : Ramesh Kumar (DEL001), Suresh Sharma (DEL002)');
    console.log('   Customers        : City Opticals (Mumbai), Vision Plus (Pune), Eye World (Nagpur)');
    console.log('   Ready orders     : 9 (unassigned to dispatch)');
    console.log('   Dispatch records :');
    console.log(`     TEST-DC-2026-0001  PENDING    → ${cust1.shopname} — 2 orders`);
    console.log(`     TEST-DC-2026-0002  IN_TRANSIT → ${cust2.shopname} — 2 orders`);
    console.log(`     TEST-DC-2026-0003  DELIVERED  → ${cust3.shopname} — 2 orders`);
    console.log(`     TEST-DC-2026-0004  ON_HOLD    → ${cust1.shopname} — 1 order`);
    console.log(`     TEST-DC-2026-0005  PENDING    → ${cust2.shopname} — (no orders yet)`);
    console.log('\n🔐 Delivery person login:');
    console.log('   Email: ramesh@lensbilling.com  / Password: delivery123');
    console.log('   Email: suresh@lensbilling.com  / Password: delivery123');
}

main()
    .catch((e) => {
        console.error('❌ Seed error:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
