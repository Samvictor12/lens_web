// scripts/drop-role-tables.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Temporarily nullifying user role_ids to prevent foreign key violations...');
  await prisma.$executeRawUnsafe('UPDATE "User" SET "role_id" = NULL;');
  
  console.log('Dropping Permission and Role tables...');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Permission" CASCADE;');
  await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS "Role" CASCADE;');
  
  console.log('Tables dropped successfully.');
}

main()
  .catch((e) => {
    console.error('Error dropping tables:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
