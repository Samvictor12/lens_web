/**
 * Simple script to add sample tinting data
 * Works with existing database - creates minimal user if needed
 */

import prisma from './src/backend/config/prisma.js';
import bcrypt from 'bcrypt';

async function loadSampleData() {
  try {
    console.log('🔍 Checking database...\n');
    
    // Check for existing user
    let user = await prisma.user.findFirst({
      select: { id: true, username: true, name: true }
    });

    // If no user exists, create a minimal test user
    if (!user) {
      console.log('📝 Creating test user...\n');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      
      user = await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@test.com',
          usercode: 'ADM001',
          username: 'admin',
          password: hashedPassword,
          createdBy: 1, // Self-reference for first user
          role_id: null,
          department_id: null
        },
        select: { id: true, username: true, name: true }
      });
      
      // Update createdBy to self
      await prisma.user.update({
        where: { id: user.id },
        data: { createdBy: user.id }
      });
      
      console.log(`✅ Created user: ${user.name} (ID: ${user.id})\n`);
    } else {
      console.log(`✅ Found existing user: ${user.name} (ID: ${user.id})\n`);
    }

    console.log('🔄 Adding sample tinting data...\n');

    const sampleTintings = [
      { name: 'Clear Lens', short_name: 'CLR', description: 'Standard clear lens with no tint', tinting_price: 0.00 },
      { name: 'Light Brown Tint', short_name: 'LBR', description: 'Light brown tint for outdoor use', tinting_price: 150.00 },
      { name: 'Dark Brown Tint', short_name: 'DBR', description: 'Dark brown tint for strong sunlight', tinting_price: 200.00 },
      { name: 'Gray Gradient', short_name: 'GRG', description: 'Gradient gray tint', tinting_price: 180.00 },
      { name: 'Green Tint', short_name: 'GRN', description: 'Green colored tint for eye protection', tinting_price: 160.00 },
      { name: 'Blue Light Filter', short_name: 'BLF', description: 'Blue light blocking tint for digital screens', tinting_price: 250.00 },
      { name: 'Photochromic Brown', short_name: 'PCB', description: 'Light-adaptive brown tint', tinting_price: 500.00 },
      { name: 'Photochromic Gray', short_name: 'PCG', description: 'Light-adaptive gray tint', tinting_price: 500.00 },
      { name: 'Yellow Night Vision', short_name: 'YNV', description: 'Yellow tint for night driving', tinting_price: 220.00 },
      { name: 'Pink Fashion Tint', short_name: 'PNK', description: 'Pink fashion tint', tinting_price: 175.00 },
      { name: 'Purple Fashion Tint', short_name: 'PRP', description: 'Purple fashion tint', tinting_price: 175.00 },
      { name: 'Mirror Silver', short_name: 'MSL', description: 'Silver mirror coating', tinting_price: 300.00 },
      { name: 'Mirror Gold', short_name: 'MGD', description: 'Gold mirror coating', tinting_price: 320.00 },
      { name: 'Polarized Gray', short_name: 'PLG', description: 'Polarized gray for glare reduction', tinting_price: 450.00 },
      { name: 'Polarized Brown', short_name: 'PLB', description: 'Polarized brown for enhanced contrast', tinting_price: 450.00 }
    ];

    let added = 0;
    let skipped = 0;
    let updated = 0;

    for (const tinting of sampleTintings) {
      try {
        // Check if already exists
        const existing = await prisma.lensTintingMaster.findUnique({
          where: { name: tinting.name }
        });

        if (existing) {
          // Update tinting_price if it's null
          if (existing.tinting_price === null) {
            await prisma.lensTintingMaster.update({
              where: { id: existing.id },
              data: { tinting_price: tinting.tinting_price }
            });
            console.log(`🔄 Updated: ${tinting.name} - added price ₹${tinting.tinting_price}`);
            updated++;
          } else {
            console.log(`⏭️  Skipped: ${tinting.name} (already exists)`);
            skipped++;
          }
          continue;
        }

        // Create new tinting
        await prisma.lensTintingMaster.create({
          data: {
            name: tinting.name,
            short_name: tinting.short_name,
            description: tinting.description,
            tinting_price: tinting.tinting_price,
            activeStatus: true,
            deleteStatus: false,
            createdBy: user.id,
            updatedBy: user.id
          }
        });

        console.log(`✅ Added: ${tinting.name} (${tinting.short_name}) - ₹${tinting.tinting_price}`);
        added++;

      } catch (error) {
        console.error(`❌ Error with ${tinting.name}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Added: ${added}`);
    console.log(`   🔄 Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   📦 Total processed: ${sampleTintings.length}`);

    // Verify the data
    const totalCount = await prisma.lensTintingMaster.count({
      where: { deleteStatus: false }
    });

    console.log(`\n✅ Total active tintings in database: ${totalCount}`);
    
    console.log(`\n🎉 Sample data loading complete!`);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

loadSampleData();
