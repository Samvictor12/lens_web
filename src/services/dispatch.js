import { apiClient } from "./apiClient";

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const getDispatchDashboard = async () => {
    try {
        return await apiClient("get", "/v1/dispatch/dashboard");
    } catch (error) {
        throw new Error(error?.message || "Failed to fetch dispatch dashboard");
    }
};

// ─── Ready for Dispatch (Sale Orders) ────────────────────────────────────────

export const getReadyForDispatch = async (filters = {}) => {
    try {
        return await apiClient("get", "/v1/dispatch/ready", { params: filters });
    } catch (error) {
        throw new Error(error?.message || "Failed to fetch ready for dispatch orders");
    }
};

// ─── Create Dispatch Record ───────────────────────────────────────────────────

export const createDispatch = async (payload) => {
    try {
        return await apiClient("post", "/v1/dispatch", { data: payload });
    } catch (error) {
        throw new Error(error?.message || "Failed to create dispatch record");
    }
};

// ─── Dispatch List ────────────────────────────────────────────────────────────

export const getDispatchList = async (filters = {}) => {
    try {
        return await apiClient("get", "/v1/dispatch/list", { params: filters });
    } catch (error) {
        throw new Error(error?.message || "Failed to fetch dispatch list");
    }
};

// ─── Update Dispatch Record ───────────────────────────────────────────────────

export const updateDispatch = async (dispatchId, payload) => {
    try {
        return await apiClient("patch", `/v1/dispatch/${dispatchId}`, { data: payload });
    } catch (error) {
        throw new Error(error?.message || "Failed to update dispatch record");
    }
};

// ─── Update Dispatch Status ───────────────────────────────────────────────────

/**
 * @param {number} dispatchId
 * @param {'PICKUP'|'DELIVERED'|'ON_HOLD'} action
 * @param {string|null} signature - base64 PNG, required for DELIVERED
 */
export const updateDispatchStatus = async (dispatchId, action, signature = null, options = {}) => {
    try {
        return await apiClient("patch", `/v1/dispatch/${dispatchId}/status`, {
            data: { action, signature, ...(options.mine ? { mine: true } : {}) },
        });
    } catch (error) {
        throw new Error(error?.message || "Failed to update dispatch status");
    }
};

// ─── Legacy ───────────────────────────────────────────────────────────────────

export const getDispatchOrders = async () => {
    try {
        return await apiClient("get", "/v1/dispatch/orders");
    } catch (error) {
        throw new Error(error?.message || "Failed to fetch dispatch orders");
    }
};

export const bulkMarkPickup = async (orderIds) => {
    try {
        return await apiClient("patch", "/v1/dispatch/bulk-pickup", { data: { orderIds } });
    } catch (error) {
        throw new Error(error?.message || "Failed to mark orders as picked up");
    }
};

export const bulkMarkDelivered = async ({ orderIds, signature }) => {
    try {
        return await apiClient("patch", "/v1/dispatch/bulk-deliver", { data: { orderIds, signature } });
    } catch (error) {
        throw new Error(error?.message || "Failed to mark orders as delivered");
    }
};

