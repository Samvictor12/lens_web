import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../config/prisma.js', () => ({
  default: {
    saleOrder: {
      findUnique: vi.fn(),
    },
    inventoryItem: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    purchaseOrderReceipt: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    locationMaster: {
      findFirst: vi.fn(),
    },
    trayMaster: {
      findFirst: vi.fn(),
    },
    inventoryTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb) => {
      return await cb(mockTx);
    }),
  },
}));

const mockTx = {
  purchaseOrderReceipt: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  locationMaster: {
    findFirst: vi.fn(),
  },
  trayMaster: {
    findFirst: vi.fn(),
  },
  inventoryItem: {
    create: vi.fn(),
  },
  inventoryTransaction: {
    create: vi.fn(),
  },
};

// Mock InventoryService as a constructor/class
vi.mock('../../services/inventory.service.js', () => {
  return {
    InventoryService: class {
      generateTransactionNumber() { return 'TX-001'; }
      updateInventoryStock() { return Promise.resolve({}); }
      reserveInventoryForSale() { return Promise.resolve({}); }
    }
  };
});

// Mock saleOrderStatusService
vi.mock('../../services/saleOrderStatusService.js', () => {
  return {
    default: {
      transition: vi.fn().mockImplementation(({ toStatus }) => {
        return { id: 1, orderNo: 'SO-101', status: toStatus };
      })
    }
  };
});

import prisma from '../../config/prisma.js';
import { SaleOrderService } from '../../services/saleOrderService.js';

const svc = new SaleOrderService();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('getMatchingInventoryFIFO() with visibility updates', () => {
  it('excludes earmarked inventory items and labels matches with sourceType and poNumber', async () => {
    const saleOrderId = 1;
    const mockSaleOrder = {
      id: saleOrderId,
      rightEye: true,
      leftEye: false,
      lens_id: 10,
      Type_id: 20,
      coating_id: 30,
      category_id: 40,
      rightSpherical: 1.25,
      rightCylindrical: -0.75,
      category: { name: 'Single Vision' }
    };

    prisma.saleOrder.findUnique.mockResolvedValue(mockSaleOrder);

    // Mock physical inventory
    prisma.inventoryItem.findMany.mockResolvedValue([
      {
        id: 101,
        quantity: 5,
        costPrice: 150,
        inwardDate: new Date(),
        purchaseOrder: null
      },
      {
        id: 102,
        quantity: 2,
        costPrice: 175,
        inwardDate: new Date(),
        purchaseOrder: { id: 2, poNumber: 'PO-002', saleOrderId: 1 }
      }
    ]);

    // Mock inward queue
    prisma.purchaseOrderReceipt.findMany.mockResolvedValue([
      {
        id: 201,
        totalReceivedQty: 5,
        inwardedQty: 2,
        unitPrice: 130,
        receivedDate: new Date(),
        purchaseOrder: { id: 3, poNumber: 'PO-003', saleOrderId: null }
      }
    ]);

    const result = await svc.getMatchingInventoryFIFO(saleOrderId);

    expect(result.rightEyeMatches).toHaveLength(3);
    
    // Check stock item
    expect(result.rightEyeMatches[0].sourceType).toBe('STOCK');
    expect(result.rightEyeMatches[0].poNumber).toBeNull();
    
    // Check earmarked item
    expect(result.rightEyeMatches[1].sourceType).toBe('RX');
    expect(result.rightEyeMatches[1].poNumber).toBe('PO-002');
    
    // Check receipt item
    expect(result.rightEyeMatches[2].sourceType).toBe('STOCK');
    expect(result.rightEyeMatches[2].poNumber).toBe('PO-003');
    expect(result.rightEyeMatches[2].isReceipt).toBe(true);
  });
});
