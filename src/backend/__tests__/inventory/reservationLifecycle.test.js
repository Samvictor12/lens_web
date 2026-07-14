import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import prisma from '../../config/prisma.js';
import saleOrderStatusService from '../../services/saleOrderStatusService.js';
import saleOrderWorkflowService from '../../services/saleOrderWorkflowService.js';
import { InventoryService } from '../../services/inventory.service.js';

const inventoryService = new InventoryService();

describe('Inventory Reservation Lifecycle integration tests', () => {
  let user;
  let customer;
  let location;
  let tray;
  let lens;
  let category;
  let type;

  beforeEach(async () => {
    // 1. Fetch seed data
    user = await prisma.user.findFirst({ where: { delete_status: false } });
    customer = await prisma.customer.findFirst({ where: { delete_status: false } });
    location = await prisma.locationMaster.findFirst({ where: { deleteStatus: false } });
    
    // Ensure we have a tray for this location
    tray = await prisma.trayMaster.findFirst({ where: { location_id: location.id, deleteStatus: false } });
    if (!tray) {
      tray = await prisma.trayMaster.create({
        data: {
          name: 'TEST-TRAY-LIFECYCLE',
          capacity: 50,
          location_id: location.id,
          createdBy: user.id
        }
      });
    }

    lens = await prisma.lensProductMaster.findFirst({ where: { deleteStatus: false } });
    category = await prisma.lensCategoryMaster.findFirst({ where: { deleteStatus: false } });
    type = await prisma.lensTypeMaster.findFirst({ where: { deleteStatus: false } });

    if (!user || !customer || !location || !lens) {
      throw new Error('Seed data required for reservation lifecycle test');
    }
  });

  afterEach(async () => {
    // Cleanup test tray if created
    await prisma.trayMaster.deleteMany({ where: { name: 'TEST-TRAY-LIFECYCLE' } });
  });

  it('correctly manages reservation, unreservation on reset, and consumption on dispatch', async () => {
    // 1. Create a dummy inventory item
    const item = await prisma.inventoryItem.create({
      data: {
        lens_id: lens.id,
        category_id: category?.id,
        Type_id: type?.id,
        location_id: location.id,
        tray_id: tray.id,
        quantity: 1,
        costPrice: 200,
        status: 'AVAILABLE',
        createdBy: user.id
      }
    });

    // Update stock summary
    await inventoryService.updateInventoryStock(item, 1, 'ADD');

    // Verify initial stock summary
    let stock = await prisma.inventoryStock.findFirst({
      where: {
        lens_id: lens.id,
        category_id: category?.id ?? null,
        Type_id: type?.id ?? null,
        coating_id: null,
        location_id: location.id,
        tray_id: tray.id
      }
    });

    const initialTotal = stock.totalStock;
    const initialAvailable = stock.availableStock;
    const initialReserved = stock.reservedStock;

    // 2. Create SaleOrder
    const orderNo = `TEST-RSV-${Date.now()}`;
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
        rightSpherical: '-0.75',
        rightCylindrical: '-0.75',
        createdBy: user.id
      }
    });
    await saleOrderStatusService.logCreation(prisma, so.id, user.id);

    // 3. Issue stock (reserving the item)
    await saleOrderWorkflowService.issueToPreQc(so.id, user.id, { inventoryItemIds: [item.id] });

    // Verify item is now RESERVED with quantity 0
    let updatedItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(updatedItem.status).toBe('RESERVED');
    expect(updatedItem.quantity).toBe(0);

    // Verify stock summary has shifted to reserved
    stock = await prisma.inventoryStock.findFirst({
      where: {
        lens_id: lens.id,
        category_id: category?.id ?? null,
        Type_id: type?.id ?? null,
        coating_id: null,
        location_id: location.id,
        tray_id: tray.id
      }
    });
    expect(stock.totalStock).toBe(initialTotal);
    expect(stock.availableStock).toBe(initialAvailable - 1);
    expect(stock.reservedStock).toBe(initialReserved + 1);

    // 4. Test Reset to DRAFT (unreservation)
    // Transition to reset-eligible status first (e.g. PRE_QC_REJECTED)
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'PRE_QC_REJECTED',
      userId: user.id,
      source: 'PRE_QC'
    });
    
    // Perform reset to DRAFT
    await saleOrderStatusService.confirmReset(so.id, user.id, 'Test reset to draft');

    // Verify item status is restored to AVAILABLE with quantity 1
    updatedItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(updatedItem.status).toBe('AVAILABLE');
    expect(updatedItem.quantity).toBe(1);
    expect(updatedItem.saleOrderId).toBeNull();

    // Verify stock summary is restored
    stock = await prisma.inventoryStock.findFirst({
      where: {
        lens_id: lens.id,
        category_id: category?.id ?? null,
        Type_id: type?.id ?? null,
        coating_id: null,
        location_id: location.id,
        tray_id: tray.id
      }
    });
    expect(stock.totalStock).toBe(initialTotal);
    expect(stock.availableStock).toBe(initialAvailable);
    expect(stock.reservedStock).toBe(initialReserved);

    // 5. Test Consumption on fulfillment
    // Re-issue stock
    await saleOrderWorkflowService.issueToPreQc(so.id, user.id, { inventoryItemIds: [item.id] });

    // Transition to DISPATCHED
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'FITTING_READY',
      userId: user.id,
      source: 'PRE_QC'
    });
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'IN_FITTING',
      userId: user.id,
      source: 'FITTING'
    });
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'AWAITING_QUALITY',
      userId: user.id,
      source: 'FITTING'
    });
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'READY_FOR_DISPATCH',
      userId: user.id,
      source: 'POST_QC'
    });
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'READY_FOR_PICKUP',
      userId: user.id,
      source: 'POST_QC'
    });
    await saleOrderStatusService.transition({
      saleOrderId: so.id,
      toStatus: 'DISPATCHED',
      userId: user.id,
      source: 'DISPATCH'
    });

    // Verify item is soft-deleted
    updatedItem = await prisma.inventoryItem.findUnique({ where: { id: item.id } });
    expect(updatedItem.deleteStatus).toBe(true);

    // Verify stock summary has decremented both totalStock and reservedStock
    stock = await prisma.inventoryStock.findFirst({
      where: {
        lens_id: lens.id,
        category_id: category?.id ?? null,
        Type_id: type?.id ?? null,
        coating_id: null,
        location_id: location.id,
        tray_id: tray.id
      }
    });
    expect(stock.totalStock).toBe(initialTotal - 1);
    expect(stock.reservedStock).toBe(initialReserved);
    expect(stock.availableStock).toBe(initialAvailable - 1);

    // Cleanup created entities
    await prisma.saleOrderStatusLog.deleteMany({ where: { saleOrderId: so.id } });
    await prisma.saleOrder.delete({ where: { id: so.id } });
    await prisma.inventoryTransaction.deleteMany({ where: { inventoryItemId: item.id } });
    await prisma.inventoryItem.delete({ where: { id: item.id } });
    
    // Decrement the initial stock addition so summary is exactly as it started
    await prisma.inventoryStock.update({
      where: { id: stock.id },
      data: {
        totalStock: initialTotal - 1, // since 1 got consumed, we don't need to deduct further from total, but let's make sure the availableStock aligns
        availableStock: initialAvailable
      }
    });
  });
});
