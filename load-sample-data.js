import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedAllTables() {
  try {
    console.log('═══════════════════════════════════════');
    console.log('🌱 Starting COMPLETE database seed...');
    console.log('═══════════════════════════════════════\n');

    // Step 1: Create Admin Role and System User
    console.log('👤 Step 1: Creating system user and roles...');
    
    // Ensure Role exists first
    const adminRole = await prisma.role.upsert({
      where: { id: 1 },
      update: { name: 'Admin' },
      create: {
        id: 1,
        name: 'Admin'
      }
    });

    // Create system department
    const systemDept = await prisma.departmentDetails.upsert({
      where: { id: 1 },
      update: { department: 'Administration' },
      create: {
        id: 1,
        department: 'Administration',
        active_status: true,
        delete_status: false,
        createdBy: 1
      }
    });

    // Create admin user
    const hashedPassword = await bcrypt.hash('demo123', 10);
    const adminUser = await prisma.user.upsert({
      where: { id: 1 },
      update: {
        name: 'Admin User',
        email: 'admin@lensbilling.com',
        password: hashedPassword,
        is_login: true
      },
      create: {
        id: 1,
        name: 'Admin User',
        email: 'admin@lensbilling.com',
        username: 'admin',
        usercode: 'ADM001',
        password: hashedPassword,
        is_login: true,
        role_id: 1,
        department_id: 1,
        active_status: true,
        delete_status: false,
        createdBy: 1
      }
    });

    console.log('✅ System user created');

    // Step 2: Create Additional Departments
    console.log('\n🏢 Step 2: Creating departments...');
    const departments = [
      { id: 2, department: 'Sales' },
      { id: 3, department: 'Inventory' },
      { id: 4, department: 'Accounts' },
      { id: 5, department: 'Production' },
      { id: 6, department: 'Dispatch' },
      { id: 7, department: 'Customer Service' },
      { id: 8, department: 'Quality Control' }
    ];

    for (const dept of departments) {
      await prisma.departmentDetails.upsert({
        where: { id: dept.id },
        update: { department: dept.department },
        create: {
          id: dept.id,
          department: dept.department,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', departments.length + 1, 'departments');

    // Step 3: Create Additional Roles
    console.log('\n👥 Step 3: Creating roles...');
    const roles = [
      { id: 2, name: 'Sales Manager' },
      { id: 3, name: 'Sales Executive' },
      { id: 4, name: 'Inventory Manager' },
      { id: 5, name: 'Accountant' },
      { id: 6, name: 'Production Manager' },
      { id: 7, name: 'Dispatch Manager' }
    ];

    for (const role of roles) {
      await prisma.role.upsert({
        where: { id: role.id },
        update: { name: role.name },
        create: {
          id: role.id,
          name: role.name
        }
      });
    }
    console.log('✅ Created', roles.length + 1, 'roles');

    // Step 4: Create Business Categories
    console.log('\n🏪 Step 4: Creating business categories...');
    const businessCategories = [
      { id: 1, name: 'Optical Retail' },
      { id: 2, name: 'Hospital' },
      { id: 3, name: 'Corporate' },
      { id: 4, name: 'Wholesale' },
      { id: 5, name: 'Direct Customer' }
    ];

    for (const cat of businessCategories) {
      await prisma.businessCategory.upsert({
        where: { id: cat.id },
        update: { name: cat.name },
        create: {
          id: cat.id,
          name: cat.name,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', businessCategories.length, 'business categories');

    // Step 5: Create Lens Categories
    console.log('\n👓 Step 5: Creating lens categories...');
    const lensCategories = [
      { id: 1, name: 'Single Vision', short_name: 'SV', description: 'Single vision lenses for near or distance' },
      { id: 2, name: 'Bifocal', short_name: 'BF', description: 'Two focal points for near and distance' },
      { id: 3, name: 'Progressive', short_name: 'PRG', description: 'Multiple focal points without visible lines' },
      { id: 4, name: 'Office Progressive', short_name: 'OPR', description: 'Optimized for office work' },
      { id: 5, name: 'Reading', short_name: 'RD', description: 'Near vision only' }
    ];

    for (const cat of lensCategories) {
      await prisma.lensCategoryMaster.upsert({
        where: { id: cat.id },
        update: { name: cat.name },
        create: {
          id: cat.id,
          name: cat.name,
          short_name: cat.short_name,
          description: cat.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', lensCategories.length, 'lens categories');

    // Step 6: Create Lens Materials
    console.log('\n🔬 Step 6: Creating lens materials...');
    const lensMaterials = [
      { id: 1, name: 'Plastic (CR-39)', short_name: 'CR39', description: 'Standard plastic lens material', index_value: 1.50 },
      { id: 2, name: 'Polycarbonate', short_name: 'PC', description: 'Impact resistant material', index_value: 1.59 },
      { id: 3, name: 'High Index 1.60', short_name: 'HI60', description: 'Thinner lenses', index_value: 1.60 },
      { id: 4, name: 'High Index 1.67', short_name: 'HI67', description: 'Extra thin lenses', index_value: 1.67 },
      { id: 5, name: 'High Index 1.74', short_name: 'HI74', description: 'Ultra thin lenses', index_value: 1.74 },
      { id: 6, name: 'Trivex', short_name: 'TRV', description: 'Lightweight and impact resistant', index_value: 1.53 }
    ];

    for (const mat of lensMaterials) {
      await prisma.lensMaterialMaster.upsert({
        where: { id: mat.id },
        update: { name: mat.name },
        create: {
          id: mat.id,
          name: mat.name,
          short_name: mat.short_name,
          description: mat.description,
          index_value: mat.index_value,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', lensMaterials.length, 'lens materials');

    // Step 7: Create Lens Coatings
    console.log('\n✨ Step 7: Creating lens coatings...');
    const lensCoatings = [
      { id: 1, name: 'Anti-Reflective (AR)', short_name: 'AR', description: 'Reduces glare and reflections' },
      { id: 2, name: 'Blue Light Protection', short_name: 'BLP', description: 'Filters blue light from screens' },
      { id: 3, name: 'UV Protection', short_name: 'UV', description: 'Blocks harmful UV rays' },
      { id: 4, name: 'Scratch Resistant', short_name: 'SR', description: 'Hard coating for durability' },
      { id: 5, name: 'Hydrophobic', short_name: 'HP', description: 'Water repellent coating' },
      { id: 6, name: 'Anti-Fog', short_name: 'AF', description: 'Prevents fogging' },
      { id: 7, name: 'Premium Multi-Coat', short_name: 'PMC', description: 'Combination of premium coatings' }
    ];

    for (const coat of lensCoatings) {
      await prisma.lensCoatingMaster.upsert({
        where: { id: coat.id },
        update: { name: coat.name },
        create: {
          id: coat.id,
          name: coat.name,
          short_name: coat.short_name,
          description: coat.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', lensCoatings.length, 'lens coatings');

    // Step 8: Create Lens Brands
    console.log('\n🏷️  Step 8: Creating lens brands...');
    const lensBrands = [
      { id: 1, name: 'Essilor', short_name: 'ESS', description: 'World leader in ophthalmic optics' },
      { id: 2, name: 'Zeiss', short_name: 'ZIS', description: 'German precision optics' },
      { id: 3, name: 'Hoya', short_name: 'HOY', description: 'Japanese optical excellence' },
      { id: 4, name: 'Rodenstock', short_name: 'ROD', description: 'Premium German lenses' },
      { id: 5, name: 'Nikon', short_name: 'NIK', description: 'Precision Japanese optics' }
    ];

    for (const brand of lensBrands) {
      await prisma.lensBrandMaster.upsert({
        where: { id: brand.id },
        update: { name: brand.name },
        create: {
          id: brand.id,
          name: brand.name,
          short_name: brand.short_name,
          description: brand.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', lensBrands.length, 'lens brands');

    // Step 9: Create Lens Types
    console.log('\n📐 Step 9: Creating lens types...');
    const lensTypes = [
      { id: 1, name: 'Spherical', short_name: 'SPH', description: 'Traditional curved surface' },
      { id: 2, name: 'Aspheric', short_name: 'ASP', description: 'Flatter, thinner profile' },
      { id: 3, name: 'Bi-Aspheric', short_name: 'BASP', description: 'Both surfaces aspheric' }
    ];

    for (const type of lensTypes) {
      await prisma.lensTypeMaster.upsert({
        where: { id: type.id },
        update: { name: type.name },
        create: {
          id: type.id,
          name: type.name,
          short_name: type.short_name,
          description: type.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', lensTypes.length, 'lens types');

    // Step 10: Create Lens Fittings
    console.log('\n🔧 Step 10: Creating lens fittings...');
    const lensFittings = [
      { id: 1, name: 'Standard Fitting', short_name: 'STD', description: 'Standard lens fitting', fitting_price: 200 },
      { id: 2, name: 'Premium Fitting', short_name: 'PRM', description: 'Premium fitting with adjustment', fitting_price: 350 },
      { id: 3, name: 'Complex Fitting', short_name: 'CMP', description: 'Complex prescription fitting', fitting_price: 500 },
      { id: 4, name: 'Rimless Fitting', short_name: 'RML', description: 'Rimless frame fitting', fitting_price: 600 }
    ];

    for (const fit of lensFittings) {
      await prisma.lensFittingMaster.upsert({
        where: { id: fit.id },
        update: { name: fit.name },
        create: {
          id: fit.id,
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
    console.log('✅ Created', lensFittings.length, 'lens fittings');

    // Step 11: Create Lens Diameters
    console.log('\n📏 Step 11: Creating lens diameters...');
    const lensDias = [
      { id: 1, name: '60mm', short_name: '60', description: 'Small diameter' },
      { id: 2, name: '65mm', short_name: '65', description: 'Standard diameter' },
      { id: 3, name: '70mm', short_name: '70', description: 'Large diameter' },
      { id: 4, name: '75mm', short_name: '75', description: 'Extra large diameter' },
      { id: 5, name: '80mm', short_name: '80', description: 'Oversized diameter' }
    ];

    for (const dia of lensDias) {
      await prisma.lensDiaMaster.upsert({
        where: { id: dia.id },
        update: { name: dia.name },
        create: {
          id: dia.id,
          name: dia.name,
          short_name: dia.short_name,
          description: dia.description,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', lensDias.length, 'lens diameters');

    // Step 12: Create Lens Tintings (already exists, skip or update)
    console.log('\n🎨 Step 12: Lens tintings already populated...');
    const tintingCount = await prisma.lensTintingMaster.count();
    console.log('✅', tintingCount, 'tintings exist');

    // Step 13: Create Location Masters
    console.log('\n📍 Step 13: Creating location masters...');
    const locations = [
      { id: 1, location_name: 'Main Store', location_code: 'MS01', address: '123 Main Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001' },
      { id: 2, location_name: 'Branch Store', location_code: 'BS01', address: '456 Park Avenue', city: 'Mumbai', state: 'Maharashtra', pincode: '400002' },
      { id: 3, location_name: 'Warehouse', location_code: 'WH01', address: '789 Industrial Area', city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400703' }
    ];

    for (const loc of locations) {
      await prisma.locationMaster.upsert({
        where: { id: loc.id },
        update: { location_name: loc.location_name },
        create: {
          id: loc.id,
          location_name: loc.location_name,
          location_code: loc.location_code,
          address: loc.address,
          city: loc.city,
          state: loc.state,
          pincode: loc.pincode,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', locations.length, 'locations');

    // Step 14: Create Tray Masters
    console.log('\n📦 Step 14: Creating tray masters...');
    const trays = [
      { id: 1, tray_name: 'Tray A1', tray_code: 'TA1', location_id: 1, capacity: 50 },
      { id: 2, tray_name: 'Tray A2', tray_code: 'TA2', location_id: 1, capacity: 50 },
      { id: 3, tray_name: 'Tray B1', tray_code: 'TB1', location_id: 2, capacity: 30 },
      { id: 4, tray_name: 'Tray W1', tray_code: 'TW1', location_id: 3, capacity: 100 }
    ];

    for (const tray of trays) {
      await prisma.trayMaster.upsert({
        where: { id: tray.id },
        update: { tray_name: tray.tray_name },
        create: {
          id: tray.id,
          tray_name: tray.tray_name,
          tray_code: tray.tray_code,
          location_id: tray.location_id,
          capacity: tray.capacity,
          activeStatus: true,
          deleteStatus: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', trays.length, 'trays');

    // Step 15: Create Vendors
    console.log('\n🏭 Step 15: Creating vendors...');
    const vendors = [
      {
        id: 1,
        vendor_name: 'Vision Optics Supplier',
        vendor_code: 'VOS001',
        email: 'sales@visionoptics.com',
        phonenumber: '9876543210',
        address: '101 Industrial Estate',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        gst_number: '27AABCU9603R1ZP'
      },
      {
        id: 2,
        vendor_name: 'Premium Lens Distributors',
        vendor_code: 'PLD001',
        email: 'orders@premiumlens.com',
        phonenumber: '9876543211',
        address: '202 Trade Center',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '110001',
        gst_number: '07AABCU9603R1ZQ'
      },
      {
        id: 3,
        vendor_name: 'Optical Supplies Co',
        vendor_code: 'OSC001',
        email: 'info@opticalsupplies.com',
        phonenumber: '9876543212',
        address: '303 Commerce Street',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
        gst_number: '29AABCU9603R1ZR'
      }
    ];

    for (const vendor of vendors) {
      await prisma.vendor.upsert({
        where: { id: vendor.id },
        update: { vendor_name: vendor.vendor_name },
        create: {
          ...vendor,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', vendors.length, 'vendors');

    // Step 16: Create Customers
    console.log('\n👥 Step 16: Creating customers...');
    const customers = [
      {
        id: 1,
        customer_name: 'Raj Kumar',
        customer_code: 'CUS001',
        email: 'raj.kumar@email.com',
        phonenumber: '9123456780',
        address: '10 MG Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        business_category_id: 5
      },
      {
        id: 2,
        customer_name: 'Priya Sharma',
        customer_code: 'CUS002',
        email: 'priya.sharma@email.com',
        phonenumber: '9123456781',
        address: '20 Park Street',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400002',
        business_category_id: 5
      },
      {
        id: 3,
        customer_name: 'Vision Care Optical',
        customer_code: 'CUS003',
        email: 'contact@visioncare.com',
        phonenumber: '9123456782',
        address: '30 Commercial Complex',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400003',
        business_category_id: 1
      },
      {
        id: 4,
        customer_name: 'City Hospital',
        customer_code: 'CUS004',
        email: 'procurement@cityhospital.com',
        phonenumber: '9123456783',
        address: '40 Hospital Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400004',
        business_category_id: 2
      },
      {
        id: 5,
        customer_name: 'TechCorp India',
        customer_code: 'CUS005',
        email: 'hr@techcorp.com',
        phonenumber: '9123456784',
        address: '50 IT Park',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400005',
        business_category_id: 3
      }
    ];

    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { id: customer.id },
        update: { customer_name: customer.customer_name },
        create: {
          ...customer,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      });
    }
    console.log('✅ Created', customers.length, 'customers');

    console.log('\n═══════════════════════════════════════');
    console.log('🎉 COMPLETE DATABASE SEED SUCCESSFUL!');
    console.log('═══════════════════════════════════════');
    console.log('\n📊 Summary:');
    console.log(`   • 1 System User (Admin)`);
    console.log(`   • ${departments.length + 1} Departments`);
    console.log(`   • ${roles.length + 1} Roles`);
    console.log(`   • ${businessCategories.length} Business Categories`);
    console.log(`   • ${lensCategories.length} Lens Categories`);
    console.log(`   • ${lensMaterials.length} Lens Materials`);
    console.log(`   • ${lensCoatings.length} Lens Coatings`);
    console.log(`   • ${lensBrands.length} Lens Brands`);
    console.log(`   • ${lensTypes.length} Lens Types`);
    console.log(`   • ${lensFittings.length} Lens Fittings`);
    console.log(`   • ${lensDias.length} Lens Diameters`);
    console.log(`   • ${tintingCount} Lens Tintings`);
    console.log(`   • ${locations.length} Locations`);
    console.log(`   • ${trays.length} Trays`);
    console.log(`   • ${vendors.length} Vendors`);
    console.log(`   • ${customers.length} Customers`);
    console.log('\n🔐 Login Credentials:');
    console.log('   Username: admin');
    console.log('   Password: demo123');
    console.log('   Email: admin@lensbilling.com');
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('\n❌ Error seeding database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedAllTables()
  .catch((error) => {
    console.error('Failed to seed database:', error);
    process.exit(1);
  });
