import bcrypt from 'bcrypt';
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

async function updatePassword() {
  try {
    console.log('🔐 Password Update Tool\n');

    // Get username
    const username = await question('Enter username (default: admin): ') || 'admin';

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      console.error(`❌ User '${username}' not found!`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${user.name} (${user.email})\n`);

    // Get new password
    const newPassword = await question('Enter new password: ');

    if (!newPassword || newPassword.length < 6) {
      console.error('❌ Password must be at least 6 characters long!');
      process.exit(1);
    }

    // Confirm password
    const confirmPassword = await question('Confirm new password: ');

    if (newPassword !== confirmPassword) {
      console.error('❌ Passwords do not match!');
      process.exit(1);
    }

    // Hash the password
    console.log('\n🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password in database
    console.log('💾 Updating password in database...');
    await prisma.user.update({
      where: { username },
      data: { password: hashedPassword }
    });

    console.log('\n✅ Password updated successfully!');
    console.log('\n📋 Updated Credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`   Email: ${user.email}`);
    console.log('\n🔒 Hashed Password (for reference):');
    console.log(`   ${hashedPassword}\n`);

  } catch (error) {
    console.error('❌ Error updating password:', error);
    throw error;
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

// Run the script
updatePassword()
  .catch((error) => {
    console.error('Failed to update password:', error);
    process.exit(1);
  });
