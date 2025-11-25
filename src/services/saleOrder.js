import { apiClient } from "./apiClient";

/**
 * Get all sale orders with pagination, search, and filters
 */
export const getSaleOrders = async (
    page = 1,
    limit = 10,
    search = "",
    filters = {},
    sortField = "createdAt",
    sortDirection = "desc"
) => {
    try {
        const params = {
            page,
            limit,
            search,
            sortField,
            sortDirection,
            ...filters,
        };

        const response = await apiClient("get", "/sale-orders", { params });
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch sale orders"
        );
    }
};

/**
 * Get single sale order by ID
 */
export const getSaleOrderById = async (id) => {
    try {
        const response = await apiClient("get", `/sale-orders/${id}`);
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch sale order details"
        );
    }
};

/**
 * Create new sale order
 */
export const createSaleOrder = async (data) => {
    try {
        const response = await apiClient("post", "/sale-orders", { data });
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to create sale order"
        );
    }
};

/**
 * Update existing sale order
 */
export const updateSaleOrder = async (id, data) => {
    try {
        const response = await apiClient("put", `/sale-orders/${id}`, { data });
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to update sale order"
        );
    }
};

/**
 * Delete sale order
 */
export const deleteSaleOrder = async (id) => {
    try {
        const response = await apiClient("delete", `/sale-orders/${id}`);
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to delete sale order"
        );
    }
};

/**
 * Update sale order status only (for status transition buttons)
 */
export const updateSaleOrderStatus = async (id, status) => {
    try {
        const response = await apiClient("patch", `/sale-orders/${id}/status`, {
            data: { status },
        });
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to update sale order status"
        );
    }
};

/**
 * Get lens price ID from LensPriceMaster based on lens and coating
 */
export const getLensPriceId = async (lensId, coatingId) => {
    try {
        // Get all prices for the lens
        const response = await apiClient("get", `/v1/lens-products/${lensId}/prices`);

        if (response.success && response.data) {
            // Find the price entry that matches the coating
            const priceEntry = response.data.find(
                (price) => price.coating_id === coatingId
            );

            if (priceEntry) {
                return {
                    success: true,
                    data: priceEntry,
                };
            } else {
                return {
                    success: false,
                    message: "No price found for this lens and coating combination",
                };
            }
        }

        return {
            success: false,
            message: "No prices available for this lens",
        };
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens price"
        );
    }
};

/**
 * Calculate product cost with customer Credit Limit
 */
export const checkCreditLimit = async (data) => {
    try {
        const customer = await apiClient("get", "/customer-master/" + data);
        if (customer.success && customer.data) {
            return customer.data.outstanding_credit;
        } else {
            return null;
        }
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to calculate product cost"
        );
    }
};


/**
 * Calculate product cost with customer discount
 */
export const calculateProductCost = async (data) => {
    try {
        const response = await apiClient("post", "/v1/lens-products/calculate-cost", {
            data: {
                customer_id: data.customer_id,
                lensPrice_id: data.lensPrice_id,
                quantity: data.quantity || 1,
            }
        });
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to calculate product cost"
        );
    }
};

/**
 * Get dropdown options for customers
 */
export const getCustomersDropdown = async () => {
    try {
        const response = await apiClient("get", "/customer-master/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch customers"
        );
    }
};

/**
 * Get dropdown options for lens products
 */
export const getLensProductsDropdown = async () => {
    try {
        const response = await apiClient("get", "/v1/lens-products/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens products"
        );
    }
};

/**
 * Get dropdown options for lens categories
 */
export const getLensCategoriesDropdown = async () => {
    try {
        const response = await apiClient("get", "/v1/lens-categories/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens categories"
        );
    }
};

/**
 * Get dropdown options for lens types
 */
export const getLensTypesDropdown = async () => {
    try {
        const response = await apiClient("get", "/v1/lens-types/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens types"
        );
    }
};

/**
 * Get dropdown options for lens dia
 */
export const getLensDiaDropdown = async () => {
    try {
        const response = await apiClient("get", "/lens-dias/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens dia options"
        );
    }
};

/**
 * Get dropdown options for lens fittings
 */
export const getLensFittingsDropdown = async () => {
    try {
        const response = await apiClient("get", "/lens-fittings/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens fittings"
        );
    }
};

/**
 * Get dropdown options for lens coatings
 */
export const getLensCoatingsDropdown = async () => {
    try {
        const response = await apiClient("get", "/v1/lens-coatings/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens coatings"
        );
    }
};

/**
 * Get dropdown options for lens tintings
 */
export const getLensTintingsDropdown = async () => {
    try {
        const response = await apiClient("get", "/v1/lens-tintings/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch lens tintings"
        );
    }
};

/**
 * Get dropdown options for users (for assigned person)
 */
export const getUsersDropdown = async () => {
    try {
        const response = await apiClient("get", "/user-master/dropdown");
        return response;
    } catch (error) {
        throw new Error(
            error.response?.data?.message || "Failed to fetch users"
        );
    }
};
