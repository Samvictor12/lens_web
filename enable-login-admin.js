/**
 * Enable login and update password for admin user
 */

import prisma from './src/backend/config/prisma.js';
import bcrypt from 'bcrypt';

async function enableLoginAndUpdatePassword() {
  try {
    console.log('🔍 Finding admin user...\n');
    
    const user = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (!user) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.username})`);
    console.log(`   Current is_login status: ${user.is_login}\n`);
    
    console.log('🔐 Updating password to "demo123" and enabling login...\n');

    const newPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        is_login: true  // Enable login
      }
    });

    console.log('✅ Password updated and login enabled successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 LOGIN CREDENTIALS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Login Enabled: ✅ YES`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

enableLoginAndUpdatePassword();
