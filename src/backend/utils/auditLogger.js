/**
 * Audit Logger Utility
 * Provides functions to log all CRUD operations for audit trail
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Log a CREATE operation
 * @param {Object} options - Logging options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.entity - Entity/Model name (e.g., "SaleOrder")
 * @param {number} options.entityId - ID of the created record
 * @param {Object} options.newValues - New record values
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata
 */
export async function logCreate({
  userId,
  entity,
  entityId,
  newValues,
  req,
  metadata = {}
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: 'CREATE',
        entity,
        entityId,
        newValues,
        oldValues: null,
        changes: null,
        ipAddress: getIpAddress(req),
        userAgent: req?.headers?.['user-agent'] || null,
        method: req?.method || null,
        endpoint: req?.originalUrl || req?.url || null,
        statusCode: 201,
        success: true,
        metadata
      }
    });
  } catch (error) {
    console.error('Error logging CREATE audit:', error);
    // Don't throw - audit logging should not break the main flow
  }
}

/**
 * Log an UPDATE operation
 * @param {Object} options - Logging options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.entity - Entity/Model name
 * @param {number} options.entityId - ID of the updated record
 * @param {Object} options.oldValues - Previous values
 * @param {Object} options.newValues - Updated values
 * @param {Object} options.changes - Specific field changes
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata
 */
export async function logUpdate({
  userId,
  entity,
  entityId,
  oldValues,
  newValues,
  changes = null,
  req,
  metadata = {}
}) {
  try {
    // Calculate changes if not provided
    if (!changes && oldValues && newValues) {
      changes = calculateChanges(oldValues, newValues);
    }

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: 'UPDATE',
        entity,
        entityId,
        oldValues,
        newValues,
        changes,
        ipAddress: getIpAddress(req),
        userAgent: req?.headers?.['user-agent'] || null,
        method: req?.method || null,
        endpoint: req?.originalUrl || req?.url || null,
        statusCode: 200,
        success: true,
        metadata
      }
    });
  } catch (error) {
    console.error('Error logging UPDATE audit:', error);
  }
}

/**
 * Log a DELETE operation
 * @param {Object} options - Logging options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.entity - Entity/Model name
 * @param {number} options.entityId - ID of the deleted record
 * @param {Object} options.oldValues - Values before deletion
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata
 */
export async function logDelete({
  userId,
  entity,
  entityId,
  oldValues,
  req,
  metadata = {}
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: 'DELETE',
        entity,
        entityId,
        oldValues,
        newValues: null,
        changes: null,
        ipAddress: getIpAddress(req),
        userAgent: req?.headers?.['user-agent'] || null,
        method: req?.method || null,
        endpoint: req?.originalUrl || req?.url || null,
        statusCode: 200,
        success: true,
        metadata
      }
    });
  } catch (error) {
    console.error('Error logging DELETE audit:', error);
  }
}

/**
 * Log a READ operation (optional - can be verbose)
 * @param {Object} options - Logging options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.entity - Entity/Model name
 * @param {number} options.entityId - ID of the read record (optional)
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata (e.g., filters, pagination)
 */
export async function logRead({
  userId,
  entity,
  entityId = null,
  req,
  metadata = {}
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action: 'READ',
        entity,
        entityId,
        oldValues: null,
        newValues: null,
        changes: null,
        ipAddress: getIpAddress(req),
        userAgent: req?.headers?.['user-agent'] || null,
        method: req?.method || null,
        endpoint: req?.originalUrl || req?.url || null,
        statusCode: 200,
        success: true,
        metadata
      }
    });
  } catch (error) {
    console.error('Error logging READ audit:', error);
  }
}

/**
 * Log a failed operation
 * @param {Object} options - Logging options
 * @param {number} options.userId - ID of the user performing the action
 * @param {string} options.action - Action attempted (CREATE, UPDATE, DELETE, READ)
 * @param {string} options.entity - Entity/Model name
 * @param {number} options.entityId - ID of the target record
 * @param {string} options.errorMessage - Error message
 * @param {number} options.statusCode - HTTP status code
 * @param {Object} options.req - Express request object
 * @param {Object} options.metadata - Additional metadata
 */
export async function logFailedOperation({
  userId,
  action,
  entity,
  entityId = null,
  errorMessage,
  statusCode = 500,
  req,
  metadata = {}
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entity,
        entityId,
        oldValues: null,
        newValues: null,
        changes: null,
        ipAddress: getIpAddress(req),
        userAgent: req?.headers?.['user-agent'] || null,
        method: req?.method || null,
        endpoint: req?.originalUrl || req?.url || null,
        statusCode,
        success: false,
        errorMessage,
        metadata
      }
    });
  } catch (error) {
    console.error('Error logging failed operation audit:', error);
  }
}

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string|null} IP address
 */
function getIpAddress(req) {
  if (!req) return null;
  
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.connection?.socket?.remoteAddress ||
    null
  );
}

/**
 * Calculate changes between old and new values
 * @param {Object} oldValues - Previous values
 * @param {Object} newValues - New values
 * @returns {Object} Changed fields with old and new values
 */
function calculateChanges(oldValues, newValues) {
  const changes = {};
  
  // Get all unique keys from both objects
  const allKeys = new Set([
    ...Object.keys(oldValues || {}),
    ...Object.keys(newValues || {})
  ]);
  
  allKeys.forEach(key => {
    const oldVal = oldValues?.[key];
    const newVal = newValues?.[key];
    
    // Skip if values are the same
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes[key] = {
        old: oldVal,
        new: newVal
      };
    }
  });
  
  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Query audit logs with filters
 * @param {Object} filters - Query filters
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.entity - Filter by entity name
 * @param {string} filters.action - Filter by action type
 * @param {number} filters.entityId - Filter by entity ID
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Records per page
 * @returns {Promise<Object>} Audit logs with pagination
 */
export async function getAuditLogs({
  userId,
  entity,
  action,
  entityId,
  startDate,
  endDate,
  page = 1,
  limit = 50
}) {
  try {
    const where = {};
    
    if (userId) where.userId = userId;
    if (entity) where.entity = entity;
    if (action) where.action = action;
    if (entityId) where.entityId = entityId;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ]);
    
    return {
      logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    throw error;
  }
}

export default {
  logCreate,
  logUpdate,
  logDelete,
  logRead,
  logFailedOperation,
  getAuditLogs
};
