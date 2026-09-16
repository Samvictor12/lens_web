import { describe, it, expect } from 'vitest';
import { InventoryService } from '../../services/inventory.service.js';
import {
  calendarMonthWindow,
  parseTopLowSellingDays,
  aggregateMonthInOut,
  aggregateSpecSales,
  rankTopLowSelling,
  shareOfTenPct,
  fifoPendingInwards,
  fifoSaleOrders,
  countDistinctNonNullIds,
} from '../../services/inventory.service.js';
import {
  buildBulkSelectionFromSpecs,
  selectedSpecsShareOneLens,
  dateRangeToParams,
  queueShareBars,
  groupSpecAlertsByProduct,
  productGroupSelectState,
  toggleProductSpecSelection,
  specAlertRowKey,
} from '../../../pages/Inventory/inventoryDashboardUtils.js';

const inventoryService = new InventoryService();

describe('req-001 inventory dashboard', () => {
  it('TC-2 month window is 1st 00:00 through now; inward/outward use abs qty+value', () => {
    const now = new Date(2026, 8, 9, 12, 30, 0);
    const { start, end } = calendarMonthWindow(now);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8);
    expect(start.getDate()).toBe(1);
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    expect(end).toBe(now);

    const agg = aggregateMonthInOut([
      { type: 'INWARD_PO', quantity: 4, totalValue: 400 },
      { type: 'INWARD_DIRECT', quantity: -2, totalValue: -50 },
      { type: 'OUTWARD_SALE', quantity: -3, totalValue: -90 },
      { type: 'OUTWARD_RETURN', quantity: 1, totalValue: 20 },
      { type: 'TRANSFER', quantity: 99, totalValue: 999 },
    ]);
    expect(agg).toEqual({
      monthInwardQty: 6,
      monthOutwardQty: 4,
      monthInwardValue: 450,
      monthOutwardValue: 110,
    });
  });

  it('TC-3 High is OVER (max set and specQty > maxQty)', () => {
    expect(inventoryService.classifySpecAlert(0, 5, 20)).toBe('out');
    expect(inventoryService.classifySpecAlert(3, 5, 20)).toBe('low');
    expect(inventoryService.classifySpecAlert(21, 5, 20)).toBe('over');
    expect(inventoryService.classifySpecAlert(10, 5, 20)).toBeNull();
    expect(inventoryService.classifySpecAlert(50, 5, null)).toBeNull();
  });

  it('TC-4 Raise PO uses minQty per spec and blocks mixed lens_id', () => {
    const same = [
      { lens_id: 7, sph: '-1.00', cyl: '-0.50', add: '0.00', minQty: 4 },
      { lens_id: 7, sph: '0.00', cyl: '0.00', add: '0.00', minQty: 2 },
    ];
    expect(selectedSpecsShareOneLens(same)).toBe(true);
    const bulk = buildBulkSelectionFromSpecs(same, 'Single Vision');
    expect(bulk.selections['sph_-1_cyl_-0.5'].quantity).toBe(4);
    expect(bulk.selections['sph_0_cyl_0'].quantity).toBe(2);

    const mixed = [...same, { lens_id: 9, sph: '1.00', cyl: '0.00', add: '0.00', minQty: 3 }];
    expect(selectedSpecsShareOneLens(mixed)).toBe(false);
  });

  it('TC-5 spec-grain OUTWARD_SALE, 30/60/90 days, share-of-10, top high→low / low low→high', () => {
    expect(parseTopLowSellingDays(60)).toBe(60);
    expect(parseTopLowSellingDays('90')).toBe(90);
    expect(parseTopLowSellingDays(30)).toBe(30);
    expect(parseTopLowSellingDays(45)).toBe(30);

    const txns = [
      {
        quantity: -5,
        inventoryItem: {
          lens_id: 1,
          rightEye: true,
          leftEye: false,
          rightSpherical: '-1.00',
          rightCylindrical: '-0.50',
          rightAdd: '',
          lensProduct: { lens_name: 'Alpha', product_code: 'A1' },
        },
      },
      {
        quantity: -5,
        inventoryItem: {
          lens_id: 1,
          rightEye: true,
          leftEye: false,
          rightSpherical: '-1',
          rightCylindrical: '-0.5',
          rightAdd: null,
          lensProduct: { lens_name: 'Alpha', product_code: 'A1' },
        },
      },
      {
        quantity: -2,
        inventoryItem: {
          lens_id: 1,
          rightEye: true,
          leftEye: false,
          rightSpherical: '0.00',
          rightCylindrical: '0.00',
          rightAdd: '0.00',
          lensProduct: { lens_name: 'Alpha', product_code: 'A1' },
        },
      },
      {
        quantity: -8,
        inventoryItem: {
          lens_id: 2,
          rightEye: true,
          leftEye: false,
          rightSpherical: '1.00',
          rightCylindrical: '0.00',
          rightAdd: '0.00',
          lensProduct: { lens_name: 'Beta', product_code: 'B1' },
        },
      },
    ];

    const bySpec = aggregateSpecSales(txns);
    expect(Object.keys(bySpec)).toHaveLength(3);
    const aMinus = bySpec['1|-1.00|-0.50|0.00'];
    expect(aMinus.unitsSold).toBe(10);
    expect(aMinus.sph).toBe('-1.00');
    expect(aMinus.cyl).toBe('-0.50');

    const { top10, low10 } = rankTopLowSelling(bySpec, 10);
    expect(top10[0].unitsSold).toBe(10);
    expect(top10[0].lens_id).toBe(1);
    expect(low10[0].unitsSold).toBe(2);
    expect(low10.map((r) => r.unitsSold)).toEqual([2, 8, 10]);

    const shareSum = top10.reduce((s, r) => s + shareOfTenPct(r.unitsSold, top10), 0);
    expect(shareSum).toBeCloseTo(1);
    expect(shareOfTenPct(10, top10)).toBeCloseTo(10 / 20);
  });

  it('TC-6 FIFO pending inwards and SO queue are oldest-first, max 10', () => {
    const receipts = [
      { id: 3, totalReceivedQty: 5, inwardedQty: 1, createdAt: '2026-09-08', receivedDate: '2026-09-08', receiptNumber: 'R3', purchaseOrder: { poNumber: 'PO-3' } },
      { id: 1, totalReceivedQty: 4, inwardedQty: 0, createdAt: '2026-09-01', receivedDate: '2026-09-01', receiptNumber: 'R1', purchaseOrder: { poNumber: 'PO-1' } },
      { id: 2, totalReceivedQty: 2, inwardedQty: 2, createdAt: '2026-08-01', receivedDate: '2026-08-01', receiptNumber: 'R2', purchaseOrder: { poNumber: 'PO-2' } },
      { id: 4, totalReceivedQty: 9, inwardedQty: 0, createdAt: '2026-09-02', receivedDate: '2026-09-02', receiptNumber: 'R4', purchaseOrder: { poNumber: 'PO-4' } },
    ];
    const inwardFifo = fifoPendingInwards(receipts, 10);
    expect(inwardFifo.map((r) => r.id)).toEqual([1, 4, 3]);
    expect(inwardFifo[0].pendingQty).toBe(4);
    expect(inwardFifo[0].poNumber).toBe('PO-1');

    const orders = Array.from({ length: 12 }, (_, i) => ({
      id: 20 - i,
      orderNo: `SO-${20 - i}`,
      createdAt: new Date(2026, 0, 12 - i),
      status: 'DRAFT',
      customer: { name: 'C' },
      lensProduct: { lens_name: 'L' },
    }));
    const soFifo = fifoSaleOrders(orders, 10);
    expect(soFifo).toHaveLength(10);
    expect(soFifo[0].orderNo).toBe('SO-9');
    expect(soFifo[9].orderNo).toBe('SO-18');
    for (let i = 1; i < soFifo.length; i++) {
      expect(new Date(soFifo[i].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(soFifo[i - 1].createdAt).getTime()
      );
    }
  });

  it('TC-7 parse days stays 30|60|90 and godown-scoped helpers keep STOCK vs RX distinct keys', () => {
    expect(parseTopLowSellingDays('STOCK')).toBe(30);
    const stockTx = aggregateSpecSales([
      {
        quantity: -1,
        inventoryItem: {
          lens_id: 5,
          rightSpherical: '0',
          rightCylindrical: '0',
          rightAdd: '0',
          lensProduct: { lens_name: 'S' },
        },
      },
    ]);
    const rxTx = aggregateSpecSales([
      {
        quantity: -3,
        inventoryItem: {
          lens_id: 5,
          rightSpherical: '0',
          rightCylindrical: '0',
          rightAdd: '0',
          lensProduct: { lens_name: 'S' },
        },
      },
    ]);
    expect(stockTx['5|0.00|0.00|0.00'].unitsSold).toBe(1);
    expect(rxTx['5|0.00|0.00|0.00'].unitsSold).toBe(3);
  });

  it('locationCount and trayCount count distinct non-null ids', () => {
    const rows = [
      { location_id: 1, tray_id: 10 },
      { location_id: 1, tray_id: 11 },
      { location_id: null, tray_id: 10 },
      { location_id: 2, tray_id: null },
      { location_id: 2, tray_id: 12 },
    ];
    expect(countDistinctNonNullIds(rows, 'location_id')).toBe(2);
    expect(countDistinctNonNullIds(rows, 'tray_id')).toBe(3);
    expect(countDistinctNonNullIds([], 'location_id')).toBe(0);
    expect(countDistinctNonNullIds([{ location_id: null, tray_id: null }], 'location_id')).toBe(0);
  });

  it('queue share bars use inward+SO denominator and sort by pct desc', () => {
    expect(queueShareBars(0, 0)).toEqual([]);
    const bars = queueShareBars(3, 1);
    expect(bars).toHaveLength(2);
    expect(bars[0].key).toBe('inward');
    expect(bars[0].pct).toBeCloseTo(0.75);
    expect(bars[0].tab).toBe('inward');
    expect(bars[1].key).toBe('so');
    expect(bars[1].pct).toBeCloseTo(0.25);
    expect(bars[1].tab).toBe('requestQueue');
    const soHeavy = queueShareBars(1, 3);
    expect(soHeavy[0].key).toBe('so');
    expect(soHeavy[0].pct).toBeCloseTo(0.75);
  });

  it('dateRangeToParams maps 7/15/30/60/90 days to local startDate/endDate', () => {
    const now = new Date(2026, 8, 9, 12, 0, 0);
    expect(dateRangeToParams('7d', now)).toEqual({ startDate: '2026-09-02', endDate: '2026-09-09' });
    expect(dateRangeToParams('15d', now)).toEqual({ startDate: '2026-08-25', endDate: '2026-09-09' });
    expect(dateRangeToParams('30d', now)).toEqual({ startDate: '2026-08-10', endDate: '2026-09-09' });
    expect(dateRangeToParams('60d', now)).toEqual({ startDate: '2026-07-11', endDate: '2026-09-09' });
    expect(dateRangeToParams('90d', now)).toEqual({ startDate: '2026-06-11', endDate: '2026-09-09' });
    expect(dateRangeToParams('unknown', now)).toEqual({ startDate: '2026-08-10', endDate: '2026-09-09' });
  });

  it('groups spec alerts by product; selecting a product selects all its specs only', () => {
    const rows = [
      { id: 1, lens_id: 10, sph: '0.00', cyl: '-0.50', add: '0.00', lensProduct: { lens_name: 'Alpha', product_code: 'A1' } },
      { id: 2, lens_id: 10, sph: '0.25', cyl: '0.00', add: '0.00', lensProduct: { lens_name: 'Alpha', product_code: 'A1' } },
      { id: 3, lens_id: 20, sph: '1.00', cyl: '0.00', add: '0.00', lensProduct: { lens_name: 'Beta', product_code: 'B1' } },
    ];
    const groups = groupSpecAlertsByProduct(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0].lens_id).toBe(10);
    expect(groups[0].specs).toHaveLength(2);
    expect(groups[1].lens_id).toBe(20);

    const alphaKeys = groups[0].specs.map(specAlertRowKey);
    const selected = toggleProductSpecSelection(new Set(), groups[0].specs, true);
    expect([...selected].sort()).toEqual([...alphaKeys].sort());
    expect(productGroupSelectState(selected, groups[0].specs)).toEqual({ checked: true, indeterminate: false });
    expect(productGroupSelectState(selected, groups[1].specs)).toEqual({ checked: false, indeterminate: false });

    const cleared = toggleProductSpecSelection(selected, groups[0].specs, false);
    expect(cleared.size).toBe(0);
  });
});
