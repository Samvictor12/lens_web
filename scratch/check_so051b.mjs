import prisma from '../src/backend/config/prisma.js';

const soId = 63;

// All inventory items that ever had this SO or matching power recently
const items = await prisma.inventoryItem.findMany({
  where: {
    deleteStatus: false,
    OR: [
      { rightSpherical: '-0.75' },
      { leftSpherical: '-0.75' },
    ],
    status: { in: ['AVAILABLE', 'RESERVED', 'RETURNED', 'IN_FITTING', 'QUALITY_CHECK', 'DAMAGED'] },
  },
  select: {
    id: true, status: true, issuedEye: true, saleOrderId: true, isReused: true,
    rightEye: true, leftEye: true,
    rightSpherical: true, leftSpherical: true,
    notes: true, updatedAt: true, quantity: true,
  },
  orderBy: { updatedAt: 'desc' },
  take: 30,
});
console.log('Power -0.75 items', items.map(i => ({
  id: i.id, status: i.status, issuedEye: i.issuedEye, so: i.saleOrderId,
  R: i.rightSpherical, L: i.leftSpherical, qty: i.quantity,
  notes: (i.notes||'').slice(0,80),
})));

const qc = await prisma.inventoryQcReturn.findMany({
  where: { saleOrderId: soId },
  include: { inventoryItem: { select: { id: true, status: true, issuedEye: true, saleOrderId: true } } },
});
console.log('QC full', JSON.stringify(qc, null, 2));

// status history model name
const models = Object.keys(prisma).filter(k => /status|history|saleOrder/i.test(k) && !k.startsWith('_') && !k.startsWith('$'));
console.log('models', models);

await prisma.$disconnect();
