import prisma from '../src/backend/config/prisma.js';
const logs = await prisma.saleOrderStatusLog.findMany({
  where: { saleOrderId: 63 },
  select: { fromStatus: true, toStatus: true, remark: true, createdAt: true, createdBy: true },
  orderBy: { createdAt: 'asc' },
});
console.log(JSON.stringify(logs, null, 2));

// Items that mention SO or were reserved around this order via transactions
const txns = await prisma.inventoryTransaction.findMany({
  where: { saleOrderId: 63 },
  select: {
    id: true, type: true, quantity: true, inventoryItemId: true, deleteStatus: true,
    reason: true, createdAt: true,
  },
  orderBy: { createdAt: 'asc' },
});
console.log('txns', txns);

const itemIds = [...new Set(txns.map(t => t.inventoryItemId).filter(Boolean))];
if (itemIds.length) {
  const items = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds } },
    select: {
      id: true, status: true, issuedEye: true, saleOrderId: true, quantity: true,
      rightSpherical: true, leftSpherical: true, notes: true, deleteStatus: true,
    },
  });
  console.log('txn items', items);
}

await prisma.$disconnect();
