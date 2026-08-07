import prisma from '../src/backend/config/prisma.js';
const txns = await prisma.inventoryTransaction.findMany({
  where: { saleOrderId: 63 },
  select: {
    id: true, type: true, quantity: true, inventoryItemId: true,
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
} else {
  console.log('no txn item ids');
}

// What statuses were items in when linked?
const anyLinked = await prisma.inventoryItem.findMany({
  where: { saleOrderId: 63 },
  select: { id: true, status: true, issuedEye: true, deleteStatus: true },
});
console.log('any saleOrderId=63 including deleted', anyLinked);

const soft = await prisma.inventoryItem.findMany({
  where: { saleOrderId: 63, deleteStatus: true },
  select: { id: true, status: true, issuedEye: true },
});
console.log('soft deleted linked', soft);

await prisma.$disconnect();
