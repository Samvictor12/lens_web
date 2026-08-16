/**
 * Applies schema columns that may be missing when the DB was seeded
 * without running Prisma migrations (no _prisma_migrations table).
 *
 * Safe to re-run — uses IF NOT EXISTS checks.
 * Run: npm run db:patch
 */
import { PrismaClient } from '@prisma/client';
import { pathToFileURL } from 'url';

const prisma = new PrismaClient();

async function columnExists(table, column, client = prisma) {
  const rows = await client.$queryRaw`
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} AND column_name = ${column}
    LIMIT 1`;
  return rows.length > 0;
}

export async function patchMissingDbColumns(client = prisma) {
  const ledgerExists = await client.$queryRaw`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Ledger' LIMIT 1`;
  if (!ledgerExists.length) return false;

  for (const table of ['Customer', 'Vendor']) {
    const hasCol = await columnExists(table, 'ledgerId', client);
    if (!hasCol) {
      await client.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "ledgerId" INTEGER`);
      console.log(`   ✅ Added ${table}.ledgerId`);
    }

    await client.$executeRawUnsafe(
      `CREATE UNIQUE INDEX IF NOT EXISTS "${table}_ledgerId_key" ON "${table}"("ledgerId")`
    );

    const fkName = `${table}_ledgerId_fkey`;
    await client.$executeRawUnsafe(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${fkName}') THEN
          ALTER TABLE "${table}"
            ADD CONSTRAINT "${fkName}"
            FOREIGN KEY ("ledgerId") REFERENCES "Ledger"("id")
            ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
  }

  if (!(await columnExists('SaleOrder', 'mrdRefNo', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "mrdRefNo" TEXT`);
    console.log('   ✅ Added SaleOrder.mrdRefNo');
  }

  if (!(await columnExists('SaleOrder', 'alternateLensNote', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "alternateLensNote" TEXT`);
    console.log('   ✅ Added SaleOrder.alternateLensNote');
  }

  // Free Lens approval columns
  await client.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FreeLensApprovalStatus') THEN
        CREATE TYPE "FreeLensApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
      END IF;
    END $$;
  `);

  if (!(await columnExists('SaleOrder', 'freeLensApprovalStatus', client))) {
    await client.$executeRawUnsafe(
      `ALTER TABLE "SaleOrder" ADD COLUMN "freeLensApprovalStatus" "FreeLensApprovalStatus"`
    );
    console.log('   ✅ Added SaleOrder.freeLensApprovalStatus');
  }
  if (!(await columnExists('SaleOrder', 'freeLensApprovedBy', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "freeLensApprovedBy" INTEGER`);
    console.log('   ✅ Added SaleOrder.freeLensApprovedBy');
  }
  if (!(await columnExists('SaleOrder', 'freeLensApprovedAt', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "freeLensApprovedAt" TIMESTAMP(3)`);
    console.log('   ✅ Added SaleOrder.freeLensApprovedAt');
  }
  if (!(await columnExists('SaleOrder', 'freeLensRejectedBy', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "freeLensRejectedBy" INTEGER`);
    console.log('   ✅ Added SaleOrder.freeLensRejectedBy');
  }
  if (!(await columnExists('SaleOrder', 'freeLensRejectedAt', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "freeLensRejectedAt" TIMESTAMP(3)`);
    console.log('   ✅ Added SaleOrder.freeLensRejectedAt');
  }
  if (!(await columnExists('SaleOrder', 'freeLensApprovalRemark', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "freeLensApprovalRemark" TEXT`);
    console.log('   ✅ Added SaleOrder.freeLensApprovalRemark');
  }

  await client.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SaleOrder_freeLensApprovedBy_fkey') THEN
        ALTER TABLE "SaleOrder"
          ADD CONSTRAINT "SaleOrder_freeLensApprovedBy_fkey"
          FOREIGN KEY ("freeLensApprovedBy") REFERENCES "User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SaleOrder_freeLensRejectedBy_fkey') THEN
        ALTER TABLE "SaleOrder"
          ADD CONSTRAINT "SaleOrder_freeLensRejectedBy_fkey"
          FOREIGN KEY ("freeLensRejectedBy") REFERENCES "User"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);

  // Existing Free Lens orders without status → pending approval
  await client.$executeRawUnsafe(`
    UPDATE "SaleOrder"
    SET "freeLensApprovalStatus" = 'PENDING'
    WHERE "freeLens" = true AND "freeLensApprovalStatus" IS NULL AND "deleteStatus" = false
  `);

  // LocationTrayMaster + SaleOrder.locationTrayId (Issue & Pre-QC destination tray)
  await client.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "LocationTrayMaster" (
      "id" SERIAL PRIMARY KEY,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "location_id" INTEGER,
      "activeStatus" BOOLEAN NOT NULL DEFAULT true,
      "deleteStatus" BOOLEAN NOT NULL DEFAULT false,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdBy" INTEGER NOT NULL,
      "updatedBy" INTEGER,
      CONSTRAINT "LocationTrayMaster_location_id_fkey"
        FOREIGN KEY ("location_id") REFERENCES "LocationMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "LocationTrayMaster_createdBy_fkey"
        FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "LocationTrayMaster_updatedBy_fkey"
        FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
    )
  `);
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "LocationTrayMaster_location_id_idx" ON "LocationTrayMaster"("location_id")`
  );
  await client.$executeRawUnsafe(
    `ALTER TABLE "LocationTrayMaster" ALTER COLUMN "location_id" DROP NOT NULL`
  );

  if (!(await columnExists('SaleOrder', 'locationTrayId', client))) {
    await client.$executeRawUnsafe(`ALTER TABLE "SaleOrder" ADD COLUMN "locationTrayId" INTEGER`);
    console.log('   ✅ Added SaleOrder.locationTrayId');
  }

  await client.$executeRawUnsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SaleOrder_locationTrayId_fkey') THEN
        ALTER TABLE "SaleOrder"
          ADD CONSTRAINT "SaleOrder_locationTrayId_fkey"
          FOREIGN KEY ("locationTrayId") REFERENCES "LocationTrayMaster"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END $$;
  `);
  await client.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "SaleOrder_locationTrayId_idx" ON "SaleOrder"("locationTrayId")`
  );

  return true;
}

async function main() {
  console.log('🔧 Patching missing DB columns...\n');
  const ok = await patchMissingDbColumns();
  if (!ok) {
    console.error('❌ Ledger table missing — run financial ledgers seed first.');
    process.exit(1);
  }
  console.log('\n✅ DB patch complete');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main()
    .catch((e) => {
      console.error('❌ Patch failed:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
