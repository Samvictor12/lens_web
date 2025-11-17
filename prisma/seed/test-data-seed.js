import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  try {
    console.log('🌱 Starting test data seed...\n');

    // Step 1: Create Admin Role and System User with raw SQL (handles circular dependency)
    console.log('👤 Creating system user...');
    
    // Create Admin role with ID=1
    await prisma.$executeRaw`
      INSERT INTO "Role" (id, name, "createdAt", "updatedAt")
      VALUES (1, 'Admin', NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET name = 'Admin'
    `;

    // Create system user without department first
    const hashedPassword = await bcrypt.hash('demo123', 10);
    await prisma.$executeRaw`
      INSERT INTO "User" (id, name, email, username, usercode, password, role_id, department_id, "createdBy", active_status, delete_status, "createdAt", "updatedAt", is_login)
      VALUES (1, 'Admin User', 'admin@lensbilling.com', 'admin', 'ADM001', ${hashedPassword}, 1, NULL, 1, true, false, NOW(), NOW(), false)
      ON CONFLICT (id) DO UPDATE SET 
        name = 'Admin User',
        email = 'admin@lensbilling.com',
        username = 'admin',
        password = ${hashedPassword}
    `;

    // Create System department with user ID 1 as creator
    await prisma.$executeRaw`
      INSERT INTO "DepartmentDetails" (id, department, active_status, delete_status, "createdAt", "updatedAt", "createdBy")
      VALUES (1, 'Administration', true, false, NOW(), NOW(), 1)
      ON CONFLICT (id) DO UPDATE SET department = 'Administration'
    `;

    // Update user with department
    await prisma.$executeRaw`
      UPDATE "User" SET department_id = 1 WHERE id = 1
    `;

    console.log('✅ System user created\n');

    // Step 2: Create additional departments
    console.log('🏢 Creating departments...');
    await prisma.departmentDetails.createMany({
      data: [
        { department: 'Sales', active_status: true, delete_status: false, createdBy: 1 },
        { department: 'Inventory', active_status: true, delete_status: false, createdBy: 1 },
        { department: 'Accounts', active_status: true, delete_status: false, createdBy: 1 },
      ],
      skipDuplicates: true
    });
    console.log('✅ Departments created\n');

    // Step 3: Create Business Categories
    console.log('🏪 Creating business categories...');
    const businessCategories = await Promise.all([
      prisma.businessCategory.upsert({
        where: { name: 'Retail' },
        update: {},
        create: { name: 'Retail', active_status: true, delete_status: false, createdBy: 1 }
      }),
      prisma.businessCategory.upsert({
        where: { name: 'Wholesale' },
        update: {},
        create: { name: 'Wholesale', active_status: true, delete_status: false, createdBy: 1 }
      }),
      prisma.businessCategory.upsert({
        where: { name: 'Corporate' },
        update: {},
        create: { name: 'Corporate', active_status: true, delete_status: false, createdBy: 1 }
      }),
    ]);
    console.log('✅ Business categories created\n');

    // Step 4: Create Lens Master Data
    console.log('👓 Creating lens master data...');
    
    const lensCategories = await Promise.all([
      prisma.lensCategoryMaster.upsert({
        where: { name: 'Single Vision' },
        update: {},
        create: { name: 'Single Vision', description: 'Standard single vision lenses', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
      prisma.lensCategoryMaster.upsert({
        where: { name: 'Progressive' },
        update: {},
        create: { name: 'Progressive', description: 'Multi-focal progressive lenses', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensMaterials = await Promise.all([
      prisma.lensMaterialMaster.upsert({
        where: { name: 'Plastic (CR-39)' },
        update: {},
        create: { name: 'Plastic (CR-39)', description: 'Standard plastic material', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
      prisma.lensMaterialMaster.upsert({
        where: { name: 'Polycarbonate' },
        update: {},
        create: { name: 'Polycarbonate', description: 'Impact resistant material', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensCoatings = await Promise.all([
      prisma.lensCoatingMaster.upsert({
        where: { name: 'Anti-Reflective Coating' },
        update: {},
        create: { name: 'Anti-Reflective Coating', short_name: 'AR', description: 'Reduces glare', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
      prisma.lensCoatingMaster.upsert({
        where: { name: 'Blue Light Protection' },
        update: {},
        create: { name: 'Blue Light Protection', short_name: 'BLP', description: 'Blocks harmful blue light', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensBrands = await Promise.all([
      prisma.lensBrandMaster.upsert({
        where: { name: 'Essilor' },
        update: {},
        create: { name: 'Essilor', description: 'Premium French lens brand', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
      prisma.lensBrandMaster.upsert({
        where: { name: 'Zeiss' },
        update: {},
        create: { name: 'Zeiss', description: 'German precision optics', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensTypes = await Promise.all([
      prisma.lensTypeMaster.upsert({
        where: { name: 'Spherical' },
        update: {},
        create: { name: 'Spherical', description: 'Standard spherical design', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
      prisma.lensTypeMaster.upsert({
        where: { name: 'Aspheric' },
        update: {},
        create: { name: 'Aspheric', description: 'Flatter, thinner profile', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensFittings = await Promise.all([
      prisma.lensFittingMaster.upsert({
        where: { name: 'Standard Fitting' },
        update: {},
        create: { name: 'Standard Fitting', short_name: 'STD', description: 'Standard lens fitting', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensDias = await Promise.all([
      prisma.lensDiaMaster.upsert({
        where: { name: '70mm' },
        update: {},
        create: { name: '70mm', short_name: '70', description: 'Standard diameter', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    const lensTintings = await Promise.all([
      prisma.lensTintingMaster.upsert({
        where: { name: 'Clear' },
        update: {},
        create: { name: 'Clear', short_name: 'CLR', description: 'No tint', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
      prisma.lensTintingMaster.upsert({
        where: { name: 'Light Gray' },
        update: {},
        create: { name: 'Light Gray', short_name: 'LG', description: 'Light gray tint', activeStatus: true, deleteStatus: false, createdBy: 1 }
      }),
    ]);

    console.log('✅ Lens master data created\n');

    // Step 5: Create Lens Products
    console.log('🔬 Creating lens products...');
    await prisma.lensProductMaster.createMany({
      data: [
        {
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
          createdBy: 1,
        },
        {
          brand_id: lensBrands[1].id,
          category_id: lensCategories[1].id,
          material_id: lensMaterials[1].id,
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
          createdBy: 1,
        }
      ],
      skipDuplicates: true
    });
    
    // Get created products for reference
    const lensProducts = await Promise.all([
      prisma.lensProductMaster.findFirst({ where: { product_code: 'ESS-SV-001' } }),
      prisma.lensProductMaster.findFirst({ where: { product_code: 'ZIS-PRG-001' } }),
    ]);
    console.log('✅ Lens products created\n');

    // Step 6: Create Lens Prices
    console.log('💰 Creating lens prices...');
    await prisma.lensPriceMaster.createMany({
      data: [
        {
          lens_id: lensProducts[0].id,
          coating_id: lensCoatings[0].id,
          price: 1500.0,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1,
        },
        {
          lens_id: lensProducts[0].id,
          coating_id: lensCoatings[1].id,
          price: 2000.0,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1,
        },
        {
          lens_id: lensProducts[1].id,
          coating_id: lensCoatings[0].id,
          price: 5000.0,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1,
        },
      ],
      skipDuplicates: true
    });
    console.log('✅ Lens prices created\n');

    // Step 7: Create Customers
    console.log('👥 Creating customers...');
    const customers = await Promise.all([
      prisma.customer.upsert({
        where: { code: 'CUST-001' },
        update: {},
        create: {
          name: 'Raj Opticals',
          code: 'CUST-001',
          shopname: 'Raj Vision Center',
          phone: '+91-9876543210',
          email: 'raj@rajopticals.com',
          address: '123 MG Road, Mumbai',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          businessCategory_id: businessCategories[0].id,
          gstin: '27AABCU9603R1Z5',
          credit_limit: 100000,
          outstanding_credit: 15000,
          active_status: true,
          delete_status: false,
          createdBy: 1,
        }
      }),
      prisma.customer.upsert({
        where: { code: 'CUST-002' },
        update: {},
        create: {
          name: 'Vision Plus',
          code: 'CUST-002',
          shopname: 'Vision Plus Optics',
          phone: '+91-9876543211',
          email: 'info@visionplus.com',
          address: '456 Park Street, Kolkata',
          city: 'Kolkata',
          state: 'West Bengal',
          pincode: '700016',
          businessCategory_id: businessCategories[1].id,
          gstin: '19AABCV5678M1Z4',
          credit_limit: 150000,
          outstanding_credit: 25000,
          active_status: true,
          delete_status: false,
          createdBy: 1,
        }
      }),
      prisma.customer.upsert({
        where: { code: 'CUST-003' },
        update: {},
        create: {
          name: 'Eye Care Centre',
          code: 'CUST-003',
          shopname: 'Eye Care Centre',
          phone: '+91-9876543212',
          email: 'eyecare@center.com',
          address: '789 Brigade Road, Bangalore',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560025',
          businessCategory_id: businessCategories[2].id,
          gstin: '29AACCD7890N1Z3',
          credit_limit: 75000,
          outstanding_credit: 12000,
          active_status: true,
          delete_status: false,
          createdBy: 1,
        }
      }),
    ]);
    console.log('✅ Customers created\n');

    // Step 8: Create Sample Sale Orders
    console.log('📝 Creating sale orders...');
    await Promise.all([
      prisma.saleOrder.upsert({
        where: { orderNo: 'SO-2024-001' },
        update: {},
        create: {
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
          dia_id: lensDias[0].id,
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
          createdBy: 1,
        }
      }),
      prisma.saleOrder.upsert({
        where: { orderNo: 'SO-2024-002' },
        update: {},
        create: {
          orderNo: 'SO-2024-002',
          customerId: customers[1].id,
          customerRefNo: 'CUST-REF-002',
          status: 'IN_PRODUCTION',
          type: 'Premium',
          lens_id: lensProducts[1].id,
          category_id: lensCategories[1].id,
          Type_id: lensTypes[1].id,
          coating_id: lensCoatings[1].id,
          fitting_id: lensFittings[0].id,
          dia_id: lensDias[0].id,
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
          lensPrice: 5000,
          discount: 15,
          remark: 'Progressive lenses for computer work',
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1,
        }
      }),
      prisma.saleOrder.upsert({
        where: { orderNo: 'SO-2024-003' },
        update: {},
        create: {
          orderNo: 'SO-2024-003',
          customerId: customers[2].id,
          status: 'DRAFT',
          type: 'Standard',
          lens_id: lensProducts[0].id,
          category_id: lensCategories[0].id,
          Type_id: lensTypes[0].id,
          coating_id: lensCoatings[1].id,
          rightEye: true,
          leftEye: false,
          rightSpherical: '-1.50',
          rightCylindrical: '-0.25',
          rightAxis: '45',
          lensPrice: 2000,
          discount: 5,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1,
        }
      }),
    ]);
    console.log('✅ Sale orders created\n');

    console.log('🎉 Test data seed completed successfully!\n');
    console.log('═══════════════════════════════════════');
    console.log('📊 Summary:');
    console.log(`   - 1 admin user created`);
    console.log(`   - 3 customers created`);
    console.log(`   - 2 lens products created`);
    console.log(`   - 3 sale orders created`);
    console.log('\n🔐 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: demo123');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedTestData()
  .catch((error) => {
    console.error('Failed to seed test data:', error);
    process.exit(1);
  });
