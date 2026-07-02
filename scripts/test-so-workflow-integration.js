/**
 * Integration test — full SO workflow (requires migrated DB + seed user/customer)
 * Run after: npm run db:deploy && node scripts/seed-so-workflow-basics.js
 * Run: node scripts/test-so-workflow-integration.js
 */
import prisma from '../src/backend/config/prisma.js';
import saleOrderWorkflowService from '../src/backend/services/saleOrderWorkflowService.js';
import saleOrderStatusService from '../src/backend/services/saleOrderStatusService.js';

async function main() {
  console.log('\n=== SO Workflow Integration Test ===\n');

  const user = await prisma.user.findFirst({ where: { delete_status: false } });
  const customer = await prisma.customer.findFirst({ where: { delete_status: false } });
  if (!user || !customer) throw new Error('Seed user and customer first');

  const orderNo = `TEST-INT-${Date.now()}`;
  const so = await prisma.$transaction(async (tx) => {
    const created = await tx.saleOrder.create({
      data: {
        orderNo,
        customerId: customer.id,
        status: 'DRAFT',
        procurementType: 'RX',
        rightEye: true,
        leftEye: true,
        createdBy: user.id,
      },
    });
    await saleOrderStatusService.logCreation(tx, created.id, user.id);
    return created;
  });
  console.log('✅ Created SO', so.orderNo);

  await saleOrderWorkflowService.issueToPreQc(so.id, user.id);
  let updated = await prisma.saleOrder.findUnique({ where: { id: so.id } });
  if (updated.status !== 'PRE_QC') throw new Error(`Expected PRE_QC, got ${updated.status}`);
  console.log('✅ Issue to Pre-QC');

  await saleOrderStatusService.transition({
    saleOrderId: so.id,
    toStatus: 'FITTING_READY',
    userId: user.id,
    source: 'PRE_QC',
  });
  console.log('✅ Pre-QC pass → FITTING_READY');

  await saleOrderStatusService.transition({
    saleOrderId: so.id,
    toStatus: 'IN_FITTING',
    userId: user.id,
    source: 'FITTING',
  });
  await saleOrderStatusService.transition({
    saleOrderId: so.id,
    toStatus: 'AWAITING_QUALITY',
    userId: user.id,
    source: 'FITTING',
  });
  console.log('✅ Fitting → Post-QC');

  await saleOrderStatusService.transition({
    saleOrderId: so.id,
    toStatus: 'POST_QC_REJECTED',
    userId: user.id,
    remark: 'Test reject',
    source: 'POST_QC',
  });
  console.log('✅ Post-QC reject');

  await saleOrderStatusService.confirmReset(so.id, user.id, 'Test reset');
  updated = await prisma.saleOrder.findUnique({ where: { id: so.id } });
  if (updated.status !== 'DRAFT') throw new Error('Reset failed');
  console.log('✅ SO reset → DRAFT');

  const logs = await prisma.saleOrderStatusLog.count({ where: { saleOrderId: so.id } });
  if (logs < 5) throw new Error(`Expected 5+ logs, got ${logs}`);
  console.log(`✅ Status log preserved (${logs} entries)`);

  await prisma.saleOrderStatusLog.deleteMany({ where: { saleOrderId: so.id } });
  await prisma.saleOrder.delete({ where: { id: so.id } });
  console.log('✅ Cleanup done\n');
}

main()
  .catch((e) => {
    console.error('❌', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
