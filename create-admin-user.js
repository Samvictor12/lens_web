// Simple script to create admin user
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Hash password
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    // Create or update admin user
    const adminUser = await prisma.user.upsert({
      where: { username: 'admin' },
      update: {
        password: hashedPassword,
        email: 'admin@lensbilling.com',
        updatedAt: new Date(),
      },
      create: {
        name: 'System Administrator',
        email: 'admin@lensbilling.com',
        usercode: 'ADM001',
        username: 'admin',
        password: hashedPassword,
        active_status: true,
        delete_status: false,
        createdBy: 1,
      },
    });

    console.log('✅ Admin user created/updated successfully!');
    console.log('📋 Login credentials:');
    console.log('   Username: admin');
    console.log('   Password: demo123');
    console.log('   Email:', adminUser.email);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();