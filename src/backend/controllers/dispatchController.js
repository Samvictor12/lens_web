import * as dispatchService from '../services/dispatchService.js';

// GET /api/v1/dispatch/dashboard
export const getDashboard = async (req, res, next) => {
  try {
    const data = await dispatchService.getDispatchDashboard(req.user, req.query);
    res.json({ success: true, data, message: 'Dashboard fetched successfully' });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/dispatch/ready
export const getReady = async (req, res, next) => {
  try {
    const orders = await dispatchService.getReadyForDispatch(req.user, req.query);
    res.json({ success: true, data: orders, message: 'Ready for dispatch orders fetched' });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/dispatch
export const createDispatch = async (req, res, next) => {
  try {
    const dispatch = await dispatchService.createDispatch(req.body, req.user?.id);
    res.status(201).json({ success: true, data: dispatch, message: 'Dispatch record created' });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/dispatch/list
export const getDispatchList = async (req, res, next) => {
  try {
    const result = await dispatchService.getDispatchList(req.user, req.query);
    res.json({ success: true, ...result, message: 'Dispatch list fetched' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/dispatch/:id
export const updateDispatch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const dispatch = await dispatchService.updateDispatch(id, req.body, req.user);
    res.json({ success: true, data: dispatch, message: 'Dispatch record updated' });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/dispatch/:id/status
export const updateDispatchStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action, signature, mine } = req.body;
    if (!action) return res.status(400).json({ success: false, message: 'action is required' });
    const dispatch = await dispatchService.updateDispatchStatus(
      id,
      action,
      signature,
      req.user,
      { mine: mine ?? req.query?.mine }
    );
    res.json({ success: true, data: dispatch, message: `Dispatch ${action} successful` });
  } catch (err) {
    next(err);
  }
};

// ─── Legacy endpoints ─────────────────────────────────────────────────────────

export const getOrders = async (req, res, next) => {
  try {
    const orders = await dispatchService.getDispatchOrders(req.user, req.query);
    res.json({ success: true, data: orders, message: 'Dispatch orders fetched successfully' });
  } catch (err) {
    next(err);
  }
};

export const bulkPickup = async (req, res, next) => {
  try {
    const { orderIds, mine } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
    }
    const result = await dispatchService.bulkMarkPickup(orderIds.map(Number), req.user, { mine });
    res.json({ success: true, data: result, message: `${result.count} order(s) marked as In Transit` });
  } catch (err) {
    next(err);
  }
};

export const bulkDeliver = async (req, res, next) => {
  try {
    const { orderIds, signature, mine } = req.body;
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'orderIds must be a non-empty array' });
    }
    if (!signature) {
      return res.status(400).json({ success: false, message: 'Signature is required' });
    }
    const result = await dispatchService.bulkMarkDelivered(orderIds.map(Number), signature, req.user, { mine });
    res.json({ success: true, data: result, message: `${result.count} order(s) marked as Delivered` });
  } catch (err) {
    next(err);
  }
};
