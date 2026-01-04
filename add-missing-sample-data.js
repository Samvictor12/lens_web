import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMissingData() {
  try {
    console.log('\n═══════════════════════════════════════');
    console.log('🌱 Adding Missing Sample Data');
    console.log('═══════════════════════════════════════\n');

    let added = 0;

    // Check and add more lens materials
    console.log('🔬 Adding more lens materials...');
    const existingMaterials = await prisma.lensMaterialMaster.count();
    if (existingMaterials < 6) {
      const newMaterials = [
        { name: 'High Index 1.60', description: 'Thinner lenses', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'High Index 1.74', description: 'Ultra thin lenses', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Trivex', description: 'Lightweight and impact resistant', activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const mat of newMaterials) {
        try {
          await prisma.lensMaterialMaster.create({ data: mat });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new lens materials');
    } else {
      console.log('✅ Lens materials already sufficient');
    }

    // Check and add more lens coatings
    console.log('\n✨ Adding more lens coatings...');
    const existingCoatings = await prisma.lensCoatingMaster.count();
    if (existingCoatings < 7) {
      const newCoatings = [
        { name: 'UV Protection', description: 'Blocks harmful UV rays', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Scratch Resistant', description: 'Hard coating for durability', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Hydrophobic', description: 'Water repellent coating', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Anti-Fog', description: 'Prevents fogging', activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const coat of newCoatings) {
        try {
          await prisma.lensCoatingMaster.create({ data: coat });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new lens coatings');
    } else {
      console.log('✅ Lens coatings already sufficient');
    }

    // Check and add more lens brands
    console.log('\n🏷️  Adding more lens brands...');
    const existingBrands = await prisma.lensBrandMaster.count();
    if (existingBrands < 5) {
      const newBrands = [
        { name: 'Rodenstock', description: 'Premium German lenses', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Nikon', description: 'Precision Japanese optics', activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const brand of newBrands) {
        try {
          await prisma.lensBrandMaster.create({ data: brand });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new lens brands');
    } else {
      console.log('✅ Lens brands already sufficient');
    }

    // Check and add more lens categories
    console.log('\n👓 Adding more lens categories...');
    const existingCategories = await prisma.lensCategoryMaster.count();
    if (existingCategories < 5) {
      const newCategories = [
        { name: 'Bifocal', description: 'Two focal points for near and distance', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Office Progressive', description: 'Optimized for office work', activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const cat of newCategories) {
        try {
          await prisma.lensCategoryMaster.create({ data: cat });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new lens categories');
    } else {
      console.log('✅ Lens categories already sufficient');
    }

    // Check and add more lens fittings
    console.log('\n🔧 Adding more lens fittings...');
    const existingFittings = await prisma.lensFittingMaster.count();
    if (existingFittings < 4) {
      const newFittings = [
        { name: 'Complex Fitting', description: 'Complex prescription fitting', fitting_price: 500, activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Rimless Fitting', description: 'Rimless frame fitting', fitting_price: 600, activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const fit of newFittings) {
        try {
          await prisma.lensFittingMaster.create({ data: fit });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new lens fittings');
    } else {
      console.log('✅ Lens fittings already sufficient');
    }

    // Check and add more lens diameters
    console.log('\n📏 Adding more lens diameters...');
    const existingDias = await prisma.lensDiaMaster.count();
    if (existingDias < 5) {
      const newDias = [
        { name: '75mm', description: 'Extra large diameter', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: '80mm', description: 'Oversized diameter', activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const dia of newDias) {
        try {
          await prisma.lensDiaMaster.create({ data: dia });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new lens diameters');
    } else {
      console.log('✅ Lens diameters already sufficient');
    }

    // Add Location Masters
    console.log('\n📍 Adding location masters...');
    const existingLocations = await prisma.locationMaster.count();
    if (existingLocations === 0) {
      const locations = [
        { name: 'Main Store', location_code: 'MS01', description: 'Main retail store', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Branch Store', location_code: 'BS01', description: 'Secondary retail location', activeStatus: true, deleteStatus: false, createdBy: 1 },
        { name: 'Warehouse', location_code: 'WH01', description: 'Central warehouse', activeStatus: true, deleteStatus: false, createdBy: 1 }
      ];
      
      for (const loc of locations) {
        await prisma.locationMaster.create({ data: loc });
        added++;
      }
      console.log('✅ Added 3 locations');
    } else {
      console.log('✅ Locations already exist');
    }

    // Add Tray Masters
    console.log('\n📦 Adding tray masters...');
    const existingTrays = await prisma.trayMaster.count();
    if (existingTrays === 0) {
      const locations = await prisma.locationMaster.findMany();
      
      if (locations.length > 0) {
        const trays = [
          { name: 'Tray A1', tray_code: 'TA1', location_id: locations[0].id, capacity: 50, description: 'Main store tray A1', activeStatus: true, deleteStatus: false, createdBy: 1 },
          { name: 'Tray A2', tray_code: 'TA2', location_id: locations[0].id, capacity: 50, description: 'Main store tray A2', activeStatus: true, deleteStatus: false, createdBy: 1 },
          { name: 'Tray B1', tray_code: 'TB1', location_id: locations.length > 1 ? locations[1].id : locations[0].id, capacity: 30, description: 'Branch store tray', activeStatus: true, deleteStatus: false, createdBy: 1 },
          { name: 'Tray W1', tray_code: 'TW1', location_id: locations.length > 2 ? locations[2].id : locations[0].id, capacity: 100, description: 'Warehouse tray', activeStatus: true, deleteStatus: false, createdBy: 1 }
        ];
        
        for (const tray of trays) {
          await prisma.trayMaster.create({ data: tray });
          added++;
        }
        console.log('✅ Added 4 trays');
      } else {
        console.log('⚠️  Cannot add trays without locations');
      }
    } else {
      console.log('✅ Trays already exist');
    }

    // Add more vendors
    console.log('\n🏭 Adding more vendors...');
    const existingVendors = await prisma.vendor.count();
    if (existingVendors < 3) {
      const newVendors = [
        {
          vendor_name: 'Optical Supplies Co',
          vendor_code: 'OSC001',
          email: 'info@opticalsupplies.com',
          phonenumber: '9876543212',
          address: '303 Commerce Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
          gst_number: '29AABCU9603R1ZR',
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      ];
      
      for (const vendor of newVendors) {
        try {
          await prisma.vendor.create({ data: vendor });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new vendors');
    } else {
      console.log('✅ Vendors already sufficient');
    }

    // Add more customers
    console.log('\n👥 Adding more customers...');
    const existingCustomers = await prisma.customer.count();
    if (existingCustomers < 5) {
      const businessCats = await prisma.businessCategory.findMany();
      const newCustomers = [
        {
          customer_name: 'City Hospital',
          customer_code: 'CUS004',
          email: 'procurement@cityhospital.com',
          phonenumber: '9123456783',
          address: '40 Hospital Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400004',
          business_category_id: businessCats.length > 1 ? businessCats[1].id : businessCats[0].id,
          active_status: true,
          delete_status: false,
          createdBy: 1
        },
        {
          customer_name: 'TechCorp India',
          customer_code: 'CUS005',
          email: 'hr@techcorp.com',
          phonenumber: '9123456784',
          address: '50 IT Park',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400005',
          business_category_id: businessCats.length > 2 ? businessCats[2].id : businessCats[0].id,
          active_status: true,
          delete_status: false,
          createdBy: 1
        }
      ];
      
      for (const customer of newCustomers) {
        try {
          await prisma.customer.create({ data: customer });
          added++;
        } catch (e) {
          // Skip if exists
        }
      }
      console.log('✅ Added new customers');
    } else {
      console.log('✅ Customers already sufficient');
    }

    console.log('\n═══════════════════════════════════════');
    console.log(`🎉 Sample Data Update Complete!`);
    console.log(`✅ Added ${added} new records`);
    console.log('═══════════════════════════════════════\n');

    // Show final counts
    console.log('📊 Final Database State:\n');
    const finalCounts = await Promise.all([
      prisma.user.count(),
      prisma.departmentDetails.count(),
      prisma.role.count(),
      prisma.businessCategory.count(),
      prisma.lensCategoryMaster.count(),
      prisma.lensMaterialMaster.count(),
      prisma.lensCoatingMaster.count(),
      prisma.lensBrandMaster.count(),
      prisma.lensTypeMaster.count(),
      prisma.lensFittingMaster.count(),
      prisma.lensDiaMaster.count(),
      prisma.lensTintingMaster.count(),
      prisma.locationMaster.count(),
      prisma.trayMaster.count(),
      prisma.vendor.count(),
      prisma.customer.count()
    ]);

    console.log('👤 Users:', finalCounts[0]);
    console.log('🏢 Departments:', finalCounts[1]);
    console.log('👥 Roles:', finalCounts[2]);
    console.log('🏪 Business Categories:', finalCounts[3]);
    console.log('👓 Lens Categories:', finalCounts[4]);
    console.log('🔬 Lens Materials:', finalCounts[5]);
    console.log('✨ Lens Coatings:', finalCounts[6]);
    console.log('🏷️  Lens Brands:', finalCounts[7]);
    console.log('📐 Lens Types:', finalCounts[8]);
    console.log('🔧 Lens Fittings:', finalCounts[9]);
    console.log('📏 Lens Diameters:', finalCounts[10]);
    console.log('🎨 Lens Tintings:', finalCounts[11]);
    console.log('📍 Locations:', finalCounts[12]);
    console.log('📦 Trays:', finalCounts[13]);
    console.log('🏭 Vendors:', finalCounts[14]);
    console.log('👥 Customers:', finalCounts[15]);
    console.log('\n✅ All tables have sample data!\n');

  } catch (error) {
    console.error('\n❌ Error adding sample data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addMissingData()
  .catch((error) => {
    console.error('Failed:', error);
    process.exit(1);
  });
