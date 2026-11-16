import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const excelData = JSON.parse(
    fs.readFileSync('/Users/kavin/.gemini/antigravity-ide/brain/276e2df4-a743-4468-bdbd-07290eeb0fb2/scratch/excel_customers.json', 'utf8')
  );

  const dbCustomers = await prisma.customer.findMany({
    select: { id: true, code: true, name: true, phone: true, gstin: true }
  });

  console.log(`DB has ${dbCustomers.length} customers.`);

  // Find max VIT code number
  let maxVit = 0;
  for (const c of dbCustomers) {
    const m = c.code.match(/VIT[- ]?(\d+)/i);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num > maxVit) maxVit = num;
    }
  }
  console.log(`Max existing VIT number: ${maxVit}`);

  let nextCodeNum = maxVit + 1;
  const toInsert = [];
  const skipped = [];

  for (const row of excelData) {
    const rawName = (row['Full Name'] || '').trim();
    const rawAlt = (row['AlternateName'] || '').trim();
    const addr = (row['Address'] || '').trim();
    const city = (row['CityName'] || '').trim();
    const gstType = (row['GST Type'] || '').trim();
    let gstin = (row['GSTIN'] || '').trim();
    if (gstin === '-' || !gstin) gstin = null;

    let mob = row['MobilePhone'];
    let work = row['WorkPhone'];
    let mobStr = mob && mob !== 0 && mob !== '0' ? String(parseInt(mob, 10)) : null;
    let workStr = work && work !== 0 && work !== '0' ? String(parseInt(work, 10)) : null;

    // Check duplicate in DB (case-insensitive name check)
    const exactNameMatch = dbCustomers.find(
      c => c.name.trim().toLowerCase() === rawName.toLowerCase()
    );

    // Also check near match (e.g. American Eye Optics / Vizyon)
    const isNearMatch = dbCustomers.find(
      c => c.name.trim().toLowerCase() === 'vizyon eye care centre' && rawName.toLowerCase() === 'vizyon eye care center'
    ) || dbCustomers.find(
      c => c.name.trim().toLowerCase() === 'american eye care centre' && rawName.toLowerCase() === 'american eye optics'
    );

    if (exactNameMatch) {
      skipped.push({
        name: rawName,
        reason: `Exact match in DB: [${exactNameMatch.code}] "${exactNameMatch.name}" (ID ${exactNameMatch.id})`
      });
      continue;
    }

    // Pincode extraction
    let pincode = null;
    const pinMatch = addr.match(/\b(6\d{5})\b/);
    if (pinMatch) pincode = pinMatch[1];

    // State derivation
    let state = 'Tamil Nadu';
    if (city.toLowerCase() === 'tirupathi') state = 'Andhra Pradesh';

    // Phone assignment
    let phone = mobStr || workStr || null;
    let altPhone = (mobStr && workStr) ? workStr : null;

    // Business category suggestion
    let bizCat = 3; // Retail default
    if (rawName.toUpperCase().includes('PURPLE OPTIC')) bizCat = 1; // Chain Retail
    if (rawName.toUpperCase().includes('HOSPITAL') || rawName.toUpperCase().includes('ASSOCIATES')) bizCat = 2; // Institution

    const code = `VIT-${String(nextCodeNum).padStart(3, '0')}`;
    nextCodeNum++;

    toInsert.push({
      code,
      name: rawName,
      shopname: rawAlt || null,
      phone,
      alternatephone: altPhone,
      address: addr || null,
      city: city || null,
      state,
      pincode,
      gstin,
      businessCategory_id: bizCat,
      credit_limit: 50000,
      credit_days: 30,
      active_status: true,
      delete_status: false,
      createdBy: 1,
      isNearMatch: isNearMatch ? `Warning: Near match with [${isNearMatch.code}] "${isNearMatch.name}"` : null
    });
  }

  console.log(`\nSkipped count: ${skipped.length}`);
  skipped.forEach(s => console.log(`  - ${s.name}: ${s.reason}`));

  console.log(`\nTo Insert count: ${toInsert.length}`);
  const nearMatches = toInsert.filter(i => i.isNearMatch);
  console.log(`Near match warnings count: ${nearMatches.length}`);
  nearMatches.forEach(n => console.log(`  - "${n.name}": ${n.isNearMatch}`));

  await prisma.$disconnect();
}

main().catch(console.error);
