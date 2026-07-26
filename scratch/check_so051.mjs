import prisma from '../src/backend/config/prisma.js';

const so = await prisma.saleOrder.findFirst({
  where: { orderNo: 'SO-2026-051', deleteStatus: false },
  select: {
    id: true, orderNo: true, status: true, procurementType: true,
    rightEye: true, leftEye: true,
    rightSpherical: true, leftSpherical: true,
  },
});
console.log('SO', so);

if (so) {
  const items = await prisma.inventoryItem.findMany({
    where: { saleOrderId: so.id, deleteStatus: false },
    select: {
      id: true, status: true, issuedEye: true, isReused: true, quantity: true,
      rightEye: true, leftEye: true,
      rightSpherical: true, leftSpherical: true,
      saleOrderId: true,
    },
  });
  console.log('Linked items', items);

  const returned = await prisma.inventoryItem.findMany({
    where: {
      deleteStatus: false,
      OR: [
        { status: 'RETURNED' },
        { notes: { contains: 'SO-2026-051' } },
      ],
      AND: [
        { OR: [
          { saleOrderId: so.id },
          { saleOrderId: null },
        ]},
      ],
    },
    select: {
      id: true, status: true, issuedEye: true, saleOrderId: true,
      rightSpherical: true, leftSpherical: true, notes: true,
    },
    take: 20,
  });
  console.log('Related returned-ish', returned.map(r => ({
    id: r.id, status: r.status, issuedEye: r.issuedEye, saleOrderId: r.saleOrderId,
    R: r.rightSpherical, L: r.leftSpherical,
  })));

  const qc = await prisma.inventoryQcReturn.findMany({
    where: { saleOrderId: so.id },
    select: {
      id: true, status: true, eyeSide: true, sourceStatus: true,
      inventoryItemId: true, createdAt: true,
    },
    orderBy: { id: 'desc' },
  });
  console.log('QcReturns', qc);

  const hist = await prisma.saleOrderStatusHistory.findMany({
    where: { saleOrderId: so.id },
    select: { fromStatus: true, toStatus: true, remark: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 15,
  });
  console.log('History', hist);
}

await prisma.$disconnect();
