import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedComplete() {
  try {
    console.log('🌱 Starting complete database seed...\n');

    // Step 1: Create Admin Role and System User
    console.log('👤 Creating system user...');
    
    await prisma.$executeRaw`
      INSERT INTO "Role" (id, name, "createdAt", "updatedAt")
      VALUES (1, 'Admin', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = 'Admin'
    `;

    const hashedPassword = await bcrypt.hash('demo123', 10);
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, email, username, usercode, password, role_id, department_id, "createdBy", active_status, delete_status, "createdAt", "updatedAt", is_login)
      VALUES (1, 'Admin User', 'admin@lensbilling.com', 'admin', 'ADM001', ${hashedPassword}, 1, NULL, 1, true, false, NOW(), NOW(), false)
      ON CONFLICT (id) DO UPDATE SET 
        name = 'Admin User',
        email = 'admin@lensbilling.com',
        password = ${hashedPassword}
    `;

    await prisma.$executeRaw`
      INSERT INTO "DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "updatedAt", "createdBy")
      VALUES (1, 'Administration', true, false, NOW(), NOW(), 1)
      ON CONFLICT (id) DO UPDATE SET department = 'Administration'
    `;

    await prisma.$executeRaw`
      UPDATE "User" SET department_id = 1 WHERE id = 1
    `;

    console.log('✅ System user created\n');

    // Step 2: Create Departments
    console.log('🏢 Creating departments...');
    const departments = [
      { id: 2, department: 'Sales' },
      { id: 3, department: 'Inventory' },
      { id: 4, department: 'Accounts' },
      { id: 5, department: 'Production' },
      { id: 6, department: 'Dispatch' }
    ];

    for (const dept of departments) {
      await prisma.departmentDetails.upsert({
        where: { id: dept.id },
        update: {},
        create: {
          id: dept.id,
          department: dept.department,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Departments created\n');

    // Step 3: Create Additional Roles
    console.log('👥 Creating roles...');
    const roles = [
      { id: 2, name: 'Sales' },
      { id: 3, name: 'Inventory' },
      { id: 4, name: 'Accounts' },
      { id: 5, name: 'Manager' }
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: {},
        create: {
          id: role.id,
          name: role.name
        }
      });
    }
    console.log('✅ Roles created\n');

    // Step 4: Create Permissions
    console.log('🔐 Creating permissions...');
    
    // Delete existing permissions for admin role
    await prisma.permission.deleteMany({
      where: { role_id: 1 }
    });

    const adminPermissions = [
      { role_id: 1, action: 'manage', subject: 'all' },
      { role_id: 1, action: 'create', subject: 'all' },
      { role_id: 1, action: 'read', subject: 'all' },
      { role_id: 1, action: 'update', subject: 'all' },
      { role_id: 1, action: 'delete', subject: 'all' }
    ];

    await prisma.permission.createMany({
      data: adminPermissions,
      skipDuplicates: true
    });
    
    console.log('✅ Permissions created\n');

    // Step 5: Create Business Categories
    console.log('🏪 Creating business categories...');
    const businessCategories = [
      { id: 1, name: 'Retail' },
      { id: 2, name: 'Wholesale' },
      { id: 3, name: 'Corporate' }
    ];

    for (const cat of businessCategories) {
      await prisma.businessCategory.upsert({
        where: { name: cat.name },
        update: {},
        create: {
          name: cat.name,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Business categories created\n');

    // Step 6: Create Lens Master Data
    console.log('👓 Creating lens master data...');
    
    // Categories
    const lensCategories = [
      { id: 1, name: 'Single Vision', description: 'Standard single vision lenses' },
      { id: 2, name: 'Progressive', description: 'Multi-focal progressive lenses' },
      { id: 3, name: 'Bifocal', description: 'Bifocal lenses' }
    ];

    for (const cat of lensCategories) {
      await prisma.lensCategoryMaster.upsert({
        where: { name: cat.name },
        update: {},
        create: {
          name: cat.name,
          description: cat.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Materials
    const lensMaterials = [
      { id: 1, name: 'Plastic (CR-39)', description: 'Standard plastic material' },
      { id: 2, name: 'Polycarbonate', description: 'Impact resistant material' },
      { id: 3, name: 'High Index 1.67', description: 'Thin and light material' }
    ];

    for (const mat of lensMaterials) {
      await prisma.lensMaterialMaster.upsert({
        where: { name: mat.name },
        update: {},
        create: {
          name: mat.name,
          description: mat.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Coatings
    const lensCoatings = [
      { id: 1, name: 'Anti-Reflective Coating', short_name: 'AR', description: 'Reduces glare and reflections' },
      { id: 2, name: 'Blue Light Protection', short_name: 'BLP', description: 'Blocks harmful blue light' },
      { id: 3, name: 'UV Protection', short_name: 'UV', description: 'UV400 protection' }
    ];

    for (const coat of lensCoatings) {
      await prisma.lensCoatingMaster.upsert({
        where: { name: coat.name },
        update: {},
        create: {
          name: coat.name,
          short_name: coat.short_name,
          description: coat.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Brands
    const lensBrands = [
      { id: 1, name: 'Essilor', description: 'Premium French lens brand' },
      { id: 2, name: 'Zeiss', description: 'German precision optics' },
      { id: 3, name: 'Hoya', description: 'Japanese optical technology' }
    ];

    for (const brand of lensBrands) {
      await prisma.lensBrandMaster.upsert({
        where: { name: brand.name },
        update: {},
        create: {
          name: brand.name,
          description: brand.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Types
    const lensTypes = [
      { id: 1, name: 'Spherical', description: 'Standard spherical design' },
      { id: 2, name: 'Aspheric', description: 'Flatter, thinner profile' }
    ];

    for (const type of lensTypes) {
      await prisma.lensTypeMaster.upsert({
        where: { name: type.name },
        update: {},
        create: {
          name: type.name,
          description: type.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Fittings
    const lensFittings = [
      { id: 1, name: 'Standard Fitting', short_name: 'STD', description: 'Standard lens fitting', fitting_price: 200.0 },
      { id: 2, name: 'Premium Fitting', short_name: 'PRM', description: 'Premium lens fitting', fitting_price: 500.0 }
    ];

    for (const fit of lensFittings) {
      await prisma.lensFittingMaster.upsert({
        where: { name: fit.name },
        update: {},
        create: {
          name: fit.name,
          short_name: fit.short_name,
          description: fit.description,
          fitting_price: fit.fitting_price,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Diameters
    const lensDias = [
      { id: 1, name: '65mm', short_name: '65', description: 'Small diameter' },
      { id: 2, name: '70mm', short_name: '70', description: 'Standard diameter' },
      { id: 3, name: '75mm', short_name: '75', description: 'Large diameter' }
    ];

    for (const dia of lensDias) {
      await prisma.lensDiaMaster.upsert({
        where: { name: dia.name },
        update: {},
        create: {
          name: dia.name,
          short_name: dia.short_name,
          description: dia.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    // Tintings
    const lensTintings = [
      { id: 1, name: 'Clear', short_name: 'CLR', description: 'No tint' },
      { id: 2, name: 'Light Gray', short_name: 'LG', description: 'Light gray tint' },
      { id: 3, name: 'Brown', short_name: 'BRN', description: 'Brown tint' },
      { id: 4, name: 'Green', short_name: 'GRN', description: 'Green tint for outdoor use' },
      { id: 5, name: 'Photochromic', short_name: 'PHT', description: 'Light-reactive tint' }
    ];

    for (const tint of lensTintings) {
      await prisma.lensTintingMaster.upsert({
        where: { name: tint.name },
        update: {},
        create: {
          name: tint.name,
          short_name: tint.short_name,
          description: tint.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }

    console.log('✅ Lens master data created\n');

    // Step 7: Create Lens Products
    console.log('🔬 Creating lens products...');
    
    // Get the created master data IDs
    const essilorBrand = await prisma.lensBrandMaster.findUnique({ where: { name: 'Essilor' } });
    const zeissBrand = await prisma.lensBrandMaster.findUnique({ where: { name: 'Zeiss' } });
    const hoyaBrand = await prisma.lensBrandMaster.findUnique({ where: { name: 'Hoya' } });
    
    const singleVisionCat = await prisma.lensCategoryMaster.findUnique({ where: { name: 'Single Vision' } });
    const progressiveCat = await prisma.lensCategoryMaster.findUnique({ where: { name: 'Progressive' } });
    
    const plasticMat = await prisma.lensMaterialMaster.findUnique({ where: { name: 'Plastic (CR-39)' } });
    const polyMat = await prisma.lensMaterialMaster.findUnique({ where: { name: 'Polycarbonate' } });
    const highIndexMat = await prisma.lensMaterialMaster.findUnique({ where: { name: 'High Index 1.67' } });
    
    const sphericalType = await prisma.lensTypeMaster.findUnique({ where: { name: 'Spherical' } });
    const asphericType = await prisma.lensTypeMaster.findUnique({ where: { name: 'Aspheric' } });
    
    // Delete existing products to avoid duplicates
    await prisma.lensProductMaster.deleteMany({
      where: {
        product_code: {
          in: ['ESS-SV-001', 'ZIS-PRG-001', 'HOY-SV-002']
        }
      }
    });
    
    const lensProducts = [
      {
        product_code: 'ESS-SV-001',
        brand_id: essilorBrand.id,
        category_id: singleVisionCat.id,
        material_id: plasticMat.id,
        type_id: sphericalType.id,
        lens_name: 'Essilor Single Vision Standard',
        index_value: 156,
        sphere_min: -6.0,
        sphere_max: 4.0,
        cyl_min: -2.0,
        cyl_max: 2.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: 1
      },
      {
        product_code: 'ZIS-PRG-001',
        brand_id: zeissBrand.id,
        category_id: progressiveCat.id,
        material_id: highIndexMat.id,
        type_id: asphericType.id,
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
        createdBy: 1
      },
      {
        product_code: 'HOY-SV-002',
        brand_id: hoyaBrand.id,
        category_id: singleVisionCat.id,
        material_id: polyMat.id,
        type_id: asphericType.id,
        lens_name: 'Hoya Single Vision Aspheric',
        index_value: 159,
        sphere_min: -10.0,
        sphere_max: 8.0,
        cyl_min: -6.0,
        cyl_max: 6.0,
        activeStatus: true,
        deleteStatus: false,
        createdBy: 1
      }
    ];

    await prisma.lensProductMaster.createMany({
      data: lensProducts,
      skipDuplicates: true
    });
    
    console.log('✅ Lens products created\n');

    // Step 8: Create Lens Prices
    console.log('💰 Creating lens prices...');
    
    // Get lens products
    const lensProduct1 = await prisma.lensProductMaster.findFirst({ where: { product_code: 'ESS-SV-001' } });
    const lensProduct2 = await prisma.lensProductMaster.findFirst({ where: { product_code: 'ZIS-PRG-001' } });
    const lensProduct3 = await prisma.lensProductMaster.findFirst({ where: { product_code: 'HOY-SV-002' } });
    
    // Get coatings
    const arCoating = await prisma.lensCoatingMaster.findUnique({ where: { name: 'Anti-Reflective Coating' } });
    const blpCoating = await prisma.lensCoatingMaster.findUnique({ where: { name: 'Blue Light Protection' } });
    const uvCoating = await prisma.lensCoatingMaster.findUnique({ where: { name: 'UV Protection' } });
    
    // Delete existing prices to avoid duplicates
    await prisma.lensPriceMaster.deleteMany({
      where: {
        OR: [
          { lens_id: lensProduct1.id },
          { lens_id: lensProduct2.id },
          { lens_id: lensProduct3.id }
        ]
      }
    });
    
    const lensPrices = [
      { lens_id: lensProduct1.id, coating_id: arCoating.id, price: 1500.0 },
      { lens_id: lensProduct1.id, coating_id: blpCoating.id, price: 2000.0 },
      { lens_id: lensProduct1.id, coating_id: uvCoating.id, price: 1800.0 },
      { lens_id: lensProduct2.id, coating_id: arCoating.id, price: 5000.0 },
      { lens_id: lensProduct2.id, coating_id: blpCoating.id, price: 6500.0 },
      { lens_id: lensProduct3.id, coating_id: blpCoating.id, price: 3500.0 },
      { lens_id: lensProduct3.id, coating_id: uvCoating.id, price: 3200.0 }
    ];

    await prisma.lensPriceMaster.createMany({
      data: lensPrices.map(price => ({
        ...price,
        activeStatus: true,
        deleteStatus: false,
        createdBy: 1
      })),
      skipDuplicates: true
    });
    
    console.log('✅ Lens prices created\n');

    // Step 9: Create Vendors
    console.log('🏭 Creating vendors...');
    const vendors = [
      {
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
        gstin: '27AAAAA0000A1Z5'
      },
      {
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
        gstin: '07BBBBB0000B2Z6'
      }
    ];

    for (const vendor of vendors) {
      await prisma.vendor.upsert({
        where: { code: vendor.code },
        update: {},
        create: {
          ...vendor,
          active_status: true,
          delete_status: false,
          createdBy: 1,
          updatedBy: 1
        }
      });
    }
    console.log('✅ Vendors created\n');

    // Step 10: Create Customers
    console.log('👥 Creating customers...');
    
    // Get business categories
    const retailCat = await prisma.businessCategory.findUnique({ where: { name: 'Retail' } });
    const wholesaleCat = await prisma.businessCategory.findUnique({ where: { name: 'Wholesale' } });
    const corporateCat = await prisma.businessCategory.findUnique({ where: { name: 'Corporate' } });
    
    const customers = [
      {
        name: 'Rahul Kumar',
        code: 'CUST-001',
        shopname: 'Rahul Opticals',
        phone: '+91-9876543212',
        email: 'rahul@rahulopticals.com',
        address: '789 Customer Lane, Chennai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        pincode: '600001',
        businessCategory_id: retailCat.id,
        gstin: '33CCCCC0000C3Z7',
        credit_limit: 50000,
        outstanding_credit: 15000
      },
      {
        name: 'Priya Singh',
        code: 'CUST-002',
        shopname: 'Priya Eye Care',
        phone: '+91-9876543213',
        email: 'priya@priyaeyecare.com',
        address: '321 Client Road, Bangalore',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        businessCategory_id: wholesaleCat.id,
        gstin: '29DDDDD0000D4Z8',
        credit_limit: 100000,
        outstanding_credit: 25000
      },
      {
        name: 'Amit Patel',
        code: 'CUST-003',
        shopname: 'Amit Vision Center',
        phone: '+91-9876543214',
        email: 'amit@amitvision.com',
        address: '654 Buyer Street, Hyderabad',
        city: 'Hyderabad',
        state: 'Telangana',
        pincode: '500001',
        businessCategory_id: corporateCat.id,
        gstin: '36EEEEE0000E5Z9',
        credit_limit: 150000,
        outstanding_credit: 45000
      }
    ];

    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { code: customer.code },
        update: {},
        create: {
          ...customer,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Customers created\n');

    // Step 11: Create Sample Sale Orders
    console.log('📝 Creating sale orders...');
    
    // Get all necessary references
    const customer1 = await prisma.customer.findUnique({ where: { code: 'CUST-001' } });
    const customer2 = await prisma.customer.findUnique({ where: { code: 'CUST-002' } });
    const customer3 = await prisma.customer.findUnique({ where: { code: 'CUST-003' } });
    
    const standardFitting = await prisma.lensFittingMaster.findUnique({ where: { name: 'Standard Fitting' } });
    const premiumFitting = await prisma.lensFittingMaster.findUnique({ where: { name: 'Premium Fitting' } });
    
    const dia65 = await prisma.lensDiaMaster.findUnique({ where: { name: '65mm' } });
    const dia70 = await prisma.lensDiaMaster.findUnique({ where: { name: '70mm' } });
    const dia75 = await prisma.lensDiaMaster.findUnique({ where: { name: '75mm' } });
    
    const clearTint = await prisma.lensTintingMaster.findUnique({ where: { name: 'Clear' } });
    const lightGrayTint = await prisma.lensTintingMaster.findUnique({ where: { name: 'Light Gray' } });
    const brownTint = await prisma.lensTintingMaster.findUnique({ where: { name: 'Brown' } });
    
    // Get lens products and coatings (reuse from earlier)
    const lensProduct1Ref = await prisma.lensProductMaster.findFirst({ where: { product_code: 'ESS-SV-001' } });
    const lensProduct2Ref = await prisma.lensProductMaster.findFirst({ where: { product_code: 'ZIS-PRG-001' } });
    const lensProduct3Ref = await prisma.lensProductMaster.findFirst({ where: { product_code: 'HOY-SV-002' } });
    
    const arCoatingRef = await prisma.lensCoatingMaster.findUnique({ where: { name: 'Anti-Reflective Coating' } });
    const blpCoatingRef = await prisma.lensCoatingMaster.findUnique({ where: { name: 'Blue Light Protection' } });
    
    const singleVisionCatRef = await prisma.lensCategoryMaster.findUnique({ where: { name: 'Single Vision' } });
    const progressiveCatRef = await prisma.lensCategoryMaster.findUnique({ where: { name: 'Progressive' } });
    
    const sphericalTypeRef = await prisma.lensTypeMaster.findUnique({ where: { name: 'Spherical' } });
    const asphericTypeRef = await prisma.lensTypeMaster.findUnique({ where: { name: 'Aspheric' } });
    
    const saleOrders = [
      {
        orderNo: 'SO-2024-001',
        customerId: customer1.id,
        customerRefNo: 'CUST-REF-001',
        status: 'CONFIRMED',
        type: 'Standard',
        urgentOrder: true,
        freeFitting: false,
        lens_id: lensProduct1Ref.id,
        category_id: singleVisionCatRef.id,
        Type_id: sphericalTypeRef.id,
        coating_id: arCoatingRef.id,
        fitting_id: standardFitting.id,
        dia_id: dia70.id,
        tinting_id: clearTint.id,
        rightEye: true,
        leftEye: true,
        rightSpherical: '-2.00',
        rightCylindrical: '-0.50',
        rightAxis: '90',
        leftSpherical: '-2.25',
        leftCylindrical: '-0.75',
        leftAxis: '85',
        lensPrice: 1500,
        fittingPrice: 200,
        discount: 10,
        remark: 'Urgent delivery required'
      },
      {
        orderNo: 'SO-2024-002',
        customerId: customer2.id,
        customerRefNo: 'CUST-REF-002',
        status: 'IN_PRODUCTION',
        type: 'Premium',
        urgentOrder: false,
        freeFitting: true,
        lens_id: lensProduct2Ref.id,
        category_id: progressiveCatRef.id,
        Type_id: asphericTypeRef.id,
        coating_id: blpCoatingRef.id,
        fitting_id: premiumFitting.id,
        dia_id: dia75.id,
        tinting_id: lightGrayTint.id,
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
        fittingPrice: 500,
        discount: 15,
        remark: 'Progressive lenses for computer work'
      },
      {
        orderNo: 'SO-2024-003',
        customerId: customer3.id,
        status: 'DRAFT',
        type: 'Standard',
        urgentOrder: false,
        freeFitting: false,
        lens_id: lensProduct3Ref.id,
        category_id: singleVisionCatRef.id,
        Type_id: asphericTypeRef.id,
        coating_id: blpCoatingRef.id,
        fitting_id: standardFitting.id,
        dia_id: dia65.id,
        tinting_id: brownTint.id,
        rightEye: true,
        leftEye: false,
        rightSpherical: '-1.50',
        rightCylindrical: '-0.25',
        rightAxis: '45',
        lensPrice: 3500,
        fittingPrice: 200,
        discount: 5
      },
      {
        orderNo: 'SO-2024-004',
        customerId: customer1.id,
        status: 'DELIVERED',
        type: 'Standard',
        urgentOrder: false,
        freeFitting: false,
        lens_id: lensProduct1Ref.id,
        category_id: singleVisionCatRef.id,
        Type_id: sphericalTypeRef.id,
        coating_id: arCoatingRef.id,
        rightEye: true,
        leftEye: true,
        rightSpherical: '-4.00',
        leftSpherical: '-4.25',
        lensPrice: 1500,
        fittingPrice: 200,
        discount: 0
      }
    ];

    for (const order of saleOrders) {
      await prisma.saleOrder.upsert({
        where: { orderNo: order.orderNo },
        update: {},
        create: {
          ...order,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Sale orders created\n');

    console.log('═══════════════════════════════════════');
    console.log('🎉 Complete database seed successful!');
    console.log('═══════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`   • 1 System User`);
    console.log(`   • 6 Departments`);
    console.log(`   • 5 Roles with Permissions`);
    console.log(`   • 3 Business Categories`);
    console.log(`   • 3 Lens Categories`);
    console.log(`   • 3 Lens Materials`);
    console.log(`   • 3 Lens Coatings`);
    console.log(`   • 3 Lens Brands`);
    console.log(`   • 2 Lens Types`);
    console.log(`   • 2 Lens Fittings`);
    console.log(`   • 3 Lens Diameters`);
    console.log(`   • 5 Lens Tintings`);
    console.log(`   • 3 Lens Products`);
    console.log(`   • 7 Lens Prices`);
    console.log(`   • 2 Vendors`);
    console.log(`   • 3 Customers`);
    console.log(`   • 4 Sale Orders`);
    console.log('\n🔐 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: demo123');
    console.log('   Email: admin@lensbilling.com');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedComplete()
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  });
