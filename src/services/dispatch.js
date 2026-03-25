import { apiClient } from "./apiClient";

/**
 * Fetch all dispatch-relevant orders (READY_FOR_DISPATCH + In Transit).
 * For Delivery Person role, backend auto-filters to their assigned orders.
 */
export const getDispatchOrders = async () => {
    try {
        const response = await apiClient("get", "/v1/dispatch/orders");
        return response;
    } catch (error) {
        throw new Error(error?.message || "Failed to fetch dispatch orders");
    }
};

/**
 * Bulk mark orders as Picked Up (In Transit).
 * @param {number[]} orderIds
 */
export const bulkMarkPickup = async (orderIds) => {
    try {
        const response = await apiClient("patch", "/v1/dispatch/bulk-pickup", {
            data: { orderIds },
        });
        return response;
    } catch (error) {
        throw new Error(error?.message || "Failed to mark orders as picked up");
    }
};

/**
 * Bulk mark orders as Delivered with customer signature.
 * @param {{ orderIds: number[], signature: string }} payload
 */
export const bulkMarkDelivered = async ({ orderIds, signature }) => {
    try {
        const response = await apiClient("patch", "/v1/dispatch/bulk-deliver", {
            data: { orderIds, signature },
        });
        return response;
    } catch (error) {
        throw new Error(error?.message || "Failed to mark orders as delivered");
    }
};
