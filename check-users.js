import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkData() {
  try {
    const counts = await Promise.all([
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
      prisma.customer.count(),
      prisma.lensProductMaster.count(),
      prisma.lensPriceMaster.count(),
      prisma.saleOrder.count()
    ]);

    console.log('\n═══════════════════════════════════════');
    console.log('📊 DATABASE CURRENT STATE');
    console.log('═══════════════════════════════════════\n');
    
    console.log('👤 Users:', counts[0]);
    console.log('🏢 Departments:', counts[1]);
    console.log('👥 Roles:', counts[2]);
    console.log('🏪 Business Categories:', counts[3]);
    console.log('👓 Lens Categories:', counts[4]);
    console.log('🔬 Lens Materials:', counts[5]);
    console.log('✨ Lens Coatings:', counts[6]);
    console.log('🏷️  Lens Brands:', counts[7]);
    console.log('📐 Lens Types:', counts[8]);
    console.log('🔧 Lens Fittings:', counts[9]);
    console.log('📏 Lens Diameters:', counts[10]);
    console.log('🎨 Lens Tintings:', counts[11]);
    console.log('📍 Locations:', counts[12]);
    console.log('📦 Trays:', counts[13]);
    console.log('🏭 Vendors:', counts[14]);
    console.log('👥 Customers:', counts[15]);
    console.log('🔬 Lens Products:', counts[16]);
    console.log('💰 Lens Prices:', counts[17]);
    console.log('📝 Sale Orders:', counts[18]);
    
    console.log('\n═══════════════════════════════════════\n');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
