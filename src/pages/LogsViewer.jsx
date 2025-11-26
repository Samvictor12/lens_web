import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Eye, ChevronLeft, ChevronRight, User, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import logsService from '@/services/logs';
import { getUsers } from '@/services/user';
import { useToast } from '@/hooks/use-toast';
import LogsFilter from './LogsFilter';
import {
  auditLogFilters,
  errorLogFilters,
  actionColors,
  severityColors,
} from './LogsViewer.constants';

export default function LogsViewer() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('audit');

  // Pagination states
  const [auditPageIndex, setAuditPageIndex] = useState(0);
  const [auditPageSize, setAuditPageSize] = useState(20);
  const [errorPageIndex, setErrorPageIndex] = useState(0);
  const [errorPageSize, setErrorPageSize] = useState(20);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditFilters, setAuditFilters] = useState(auditLogFilters);
  const [auditTempFilters, setAuditTempFilters] = useState(auditLogFilters);
  const [showAuditFilterDialog, setShowAuditFilterDialog] = useState(false);

  // Error Logs State
  const [errorLogs, setErrorLogs] = useState([]);
  const [errorLoading, setErrorLoading] = useState(false);
  const [errorTotalCount, setErrorTotalCount] = useState(0);
  const [errorFilters, setErrorFilters] = useState(errorLogFilters);
  const [errorTempFilters, setErrorTempFilters] = useState(errorLogFilters);
  const [showErrorFilterDialog, setShowErrorFilterDialog] = useState(false);

  // Detail Dialog State
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  // Users for filter dropdown
  const [users, setUsers] = useState([]);

  // View log details
  const viewLogDetails = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  // Format timestamp safely
  const formatTimestamp = (timestamp) => {
    try {
      if (!timestamp) return 'N/A';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return format(date, 'MMM dd, yyyy HH:mm:ss');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  // Render field changes for audit logs - only show fields that actually changed
  const renderFieldChanges = (log) => {
    if (!log.changes) return null;

    try {
      const changes = typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;

      if (!changes || typeof changes !== 'object') return null;

      const changeEntries = Object.entries(changes).filter(([field, values]) => {
        // Only show fields where old and new values are different
        if (values && typeof values === 'object') {
          if ('old' in values && 'new' in values) {
            return values.old !== values.new;
          } else if ('from' in values && 'to' in values) {
            return values.from !== values.to;
          }
        }
        return true; // If we can't determine, show it
      });

      if (changeEntries.length === 0) return null;

      return (
        <div className="mt-3 pt-3 border-t space-y-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Field Changes:</div>
          {changeEntries.map(([field, values]) => {
            // Handle different change formats
            let oldValue = 'N/A';
            let newValue = 'N/A';

            if (values && typeof values === 'object') {
              if ('old' in values && 'new' in values) {
                oldValue = values.old !== null && values.old !== undefined ? String(values.old) : 'null';
                newValue = values.new !== null && values.new !== undefined ? String(values.new) : 'null';
              } else if ('from' in values && 'to' in values) {
                oldValue = values.from !== null && values.from !== undefined ? String(values.from) : 'null';
                newValue = values.to !== null && values.to !== undefined ? String(values.to) : 'null';
              }
            }

            return (
              <div key={field} className="flex items-start gap-2 text-xs bg-muted/50 p-2 rounded">
                <div className="flex-1">
                  <div className="font-medium text-foreground mb-1">{field}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <span className="text-muted-foreground">Old: </span>
                      <span className="text-red-600 dark:text-red-400 font-mono">{oldValue}</span>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">New: </span>
                      <span className="text-green-600 dark:text-green-400 font-mono">{newValue}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    } catch (error) {
      console.error('Error parsing changes:', error);
      return null;
    }
  };

  // Render audit log card
  const renderAuditCard = (log) => (
    <Card key={log.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header: Module, Action, User */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{log.entity}</span>
                <Badge variant="outline" className={`${actionColors[log.action] || ''} text-xs`}>
                  {log.action}
                </Badge>
              </div>
              <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                <span>{log.user ? log.user.name : `User ID: ${log.userId}`}</span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewLogDetails(log)}
            className="h-7 w-7 p-0"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <span>{formatTimestamp(log.createdAt || log.timestamp)}</span>
        </div>

        {/* Field Changes */}
        {renderFieldChanges(log)}
      </CardContent>
    </Card>
  );

  // Render error log card
  const renderErrorCard = (log) => (
    <Card key={log.id} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        {/* Header: Error Type, Severity */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-base">{log.errorType}</span>
                <Badge variant="outline" className={`${severityColors[log.severity] || ''} text-xs`}>
                  {log.severity}
                </Badge>
                <Badge variant={log.resolved ? 'success' : 'destructive'} className="text-xs">
                  {log.resolved ? 'Resolved' : 'Unresolved'}
                </Badge>
              </div>
              {log.userId && (
                <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{log.user ? log.user.name : `User ID: ${log.userId}`}</span>
                </div>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => viewLogDetails(log)}
            className="h-7 w-7 p-0"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Timestamp */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3" />
          <span>{formatTimestamp(log.createdAt || log.timestamp)}</span>
        </div>

        {/* Error Message */}
        <div className="mt-2 pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground mb-1">Error Message:</div>
          <div className="text-sm text-foreground">{log.message}</div>
        </div>
      </CardContent>
    </Card>
  );

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const params = {
        page: auditPageIndex + 1,
        limit: auditPageSize,
        userId: auditFilters.userId || undefined,
        entity: auditFilters.entity || undefined,
        action: auditFilters.action || undefined,
        startDate: auditFilters.startDate || undefined,
        endDate: auditFilters.endDate || undefined,
      };

      const response = await logsService.getAuditLogs(params);

      if (response.success) {
        // Filter out READ logs
        const filteredLogs = (response.data || []).filter(log => log.action !== 'READ');
        setAuditLogs(filteredLogs);
        setAuditTotalCount(filteredLogs.length);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch audit logs',
        variant: 'destructive',
      });
      setAuditLogs([]);
      setAuditTotalCount(0);
    } finally {
      setAuditLoading(false);
    }
  };

  // Fetch Error Logs
  const fetchErrorLogs = async () => {
    setErrorLoading(true);
    try {
      const params = {
        page: errorPageIndex + 1,
        limit: errorPageSize,
        userId: errorFilters.userId || undefined,
        errorType: errorFilters.errorType || undefined,
        severity: errorFilters.severity || undefined,
        resolved: errorFilters.resolved || undefined,
        startDate: errorFilters.startDate || undefined,
        endDate: errorFilters.endDate || undefined,
      };

      const response = await logsService.getErrorLogs(params);

      if (response.success) {
        setErrorLogs(response.data || []);
        setErrorTotalCount(response.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Error fetching error logs:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch error logs',
        variant: 'destructive',
      });
      setErrorLogs([]);
      setErrorTotalCount(0);
    } finally {
      setErrorLoading(false);
    }
  };

  // Initial load and when tab changes
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    } else {
      fetchErrorLogs();
    }
  }, [activeTab]);

  // Fetch users for filter dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await getUsers(1, 999, '', {}, 'name', 'asc');
        if (response.success) {
          setUsers(response.data || []);
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  // Fetch audit logs when dependencies change
  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [auditPageIndex, auditPageSize, auditFilters]);

  // Fetch error logs when dependencies change
  useEffect(() => {
    if (activeTab === 'error') {
      fetchErrorLogs();
    }
  }, [errorPageIndex, errorPageSize, errorFilters]);

  // Check if any audit filters are active
  const hasActiveAuditFilters = useMemo(() => {
    return (
      auditFilters.userId !== null ||
      auditFilters.entity !== null ||
      auditFilters.action !== null ||
      auditFilters.startDate !== null ||
      auditFilters.endDate !== null
    );
  }, [auditFilters]);

  // Check if any error filters are active
  const hasActiveErrorFilters = useMemo(() => {
    return (
      errorFilters.userId !== null ||
      errorFilters.errorType !== null ||
      errorFilters.severity !== null ||
      errorFilters.resolved !== null ||
      errorFilters.startDate !== null ||
      errorFilters.endDate !== null
    );
  }, [errorFilters]);

  // Handle apply audit filters
  const handleApplyAuditFilters = () => {
    setAuditFilters(auditTempFilters);
    setShowAuditFilterDialog(false);
    setAuditPageIndex(0);
  };

  // Handle clear audit filters
  const handleClearAuditFilters = () => {
    const clearedFilters = auditLogFilters;
    setAuditTempFilters(clearedFilters);
    setAuditFilters(clearedFilters);
    setShowAuditFilterDialog(false);
    setAuditPageIndex(0);
  };

  // Handle cancel audit filters
  const handleCancelAuditFilters = () => {
    setAuditTempFilters(auditFilters);
    setShowAuditFilterDialog(false);
  };

  // Handle apply error filters
  const handleApplyErrorFilters = () => {
    setErrorFilters(errorTempFilters);
    setShowErrorFilterDialog(false);
    setErrorPageIndex(0);
  };

  // Handle clear error filters
  const handleClearErrorFilters = () => {
    const clearedFilters = errorLogFilters;
    setErrorTempFilters(clearedFilters);
    setErrorFilters(clearedFilters);
    setShowErrorFilterDialog(false);
    setErrorPageIndex(0);
  };

  // Handle cancel error filters
  const handleCancelErrorFilters = () => {
    setErrorTempFilters(errorFilters);
    setShowErrorFilterDialog(false);
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 w-full">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">System Logs</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View and monitor audit trails and error logs
          </p>
        </div>

        {/* Tabs */}
        <Card className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex justify-between">
            <div className="border-b">
              <TabsList className="w-full justify-start rounded-none border-0 bg-transparent p-0">
                <TabsTrigger
                  value="audit"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Audit Logs
                </TabsTrigger>
                <TabsTrigger
                  value="error"
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none"
                >
                  Error Logs
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Audit Logs Tab */}
            <TabsContent value="audit" className="mt-0 p-1">
              <div className="flex items-center gap-2 mb-2">
                <LogsFilter
                  activeTab="audit"
                  filters={auditFilters}
                  tempFilters={auditTempFilters}
                  setTempFilters={setAuditTempFilters}
                  showFilterDialog={showAuditFilterDialog}
                  setShowFilterDialog={setShowAuditFilterDialog}
                  hasActiveFilters={hasActiveAuditFilters}
                  onApplyFilters={handleApplyAuditFilters}
                  onClearFilters={handleClearAuditFilters}
                  onCancelFilters={handleCancelAuditFilters}
                  users={users}
                />
              </div>
            </TabsContent>

            {/* Error Logs Tab */}
            <TabsContent value="error" className="mt-0 p-1">
              <div className="flex items-center gap-2 mb-2">
                <Button
                  size="xs"
                  variant="outline"
                  className="gap-1.5 h-8"
                  onClick={() => (activeTab === 'audit' ? fetchAuditLogs() : fetchErrorLogs())}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Refresh
                </Button>
                <LogsFilter
                  activeTab="error"
                  filters={errorFilters}
                  tempFilters={errorTempFilters}
                  setTempFilters={setErrorTempFilters}
                  showFilterDialog={showErrorFilterDialog}
                  setShowFilterDialog={setShowErrorFilterDialog}
                  hasActiveFilters={hasActiveErrorFilters}
                  onApplyFilters={handleApplyErrorFilters}
                  onClearFilters={handleClearErrorFilters}
                  onCancelFilters={handleCancelErrorFilters}
                  users={users}
                />
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>



      {/* Card View with Pagination */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'audit' ? (
          <>
            {/* Audit Logs Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {auditLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : auditLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No audit logs found</p>
                  </CardContent>
                </Card>
              ) : (
                auditLogs.map((log) => renderAuditCard(log))
              )}
            </div>

            {/* Audit Pagination */}
            {auditTotalCount > 0 && (
              <Card className="mt-2 flex-shrink-0">
                <CardContent className="p-1">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Showing {auditPageIndex * auditPageSize + 1} to{' '}
                      {Math.min((auditPageIndex + 1) * auditPageSize, auditTotalCount)} of{' '}
                      {auditTotalCount} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPageIndex(Math.max(0, auditPageIndex - 1))}
                        disabled={auditPageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs">
                        Page {auditPageIndex + 1} of {Math.ceil(auditTotalCount / auditPageSize)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAuditPageIndex(auditPageIndex + 1)}
                        disabled={(auditPageIndex + 1) * auditPageSize >= auditTotalCount}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <>
            {/* Error Logs Cards */}
            <div className="flex-1 overflow-y-auto space-y-3 p-1">
              {errorLoading ? (
                <div className="flex items-center justify-center h-40">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : errorLogs.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No error logs found</p>
                  </CardContent>
                </Card>
              ) : (
                errorLogs.map((log) => renderErrorCard(log))
              )}
            </div>

            {/* Error Pagination */}
            {errorTotalCount > 0 && (
              <Card className="mt-2 flex-shrink-0">
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Showing {errorPageIndex * errorPageSize + 1} to{' '}
                      {Math.min((errorPageIndex + 1) * errorPageSize, errorTotalCount)} of{' '}
                      {errorTotalCount} entries
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setErrorPageIndex(Math.max(0, errorPageIndex - 1))}
                        disabled={errorPageIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs">
                        Page {errorPageIndex + 1} of {Math.ceil(errorTotalCount / errorPageSize)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setErrorPageIndex(errorPageIndex + 1)}
                        disabled={(errorPageIndex + 1) * errorPageSize >= errorTotalCount}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog && (activeTab === 'audit' ? 'Audit Log Information' : 'Error Log Information')}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Timestamp</label>
                  <p className="text-sm text-muted-foreground">
                    {selectedLog.timestamp
                      ? (() => {
                        try {
                          const date = new Date(selectedLog.timestamp);
                          return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'PPpp');
                        } catch {
                          return 'Invalid Date';
                        }
                      })()
                      : 'N/A'
                    }
                  </p>
                </div>
                {activeTab === 'audit' ? (
                  <>
                    <div>
                      <label className="text-sm font-medium">Action</label>
                      <p className="text-sm">
                        <Badge variant="outline" className={actionColors[selectedLog.action] || ''}>
                          {selectedLog.action}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Entity</label>
                      <p className="text-sm text-muted-foreground">{selectedLog.entity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Entity ID</label>
                      <p className="text-sm text-muted-foreground">{selectedLog.entityId || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">User</label>
                      <p className="text-sm text-muted-foreground">
                        {selectedLog.user ? selectedLog.user.name : `ID: ${selectedLog.userId}`}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">IP Address</label>
                      <p className="text-sm text-muted-foreground font-mono">
                        {selectedLog.ipAddress || 'N/A'}
                      </p>
                    </div>
                    {selectedLog.changes && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium">Changes</label>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(selectedLog.changes, null, 2)}
                        </pre>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div>
                      <label className="text-sm font-medium">Severity</label>
                      <p className="text-sm">
                        <Badge variant="outline" className={severityColors[selectedLog.severity] || ''}>
                          {selectedLog.severity}
                        </Badge>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Error Type</label>
                      <p className="text-sm text-muted-foreground">{selectedLog.errorType}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <p className="text-sm">
                        <Badge variant={selectedLog.resolved ? 'success' : 'destructive'}>
                          {selectedLog.resolved ? 'Resolved' : 'Unresolved'}
                        </Badge>
                      </p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Message</label>
                      <p className="text-sm text-muted-foreground">{selectedLog.message}</p>
                    </div>
                    {selectedLog.stackTrace && (
                      <div className="col-span-2">
                        <label className="text-sm font-medium">Stack Trace</label>
                        <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                          {selectedLog.stackTrace}
                        </pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
