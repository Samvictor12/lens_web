/**
 * Logs API Service
 * Handles API calls for audit logs and error logs
 */

import api from './api';

const logsService = {
  /**
   * Get audit logs with filters
   * @param {Object} params - Query parameters
   * @returns {Promise} Audit logs response
   */
  getAuditLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.entity) queryParams.append('entity', params.entity);
    if (params.action) queryParams.append('action', params.action);
    if (params.entityId) queryParams.append('entityId', params.entityId);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const response = await api.get(`/logs/audit-logs?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get error logs with filters
   * @param {Object} params - Query parameters
   * @returns {Promise} Error logs response
   */
  getErrorLogs: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.errorType) queryParams.append('errorType', params.errorType);
    if (params.severity) queryParams.append('severity', params.severity);
    if (params.resolved !== undefined) queryParams.append('resolved', params.resolved);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    
    const response = await api.get(`/logs/error-logs?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Get error statistics
   * @param {Object} params - Date range parameters
   * @returns {Promise} Error statistics
   */
  getErrorStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    
    const response = await api.get(`/logs/error-logs/stats?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * Resolve an error
   * @param {number} errorId - Error log ID
   * @param {string} resolution - Resolution description
   * @returns {Promise} Response
   */
  resolveError: async (errorId, resolution) => {
    const response = await api.patch(`/logs/error-logs/${errorId}/resolve`, {
      resolution
    });
    return response.data;
  }
};

export default logsService;
