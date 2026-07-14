import prisma from '../src/backend/config/prisma.js';

async function run() {
  console.log("=== INVENTORY DIAGNOSTICS ===");
  
  // 1. Query InventoryStock
  const stocks = await prisma.inventoryStock.findMany({
    include: {
      lensProduct: true,
      location: true,
      tray: true
    }
  });
  console.log(`\nTotal InventoryStock rows: ${stocks.length}`);
  const nonZeroStocks = stocks.filter(s => s.totalStock > 0 || s.reservedStock > 0);
  console.log(`Stocks with totalStock > 0 or reservedStock > 0: ${nonZeroStocks.length}`);
  nonZeroStocks.forEach(s => {
    console.log(`- Lens: ${s.lensProduct.lens_name} (${s.lensProduct.product_code}) | Location: ${s.location?.name || 'N/A'} | Tray: ${s.tray?.name || 'N/A'} | Total: ${s.totalStock} | Reserved: ${s.reservedStock} | Available: ${s.availableStock}`);
  });

  const totalReservedStockSum = stocks.reduce((sum, s) => sum + s.reservedStock, 0);
  console.log(`\nSum of reservedStock in InventoryStock: ${totalReservedStockSum}`);

  // 2. Query InventoryItems with RESERVED status
  const reservedItems = await prisma.inventoryItem.findMany({
    where: { status: 'RESERVED' },
    include: {
      lensProduct: true,
      location: true,
      tray: true,
      saleOrder: true
    }
  });
  console.log(`\nTotal InventoryItems with status RESERVED: ${reservedItems.length}`);
  reservedItems.forEach(item => {
    console.log(`- Item ID: ${item.id} | Lens: ${item.lensProduct.lens_name} | Qty: ${item.quantity} | Tray: ${item.tray?.name || 'N/A'} | SO Link: ${item.saleOrder?.orderNo || 'NONE'} (SO Status: ${item.saleOrder?.status || 'N/A'})`);
  });

  // 3. Query InventoryItems with AVAILABLE status
  const availableItems = await prisma.inventoryItem.findMany({
    where: { status: 'AVAILABLE' },
    include: {
      lensProduct: true,
      location: true,
      tray: true,
      purchaseOrder: true
    }
  });
  console.log(`\nTotal InventoryItems with status AVAILABLE: ${availableItems.length}`);
  availableItems.slice(0, 30).forEach(item => {
    console.log(`- Item ID: ${item.id} | Lens: ${item.lensProduct.lens_name} | Qty: ${item.quantity} | Tray: ${item.tray?.name || 'N/A'} | Location: ${item.location?.name || 'N/A'} | SPH: R ${item.rightSpherical} / L ${item.leftSpherical} | CYL: R ${item.rightCylindrical} / L ${item.leftCylindrical}`);
  });

  // 4. Query SaleOrders in queue or in-fitting or pre-qc
  const activeOrders = await prisma.saleOrder.findMany({
    where: {
      deleteStatus: false,
      status: {
        notIn: ['COMPLETED', 'CANCELLED', 'DELIVERED', 'DISPATCHED', 'INVOICED', 'READY_FOR_DISPATCH', 'READY_FOR_PICKUP']
      }
    },
    include: {
      lensProduct: true,
      customer: true
    }
  });
  console.log(`\nTotal Active/Pending SaleOrders (excluding finished/cancelled/dispatched): ${activeOrders.length}`);
  activeOrders.forEach(so => {
    console.log(`- SO ID: ${so.id} | Order No: ${so.orderNo} | Status: ${so.status} | Customer: ${so.customer?.name} | Lens: ${so.lensProduct?.lens_name || 'N/A'} | RightEye: ${so.rightEye} (SPH:${so.rightSpherical}, CYL:${so.rightCylindrical}) | LeftEye: ${so.leftEye} (SPH:${so.leftSpherical}, CYL:${so.leftCylindrical})`);
  });

  // 5. Check if there are any pending receipts in the Inward Queue
  const receipts = await prisma.purchaseOrderReceipt.findMany({
    where: { deleteStatus: false },
    include: {
      purchaseOrder: true
    }
  });
  const pendingReceipts = receipts.filter(r => (r.totalReceivedQty || 0) > (r.inwardedQty || 0));
  console.log(`\nTotal Pending Receipts in Inward Queue: ${pendingReceipts.length}`);
  pendingReceipts.forEach(r => {
    console.log(`- Receipt: ${r.receiptNumber} | PO: ${r.purchaseOrder?.poNumber} | Total Received Qty: ${r.totalReceivedQty} | Inwarded Qty: ${r.inwardedQty}`);
  });

  // 6. Show tray details
  const trays = await prisma.trayMaster.findMany({
    include: {
      location: true
    }
  });
  console.log(`\nTrays:`);
  trays.forEach(t => {
    console.log(`- Tray: ${t.name} (ID: ${t.id}) | Capacity: ${t.capacity} | Location: ${t.location?.name}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
