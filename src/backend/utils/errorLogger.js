/**
 * Error Logger Utility
 * Provides functions to log all errors with context for debugging and monitoring
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Severity levels for errors
 */
export const ErrorSeverity = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  ERROR: 'ERROR',
  CRITICAL: 'CRITICAL'
};

/**
 * Log an error
 * @param {Object} options - Error logging options
 * @param {Error} options.error - Error object
 * @param {number} options.userId - ID of the user who encountered the error
 * @param {string} options.errorType - Type of error (e.g., "ValidationError", "DatabaseError")
 * @param {string} options.errorCode - Custom error code
 * @param {number} options.statusCode - HTTP status code
 * @param {Object} options.req - Express request object
 * @param {string} options.severity - Error severity level
 * @param {Object} options.metadata - Additional error context
 */
export async function logError({
  error,
  userId = null,
  errorType = 'UnknownError',
  errorCode = null,
  statusCode = 500,
  req = null,
  severity = ErrorSeverity.ERROR,
  metadata = {}
}) {
  try {
    await prisma.errorLog.create({
      data: {
        userId,
        errorType,
        errorMessage: error?.message || 'Unknown error occurred',
        errorStack: error?.stack || null,
        errorCode,
        statusCode,
        method: req?.method || null,
        endpoint: req?.originalUrl || req?.url || null,
        requestBody: req?.body ? sanitizeRequestBody(req.body) : null,
        requestParams: req?.params || req?.query ? {
          params: req.params || {},
          query: req.query || {}
        } : null,
        ipAddress: getIpAddress(req),
        userAgent: req?.headers?.['user-agent'] || null,
        severity,
        metadata
      }
    });
  } catch (logError) {
    console.error('Error logging error to database:', logError);
    // Fallback to console logging
    console.error('Original error:', error);
  }
}

/**
 * Log a validation error
 * @param {Object} options - Validation error options
 */
export async function logValidationError({
  error,
  userId = null,
  req = null,
  validationDetails = {},
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'ValidationError',
    errorCode: 'VALIDATION_FAILED',
    statusCode: 400,
    req,
    severity: ErrorSeverity.WARNING,
    metadata: {
      ...metadata,
      validationDetails
    }
  });
}

/**
 * Log a database error
 * @param {Object} options - Database error options
 */
export async function logDatabaseError({
  error,
  userId = null,
  req = null,
  query = null,
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'DatabaseError',
    errorCode: 'DB_ERROR',
    statusCode: 500,
    req,
    severity: ErrorSeverity.CRITICAL,
    metadata: {
      ...metadata,
      query: query || null,
      prismaErrorCode: error?.code || null
    }
  });
}

/**
 * Log an authentication error
 * @param {Object} options - Authentication error options
 */
export async function logAuthError({
  error,
  userId = null,
  req = null,
  authType = 'JWT',
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'AuthenticationError',
    errorCode: 'AUTH_FAILED',
    statusCode: 401,
    req,
    severity: ErrorSeverity.WARNING,
    metadata: {
      ...metadata,
      authType
    }
  });
}

/**
 * Log an authorization error
 * @param {Object} options - Authorization error options
 */
export async function logAuthorizationError({
  error,
  userId = null,
  req = null,
  requiredPermission = null,
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'AuthorizationError',
    errorCode: 'FORBIDDEN',
    statusCode: 403,
    req,
    severity: ErrorSeverity.WARNING,
    metadata: {
      ...metadata,
      requiredPermission
    }
  });
}

/**
 * Log a not found error
 * @param {Object} options - Not found error options
 */
export async function logNotFoundError({
  error,
  userId = null,
  req = null,
  resource = null,
  resourceId = null,
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'NotFoundError',
    errorCode: 'NOT_FOUND',
    statusCode: 404,
    req,
    severity: ErrorSeverity.INFO,
    metadata: {
      ...metadata,
      resource,
      resourceId
    }
  });
}

/**
 * Log a business logic error
 * @param {Object} options - Business logic error options
 */
