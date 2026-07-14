import prisma from '../src/backend/config/prisma.js';
import { InventoryService } from '../src/backend/services/inventory.service.js';

const inventoryService = new InventoryService();

async function main() {
  console.log('\n=== Database Cleanup: Stale Inventory Reservations ===\n');

  // Fetch all items in RESERVED status
  const reservedItems = await prisma.inventoryItem.findMany({
    where: {
      status: 'RESERVED',
      deleteStatus: false
    },
    include: {
      saleOrder: true
    }
  });

  console.log(`Found ${reservedItems.length} active inventory items with status 'RESERVED'.`);

  let consumedCount = 0;
  let revertedCount = 0;

  for (const item of reservedItems) {
    const order = item.saleOrder;

    // Case 1: Orphaned or order is completed/invoiced/delivered -> CONSUME
    if (!order || ['DELIVERED', 'INVOICED', 'COMPLETED'].includes(order.status)) {
      const orderNo = order ? order.orderNo : 'ORPHANED';
      const orderStatus = order ? order.status : 'N/A';
      console.log(`Consuming item ID ${item.id} (Lens ID: ${item.lens_id}) reserved for ${orderNo} (Status: ${orderStatus})`);

      await prisma.$transaction(async (tx) => {
        // Decrement totalStock and reservedStock in summary
        await inventoryService.updateInventoryStock(item, item.quantity || 1, 'CONSUME_RESERVED', tx);

        // Soft-delete the item
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            deleteStatus: true,
            updatedAt: new Date()
          }
        });
      });
      consumedCount++;
    }
    // Case 2: Order is reset back to DRAFT or CANCELLED -> REVERT
    else if (['DRAFT', 'CANCELLED'].includes(order.status)) {
      console.log(`Reverting reservation on item ID ${item.id} reserved for ${order.orderNo} (Status: ${order.status})`);

      await prisma.$transaction(async (tx) => {
        // Reset item status and quantity
        await tx.inventoryItem.update({
          where: { id: item.id },
          data: {
            status: 'AVAILABLE',
            quantity: 1,
            saleOrderId: null,
            reservedDate: null,
            updatedAt: new Date()
          }
        });

        // Revert stock summary
        await inventoryService.updateInventoryStock(item, 1, 'UNRESERVE', tx);

        // Delete outward transaction
        await tx.inventoryTransaction.deleteMany({
          where: {
            saleOrderId: order.id,
            type: 'OUTWARD_SALE'
          }
        });
      });
      revertedCount++;
    }
  }

  console.log(`\nCleanup completed successfully!`);
  console.log(`- Consumed: ${consumedCount} items`);
  console.log(`- Reverted: ${revertedCount} items\n`);
}

main()
  .catch((e) => {
    console.error('Error running cleanup:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
