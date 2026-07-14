import prisma from '../src/backend/config/prisma.js';

async function run() {
  console.log("=== INWARD QUEUE STATUS DIAGNOSTICS ===");

  // 1. Query all PurchaseOrderReceipts (even fully inwarded ones to see history)
  console.log("\n--- PurchaseOrderReceipts ---");
  const receipts = await prisma.purchaseOrderReceipt.findMany({
    where: { deleteStatus: false },
    include: {
      purchaseOrder: {
        include: {
          saleOrder: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total active receipts: ${receipts.length}`);
  receipts.forEach(r => {
    const po = r.purchaseOrder;
    const saleOrderNo = po?.saleOrder?.orderNo || 'None';
    const saleOrderId = po?.saleOrderId;
    const pendingQty = (r.totalReceivedQty || 0) - (r.inwardedQty || 0);
    console.log(`Receipt: ${r.receiptNumber} | PO: ${po?.poNumber || 'N/A'} | Status: ${r.status} | RecQty: ${r.totalReceivedQty} | InwardQty: ${r.inwardedQty} | PendingQty: ${pendingQty} | Linked SO: ${saleOrderNo} (ID: ${saleOrderId}) | PO Status: ${po?.status || 'N/A'}`);
  });

  // 2. Query all PurchaseOrders that are received or partially received
  console.log("\n--- PurchaseOrders (RECEIVED or PO_PARTIAL_RECEIVED) ---");
  const pos = await prisma.purchaseOrder.findMany({
    where: {
      deleteStatus: false,
      status: {
        in: ['RECEIVED', 'PO_PARTIAL_RECEIVED']
      }
    },
    include: {
      saleOrder: true,
      receipts: {
        where: { deleteStatus: false }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`Total RECEIVED/PARTIAL POs: ${pos.length}`);
  pos.forEach(po => {
    const saleOrderNo = po.saleOrder?.orderNo || 'None';
    const receiptCount = po.receipts.length;
    console.log(`PO: ${po.poNumber} | Status: ${po.status} | OrderQty: ${po.quantity} | RecQty: ${po.receivedQty} | Linked SO: ${saleOrderNo} | Receipts Count: ${receiptCount}`);
  });

  // 3. Query all PurchaseOrders in other statuses (to see if they are not received yet)
  console.log("\n--- PurchaseOrders (Other Statuses) ---");
  const otherPos = await prisma.purchaseOrder.findMany({
    where: {
      deleteStatus: false,
      status: {
        notIn: ['RECEIVED', 'PO_PARTIAL_RECEIVED']
      }
    },
    include: {
      saleOrder: true
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`Total other POs: ${otherPos.length}`);
  otherPos.forEach(po => {
    const saleOrderNo = po.saleOrder?.orderNo || 'None';
    console.log(`PO: ${po.poNumber} | Status: ${po.status} | OrderQty: ${po.quantity} | RecQty: ${po.receivedQty} | Linked SO: ${saleOrderNo}`);
  });
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
