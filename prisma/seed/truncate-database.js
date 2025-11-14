import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function truncateAllTables() {
  try {
    console.log('⚠️  DATABASE RESET - TRUNCATE ALL TABLES');
    console.log('==========================================');
    console.log('⚠️  WARNING: This will DELETE ALL DATA from your database!');
    console.log('⚠️  This action CANNOT be undone!\n');

    const confirmation = await question('Type "DELETE ALL DATA" to confirm: ');

    if (confirmation !== 'DELETE ALL DATA') {
      console.log('❌ Operation cancelled. Database was not modified.');
      process.exit(0);
    }

    console.log('\n🗑️  Starting database truncation...\n');

    // Order matters: Delete child tables before parent tables
    
    console.log('Deleting Payments...');
    await prisma.payment.deleteMany();
    
    console.log('Deleting Invoices...');
    await prisma.invoice.deleteMany();
    
    console.log('Deleting Dispatch Copies...');
    await prisma.dispatchCopy.deleteMany();
    
    console.log('Deleting Purchase Orders...');
    await prisma.purchaseOrder.deleteMany();
    
    console.log('Deleting Sale Orders...');
    await prisma.saleOrder.deleteMany();
    
    console.log('Deleting Lens Price Masters...');
    await prisma.lensPriceMaster.deleteMany();
    
    console.log('Deleting Lens Product Masters...');
    await prisma.lensProductMaster.deleteMany();
    
    console.log('Deleting Lens Type Masters...');
    await prisma.lensTypeMaster.deleteMany();
    
    console.log('Deleting Lens Brand Masters...');
    await prisma.lensBrandMaster.deleteMany();
    
    console.log('Deleting Lens Coating Masters...');
    await prisma.lensCoatingMaster.deleteMany();
    
    console.log('Deleting Lens Material Masters...');
    await prisma.lensMaterialMaster.deleteMany();
    
    console.log('Deleting Lens Category Masters...');
    await prisma.lensCategoryMaster.deleteMany();
    
    console.log('Deleting Customers...');
    await prisma.customer.deleteMany();
    
    console.log('Deleting Vendors...');
    await prisma.vendor.deleteMany();
    
    console.log('Deleting Business Categories...');
    await prisma.businessCategory.deleteMany();
    
    console.log('Deleting Refresh Tokens...');
    await prisma.refreshToken.deleteMany();
    
    console.log('Deleting Permissions...');
    await prisma.permission.deleteMany();
    
    console.log('Deleting Users...');
    await prisma.user.deleteMany();
    
    console.log('Deleting Roles...');
    await prisma.role.deleteMany();
    
    console.log('Deleting Departments...');
    await prisma.departmentDetails.deleteMany();

    console.log('\n✅ All tables truncated successfully!');
    console.log('\n📊 Verifying database is empty...\n');

    // Verify all tables are empty
    const counts = {
      departments: await prisma.departmentDetails.count(),
      users: await prisma.user.count(),
      roles: await prisma.role.count(),
      permissions: await prisma.permission.count(),
      refreshTokens: await prisma.refreshToken.count(),
      businessCategories: await prisma.businessCategory.count(),
      customers: await prisma.customer.count(),
      vendors: await prisma.vendor.count(),
      lensCategoryMasters: await prisma.lensCategoryMaster.count(),
      lensMaterialMasters: await prisma.lensMaterialMaster.count(),
      lensCoatingMasters: await prisma.lensCoatingMaster.count(),
      lensBrandMasters: await prisma.lensBrandMaster.count(),
      lensTypeMasters: await prisma.lensTypeMaster.count(),
      lensProductMasters: await prisma.lensProductMaster.count(),
      lensPriceMasters: await prisma.lensPriceMaster.count(),
      saleOrders: await prisma.saleOrder.count(),
      invoices: await prisma.invoice.count(),
      payments: await prisma.payment.count(),
      purchaseOrders: await prisma.purchaseOrder.count(),
      dispatchCopies: await prisma.dispatchCopy.count(),
    };

    console.log('Table Counts:');
    console.log('═══════════════════════════════════════');
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`${table.padEnd(25)} : ${count}`);
    });
    console.log('═══════════════════════════════════════');

    const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
    
    if (totalRecords === 0) {
      console.log('\n✅ Database is completely empty!');
      console.log('\n💡 Next steps:');
      console.log('   1. Run: node prisma/seed/create-initial-data.js');
      console.log('   2. This will create admin user and initial setup');
    } else {
      console.log(`\n⚠️  Warning: ${totalRecords} records still exist in database`);
    }

  } catch (error) {
    console.error('❌ Error truncating database:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
truncateAllTables()
  .catch((error) => {
    console.error('Failed to truncate database:', error);
    process.exit(1);
  });
