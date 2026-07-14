/**
 * Diagnose why SO Request Queue shows Out of Stock despite inventory.
 * Run: node scratch/diagnose_so_queue_stock.js
 */
import prisma from '../src/backend/config/prisma.js';
import SaleOrderService from '../src/backend/services/saleOrderService.js';
import saleOrderWorkflowService from '../src/backend/services/saleOrderWorkflowService.js';

const saleOrderService = new SaleOrderService();

const norm = (v) => {
  if (v === null || v === undefined || String(v).trim() === '') return '0';
  const n = Number(String(v).trim());
  return Number.isNaN(n) ? String(v).trim() : String(n);
};

function fieldDiff(label, soVal, invVal) {
  const a = soVal === null || soVal === undefined ? null : soVal;
  const b = invVal === null || invVal === undefined ? null : invVal;
  const same = a === b || (a == null && b == null);
  const opticSame = norm(a) === norm(b);
  return { label, so: a, inv: b, exact: same, nullEq0: opticSame };
}

async function main() {
  const queue = await saleOrderWorkflowService.getInventoryQueue({ limit: 100 });
  console.log(`\n=== SO Request Queue: ${queue.data.length} orders ===\n`);

  for (const order of queue.data) {
    const fifo = await saleOrderService.getMatchingInventoryFIFO(order.id);
    const r = fifo.rightEyeMatches?.length || 0;
    const l = fifo.leftEyeMatches?.length || 0;
    const badge = order.isStockAvailable ? 'IN STOCK' : 'OUT OF STOCK';

    console.log('─'.repeat(72));
    console.log(
      `${order.orderNo} | ${badge} | status=${order.status} | procurement=${order.procurementType || 'RX'}`
    );
    console.log(
      `  Product: ${order.lensProduct?.lens_name || 'N/A'} (lens_id=${order.lens_id}) | cat=${order.category_id} type=${order.Type_id} coat=${order.coating_id}`
    );
    console.log(
      `  Eyes: R=${order.rightEye} L=${order.leftEye} | FIFO matches: R=${r} L=${l}`
    );
    if (order.rightEye) {
      console.log(
        `  SO Right: SPH=${order.rightSpherical} CYL=${order.rightCylindrical} ADD=${order.rightAdd}`
      );
    }
    if (order.leftEye) {
      console.log(
        `  SO Left:  SPH=${order.leftSpherical} CYL=${order.leftCylindrical} ADD=${order.leftAdd}`
      );
    }

    if (order.isStockAvailable) {
      console.log('  OK — matcher found stock.');
      continue;
    }

    // Candidate AVAILABLE items for same lens (ignore other filters first)
    const candidates = await prisma.inventoryItem.findMany({
      where: {
        deleteStatus: false,
        status: 'AVAILABLE',
        quantity: { gt: 0 },
        lens_id: order.lens_id,
      },
      include: {
        purchaseOrder: {
          select: {
            id: true,
            poNumber: true,
            saleOrderId: true,
            saleOrder: { select: { id: true, orderNo: true, procurementType: true } },
          },
        },
        coating: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        lensType: { select: { id: true, name: true } },
      },
      take: 40,
      orderBy: { inwardDate: 'asc' },
    });

    console.log(`  AVAILABLE items same lens_id: ${candidates.length}`);
    if (candidates.length === 0) {
      console.log('  ROOT: No AVAILABLE qty>0 InventoryItem for this lens_id.');
      const other = await prisma.inventoryItem.groupBy({
        by: ['status'],
        where: { deleteStatus: false, lens_id: order.lens_id },
        _count: true,
        _sum: { quantity: true },
      });
      console.log('  Other statuses for this lens:', JSON.stringify(other));
      continue;
    }

    for (const item of candidates.slice(0, 15)) {
      const reasons = [];
      if (order.category_id && item.category_id !== order.category_id) {
        reasons.push(`category_id SO=${order.category_id} Inv=${item.category_id}`);
      }
      if (order.Type_id && item.Type_id !== order.Type_id) {
        reasons.push(`Type_id SO=${order.Type_id} Inv=${item.Type_id}`);
      }
      if (order.coating_id && item.coating_id !== order.coating_id) {
        reasons.push(`coating_id SO=${order.coating_id} Inv=${item.coating_id}`);
      }

      const poSoId = item.purchaseOrder?.saleOrderId;
      const poProc = item.purchaseOrder?.saleOrder?.procurementType;
      if (poSoId != null && poProc === 'RX' && poSoId !== order.id) {
        reasons.push(
          `RX-reserved to other SO ${item.purchaseOrder?.saleOrder?.orderNo || poSoId}`
        );
      }

      if (order.rightEye) {
        const diffs = [
          fieldDiff('SPH', order.rightSpherical, item.rightSpherical),
          fieldDiff('CYL', order.rightCylindrical, item.rightCylindrical),
          fieldDiff('ADD', order.rightAdd, item.rightAdd),
        ];
        for (const d of diffs) {
          if (!d.nullEq0) reasons.push(`right ${d.label}: SO=${d.so} Inv=${d.inv}`);
        }
        // also check if specs live only on left side of item
        if (
          item.rightSpherical == null &&
          item.leftSpherical != null &&
          norm(order.rightSpherical) === norm(item.leftSpherical)
        ) {
          reasons.push('specs stored on LEFT columns only (right-eye SO looks at right* fields)');
        }
      }

      if (order.leftEye) {
        const leftOk =
          norm(order.leftSpherical) === norm(item.leftSpherical) &&
          norm(order.leftCylindrical) === norm(item.leftCylindrical) &&
          norm(order.leftAdd) === norm(item.leftAdd);
        const rightSlotOk =
          item.leftSpherical == null &&
          norm(order.leftSpherical) === norm(item.rightSpherical) &&
          norm(order.leftCylindrical) === norm(item.rightCylindrical) &&
          norm(order.leftAdd) === norm(item.rightAdd);
        if (!leftOk && !rightSlotOk) {
          reasons.push(
            `left eye no slot match (Inv R SPH/CYL/ADD=${item.rightSpherical}/${item.rightCylindrical}/${item.rightAdd}; L=${item.leftSpherical}/${item.leftCylindrical}/${item.leftAdd})`
          );
        }
      }

      console.log(
        `  - Item#${item.id} qty=${item.quantity} tray=${item.tray_id} | R SPH/CYL/ADD=${item.rightSpherical}/${item.rightCylindrical}/${item.rightAdd} | L=${item.leftSpherical}/${item.leftCylindrical}/${item.leftAdd} | cat=${item.category_id} type=${item.Type_id} coat=${item.coating_id} | PO=${item.purchaseOrder?.poNumber || 'none'} (${poProc || 'n/a'})`
      );
      if (reasons.length === 0) {
        console.log(
          '    !!! Specs look matchable under null≡0 — check coating/category omitted or FIFO OR filter; unexpected'
        );
      } else {
        console.log(`    BLOCKED BY: ${reasons.join(' | ')}`);
      }
    }
  }

  console.log('\n' + '─'.repeat(72));
  console.log('Done.\n');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
