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
