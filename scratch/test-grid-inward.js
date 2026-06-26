import { PrismaClient } from '@prisma/client';
import InventoryService from '../src/backend/services/inventory.service.js';

const prisma = new PrismaClient();
const inventoryService = new InventoryService();

async function main() {
  console.log("🧪 Starting Backend QA simulation for Initial Stock Grid Inward...");

  let tempLocation = null;
  let tempTray = null;
  let createdItemIds = [];
  let createdTxIds = [];

  try {
    // 1. Create temporary location
    tempLocation = await prisma.locationMaster.create({
      data: {
        name: "QA Temp Location",
        description: "Temporary location for QA testing",
        createdBy: 1
      }
    });
    console.log(`📍 Created QA Location: ${tempLocation.name} (ID: ${tempLocation.id})`);

    // 2. Create temporary tray with capacity 100
    tempTray = await prisma.trayMaster.create({
      data: {
        name: "QA Temp Tray",
        capacity: 100,
        location_id: tempLocation.id,
        createdBy: 1
      }
    });
    console.log(`📥 Created QA Tray: ${tempTray.name} (ID: ${tempTray.id}, Capacity: ${tempTray.capacity})`);

    // 3. Fetch an active Product
    const product = await prisma.lensProductMaster.findFirst({
      where: { activeStatus: true, deleteStatus: false }
    });
    if (!product) {
      throw new Error("No active Product found in DB");
    }
    console.log(`👓 Found Product: ${product.lens_name} (ID: ${product.id})`);

    // 4. Fetch an active Coating
    const coating = await prisma.lensCoatingMaster.findFirst({
      where: { activeStatus: true, deleteStatus: false }
    });
    if (!coating) {
      throw new Error("No active Coating found in DB");
    }
    console.log(`✨ Found Coating: ${coating.name} (ID: ${coating.id})`);

    // 5. Build payload
    const payload = {
      lens_id: product.id,
      coating_id: coating.id,
      costPrice: 150,
      rows: [
        {
          spherical: "-1.00",
          cylindrical: "0.00",
          add: null,
          eye: null,
          splits: [
            {
              location_id: tempLocation.id,
              tray_id: tempTray.id,
              qty: 5,
              costPrice: 150
            }
          ]
        }
      ]
    };

    console.log("📦 Call bulkInwardFromGrid service...");
    const res = await inventoryService.bulkInwardFromGrid(payload, 1);
    console.log("✅ Service call succeeded!");
    console.log(`Created Count: ${res.createdCount}, Total Quantity: ${res.totalQuantity}`);

    // 6. Verify database records
    const items = await prisma.inventoryItem.findMany({
      where: {
        location_id: tempLocation.id,
        tray_id: tempTray.id,
        lens_id: product.id
      },
      include: { transactions: true }
    });

    console.log(`🔍 Verified items created: ${items.length} items found in DB.`);
    items.forEach(item => {
      createdItemIds.push(item.id);
      item.transactions.forEach(t => createdTxIds.push(t.id));
    });

    if (items.length !== 1) {
      throw new Error(`Expected 1 inventory item, but found ${items.length}`);
    }
    if (items[0].quantity !== 5) {
      throw new Error(`Expected quantity to be 5, but got ${items[0].quantity}`);
    }
    if (items[0].costPrice !== 150) {
      throw new Error(`Expected costPrice to be 150, but got ${items[0].costPrice}`);
    }

    console.log("🎉 Backend QA simulation PASSED!");
  } catch (error) {
    console.error("❌ QA simulation FAILED:", error);
  } finally {
    console.log("🧹 Cleaning up QA temp data...");

    // Delete created stock items and transactions
    if (createdTxIds.length > 0) {
      await prisma.inventoryTransaction.deleteMany({
        where: { id: { in: createdTxIds } }
      });
    }
    if (createdItemIds.length > 0) {
      await prisma.inventoryItem.deleteMany({
        where: { id: { in: createdItemIds } }
      });
    }
    if (tempTray) {
      await prisma.trayMaster.delete({ where: { id: tempTray.id } });
    }
    if (tempLocation) {
      await prisma.locationMaster.delete({ where: { id: tempLocation.id } });
    }

    console.log("🧼 Cleanup finished.");
    await prisma.$disconnect();
  }
}

main();
