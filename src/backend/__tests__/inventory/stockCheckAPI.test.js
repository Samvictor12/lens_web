import { describe, it, expect, beforeEach } from 'vitest';
import prisma from '../../config/prisma.js';
import saleOrderWorkflowService from '../../services/saleOrderWorkflowService.js';
import { InventoryService } from '../../services/inventory.service.js';

const inventoryService = new InventoryService();

describe('SO Request Queue stock availability checks', () => {
  let user;
  let customer;
  let location;
  let tray;
  let lens;
  let category;
  let type;

  beforeEach(async () => {
    user = await prisma.user.findFirst({ where: { delete_status: false } });
    customer = await prisma.customer.findFirst({ where: { delete_status: false } });
    location = await prisma.locationMaster.findFirst({ where: { deleteStatus: false } });
    tray = await prisma.trayMaster.findFirst({ where: { location_id: location.id, deleteStatus: false } });
    lens = await prisma.lensProductMaster.findFirst({ where: { deleteStatus: false } });
    category = await prisma.lensCategoryMaster.findFirst({ where: { deleteStatus: false } });
    type = await prisma.lensTypeMaster.findFirst({ where: { deleteStatus: false } });
  });

  it('correctly sets isStockAvailable to true when stock exists, and false otherwise', async () => {
    const orderNo = `TEST-STK-${Date.now()}`;
    
    // 1. Create a SaleOrder that needs a specific lens SPH -8.50, CYL -8.50
    const so = await prisma.saleOrder.create({
      data: {
        orderNo,
        customerId: customer.id,
        status: 'DRAFT',
        procurementType: 'RX',
        rightEye: true,
        leftEye: false,
        lens_id: lens.id,
        category_id: category?.id,
        Type_id: type?.id,
        rightSpherical: '-8.50',
        rightCylindrical: '-8.50',
        createdBy: user.id
      }
    });

    try {
      // 2. Query queue - since no stock has this spec (-8.50/-8.50), isStockAvailable should be false
      let queue = await saleOrderWorkflowService.getInventoryQueue({ orderNo });
      let matchedOrder = queue.data.find(o => o.id === so.id);
      expect(matchedOrder).toBeDefined();
      expect(matchedOrder.isStockAvailable).toBe(false);

      // 3. Create a matching inventory item in the database
      const item = await prisma.inventoryItem.create({
        data: {
          lens_id: lens.id,
          category_id: category?.id,
          Type_id: type?.id,
          location_id: location.id,
          tray_id: tray.id,
          quantity: 1,
          costPrice: 150,
          rightEye: true,
          leftEye: false,
          rightSpherical: '-8.50',
          rightCylindrical: '-8.50',
          status: 'AVAILABLE',
          createdBy: user.id
        }
      });

      // Update stock summary
      await inventoryService.updateInventoryStock(item, 1, 'ADD');

      try {
        // 4. Query queue again - now stock is available, isStockAvailable should be true!
        queue = await saleOrderWorkflowService.getInventoryQueue({ orderNo });
        matchedOrder = queue.data.find(o => o.id === so.id);
        expect(matchedOrder.isStockAvailable).toBe(true);
      } finally {
        // Cleanup stock and item
        await prisma.inventoryStock.deleteMany({
          where: {
            lens_id: lens.id,
            category_id: category?.id ?? null,
            Type_id: type?.id ?? null,
            location_id: location.id,
            tray_id: tray.id
          }
        });
        await prisma.inventoryTransaction.deleteMany({ where: { inventoryItemId: item.id } });
        await prisma.inventoryItem.delete({ where: { id: item.id } });
      }
    } finally {
      // Cleanup sale order
      await prisma.saleOrder.delete({ where: { id: so.id } });
    }
  });
});