export async function logBusinessError({
  error,
  userId = null,
  req = null,
  businessRule = null,
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'BusinessLogicError',
    errorCode: 'BUSINESS_RULE_VIOLATION',
    statusCode: 422,
    req,
    severity: ErrorSeverity.WARNING,
    metadata: {
      ...metadata,
      businessRule
    }
  });
}

/**
 * Log an external API error
 * @param {Object} options - External API error options
 */
export async function logExternalApiError({
  error,
  userId = null,
  req = null,
  apiName = null,
  apiEndpoint = null,
  metadata = {}
}) {
  return logError({
    error,
    userId,
    errorType: 'ExternalApiError',
    errorCode: 'EXTERNAL_API_FAILED',
    statusCode: 502,
    req,
    severity: ErrorSeverity.ERROR,
    metadata: {
      ...metadata,
      apiName,
      apiEndpoint
    }
  });
}

/**
 * Mark an error as resolved
 * @param {number} errorId - Error log ID
 * @param {number} resolvedBy - User ID who resolved the error
 * @param {string} resolution - Resolution description
 */
export async function resolveError(errorId, resolvedBy, resolution) {
  try {
    await prisma.errorLog.update({
      where: { id: errorId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy,
        resolution
      }
    });
  } catch (error) {
    console.error('Error marking error as resolved:', error);
    throw error;
  }
}

/**
 * Get error logs with filters
 * @param {Object} filters - Query filters
 * @param {number} filters.userId - Filter by user ID
 * @param {string} filters.errorType - Filter by error type
 * @param {string} filters.severity - Filter by severity
 * @param {boolean} filters.resolved - Filter by resolution status
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {number} filters.page - Page number
 * @param {number} filters.limit - Records per page
 * @returns {Promise<Object>} Error logs with pagination
 */
export async function getErrorLogs({
  userId,
  errorType,
  severity,
  resolved,
  startDate,
  endDate,
  page = 1,
  limit = 50
}) {
  try {
    const where = {};
    
    if (userId) where.userId = userId;
    if (errorType) where.errorType = errorType;
    if (severity) where.severity = severity;
    if (typeof resolved === 'boolean') where.resolved = resolved;
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const [logs, total] = await Promise.all([
      prisma.errorLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              username: true
            }
          },
          resolver: {
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
      prisma.errorLog.count({ where })
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
    console.error('Error fetching error logs:', error);
    throw error;
  }
}

/**
 * Get error statistics
 * @param {Date} startDate - Start date for statistics
 * @param {Date} endDate - End date for statistics
 * @returns {Promise<Object>} Error statistics
 */
export async function getErrorStats(startDate, endDate) {
  try {
    const where = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    
    const [
      totalErrors,
      unresolvedErrors,
      errorsBySeverity,
      errorsByType
    ] = await Promise.all([
      prisma.errorLog.count({ where }),
      prisma.errorLog.count({ where: { ...where, resolved: false } }),
      prisma.errorLog.groupBy({
        by: ['severity'],
        where,
        _count: true
      }),
      prisma.errorLog.groupBy({
        by: ['errorType'],
        where,
        _count: true,
        orderBy: {
          _count: {
            errorType: 'desc'
          }
        },
        take: 10
      })
    ]);
    
    return {
      totalErrors,
      unresolvedErrors,
      resolvedErrors: totalErrors - unresolvedErrors,
      errorsBySeverity: errorsBySeverity.map(item => ({
        severity: item.severity,
        count: item._count
      })),
      topErrorTypes: errorsByType.map(item => ({
        errorType: item.errorType,
        count: item._count
      }))
    };
  } catch (error) {
    console.error('Error fetching error statistics:', error);
    throw error;
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
 * Sanitize request body to remove sensitive data
 * @param {Object} body - Request body
 * @returns {Object} Sanitized body
 */
function sanitizeRequestBody(body) {
  if (!body) return null;
  
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'accessToken', 'refreshToken'];
  const sanitized = { ...body };
  
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '***REDACTED***';
    }
  });
  
  return sanitized;
}

export default {
  logError,
  logValidationError,
  logDatabaseError,
  logAuthError,
  logAuthorizationError,
  logNotFoundError,
  logBusinessError,
  logExternalApiError,
  resolveError,
  getErrorLogs,
  getErrorStats,
  ErrorSeverity
};
