/**
 * Clear Type_id on queue SOs so FIFO stock match ignores type.
 * Run: node scratch/clear_so_type_id.js
 */
import prisma from '../src/backend/config/prisma.js';
import saleOrderWorkflowService from '../src/backend/services/saleOrderWorkflowService.js';

const ORDER_NOS = ['SO-2026-001', 'SO-2026-002'];

const before = await prisma.saleOrder.findMany({
  where: { orderNo: { in: ORDER_NOS }, deleteStatus: false },
  select: { id: true, orderNo: true, Type_id: true },
});
console.log('Before:', before);

const result = await prisma.saleOrder.updateMany({
  where: { orderNo: { in: ORDER_NOS }, deleteStatus: false },
  data: { Type_id: null },
});
console.log('Updated rows:', result.count);

const after = await prisma.saleOrder.findMany({
  where: { orderNo: { in: ORDER_NOS }, deleteStatus: false },
  select: { id: true, orderNo: true, Type_id: true },
});
console.log('After:', after);

const queue = await saleOrderWorkflowService.getInventoryQueue({ limit: 100 });
for (const o of queue.data.filter((x) => ORDER_NOS.includes(x.orderNo))) {
  console.log(
    `${o.orderNo} | Type_id=${o.Type_id} | isStockAvailable=${o.isStockAvailable}`
  );
}

await prisma.$disconnect();
