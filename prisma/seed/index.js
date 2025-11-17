import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Clear existing data in correct order (respecting foreign keys)
  console.log('🗑️  Clearing existing data...');
  
  const deleteTable = async (tableName, deleteFunc) => {
    try {
      await deleteFunc();
    } catch (e) {
      if (e.code === 'P2021') {
        console.log(`   ℹ️  ${tableName} table doesn't exist yet, skipping...`);
      } else {
        throw e;
      }
    }
  };
  
  await deleteTable('Payment', () => prisma.payment.deleteMany());
  await deleteTable('Invoice', () => prisma.invoice.deleteMany());
  await deleteTable('PurchaseOrder', () => prisma.purchaseOrder.deleteMany());
  await deleteTable('SaleOrderItem', () => prisma.saleOrderItem.deleteMany());
  await deleteTable('PriceMapping', () => prisma.priceMapping.deleteMany());
  await deleteTable('SaleOrder', () => prisma.saleOrder.deleteMany());
  await deleteTable('DispatchCopy', () => prisma.dispatchCopy.deleteMany());
  await deleteTable('LensPriceMaster', () => prisma.lensPriceMaster.deleteMany());
  await deleteTable('LensProductMaster', () => prisma.lensProductMaster.deleteMany());
  await deleteTable('LensTintingMaster', () => prisma.lensTintingMaster.deleteMany());
  await deleteTable('LensDiaMaster', () => prisma.lensDiaMaster.deleteMany());
  await deleteTable('LensFittingMaster', () => prisma.lensFittingMaster.deleteMany());
  await deleteTable('LensCoatingMaster', () => prisma.lensCoatingMaster.deleteMany());
  await deleteTable('LensTypeMaster', () => prisma.lensTypeMaster.deleteMany());
  await deleteTable('LensBrandMaster', () => prisma.lensBrandMaster.deleteMany());
  await deleteTable('LensMaterialMaster', () => prisma.lensMaterialMaster.deleteMany());
  await deleteTable('LensCategoryMaster', () => prisma.lensCategoryMaster.deleteMany());
  await deleteTable('Customer', () => prisma.customer.deleteMany());
  await deleteTable('Vendor', () => prisma.vendor.deleteMany());
  await deleteTable('BusinessCategory', () => prisma.businessCategory.deleteMany());
  await deleteTable('Permission', () => prisma.permission.deleteMany());
  await deleteTable('RefreshToken', () => prisma.refreshToken.deleteMany());
  
  // Need to delete DepartmentDetails before User due to circular dependency
  // First update all departments to remove the user references
  try {
    await prisma.departmentDetails.updateMany({
      data: {
        createdBy: 1,
        updatedBy: 1,
      }
    });
  } catch (e) {
    console.log('   ℹ️  Could not update departments, continuing...');
  }
  
  await deleteTable('User', () => prisma.user.deleteMany());
  await deleteTable('Role', () => prisma.role.deleteMany());
  await deleteTable('DepartmentDetails', () => prisma.departmentDetails.deleteMany());
  
  console.log('✅ Existing data cleared\n');

  // Create a system user first (for createdBy references)
  // Handle circular dependency: User -> Department -> createdBy (User)
  console.log('👤 Creating system user...');
  
  // Step 1: Create system role
  await prisma.$executeRaw`
    INSERT INTO "Role" (id, name, "createdAt", "updatedAt")
    VALUES (1, 'System', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `;

  // Step 2: Create user without department (set to NULL temporarily)
  const hashedSystemPassword = await bcrypt.hash('system123', 10);
  await prisma.$executeRaw`
    INSERT INTO "User" (id, name, email, usercode, password, role_id, department_id, "createdBy", active_status, delete_status, "createdAt", "updatedAt")
    VALUES (1, 'System Admin', 'system@lensbilling.com', 'SYS001', ${hashedSystemPassword}, 1, NULL, 1, true, false, NOW(), NOW())
    ON CONFLICT (id) DO NOTHING
  `;

  // Step 3: Create department (now user ID 1 exists for createdBy)
  await prisma.$executeRaw`
    INSERT INTO "DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "updatedAt", "createdBy")
    VALUES (1, 'System', true, false, NOW(), NOW(), 1)
    ON CONFLICT (id) DO NOTHING
  `;
  
  // Step 4: Update user with department
  await prisma.$executeRaw`
    UPDATE "User" SET department_id = 1 WHERE id = 1
  `;
  
  const systemUser = await prisma.user.findUnique({ where: { id: 1 } });
  console.log('✅ System user created\n');

  // Create Departments
  console.log('🏢 Creating departments...');
  const departments = await Promise.all([
    prisma.departmentDetails.create({
      data: {
        department: 'Administration',
        active_status: true,
        delete_status: false,
        createdBy: systemUser.id,
      },
    }),
    prisma.departmentDetails.create({
      data: {
        department: 'Sales',
        active_status: true,
        delete_status: false,
        createdBy: systemUser.id,
      },
    }),
    prisma.departmentDetails.create({
      data: {
        department: 'Inventory',
        active_status: true,
        delete_status: false,
        createdBy: systemUser.id,
      },
    }),
    prisma.departmentDetails.create({
      data: {
        department: 'Accounts',
        active_status: true,
        delete_status: false,
        createdBy: systemUser.id,
      },
    }),
  ]);
  console.log('✅ Departments created\n');

  // Create Roles
  console.log('👥 Creating roles and permissions...');
  const roles = await Promise.all([
    prisma.role.create({
      data: {
        name: 'Admin',
        permissions: {
          create: [
            { action: 'create', subject: 'all' },
            { action: 'read', subject: 'all' },
            { action: 'update', subject: 'all' },
            { action: 'delete', subject: 'all' },
          ],
        },
      },
    }),
    prisma.role.create({
      data: {
        name: 'Sales',
        permissions: {
          create: [
            { action: 'create', subject: 'SaleOrder' },
            { action: 'read', subject: 'SaleOrder' },
            { action: 'update', subject: 'SaleOrder' },
            { action: 'read', subject: 'Customer' },
            { action: 'create', subject: 'Customer' },
          ],
        },
      },
    }),
    prisma.role.create({
      data: {
        name: 'Inventory',
        permissions: {
          create: [
            { action: 'create', subject: 'PurchaseOrder' },
            { action: 'read', subject: 'PurchaseOrder' },
            { action: 'update', subject: 'PurchaseOrder' },
            { action: 'read', subject: 'Vendor' },
            { action: 'create', subject: 'Vendor' },
          ],
        },
      },
    }),
    prisma.role.create({
      data: {
        name: 'Accounts',
        permissions: {
          create: [
            { action: 'read', subject: 'Invoice' },
            { action: 'create', subject: 'Payment' },
            { action: 'read', subject: 'Payment' },
            { action: 'read', subject: 'SaleOrder' },
            { action: 'read', subject: 'PurchaseOrder' },
          ],
        },
      },
    }),
  ]);
  console.log('✅ Roles and permissions created\n');

  // Hash passwords
  const hashedPassword = await bcrypt.hash('demo123', 10);

  // Create demo users
  console.log('👤 Creating demo users...');
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@lensbilling.com',
        usercode: 'ADM001',
        password: hashedPassword,
        role_id: roles[0].id,
        createdBy: systemUser.id,
        phonenumber: '+1234567890',
        department_id: departments[0].id,
        active_status: true,
        delete_status: false,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Sales User',
        email: 'sales@lensbilling.com',
        usercode: 'SAL001',
        password: hashedPassword,
        role_id: roles[1].id,
        createdBy: systemUser.id,
        phonenumber: '+1234567891',
        department_id: departments[1].id,
        active_status: true,
        delete_status: false,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Inventory User',
        email: 'inventory@lensbilling.com',
        usercode: 'INV001',
        password: hashedPassword,
        role_id: roles[2].id,
        createdBy: systemUser.id,
        phonenumber: '+1234567892',
        department_id: departments[2].id,
        active_status: true,
        delete_status: false,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Accounts User',
        email: 'accounts@lensbilling.com',
        usercode: 'ACC001',
        password: hashedPassword,
        role_id: roles[3].id,
        createdBy: systemUser.id,
        phonenumber: '+1234567893',
        department_id: departments[3].id,
        active_status: true,
        delete_status: false,
      },
    }),
  ]);
  
  const adminUser = users[0];
  console.log('✅ Demo users created\n');

  // Create Business Categories
  console.log('🏪 Creating business categories...');
  const businessCategories = await Promise.all([
    prisma.businessCategory.create({
      data: {
        name: 'Retail',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.businessCategory.create({
      data: {
        name: 'Wholesale',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.businessCategory.create({
      data: {
        name: 'Corporate',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Business categories created\n');

  // Create Lens Master Data
  console.log('👓 Creating lens master data...');
  
  const lensCategories = await Promise.all([
    prisma.lensCategoryMaster.create({
      data: {
        name: 'Single Vision',
        description: 'Standard single vision lenses',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensCategoryMaster.create({
      data: {
        name: 'Progressive',
        description: 'Multi-focal progressive lenses',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensCategoryMaster.create({
      data: {
        name: 'Bifocal',
        description: 'Bifocal lenses',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensMaterials = await Promise.all([
    prisma.lensMaterialMaster.create({
      data: {
        name: 'Plastic (CR-39)',
        description: 'Standard plastic material',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensMaterialMaster.create({
      data: {
        name: 'Polycarbonate',
        description: 'Impact resistant material',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensMaterialMaster.create({
      data: {
        name: 'High Index 1.67',
        description: 'Thin and light material',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensCoatings = await Promise.all([
    prisma.lensCoatingMaster.create({
      data: {
        name: 'Anti-Reflective Coating',
        short_name: 'AR',
        description: 'Reduces glare and reflections',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensCoatingMaster.create({
      data: {
        name: 'Blue Light Protection',
        short_name: 'BLP',
        description: 'Blocks harmful blue light',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensCoatingMaster.create({
      data: {
        name: 'UV Protection',
        short_name: 'UV',
        description: 'UV400 protection',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensBrands = await Promise.all([
    prisma.lensBrandMaster.create({
      data: {
        name: 'Essilor',
        description: 'Premium French lens brand',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensBrandMaster.create({
      data: {
        name: 'Zeiss',
        description: 'German precision optics',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensBrandMaster.create({
      data: {
        name: 'Hoya',
        description: 'Japanese optical technology',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensTypes = await Promise.all([
    prisma.lensTypeMaster.create({
      data: {
        name: 'Spherical',
        description: 'Standard spherical design',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensTypeMaster.create({
      data: {
        name: 'Aspheric',
        description: 'Flatter, thinner profile',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensFittings = await Promise.all([
    prisma.lensFittingMaster.create({
      data: {
        name: 'Standard Fitting',
        short_name: 'STD',
        description: 'Standard lens fitting',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensFittingMaster.create({
      data: {
        name: 'Premium Fitting',
        short_name: 'PRM',
        description: 'Premium lens fitting',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensDias = await Promise.all([
    prisma.lensDiaMaster.create({
      data: {
        name: '65mm',
        short_name: '65',
        description: 'Small diameter',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensDiaMaster.create({
      data: {
        name: '70mm',
        short_name: '70',
        description: 'Standard diameter',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensDiaMaster.create({
      data: {
        name: '75mm',
        short_name: '75',
        description: 'Large diameter',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);

  const lensTintings = await Promise.all([
    prisma.lensTintingMaster.create({
      data: {
        name: 'Clear',
        short_name: 'CLR',
        description: 'No tint',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensTintingMaster.create({
      data: {
        name: 'Light Gray',
        short_name: 'LG',
        description: 'Light gray tint',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensTintingMaster.create({
      data: {
        name: 'Brown',
        short_name: 'BRN',
        description: 'Brown tint',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Lens master data created\n');

  // Create Lens Products
  console.log('🔬 Creating lens products...');
  const lensProducts = await Promise.all([
    prisma.lensProductMaster.create({
      data: {
        brand_id: lensBrands[0].id,
        category_id: lensCategories[0].id,
        material_id: lensMaterials[0].id,
        type_id: lensTypes[0].id,
        product_code: 'ESS-SV-001',
        lens_name: 'Essilor Single Vision Standard',
        index_value: 156,
        sphere_min: -6.0,
        sphere_max: 4.0,
        cyl_min: -2.0,
        cyl_max: 2.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensProductMaster.create({
      data: {
        brand_id: lensBrands[1].id,
        category_id: lensCategories[1].id,
        material_id: lensMaterials[2].id,
        type_id: lensTypes[1].id,
        product_code: 'ZIS-PRG-001',
        lens_name: 'Zeiss Progressive Premium',
        index_value: 167,
        sphere_min: -8.0,
        sphere_max: 6.0,
        cyl_min: -4.0,
        cyl_max: 4.0,
        add_min: 0.75,
        add_max: 3.5,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensProductMaster.create({
      data: {
        brand_id: lensBrands[2].id,
        category_id: lensCategories[0].id,
        material_id: lensMaterials[1].id,
        type_id: lensTypes[1].id,
        product_code: 'HOY-SV-002',
        lens_name: 'Hoya Single Vision Aspheric',
        index_value: 159,
        sphere_min: -10.0,
        sphere_max: 8.0,
        cyl_min: -6.0,
        cyl_max: 6.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Lens products created\n');

  // Create Lens Prices
  console.log('💰 Creating lens prices...');
  await Promise.all([
    prisma.lensPriceMaster.create({
      data: {
        lens_id: lensProducts[0].id,
        coating_id: lensCoatings[0].id,
        price: 1500.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensPriceMaster.create({
      data: {
        lens_id: lensProducts[0].id,
        coating_id: lensCoatings[1].id,
        price: 2000.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensPriceMaster.create({
      data: {
        lens_id: lensProducts[1].id,
        coating_id: lensCoatings[0].id,
        price: 5000.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensPriceMaster.create({
      data: {
        lens_id: lensProducts[1].id,
        coating_id: lensCoatings[1].id,
        price: 6500.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.lensPriceMaster.create({
      data: {
        lens_id: lensProducts[2].id,
        coating_id: lensCoatings[2].id,
        price: 3500.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Lens prices created\n');

  // Create Vendors
  console.log('🏭 Creating vendors...');
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: {
        name: 'OptiLens Suppliers',
        code: 'VEND-001',
        shopname: 'OptiLens Store',
        phone: '+91-9876543210',
        email: 'contact@optilens.com',
        address: '123 Lens Street, Mumbai',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        category: 'Lens Supplier',
        gstin: '27AAAAA0000A1Z5',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    }),
    prisma.vendor.create({
      data: {
        name: 'Vision Care Products',
        code: 'VEND-002',
        shopname: 'Vision Care Hub',
        phone: '+91-9876543211',
        email: 'sales@visioncare.com',
        address: '456 Eye Road, Delhi',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        category: 'Eye Care Products',
        gstin: '07BBBBB0000B2Z6',
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
        updatedBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Vendors created\n');

  // Create Customers  
  console.log('👥 Creating customers...');
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        name: 'Rahul Kumar',
        code: 'CUST-001',
        shopname: 'Rahul Opticals',
        phone: '+91-9876543212',
        email: 'rahul@rahulopticals.com',
        address: '789 Customer Lane, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        businessCategory_id: businessCategories[0].id,
        gstin: '33CCCCC0000C3Z7',
        credit_limit: 50000,
        outstanding_credit: 15000,
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Priya Singh',
        code: 'CUST-002',
        shopname: 'Priya Eye Care',
        phone: '+91-9876543213',
        email: 'priya@priyaeyecare.com',
        address: '321 Client Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        businessCategory_id: businessCategories[1].id,
        gstin: '29DDDDD0000D4Z8',
        credit_limit: 100000,
        outstanding_credit: 25000,
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.customer.create({
      data: {
        name: 'Amit Patel',
        code: 'CUST-003',
        shopname: 'Amit Vision Center',
        phone: '+91-9876543214',
        email: 'amit@amitvision.com',
        address: '654 Buyer Street, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        businessCategory_id: businessCategories[2].id,
        gstin: '36EEEEE0000E5Z9',
        credit_limit: 150000,
        outstanding_credit: 45000,
        active_status: true,
        delete_status: false,
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Customers created\n');

  // Create Sale Orders
  console.log('📝 Creating sale orders...');
  const saleOrders = await Promise.all([
    prisma.saleOrder.create({
      data: {
        orderNo: 'SO-2024-001',
        customerId: customers[0].id,
        customerRefNo: 'CUST-REF-001',
        status: 'CONFIRMED',
        type: 'Standard',
        lens_id: lensProducts[0].id,
        category_id: lensCategories[0].id,
        Type_id: lensTypes[0].id,
        coating_id: lensCoatings[0].id,
        fitting_id: lensFittings[0].id,
        dia_id: lensDias[1].id,
        tinting_id: lensTintings[0].id,
        rightEye: true,
        leftEye: true,
        rightSpherical: '-2.00',
        rightCylindrical: '-0.50',
        rightAxis: '90',
        leftSpherical: '-2.25',
        leftCylindrical: '-0.75',
        leftAxis: '85',
        lensPrice: 1500,
        discount: 10,
        remark: 'Urgent delivery required',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.saleOrder.create({
      data: {
        orderNo: 'SO-2024-002',
        customerId: customers[1].id,
        customerRefNo: 'CUST-REF-002',
        status: 'IN_PRODUCTION',
        type: 'Premium',
        lens_id: lensProducts[1].id,
        category_id: lensCategories[1].id,
        Type_id: lensTypes[1].id,
        coating_id: lensCoatings[1].id,
        fitting_id: lensFittings[1].id,
        dia_id: lensDias[2].id,
        tinting_id: lensTintings[1].id,
        rightEye: true,
        leftEye: true,
        rightSpherical: '-3.50',
        rightCylindrical: '-1.00',
        rightAxis: '180',
        rightAdd: '+2.00',
        leftSpherical: '-3.75',
        leftCylindrical: '-1.25',
        leftAxis: '175',
        leftAdd: '+2.00',
        lensPrice: 6500,
        discount: 15,
        remark: 'Progressive lenses for computer work',
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.saleOrder.create({
      data: {
        orderNo: 'SO-2024-003',
        customerId: customers[2].id,
        status: 'DRAFT',
        type: 'Standard',
        lens_id: lensProducts[2].id,
        category_id: lensCategories[0].id,
        Type_id: lensTypes[1].id,
        coating_id: lensCoatings[2].id,
        fitting_id: lensFittings[0].id,
        dia_id: lensDias[0].id,
        tinting_id: lensTintings[2].id,
        rightEye: true,
        leftEye: false,
        rightSpherical: '-1.50',
        rightCylindrical: '-0.25',
        rightAxis: '45',
        lensPrice: 3500,
        discount: 5,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
    prisma.saleOrder.create({
      data: {
        orderNo: 'SO-2024-004',
        customerId: customers[0].id,
        status: 'DELIVERED',
        type: 'Standard',
        lens_id: lensProducts[0].id,
        category_id: lensCategories[0].id,
        Type_id: lensTypes[0].id,
        coating_id: lensCoatings[0].id,
        rightEye: true,
        leftEye: true,
        rightSpherical: '-4.00',
        leftSpherical: '-4.25',
        lensPrice: 1500,
        discount: 0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: adminUser.id,
      },
    }),
  ]);
  console.log('✅ Sale orders created\n');

  console.log('🎉 Seed data created successfully!\n');
  console.log('📊 Summary:');
  console.log(`   - ${users.length} users created`);
  console.log(`   - ${customers.length} customers created`);
  console.log(`   - ${vendors.length} vendors created`);
  console.log(`   - ${lensProducts.length} lens products created`);
  console.log(`   - ${saleOrders.length} sale orders created`);
  console.log('\n🔐 Login credentials:');
  console.log('   Email: admin@lensbilling.com');
  console.log('   Password: demo123');
  console.log('\n   Email: sales@lensbilling.com');
  console.log('   Password: demo123');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });