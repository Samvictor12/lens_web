/**
 * Update admin user password to 'demo123'
 */

import prisma from './src/backend/config/prisma.js';
import bcrypt from 'bcrypt';

async function updatePassword() {
  try {
    console.log('🔍 Finding admin user...\n');
    
    const user = await prisma.user.findFirst({
      where: { username: 'admin' }
    });

    if (!user) {
      console.error('❌ Admin user not found');
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.username})\n`);
    console.log('🔐 Updating password to "demo123"...\n');

    const newPassword = 'demo123';
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword }
    });

    console.log('✅ Password updated successfully!\n');
    console.log('📋 Login Credentials:');
    console.log(`   Username: ${user.username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Email: ${user.email}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

updatePassword();
