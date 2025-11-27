/**
 * AUDIT AND ERROR LOGGING - INTEGRATION GUIDE
 * 
 * This document demonstrates how to integrate audit and error logging
 * into your existing controllers and services.
 */

// ============================================
// 1. IMPORT THE LOGGING UTILITIES
// ============================================

import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { 
  logError, 
  logValidationError, 
  logDatabaseError,
  logNotFoundError 
} from '../utils/errorLogger.js';

// ============================================
// 2. EXAMPLE: CREATE OPERATION
// ============================================

/**
 * Example: Create Customer with Audit Logging
 */
export const createCustomer = async (req, res) => {
  try {
    const customerData = req.body;
    const userId = req.user.id; // From auth middleware

    // Validate input
    // ... validation logic ...

    // Create customer in database
    const customer = await prisma.customer.create({
      data: {
        ...customerData,
        createdBy: userId
      }
    });

    // ✅ LOG THE CREATE OPERATION
    await logCreate({
      userId,
      entity: 'Customer',
      entityId: customer.id,
      newValues: customer,
      req,
      metadata: {
        action: 'Customer created successfully'
      }
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Customer created successfully'
    });

  } catch (error) {
    // ✅ LOG THE ERROR
    await logDatabaseError({
      error,
      userId: req.user?.id,
      req,
      metadata: {
        operation: 'createCustomer',
        input: req.body
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create customer'
    });
  }
};

// ============================================
// 3. EXAMPLE: UPDATE OPERATION
// ============================================

/**
 * Example: Update Sale Order with Audit Logging
 */
export const updateSaleOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user.id;

    // Get existing record (for audit trail)
    const existingSaleOrder = await prisma.saleOrder.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingSaleOrder) {
      // ✅ LOG NOT FOUND ERROR
      await logNotFoundError({
        error: new Error(`Sale Order ${id} not found`),
        userId,
        req,
        resource: 'SaleOrder',
        resourceId: id
      });

      return res.status(404).json({
        success: false,
        error: 'Sale order not found'
      });
    }

    // Update the record
    const updatedSaleOrder = await prisma.saleOrder.update({
      where: { id: parseInt(id) },
      data: {
        ...updateData,
        updatedBy: userId
      }
    });

    // ✅ LOG THE UPDATE OPERATION
    await logUpdate({
      userId,
      entity: 'SaleOrder',
      entityId: updatedSaleOrder.id,
      oldValues: existingSaleOrder,
      newValues: updatedSaleOrder,
      req,
      metadata: {
        action: 'Sale order updated successfully'
      }
    });

    res.json({
      success: true,
      data: updatedSaleOrder,
      message: 'Sale order updated successfully'
    });

  } catch (error) {
    // ✅ LOG THE ERROR
    await logDatabaseError({
      error,
      userId: req.user?.id,
      req,
      metadata: {
        operation: 'updateSaleOrder',
        saleOrderId: req.params.id,
        input: req.body
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to update sale order'
    });
  }
};

// ============================================
// 4. EXAMPLE: DELETE OPERATION
// ============================================

/**
 * Example: Delete Vendor with Audit Logging
 */
export const deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get existing record (for audit trail)
    const existingVendor = await prisma.vendor.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingVendor) {
      // ✅ LOG NOT FOUND ERROR
      await logNotFoundError({
        error: new Error(`Vendor ${id} not found`),
        userId,
        req,
        resource: 'Vendor',
        resourceId: id
      });

      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    // Soft delete (recommended) or hard delete
    await prisma.vendor.update({
      where: { id: parseInt(id) },
      data: {
        delete_status: true,
        updatedBy: userId
      }
    });

    // ✅ LOG THE DELETE OPERATION
    await logDelete({
      userId,
      entity: 'Vendor',
      entityId: parseInt(id),
      oldValues: existingVendor,
      req,
      metadata: {
        action: 'Vendor deleted (soft delete)',
        deleteType: 'soft'
      }
    });

    res.json({
      success: true,
      message: 'Vendor deleted successfully'
    });

  } catch (error) {
    // ✅ LOG THE ERROR
    await logDatabaseError({
      error,
      userId: req.user?.id,
      req,
      metadata: {
        operation: 'deleteVendor',
        vendorId: req.params.id
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to delete vendor'
    });
  }
};

