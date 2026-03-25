import * as dispatchService from '../services/dispatchService.js';

/**
 * GET /api/v1/dispatch/orders
 * Returns all READY_FOR_DISPATCH + In-Transit orders.
 * Delivery Person role: filtered to their assigned orders only.
 */
export const getOrders = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const roleName = req.user?.role?.name;
    const orders = await dispatchService.getDispatchOrders(userId, roleName);
    res.json({ success: true, data: orders, message: 'Dispatch orders fetched successfully' });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/dispatch/bulk-pickup
 * Marks selected orders as "In Transit" (Picked Up).
 * Body: { orderIds: number[] }
 */
export const bulkPickup = async (req, res, next) => {
  try {
    const { orderIds } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
    }
    const userId = req.user?.id;
    const roleName = req.user?.role?.name;
    const result = await dispatchService.bulkMarkPickup(
      orderIds.map(Number),
      userId,
      roleName
    );
    res.json({
      success: true,
      data: result,
      message: `${result.count} order(s) marked as In Transit`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/v1/dispatch/bulk-deliver
 * Marks selected orders as Delivered with customer signature.
 * Body: { orderIds: number[], signature: string (base64 PNG) }
 */
export const bulkDeliver = async (req, res, next) => {
  try {
    const { orderIds, signature } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
    }
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Signature is required' });
    }
    const userId = req.user?.id;
    const roleName = req.user?.role?.name;
    const result = await dispatchService.bulkMarkDelivered(
      orderIds.map(Number),
      signature,
      userId,
      roleName
    );
    res.json({
      success: true,
      data: result,
      message: `${result.count} order(s) marked as Delivered`,
    });
  } catch (err) {
    next(err);
  }
};
