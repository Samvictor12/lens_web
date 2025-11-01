import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class InventoryUtils {
  // Check if stock is available for a list of items
  static async checkStockAvailability(items: { lensVariantId; quantity }[]) {
    const stockStatus = await Promise.all(
      items.map(async (item) => {
        const variant = await prisma.lensVariant.findUnique({
          where: { id.lensVariantId }
        });

        if (!variant) {
          return {
            lensVariantId.lensVariantId,
            available,
            message: 'Lens variant not found'
          };
        }

        const available = !variant.isRx && variant.stock >= item.quantity;
        return {
          lensVariantId.lensVariantId,
          available,
          currentStock.stock,
          required.quantity,
          message ? 'In stock' : (variant.isRx ? 'Requires purchase order' : 'Insufficient stock')
        };
      })
    );

    return {
      allAvailable.every(item => item.available),
      items
    };
  }

  // Get stock movement history for a lens variant
  static async getStockMovementHistory(lensVariantId) {
    // Get sale order items
    const saleItems = await prisma.saleOrderItem.findMany({
      where: {
        lensVariantId
      },
      include: {
        saleOrder
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get purchase order items
    const purchaseItems = await prisma.pOItem.findMany({
      where: {
        lensVariantId
      },
      include: {
        purchaseOrder
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Combine and format movements
    const movements = [
      ...saleItems.map(item => ({
        date.createdAt,
        type: 'OUT',
        quantity.quantity,
        reference.saleOrder.id.toString(),
        referenceType: 'SALE_ORDER'
      })),
      ...purchaseItems.map(item => ({
        date.createdAt,
        type: 'IN',
        quantity.quantity,
        reference.purchaseOrder.poNumber,
        referenceType: 'PURCHASE_ORDER'
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime());

    return movements;
  }

  // Generate automatic purchase orders for low stock items
  static async generateAutoPurchaseOrders() {
    // Get all low stock non-RX items
    const lowStockItems = await prisma.lensVariant.findMany({
      where: {
        AND: [
          { stock: { lte.lensVariant.fields.minStock } },
          { isRx }
        ]
      },
      include: {
        lensType
      }
    });

    // Group items by vendor (in a real system, you'd have a vendorId on LensVariant)
    // For now, we'll create one PO for all items
    if (lowStockItems.length > 0) {
      // Get default vendor
      const defaultVendor = await prisma.vendor.findFirst();
      if (!defaultVendor) return null;

      // Calculate quantities to order
      const poItems = lowStockItems.map(item => ({
        lensVariantId.id,
        quantity.minStock * 2 - item.stock, // Order to reach 2x minimum stock
        price.price * 0.7 // Assume 30% margin, in reality this would come from vendor pricing
      }));

      // Create purchase order
      const po = await prisma.purchaseOrder.create({
        data: {
          vendorId.id,
          poNumber: `AUTO-PO-${Date.now()}`,
          status: 'PENDING',
          totalValue.reduce((sum, item) => sum + (item.price * item.quantity), 0),
          items: {
            create
          }
        },
        include: {
          items,
          vendor
        }
      });

      return po;
    }

    return null;
  }
}



