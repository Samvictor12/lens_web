import prisma from "../config/prisma.js";
import { APIError } from "../middleware/errorHandler.js";
import { randomUUID } from "crypto";
import { postTransaction } from "./accountingService.js";

/**
 * Customer Master Service
 * Handles all database operations for Customer Master management
 */
export class CustomerMasterService {
  /**
   * Create a new customer master
   * @param {Object} customerData - Customer master data
   * @returns {Promise<Object>} Created customer master
   */
  async createCustomerMaster(customerData) {
    console.log("customerData", customerData);

    try {
      // Check if email already exists (if provided)
      if (customerData.email) {
        const existingCustomer = await prisma.customer.findFirst({
          where: { email: customerData.email, delete_status: false },
        });
        console.log("existingCustomer", existingCustomer);

        if (existingCustomer) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
      }

      // Check if customer code already exists
      if (customerData.code) {
        const existingCode = await prisma.customer.findUnique({
          where: { code: customerData.code },
        });

        if (existingCode) {
          throw new APIError(
            "Customer code already exists",
            409,
            "DUPLICATE_CODE"
          );
        }
      }

      // Create the customer master + its subsidiary ledger atomically
      const customerMaster = await prisma.$transaction(async (tx) => {
        // 1. Create the customer row first (ledgerId not known yet)
        const created = await tx.customer.create({
          data: {
            name: customerData.name,
            code: customerData.code,
            shopname: customerData.shopname,
            phone: customerData.phone,
            alternatephone: customerData.alternatephone,
            email: customerData.email,
            address: customerData.address,
            city: customerData.city,
            state: customerData.state,
            pincode: customerData.pincode,
            businessCategory_id: customerData.businessCategory_id,
            gstin: customerData.gstin,
            credit_limit: customerData.credit_limit,
            outstanding_credit: customerData.outstanding_credit,
            sale_person_id: customerData.sale_person_id,
            delivery_person_id: customerData.delivery_person_id,
            active_status: customerData.active_status,
            delete_status: customerData.delete_status || false,
            notes: customerData.notes,
            createdBy: customerData.createdBy,
          },
        });

        // 2. Resolve the parent control ledger (Accounts Receivable)
        const parentLedger = await tx.ledger.findFirst({
          where: { ledgerCode: 'AC-1003', delete_status: false },
        });
        if (!parentLedger) {
          throw new APIError(
            'System ledger AC-1003 not found. Run npm run db:seed:ledgers.',
            500,
            'LEDGER_NOT_FOUND'
          );
        }

        // 3. Create the customer's own subsidiary ledger
        const childLedger = await tx.ledger.create({
          data: {
            ledgerCode: `AC-1003-C${created.id}`,
            ledgerName: `${created.name} (Customer AR)`.slice(0, 191),
            ledgerType: 'ASSET',
            parentLedgerId: parentLedger.id,
            isSystemLedger: false,
            openingBalance: 0,
            currentBalance: 0,
            createdBy: customerData.createdBy,
          },
        });

        // 4. Link the ledger back to the customer
        await tx.customer.update({
          where: { id: created.id },
          data: { ledgerId: childLedger.id },
        });

        // 5. Re-fetch with all includes, including the new ledger
        return tx.customer.findUnique({
          where: { id: created.id },
          include: {
            usercreate: {
              select: { id: true, name: true, email: true },
            },
            userupdate: {
              select: { id: true, name: true, email: true },
            },
            category: {
              select: { id: true, name: true },
            },
            salePerson: {
              select: { id: true, name: true, usercode: true },
            },
            deliveryPerson: {
              select: { id: true, name: true, usercode: true },
            },
            ledger: true,
          },
        });
      });

      return customerMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error creating customer master:", error);
      throw new APIError(
        "Failed to create customer master",
        500,
        "CREATE_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Get paginated list of customer masters with filtering
   * @param {Object} queryParams - Query parameters for filtering and pagination
   * @returns {Promise<Object>} Paginated customer masters list
   */
  async getCustomerMasters(queryParams) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy = "createdAt",
        sortOrder = "desc",
        ...filters
      } = queryParams;

      // Build where clause for filtering
      const where = {};

      if (filters.name) {
        where.name = {
          contains: filters.name,
          mode: "insensitive",
        };
      }

      if (filters.code) {
        where.code = {
          contains: filters.code,
          mode: "insensitive",
        };
      }

      if (filters.city) {
        where.city = {
          contains: filters.city,
          mode: "insensitive",
        };
      }

      if (filters.businessCategory_id) {
        where.businessCategory_id = filters.businessCategory_id;
      }

      if (filters.email) {
        where.email = {
          contains: filters.email,
          mode: "insensitive",
        };
      }

      if (filters.phone) {
        where.phone = {
          contains: filters.phone,
        };
      }

      if (filters.active_status !== undefined) {
        where.active_status = filters.active_status;
      }

      // Always filter out deleted records unless specifically requested
      if (!filters.includeDeleted) {
        where.delete_status = false;
      }

      // Calculate offset
      const offset = (page - 1) * limit;

      // Get total count for pagination
      const total = await prisma.customer.count({ where });

      // Get customer masters with pagination
      const customerMasters = await prisma.customer.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          salePerson: {
            select: { id: true, name: true, usercode: true },
          },
          deliveryPerson: {
            select: { id: true, name: true, usercode: true },
          },
        },
      });

      // Calculate pagination info
      const pages = Math.ceil(total / limit);

      return {
        data: customerMasters,
        pagination: {
          page,
          limit,
          total,
          pages,
        },
      };
    } catch (error) {
      console.error("Error fetching customer masters:", error);
      throw new APIError(
        "Failed to fetch customer masters",
        500,
        "FETCH_CUSTOMERS_ERROR"
      );
    }
  }

  /**
   * Get customer master by ID
   * @param {number} id - Customer master ID
   * @returns {Promise<Object>} Customer master details
   */
  async getCustomerMasterById(id) {
    try {
      const customerMaster = await prisma.customer.findUnique({
        where: { id },
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          salePerson: {
            select: { id: true, name: true, usercode: true },
          },
          deliveryPerson: {
            select: { id: true, name: true, usercode: true },
          },
          _count: {
            select: {
              saleOrders: true,
            },
          },
          ledger: { select: { id: true, ledgerCode: true, ledgerName: true, currentBalance: true } },
        },
      });

      if (!customerMaster) {
        throw new APIError(
          "Customer master not found",
          404,
          "CUSTOMER_MASTER_NOT_FOUND"
        );
      }

      return customerMaster;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching customer master by ID:", error);
      throw new APIError(
        "Failed to fetch customer master",
        500,
        "FETCH_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Get minimal customer data (id, code, name only) for price mapping
   * @param {number} id - Customer master ID
   * @returns {Promise<Object>} Minimal customer data
   */
  async getMinimalCustomerById(id) {
    try {
      const customer = await prisma.customer.findUnique({
        where: {
          id,
          delete_status: false
        },
        select: {
          id: true,
          code: true,
          name: true,
        },
      });

      if (!customer) {
        throw new APIError(
          "Customer not found",
          404,
          "CUSTOMER_NOT_FOUND"
        );
      }

      return customer;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error fetching minimal customer data:", error);
      throw new APIError(
        "Failed to fetch customer data",
        500,
        "FETCH_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Update customer master
   * @param {number} id - Customer master ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer master
   */
  async updateCustomerMaster(id, updateData) {
    try {
      // Check if customer master exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
      });

      if (!existingCustomer) {
        throw new APIError(
          "Customer master not found",
          404,
          "CUSTOMER_MASTER_NOT_FOUND"
        );
      }

      // Check for duplicate email if being updated
      if (updateData.email && updateData.email !== existingCustomer.email) {
        const duplicateEmail = await prisma.customer.findFirst({
          where: {
            email: updateData.email,
            id: { not: id },
          },
        });

        if (duplicateEmail) {
          throw new APIError("Email already exists", 409, "DUPLICATE_EMAIL");
        }
      }

      // Update the customer master
      const updatedCustomer = await prisma.customer.update({
        where: { id },
        data: updateData,
        include: {
          usercreate: {
            select: { id: true, name: true, email: true },
          },
          userupdate: {
            select: { id: true, name: true, email: true },
          },
          category: {
            select: { id: true, name: true },
          },
          salePerson: {
            select: { id: true, name: true, usercode: true },
          },
          deliveryPerson: {
            select: { id: true, name: true, usercode: true },
          },
        },
      });

      return updatedCustomer;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error updating customer master:", error);
      throw new APIError(
        "Failed to update customer master",
        500,
        "UPDATE_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Delete customer master (soft delete)
   * @param {number} id - Customer master ID
   * @param {number} updatedBy - User ID performing the deletion
   * @returns {Promise<boolean>} Deletion success
   */
  async deleteCustomerMaster(id, updatedBy) {
    try {
      // Check if customer master exists
      const existingCustomer = await prisma.customer.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              saleOrders: true,
            },
          },
        },
      });

      if (!existingCustomer) {
        throw new APIError(
          "Customer master not found",
          404,
          "CUSTOMER_MASTER_NOT_FOUND"
        );
      }

      if (existingCustomer.delete_status) {
        throw new APIError(
          "Customer is already deleted",
          400,
          "CUSTOMER_ALREADY_DELETED"
        );
      }

      // Check if customer has any sale orders
      if (existingCustomer._count.saleOrders > 0) {
        throw new APIError(
          "Cannot delete customer with existing sale orders",
          400,
          "CUSTOMER_HAS_ORDERS"
        );
      }

      // Soft delete the customer master
      await prisma.customer.update({
        where: { id },
        data: {
          delete_status: true,
          active_status: false,
          updatedBy: updatedBy,
        },
      });

      return true;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      console.error("Error deleting customer master:", error);
      throw new APIError(
        "Failed to delete customer master",
        500,
        "DELETE_CUSTOMER_ERROR"
      );
    }
  }

  /**
   * Check if customer email exists
   * @param {string} email - Email to check
   * @param {number} excludeId - ID to exclude from check (for updates)
   * @returns {Promise<boolean>} Whether email exists
   */
  async isCustomerEmailExists(email, excludeId = null) {
    try {
      const where = { email };
      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existingCustomer = await prisma.customer.findFirst({ where });
      return !!existingCustomer;
    } catch (error) {
      console.error("Error checking customer email:", error);
      return false;
    }
  }

  /**
   * Get customer master dropdown list (for forms)
   * @returns {Promise<Array>} Simple customer list for dropdowns
   */
  async getCustomerDropdown() {
    try {
      const customers = await prisma.customer.findMany({
        where: {
          active_status: true,
          delete_status: false,
        },
        select: {
          id: true,
          name: true,
          code: true,
          city: true,
          phone: true,
          shopname: true,
        },
        orderBy: {
          name: "asc",
        },
      });

      return customers.map((customer) => ({
        id: customer.id,
        label: `${customer.name} (${customer.code})${customer.city ? ` - ${customer.city}` : ""
          }`,
        name: customer.name,
        shopname: customer.shopname,
        value: customer.id,
        code: customer.code,
        phone: customer.phone,
      }));
    } catch (error) {
      console.error("Error fetching customer dropdown:", error);
      throw new APIError(
        "Failed to fetch customer dropdown",
        500,
        "FETCH_DROPDOWN_ERROR"
      );
    }
  }

  // ─── Customer Portal Methods ────────────────────────────────────────────────

  /**
   * Activate customer portal: hash PIN, generate UUID token, mark active
   */
  async activatePortal(id, pin, userId) {
    try {
      const customer = await prisma.customer.findUnique({ where: { id, delete_status: false } });
      if (!customer) throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

      const token = randomUUID();

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          portal_pin_hash: pin,
          portal_token: token,
          portal_active: true,
          portal_activated_at: new Date(),
          portal_pin_changed_at: new Date(),
          updatedBy: userId,
        },
        select: { id: true, name: true, phone: true, portal_token: true, portal_active: true, portal_activated_at: true },
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error activating portal:", error);
      throw new APIError("Failed to activate portal", 500, "PORTAL_ACTIVATE_ERROR");
    }
  }

  /**
   * Change customer portal PIN
   */
  async changePortalPin(id, pin, userId) {
    try {
      const customer = await prisma.customer.findUnique({ where: { id, delete_status: false } });
      if (!customer) throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      if (!customer.portal_active) throw new APIError("Portal is not activated", 400, "PORTAL_NOT_ACTIVE");

      const updated = await prisma.customer.update({
        where: { id },
        data: {
          portal_pin_hash: pin,
          portal_pin_changed_at: new Date(),
          updatedBy: userId,
        },
        select: { id: true, name: true, portal_active: true, portal_pin_changed_at: true },
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error changing portal PIN:", error);
      throw new APIError("Failed to change portal PIN", 500, "PORTAL_PIN_CHANGE_ERROR");
    }
  }

  /**
   * Get customer portal status (for the actions modal)
   */
  async getPortalStatus(id) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id, delete_status: false },
        select: {
          id: true, name: true, phone: true, email: true,
          portal_token: true, portal_pin_hash: true, portal_active: true,
          portal_activated_at: true, portal_pin_changed_at: true, portal_last_accessed: true,
        },
      });
      if (!customer) throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

      // If the stored PIN looks like an old bcrypt hash, mask it so the admin
      // knows to reset it via "Change PIN"
      const pin = customer.portal_pin_hash;
      const isLegacyHash = pin && pin.startsWith("$2");
      return {
        ...customer,
        portal_pin_hash: isLegacyHash ? null : pin,
        pin_needs_reset: isLegacyHash,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to get portal status", 500, "PORTAL_STATUS_ERROR");
    }
  }

  /**
   * Portal login: verify token + PIN, update last_accessed, return safe customer data
   */
  async portalLogin(token, pin) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { portal_token: token },
        select: {
          id: true, name: true, shopname: true, phone: true, email: true, code: true,
          city: true, state: true, address: true, credit_limit: true, outstanding_credit: true,
          portal_active: true, portal_pin_hash: true, portal_last_accessed: true,
          category: { select: { id: true, name: true } },
        },
      });

      if (!customer) throw new APIError("Invalid portal link", 404, "INVALID_TOKEN");
      if (!customer.portal_active) throw new APIError("Portal is deactivated. Contact your supplier.", 403, "PORTAL_INACTIVE");
      if (!customer.portal_pin_hash) throw new APIError("PIN not set. Contact your supplier.", 400, "PIN_NOT_SET");

      if (customer.portal_pin_hash !== pin) throw new APIError("Invalid PIN", 401, "INVALID_PIN");

      // Update last accessed timestamp
      await prisma.customer.update({
        where: { id: customer.id },
        data: { portal_last_accessed: new Date() },
      });

      // Return safe data (no pin)
      const { portal_pin_hash, ...safeData } = customer;
      return safeData;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Portal login failed", 500, "PORTAL_LOGIN_ERROR");
    }
  }

  /**
   * Get pending invoices for a customer (dummy data with real SaleOrder counts)
   */
  async getCustomerPendingInvoices(id) {
    try {
      const customer = await prisma.customer.findUnique({ where: { id, delete_status: false } });
      if (!customer) throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");

      // Get real sale orders for invoice context
      const pendingOrders = await prisma.saleOrder.findMany({
        where: {
          customerId: id,
          deleteStatus: false,
          status: {
            in: [
              'PRODUCTION_READY',
              'IN_PRODUCTION',
              'ON_HOLD',
              'AWAITING_QUALITY',
              'READY_FOR_DISPATCH',
              'DISPATCHED',
              'DELIVERED',
            ],
          },
        },
        select: {
          id: true, orderNo: true, status: true, orderDate: true,
          lensPrice: true, discount: true, totalValue: true,
          lensProduct: { select: { lens_name: true } },
        },
        orderBy: { orderDate: "desc" },
        take: 10,
      });

      return {
        customerId: id,
        customerName: customer.name,
        outstandingBalance: customer.outstanding_credit || 0,
        creditLimit: customer.credit_limit || 0,
        pendingOrders,
      };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to get pending invoices", 500, "FETCH_INVOICES_ERROR");
    }
  }

  /**
   * Get portal customer data by token (used by portal pages - public)
   */
  async getPortalCustomerByToken(token) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { portal_token: token },
        select: { id: true, name: true, portal_active: true },
      });
      if (!customer) throw new APIError("Invalid portal link", 404, "INVALID_TOKEN");
      if (!customer.portal_active) throw new APIError("Portal is deactivated", 403, "PORTAL_INACTIVE");
      return customer;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch portal info", 500, "PORTAL_FETCH_ERROR");
    }
  }

  /**
   * Get full portal dashboard data for a customer by token (public endpoint)
   * Returns sale orders, dispatch copies, and account summary.
   */
  async getPortalDashboard(token) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { portal_token: token },
        select: {
          id: true, name: true, shopname: true, phone: true,
          outstanding_credit: true, credit_limit: true,
          portal_active: true,
        },
      });

      if (!customer) throw new APIError("Invalid portal link", 404, "INVALID_TOKEN");
      if (!customer.portal_active) throw new APIError("Portal is deactivated. Contact your supplier.", 403, "PORTAL_INACTIVE");

      // Fetch recent sale orders
      const saleOrders = await prisma.saleOrder.findMany({
        where: { customerId: customer.id, deleteStatus: false },
        select: {
          id: true,
          orderNo: true,
          status: true,
          orderDate: true,
          type: true,
          urgentOrder: true,
          lensPrice: true,
          rightEyeExtra: true,
          leftEyeExtra: true,
          fittingPrice: true,
          tintingPrice: true,
          discount: true,
          dispatchStatus: true,
          category: { select: { name: true } },
          lensProduct: { select: { lens_name: true } },
          coating: { select: { name: true } },
        },
        orderBy: { orderDate: "desc" },
        take: 30,
      });

      // Fetch recent dispatch copies
      const dispatches = await prisma.dispatchCopy.findMany({
        where: { customerId: customer.id },
        select: {
          id: true,
          dcNumber: true,
          status: true,
          expectedDeliveryDate: true,
          actualDeliveryDate: true,
          createdAt: true,
          saleOrders: { select: { id: true, orderNo: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      // Update last accessed timestamp
      await prisma.customer.update({
        where: { id: customer.id },
        data: { portal_last_accessed: new Date() },
      });

      const { portal_active, ...safeCustomer } = customer;
      return { customer: safeCustomer, saleOrders, dispatches };
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError("Failed to fetch portal dashboard", 500, "PORTAL_DASHBOARD_ERROR");
    }
  }

  async updateOpeningBalance(customerId, amount, userId, req = null) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: { ledger: true }
      });

      if (!customer) {
        throw new APIError("Customer not found", 404, "CUSTOMER_NOT_FOUND");
      }

      if (!customer.ledger) {
        throw new APIError("Customer subsidiary ledger not found", 404, "LEDGER_NOT_FOUND");
      }

      const ledger = customer.ledger;
      const oldOpeningBalance = parseFloat(ledger.openingBalance || 0);
      const diff = amount - oldOpeningBalance;

      if (diff === 0) {
        return customer;
      }

      const updated = await prisma.$transaction(async (tx) => {
        // Update Ledger openingBalance (the field itself)
        await tx.ledger.update({
          where: { id: ledger.id },
          data: { openingBalance: amount }
        });

        // Resolve the offset equity ledger (AC-5002 Retained Earnings)
        const equityLedger = await tx.ledger.findFirst({
          where: { ledgerCode: 'AC-5002', delete_status: false }
        });
        if (!equityLedger) {
          throw new APIError("Equity ledger AC-5002 not found", 500, "LEDGER_NOT_FOUND");
        }

        // Post balanced financial transaction
        const entryTypeDr = diff > 0 ? 'DEBIT' : 'CREDIT';
        const entryTypeCr = diff > 0 ? 'CREDIT' : 'DEBIT';
        const absDiff = Math.abs(diff);

        await postTransaction(tx, {
          transactionType: 'OPENING_BALANCE',
          referenceType: 'MANUAL',
          referenceId: customerId,
          referenceNumber: `OB-C${customerId}`,
          description: `Opening balance update for customer ${customer.name} from \u20b9${oldOpeningBalance} to \u20b9${amount}`,
          transactionDate: new Date(),
        }, [
          { ledgerId: ledger.id, entryType: entryTypeDr, amount: absDiff, description: 'Customer AR opening balance adjustment' },
          { ledgerId: equityLedger.id, entryType: entryTypeCr, amount: absDiff, description: 'Equity offset entry' }
        ], userId);

        // Update customer outstanding_credit by adding diff
        const currentOutstanding = customer.outstanding_credit || 0;
        await tx.customer.update({
          where: { id: customerId },
          data: { outstanding_credit: Math.max(0, currentOutstanding + Math.round(diff)) }
        });

        // Re-fetch updated customer
        return tx.customer.findUnique({
          where: { id: customerId },
          include: { ledger: true }
        });
      });

      return updated;
    } catch (error) {
      if (error instanceof APIError) throw error;
      console.error("Error updating customer opening balance:", error);
      throw new APIError("Failed to update opening balance", 500, "UPDATE_OPENING_BALANCE_ERROR");
    }
  }
}

export default CustomerMasterService;
