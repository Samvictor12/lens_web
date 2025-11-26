/**
 * Audit Logging Middleware
 * Automatically logs API requests and responses for audit trail
 */

import { logRead, logFailedOperation } from '../utils/auditLogger.js';
import { logError } from '../utils/errorLogger.js';

/**
 * Middleware to log API requests for audit trail
 * Place this middleware AFTER authentication middleware
 */
export const auditMiddleware = (options = {}) => {
  const {
    logReads = false, // Set to true to log READ operations (can be verbose)
    excludePaths = ['/health', '/api-docs'], // Paths to exclude from logging
    excludeReadPaths = ['/api-docs', '/swagger'] // Additional paths to exclude from READ logging
  } = options;

  return async (req, res, next) => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Skip READ logging for specific paths
    if (!logReads && excludeReadPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Track response data
    let responseData = null;
    let responseSent = false;

    // Override res.json to capture response
    res.json = function (data) {
      if (!responseSent) {
        responseData = data;
        responseSent = true;
        
        // Log after response is sent
        setImmediate(() => {
          logRequest(req, res, data).catch(err => {
            console.error('Audit logging error:', err);
          });
        });
      }
      return originalJson.call(this, data);
    };

    // Override res.send to capture response
    res.send = function (data) {
      if (!responseSent) {
        responseSent = true;
        
        // Try to parse JSON data
        try {
          responseData = typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          responseData = data;
        }
        
        // Log after response is sent
        setImmediate(() => {
          logRequest(req, res, responseData).catch(err => {
            console.error('Audit logging error:', err);
          });
        });
      }
      return originalSend.call(this, data);
    };

    next();
  };

  /**
   * Log the request based on method and response
   */
  async function logRequest(req, res, responseData) {
    const userId = req.user?.id || null;
    const method = req.method;
    const statusCode = res.statusCode;
    const success = statusCode >= 200 && statusCode < 400;

    // Extract entity name from path (e.g., /api/customers -> Customer)
    const entity = extractEntityName(req.path);

    // Skip logging if entity cannot be determined
    if (!entity) {
      return;
    }

    // Log based on HTTP method and success status
    try {
      if (!success) {
        // Log failed operations
        await logFailedOperation({
          userId,
          action: getActionFromMethod(method),
          entity,
          entityId: extractEntityId(req),
          errorMessage: responseData?.message || responseData?.error || 'Operation failed',
          statusCode,
          req,
          metadata: {
            requestBody: req.body,
            requestParams: req.params,
            requestQuery: req.query
          }
        });
      } else if (method === 'GET' && logReads) {
        // Log READ operations (only if enabled)
        await logRead({
          userId,
          entity,
          entityId: extractEntityId(req),
          req,
          metadata: {
            query: req.query,
            recordCount: Array.isArray(responseData?.data) ? responseData.data.length : 1
          }
        });
      }
      // Note: CREATE, UPDATE, DELETE should be logged explicitly in controllers
      // because we need access to the actual data being modified
    } catch (error) {
      console.error('Error in audit logging:', error);
    }
  }
};

/**
 * Error handling middleware with logging
 * Place this middleware LAST in the middleware chain
 */
export const errorLoggingMiddleware = async (err, req, res, next) => {
  const userId = req.user?.id || null;

  // Determine error type and status code
  let statusCode = err.statusCode || 500;
  let errorType = err.name || 'UnknownError';
  let errorCode = err.code || null;

  // Log the error
  await logError({
    error: err,
    userId,
    errorType,
    errorCode,
    statusCode,
    req,
    severity: getSeverityFromStatusCode(statusCode),
    metadata: {
      requestBody: req.body,
      requestParams: req.params,
      requestQuery: req.query
    }
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: err.message || 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

/**
 * Extract entity name from request path
 * @param {string} path - Request path
 * @returns {string|null} Entity name
 */
function extractEntityName(path) {
  // Remove leading /api or /api/v1 etc.
  const cleanPath = path.replace(/^\/api(\/v\d+)?\//, '');
  
  // Get first segment and convert to PascalCase
  const segment = cleanPath.split('/')[0];
  
  if (!segment) return null;
  
  // Convert kebab-case or snake_case to PascalCase
  return segment
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Extract entity ID from request
 * @param {Object} req - Express request object
 * @returns {number|null} Entity ID
 */
function extractEntityId(req) {
  // Check params for id
  if (req.params.id) {
    const id = parseInt(req.params.id);
    return isNaN(id) ? null : id;
  }
  
  // Check body for id
  if (req.body?.id) {
    const id = parseInt(req.body.id);
    return isNaN(id) ? null : id;
  }
  
  return null;
}

/**
 * Get action name from HTTP method
 * @param {string} method - HTTP method
 * @returns {string} Action name
 */
function getActionFromMethod(method) {
  const methodMap = {
    'POST': 'CREATE',
    'GET': 'READ',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  
  return methodMap[method] || 'UNKNOWN';
}

/**
 * Get error severity from status code
 * @param {number} statusCode - HTTP status code
 * @returns {string} Severity level
 */
function getSeverityFromStatusCode(statusCode) {
  if (statusCode >= 500) return 'CRITICAL';
  if (statusCode >= 400) return 'ERROR';
  if (statusCode >= 300) return 'WARNING';
  return 'INFO';
}

export default {
  auditMiddleware,
  errorLoggingMiddleware
};
