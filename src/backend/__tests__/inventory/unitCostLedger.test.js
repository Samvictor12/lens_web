import { describe, it, expect } from 'vitest';
import { InventoryService } from '../../services/inventory.service.js';
import {
  validateCreateInventoryTransaction,
  validateQueryParams,
} from '../../dto/inventoryDto.js';
import {
  resolveBilledPoUnitPrice,
  syncInwardPoPricesFromVendorBill,
  pickOpenSourceUnits,
  decrementSourceUnit,
  sourceLedgerFields,
  nonSourceLedgerFields,
} from '../../services/inventoryUnitCostLedger.js';
import { transactionTypeOptions } from '../../../pages/Inventory/Inventory.constants.js';

const inventoryService = new InventoryService();

describe('req-001 unit-cost inventory ledger', () => {
  it('TC-7 DTO and operator options reject Adjustment; GET filter still allows ADJUSTMENT', () => {
    const validation = validateCreateInventoryTransaction({
      type: 'ADJUSTMENT',
      inventoryItemId: 1,
      quantity: 1,
      createdBy: 1,
    });
    expect(validation.isValid).toBe(false);
    expect(validation.errors.some((e) => e.field === 'type')).toBe(true);
    expect(transactionTypeOptions.some((o) => o.value === 'ADJUSTMENT')).toBe(false);

    const getFilter = validateQueryParams({ type: 'ADJUSTMENT' });
    expect(getFilter.isValid).toBe(true);
    expect(getFilter.data.type).toBe('ADJUSTMENT');
  });

  it('TC-3 Direct inward ledger fields are OPEN with remainingQty=qty', () => {
    expect(sourceLedgerFields(4)).toEqual({ remainingQty: 4, status: 'OPEN' });
  });

  it('TC-2 PO receipt does not lock unitPrice when the PO is unbilled', async () => {
    const client = {
      inventoryTransaction: {
        findFirst: async () => null,
        aggregate: async () => ({ _sum: { quantity: 0 } }),
      },
      vendorInvoiceItem: { findFirst: async () => null },
    };
    const billed = await resolveBilledPoUnitPrice(client, 42, 3);
    expect(billed).toBeNull();
    expect(sourceLedgerFields(3)).toEqual({ remainingQty: 3, status: 'OPEN' });
  });

  it('TC-4 Outward qty N tags N FIFO units; remainingQty 0 → CONSUMED', async () => {
    const rows = [
      {
        id: 11,
        remainingQty: 3,
        status: 'OPEN',
        createdAt: new Date('2026-01-01'),
        type: 'INWARD_DIRECT',
        unitPrice: 40,
      },
    ];
    const client = {
      inventoryTransaction: {
        findMany: async () => rows,
        findUnique: async ({ where }) => rows.find((r) => r.id === where.id),
        update: async ({ where, data }) => {
          Object.assign(rows.find((r) => r.id === where.id), data);
          return data;
        },
      },
    };
    const picks = await pickOpenSourceUnits(client, 99, 3);
    expect(picks).toHaveLength(3);
    expect(picks.every((p) => p.id === 11)).toBe(true);
    for (const pick of picks) {
      await decrementSourceUnit(client, pick);
    }
    expect(rows[0].remainingQty).toBe(0);
    expect(rows[0].status).toBe('CONSUMED');
    expect(nonSourceLedgerFields()).toEqual({ remainingQty: 0 });
  });

  it('TC-5 Transfer consumes tagged source; new rows OPEN remainingQty 1', async () => {
    const rows = [
      {
        id: 21,
        remainingQty: 2,
        status: 'OPEN',
        createdAt: new Date('2026-01-01'),
        type: 'INWARD_PO',
        unitPrice: 55,
      },
    ];
    const client = {
      inventoryTransaction: {
        findMany: async () => rows,
        findUnique: async ({ where }) => rows.find((r) => r.id === where.id),
        update: async ({ where, data }) => {
          Object.assign(rows.find((r) => r.id === where.id), data);
          return data;
        },
      },
    };
    const picks = await pickOpenSourceUnits(client, 7, 2);
    expect(picks).toHaveLength(2);
    for (const pick of picks) {
      await decrementSourceUnit(client, pick);
    }
    expect(rows[0].status).toBe('CONSUMED');
    expect(sourceLedgerFields(1)).toEqual({ remainingQty: 1, status: 'OPEN' });
  });

  it('TC-6 Vendor bill helper sets INWARD_PO unitPrice from subtotal / inward qty', async () => {
    const itemUpdates = [];
    const txUpdates = [];
    const client = {
      inventoryTransaction: {
        findMany: async () => [
          { id: 1, quantity: 2, inventoryItemId: 10 },
          { id: 2, quantity: 2, inventoryItemId: 11 },
        ],
        findFirst: async () => ({ unitPrice: 20 }),
        aggregate: async () => ({ _sum: { quantity: 4 } }),
        update: async ({ where, data }) => {
          txUpdates.push({ id: where.id, ...data });
          return data;
        },
      },
      inventoryItem: {
        update: async ({ where, data }) => {
          itemUpdates.push({ id: where.id, ...data });
          return data;
        },
      },
      vendorInvoiceItem: {
        findFirst: async () => ({ subtotalAmount: 80 }),
      },
    };

    const sync = await syncInwardPoPricesFromVendorBill(client, 99, 80);
    expect(sync.unitPrice).toBe(20);
    expect(sync.updated).toBe(2);
    expect(txUpdates.every((u) => u.unitPrice === 20)).toBe(true);
    expect(txUpdates[0].totalValue).toBe(40);
    expect(itemUpdates.every((u) => u.costPrice === 20)).toBe(true);

    const laterPrice = await resolveBilledPoUnitPrice(client, 99, 1);
    expect(laterPrice).toBe(20);
  });

  it('TC-7 POST transactions rejects ADJUSTMENT; QC reuse writes INWARD_DIRECT', async () => {
    await expect(
      inventoryService.createInventoryTransaction({
        type: 'ADJUSTMENT',
        inventoryItemId: 1,
        quantity: 1,
        createdBy: 1,
      })
    ).rejects.toMatchObject({ statusCode: 400, code: 'ADJUSTMENT_NOT_ALLOWED' });
  });
});
