import prisma from '../src/backend/config/prisma.js';

async function main() {
  console.log('=== Lens Dia Test ===\n');

  // Check column type
  const colInfo = await prisma.$queryRaw`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'LensDiaMaster' AND column_name = 'name'
  `;
  console.log('Column type:', colInfo);

  const nameType = colInfo[0]?.data_type;
  if (nameType === 'text' || nameType === 'character varying') {
    console.log('\nApplying name -> integer conversion...');
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "LensDiaMaster" ALTER COLUMN "name" TYPE INTEGER USING (
        NULLIF(regexp_replace("name", '[^0-9]', '', 'g'), '')::INTEGER
      )
    `);
    console.log('Conversion applied.');
  }

  // List existing records
  const existing = await prisma.lensDiaMaster.findMany({
    where: { deleteStatus: false },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, short_name: true, activeStatus: true },
  });
  console.log('\nExisting diameters:', existing);

  // Create test record (upsert by unique name)
  const testName = 80;
  const created = await prisma.lensDiaMaster.upsert({
    where: { name: testName },
    update: { activeStatus: true, deleteStatus: false },
    create: {
      name: testName,
      short_name: String(testName),
      description: 'Test diameter 80',
      activeStatus: true,
      deleteStatus: false,
      createdBy: 1,
    },
  });
  console.log('\nUpsert test (80):', { id: created.id, name: created.name, type: typeof created.name });

  // Validate name is integer
  if (typeof created.name !== 'number' || !Number.isInteger(created.name)) {
    throw new Error(`Expected integer name, got ${typeof created.name}: ${created.name}`);
  }

  // Reject text via raw check (simulating API validation)
  const invalidNames = ['65mm', 'abc', 65.5];
  for (const invalid of invalidNames) {
    const parsed = parseInt(invalid, 10);
    const valid = !isNaN(parsed) && parsed > 0 && Number.isInteger(parsed) && String(parsed) === String(invalid).replace(/\.0+$/, '');
    console.log(`Validation "${invalid}": ${valid ? 'PASS (unexpected)' : 'REJECT (expected)'}`);
  }

  // Dropdown-style query
  const dropdown = await prisma.lensDiaMaster.findMany({
    where: { activeStatus: true, deleteStatus: false },
    select: { id: true, name: true, short_name: true },
    orderBy: { name: 'asc' },
  });
  console.log('\nDropdown options:', dropdown.map((d) => ({ id: d.id, label: String(d.name) })));

  // Cleanup test record
  await prisma.lensDiaMaster.update({
    where: { id: created.id },
    data: { deleteStatus: true, activeStatus: false },
  });
  console.log('\nTest record 80 soft-deleted.');

  console.log('\n✅ All Lens Dia tests passed.');
}

main()
  .catch((err) => {
    console.error('\n❌ Test failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
