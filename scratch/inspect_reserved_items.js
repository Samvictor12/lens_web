import prisma from '../src/backend/config/prisma.js';

async function run() {
  console.log("=== RESERVED ITEMS DETAILED INSPECTION ===");
  const items = await prisma.inventoryItem.findMany({
    where: { status: 'RESERVED' },
    include: {
      lensProduct: true,
      saleOrder: true,
      tray: true
    }
  });

  console.log(`Reserved Items Count: ${items.length}`);
  items.forEach(item => {
    console.log(`Item ID: ${item.id}
  Lens: ${item.lensProduct.lens_name}
  Qty: ${item.quantity} (status: ${item.status})
  Tray: ${item.tray?.name || 'None'}
  Right Eye: SPH ${item.rightSpherical}, CYL ${item.rightCylindrical}, ADD ${item.rightAdd}
  Left Eye: SPH ${item.leftSpherical}, CYL ${item.leftCylindrical}, ADD ${item.leftAdd}
  Linked SO: ${item.saleOrder?.orderNo || 'None'} (Status: ${item.saleOrder?.status || 'N/A'})
  Reserved Date: ${item.reservedDate}
  Created At: ${item.createdAt}
---------------------------------------------`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
