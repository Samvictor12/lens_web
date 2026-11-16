import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const excelData = JSON.parse(
    fs.readFileSync('/Users/kavin/.gemini/antigravity-ide/brain/276e2df4-a743-4468-bdbd-07290eeb0fb2/scratch/excel_customers.json', 'utf8')
  );

  const dbCustomers = await prisma.customer.findMany({
    select: { id: true, code: true, name: true, phone: true, gstin: true, ledgerId: true, address: true, city: true }
  });

  console.log(`=== Total in DB: ${dbCustomers.length}, Total in Excel: ${excelData.length} ===\n`);

  const matchedInDb = [];
  const notInDb = [];

  for (const item of excelData) {
    const rawName = item['Full Name'] || '';
    const name = rawName.trim();
    const gstin = (item['GSTIN'] || '').trim();

    // Check duplicate by Name (case insensitive)
    const matchByName = dbCustomers.find(c => c.name.trim().toLowerCase() === name.toLowerCase());
    
    // Check match by GSTIN if GSTIN is present and valid
    const matchByGstin = (gstin && gstin !== '-') ? dbCustomers.find(c => c.gstin && c.gstin.trim().toLowerCase() === gstin.toLowerCase()) : null;

    if (matchByName || matchByGstin) {
      matchedInDb.push({
        excelName: name,
        excelGstin: gstin,
        dbMatch: matchByName || matchByGstin,
        matchType: matchByName ? 'NAME_EXACT' : 'GSTIN_EXACT'
      });
    } else {
      notInDb.push(item);
    }
  }

  console.log(`Matched (Already in DB): ${matchedInDb.length}`);
  matchedInDb.forEach(m => {
    console.log(` - Excel: "${m.excelName}" (Match: ${m.matchType} -> DB ID: ${m.dbMatch.id}, Code: ${m.dbMatch.code}, DB Name: "${m.dbMatch.name}")`);
  });

  console.log(`\nNew to Insert: ${notInDb.length}`);

  // Also check fuzzy / partial matches
  console.log('\n--- Checking potential partial/similar names in DB ---');
  for (const item of notInDb) {
    const name = (item['Full Name'] || '').trim().toLowerCase();
    for (const dbC of dbCustomers) {
      const dbName = dbC.name.trim().toLowerCase();
      if (name.includes(dbName) || dbName.includes(name)) {
        console.log(`Potential Partial Match: Excel "${item['Full Name'].trim()}" vs DB "${dbC.name}" (Code: ${dbC.code})`);
      }
    }
  }

  await prisma.$disconnect();
}

run().catch(console.error);
