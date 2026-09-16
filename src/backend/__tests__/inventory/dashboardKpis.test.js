import { describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  groupBy: vi.fn(),
  findMany: vi.fn(),
  thresholdFindMany: vi.fn(),
  receiptFindMany: vi.fn(),
  txnFindMany: vi.fn(),
  soCount: vi.fn(),
  soFindMany: vi.fn(),
  stockFindMany: vi.fn(),
}));

vi.mock('../../config/prisma.js', () => ({
  default: {
    inventoryItem: { groupBy: mocks.groupBy, findMany: mocks.findMany },
    inventorySpecThreshold: { findMany: mocks.thresholdFindMany },
    purchaseOrderReceipt: { findMany: mocks.receiptFindMany },
    inventoryTransaction: { findMany: mocks.txnFindMany },
    saleOrder: { count: mocks.soCount, findMany: mocks.soFindMany },
    inventoryStock: { findMany: mocks.stockFindMany },
  },
}));

vi.mock('../../services/inventoryCycleCount.service.js', () => ({
  getCycleCountDashboardKpis: vi.fn().mockResolvedValue({
    sessionId: null,
    sessionNo: null,
    status: null,
    traysInScope: 0,
    traysCounted: 0,
    completionPct: 0,
    accuracyPct: null,
    matched: 0,
    variance: 0,
    pendingRecount: 0,
    shortage: 0,
    overage: 0,
    lineCount: 0,
  }),
}));

import { InventoryService, specQtyMapFromItems, sumSpecQtyMap, aggregateStockSummaryTotals } from '../../services/inventory.service.js';

const items = [
  {
    lens_id: 1,
    coating_id: 2,
    location_id: 10,
    tray_id: 20,
    quantity: 4,
    costPrice: 25,
    rightEye: true,
    leftEye: false,
    rightSpherical: '-1.00',
    rightCylindrical: '0.00',
    rightAdd: '0.00',
    leftSpherical: null,
    leftCylindrical: null,
    leftAdd: null,
  },
  {
    lens_id: 1,
    coating_id: 2,
    location_id: 10,
    tray_id: 20,
    quantity: 2,
    costPrice: 35,
    rightEye: true,
    leftEye: false,
    rightSpherical: '-1.00',
    rightCylindrical: '0.00',
    rightAdd: '0.00',
    leftSpherical: null,
    leftCylindrical: null,
    leftAdd: null,
  },
];

const inventoryService = new InventoryService();

describe('req-001 inventory dashboard KPIs (TC-2)', () => {
  it('specQty sum and stock-summary cost×qty from fixture items', () => {
    const specMap = specQtyMapFromItems(items);
    expect(sumSpecQtyMap(specMap)).toBe(6);
    // avg cost = (25+35)/2 = 30; qty 6 → 180 (not empty InventoryStock 0)
    expect(aggregateStockSummaryTotals(items).totalValue).toBe(180);
    expect(aggregateStockSummaryTotals(items).totalValue).not.toBe(0);
  });

  it('getInventoryDashboardEnhanced uses specQty units and item cost×qty even if InventoryStock is empty', async () => {
    mocks.groupBy.mockResolvedValue([{ lens_id: 1 }]);
    mocks.findMany.mockResolvedValue(items);
    mocks.thresholdFindMany.mockResolvedValue([]);
    mocks.receiptFindMany.mockResolvedValue([]);
    mocks.txnFindMany.mockResolvedValue([]);
    mocks.soCount.mockResolvedValue(0);
    mocks.soFindMany.mockResolvedValue([]);
    mocks.stockFindMany.mockResolvedValue([]);

    const dash = await inventoryService.getInventoryDashboardEnhanced({});

    expect(dash.totalStockUnits).toBe(6);
    expect(dash.specQty).toBe(6);
    expect(dash.totalValue).toBe(180);
    expect(mocks.stockFindMany).not.toHaveBeenCalled();
  });
});