// ============================================
// 5. EXAMPLE: VALIDATION ERROR
// ============================================

/**
 * Example: Handle Validation Errors
 */
export const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    const userId = req.user.id;

    // Validation
    const validationErrors = [];
    if (!productData.name) validationErrors.push('Name is required');
    if (!productData.price) validationErrors.push('Price is required');
    if (productData.price < 0) validationErrors.push('Price must be positive');

    if (validationErrors.length > 0) {
      // ✅ LOG VALIDATION ERROR
      await logValidationError({
        error: new Error('Validation failed'),
        userId,
        req,
        validationDetails: {
          errors: validationErrors,
          input: productData
        }
      });

      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Create product...
    const product = await prisma.lensProductMaster.create({
      data: {
        ...productData,
        createdBy: userId
      }
    });

    // ✅ LOG THE CREATE OPERATION
    await logCreate({
      userId,
      entity: 'LensProductMaster',
      entityId: product.id,
      newValues: product,
      req
    });

    res.status(201).json({
      success: true,
      data: product
    });

  } catch (error) {
    // ✅ LOG THE ERROR
    await logDatabaseError({
      error,
      userId: req.user?.id,
      req,
      metadata: {
        operation: 'createProduct',
        input: req.body
      }
    });

    res.status(500).json({
      success: false,
      error: 'Failed to create product'
    });
  }
};

// ============================================
// 6. INTEGRATION WITH EXPRESS APP
// ============================================

/**
 * In your server.js file, add the middleware:
 */

/*
import { auditMiddleware, errorLoggingMiddleware } from './middleware/auditMiddleware.js';
import logsRouter from './routes/logs.routes.js';

// ... other imports ...

// Apply audit middleware AFTER authentication
app.use('/api', authenticateToken);
app.use('/api', auditMiddleware({
  logReads: false, // Set to true to log GET requests
  excludePaths: ['/health', '/api-docs']
}));

// Your routes
app.use('/api/customers', customersRouter);
app.use('/api/sale-orders', saleOrdersRouter);
// ... other routes ...

// Logs viewing routes
app.use('/api', logsRouter);

// Error logging middleware (MUST BE LAST)
app.use(errorLoggingMiddleware);
*/

// ============================================
// 7. QUERYING LOGS
// ============================================

/**
 * Frontend can now query logs using the following endpoints:
 * 
 * GET /api/audit-logs?entity=Customer&action=CREATE&page=1&limit=50
 * GET /api/audit-logs?userId=1&startDate=2024-01-01&endDate=2024-12-31
 * 
 * GET /api/error-logs?severity=CRITICAL&resolved=false
 * GET /api/error-logs/stats?startDate=2024-01-01
 * 
 * PATCH /api/error-logs/123/resolve
 * Body: { "resolution": "Fixed database connection issue" }
 */

// ============================================
// 8. BEST PRACTICES
// ============================================

/**
 * ✅ DO:
 * - Log all CREATE, UPDATE, DELETE operations
 * - Log validation errors
 * - Log database errors
 * - Include meaningful metadata
 * - Sanitize sensitive data (passwords, tokens)
 * - Use try-catch to prevent logging from breaking main flow
 * 
 * ❌ DON'T:
 * - Log every GET request (can be too verbose) - use sparingly
 * - Include passwords or sensitive tokens in logs
 * - Throw errors from logging functions
 * - Log to console only - use the database logging
 * - Forget to capture old values before updates/deletes
 */

export default {
  createCustomer,
  updateSaleOrder,
  deleteVendor,
  createProduct
};
