/**
 * Phase 1 test — schema, enums, status log, virtual location seed
 * Run: node scripts/test-so-workflow-phase1.js
 */
import prisma from '../src/backend/config/prisma.js';

const PASS = [];
const FAIL = [];

function ok(name) {
  PASS.push(name);
  console.log(`  ✅ ${name}`);
}

function fail(name, err) {
  FAIL.push({ name, err: err?.message || String(err) });
  console.error(`  ❌ ${name}:`, err?.message || err);
}

async function main() {
  console.log('\n=== Phase 1: Schema & Status Log ===\n');

  try {
    const statuses = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"SaleOrderStatus"))::text AS status
    `;
    const names = statuses.map((r) => r.status);
    if (names.includes('PRE_QC') && names.includes('PO_RAISED') && names.includes('COMPLETED')) {
      ok('SaleOrderStatus enum has workflow values');
    } else {
      fail('SaleOrderStatus enum', new Error(`Missing values: ${names.join(', ')}`));
    }
  } catch (e) {
    fail('SaleOrderStatus enum', e);
  }

  try {
    const poStatuses = await prisma.$queryRaw`
      SELECT unnest(enum_range(NULL::"POStatus"))::text AS status
    `;
    const poNames = poStatuses.map((r) => r.status);
    if (poNames.includes('PO_PARTIAL_RECEIVED')) {
      ok('POStatus has PO_PARTIAL_RECEIVED');
    } else {
      fail('POStatus', new Error(poNames.join(', ')));
    }
  } catch (e) {
    fail('POStatus', e);
  }

  try {
    const cols = await prisma.$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'SaleOrder' AND column_name IN ('procurementType', 'hasLinkedPoEver')
    `;
    if (cols.length >= 2) ok('SaleOrder has procurementType and hasLinkedPoEver');
    else fail('SaleOrder columns', new Error(JSON.stringify(cols)));
  } catch (e) {
    fail('SaleOrder columns', e);
  }

  try {
    const loc = await prisma.locationMaster.findFirst({ where: { isVirtual: true } });
    if (loc) ok(`Virtual location exists: ${loc.name}`);
    else fail('Virtual location', new Error('Run seed or scripts/seed-so-workflow-basics.js'));
  } catch (e) {
    fail('Virtual location', e);
  }

  try {
    const user = await prisma.user.findFirst({ where: { delete_status: false } });
    const customer = await prisma.customer.findFirst({ where: { delete_status: false } });
    if (!user || !customer) {
      fail('Status log write', new Error('Need at least one user and customer in DB'));
    } else {
      const orderNo = `TEST-P1-${Date.now()}`;
      const so = await prisma.saleOrder.create({
        data: {
          orderNo,
          customerId: customer.id,
          status: 'DRAFT',
          procurementType: 'STOCK',
          createdBy: user.id,
        },
      });
      await prisma.saleOrderStatusLog.create({
        data: {
          saleOrderId: so.id,
          fromStatus: null,
          toStatus: 'DRAFT',
          source: 'SYSTEM',
          remark: 'Phase 1 test',
          createdBy: user.id,
        },
      });
      const logs = await prisma.saleOrderStatusLog.count({ where: { saleOrderId: so.id } });
      await prisma.saleOrderStatusLog.deleteMany({ where: { saleOrderId: so.id } });
      await prisma.saleOrder.delete({ where: { id: so.id } });
      if (logs === 1) ok('SaleOrderStatusLog write/read');
      else fail('SaleOrderStatusLog', new Error(`count=${logs}`));
    }
  } catch (e) {
    fail('Status log write', e);
  }

  console.log(`\n--- Phase 1: ${PASS.length} passed, ${FAIL.length} failed ---\n`);
  if (FAIL.length) {
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
