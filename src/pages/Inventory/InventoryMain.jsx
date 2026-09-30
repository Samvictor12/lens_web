import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { QrScanButton } from '@/components/ui/QrScanButton';
import { parseSaleOrderScanPayload } from '@/utils/parseSaleOrderScanPayload';
import {
  getSaleOrders,
  getInventorySoQueue,
  issueSoToPreQc,
} from '@/services/saleOrder';
import { STATUS_LABELS } from '@/constants/saleOrderStatus';
import { isFreeLensFulfillmentAllowed } from '@/pages/SaleOrder/SaleOrder.constants';

import InventoryDashboard from './InventoryDashboard';
import InventoryInwardQueueTab from './InventoryInwardQueueTab';
import InventoryRequestQueueTab from './InventoryRequestQueueTab';
import InventoryTransactionsTab from './InventoryTransactionsTab';
import InventoryStockTab from './InventoryStockTab';
import InventoryAuditTab from './InventoryAuditTab';
import StockPickModal from './StockPickModal';
import { inventoryService } from '@/services/inventory';
import {
  parseInventoryPath,
  inventoryTabPath,
  inventoryTransactionAddPath,
  godownDisplayLabel,
} from './inventoryGodown';

const FEATURE_TAB_LABELS = {
  dashboard: 'Dashboard',
  inward: 'Inward Queue',
  requestQueue: 'SO Request Query',
  transactions: 'Transactions',
  stock: 'Stock Summary',
  audit: 'Audit',
};

/** Same statuses as SO Request Queue "Issue & Pre-QC" */
const STOCK_PICK_STATUSES = ['DRAFT', 'PO_RECEIVED', 'PO_CANCELLED'];

function statusLabel(status) {
  return STATUS_LABELS[status] || String(status || '').replace(/_/g, ' ') || '—';
}

function isAlreadyFullyIssued(order) {
  const readiness = order?.issueReadiness;
  if (!readiness) return false;
  const wantsRight = Boolean(order.rightEye);
  const wantsLeft = Boolean(order.leftEye);
  if (!wantsRight && !wantsLeft) return false;
  const rightDone = !wantsRight || Boolean(readiness.right?.alreadyHasLens);
  const leftDone = !wantsLeft || Boolean(readiness.left?.alreadyHasLens);
  return rightDone && leftDone;
}

const InventoryMain = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const { slug, godownType, activeTab } = useMemo(
    () => parseInventoryPath(location.pathname),
    [location.pathname]
  );

  const [dashboardStats, setDashboardStats] = useState({});
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [scanBusy, setScanBusy] = useState(false);
  const [pickModalOrder, setPickModalOrder] = useState(null);
  const [issueBusy, setIssueBusy] = useState(false);
  const [scanError, setScanError] = useState(null);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    const loadDashboardStats = async () => {
      try {
        setDashboardLoading(true);
        const res = await inventoryService.getInventoryDashboard({ godownType });
        if (res.success) setDashboardStats(res.data || {});
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load dashboard stats',
          variant: 'destructive',
        });
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardStats();
  }, [activeTab, refreshKey, toast, godownType]);

  const bumpRefreshKey = () => setRefreshKey((key) => key + 1);

  const handleRefresh = () => {
    bumpRefreshKey();
  };

  const godownLabel = godownDisplayLabel(godownType);

  const switchGodown = (nextSlug) => {
    if (nextSlug === slug) return;
    navigate(inventoryTabPath(nextSlug, activeTab));
  };

  const openScanError = (title, description) => {
    setScanError({ title, description });
  };

  const handleInventoryScan = useCallback(
    async (scannedRaw) => {
      const { orderNo, customerRefNo } = parseSaleOrderScanPayload(scannedRaw);
      const searchTerm = orderNo || customerRefNo || String(scannedRaw || '').trim();
      if (!searchTerm) return;

      setScanBusy(true);
      setScanError(null);
      try {
        const response = await getSaleOrders(1, 20, searchTerm, {}, 'updatedAt', 'desc');
        const results = response?.data || [];
        const exact =
          results.find(
            (o) => orderNo && o.orderNo?.toLowerCase() === orderNo.toLowerCase()
          ) ||
          results.find(
            (o) =>
              customerRefNo &&
              o.customerRefNo?.toLowerCase() === customerRefNo.toLowerCase()
          ) ||
          (results.length === 1 ? results[0] : null);

        if (!response?.success || !exact) {
          openScanError(
            'Sale order not found',
            `No sale order matched “${searchTerm}”. Check the barcode and try again.`
          );
          return;
        }

        if (!STOCK_PICK_STATUSES.includes(exact.status)) {
          openScanError(
            'Cannot open Stock Pick',
            `Cannot open Stock Pick for ${exact.orderNo} (status: ${statusLabel(exact.status)}). Issue is only allowed for Draft / PO Received / PO Cancelled.`
          );
          return;
        }

        if (!isFreeLensFulfillmentAllowed(exact)) {
          openScanError(
            'Free lens blocked',
            `${exact.orderNo} is a free-lens order and is not approved yet. Stock Pick is blocked until free lens is approved.`
          );
          return;
        }

        // Enrich with issueReadiness from inventory queue (same as Request Query cards)
        let enriched = exact;
        try {
          const queueRes = await getInventorySoQueue({
            orderNo: exact.orderNo,
            limit: 10,
          });
          const queueHit = (queueRes?.data || []).find((o) => o.id === exact.id);
          if (queueHit) enriched = queueHit;
        } catch {
          // proceed with list payload if queue enrich fails
        }

        if (isAlreadyFullyIssued(enriched)) {
          openScanError(
            'Already issued',
            `${enriched.orderNo} already has lens stock issued for all required eyes. Stock Pick is not available.`
          );
          return;
        }

        setPickModalOrder(enriched);
      } catch (err) {
        openScanError(
          'Scan failed',
          err?.message || 'Could not look up the sale order from this scan.'
        );
      } finally {
        setScanBusy(false);
      }
    },
    []
  );

  const handleConfirmIssue = async (pick) => {
    if (!pickModalOrder) return;
    const itemIds = Array.isArray(pick) ? pick : pick?.itemIds || [];
    const rightItemId = Array.isArray(pick) ? null : pick?.rightItemId ?? null;
    const leftItemId = Array.isArray(pick) ? null : pick?.leftItemId ?? null;
    const locationTrayId = Array.isArray(pick) ? null : pick?.locationTrayId ?? null;
    if (!locationTrayId) {
      toast({
        title: 'Tray required',
        description: 'Select a destination Tray before issuing to Pre-QC.',
        variant: 'destructive',
      });
      return;
    }
    setIssueBusy(true);
    try {
      const res = await issueSoToPreQc(
        pickModalOrder.id,
        itemIds,
        false,
        { rightItemId, leftItemId },
        locationTrayId
      );
      if (res.success) {
        toast({ title: 'Issued to Pre-QC', description: pickModalOrder.orderNo });
        setPickModalOrder(null);
        bumpRefreshKey();
      }
    } catch (e) {
      toast({ title: 'Issue failed', description: e.message, variant: 'destructive' });
    } finally {
      setIssueBusy(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Inventory Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage inward queue, SO Request Query, transactions, and stock levels for {godownLabel}
          </p>
        </div>
        <div className="flex gap-1.5 items-center">
          <QrScanButton
            onScan={handleInventoryScan}
            label={scanBusy ? 'Scanning…' : 'Scan'}
            className="h-8"
          />
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate(inventoryTransactionAddPath(slug))}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Transaction</span>
          </Button>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => navigate(inventoryTabPath(slug, value))}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {/* Split tab bar: godown (left) | feature tabs (right) */}
        <div className="mb-4 flex min-w-0 flex-shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {/* Left — RX / STOCK godown */}
          <div
            className="inline-flex h-9 w-full shrink-0 items-center rounded-lg bg-gray-100 p-1 text-gray-500 sm:w-auto"
            role="tablist"
            aria-label="Godown"
          >
            <button
              type="button"
              role="tab"
              aria-selected={slug === 'rx'}
              onClick={() => switchGodown('rx')}
              className={cn(
                'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all sm:flex-none sm:px-3',
                slug === 'rx'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              RX Godown
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={slug === 'stock'}
              onClick={() => switchGodown('stock')}
              className={cn(
                'inline-flex flex-1 items-center justify-center whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold transition-all sm:flex-none sm:px-3',
                slug === 'stock'
                  ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              STOCK Godown
            </button>
          </div>

          <div className="h-px w-full bg-border sm:hidden" aria-hidden />

          {/* Right — feature tabs pinned to the right */}
          <div className="flex min-w-0 items-center gap-3 sm:ml-auto">
            <div className="hidden h-7 w-px shrink-0 bg-border sm:block" aria-hidden />
            <TabsList className="!flex h-9 !w-full min-w-0 gap-0.5 overflow-x-auto !justify-end p-1 sm:!w-auto">
              {Object.entries(FEATURE_TAB_LABELS).map(([value, label]) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="!flex-none shrink-0 px-2 py-1 text-[11px] sm:px-2.5 sm:text-xs"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        <TabsContent value="dashboard" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryDashboard
            key={`dash-${godownType}`}
            stats={dashboardStats}
            isLoading={dashboardLoading}
            onRefresh={handleRefresh}
            godownType={godownType}
          />
        </TabsContent>

        <TabsContent value="inward" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryInwardQueueTab key={`inward-${godownType}`} refreshKey={refreshKey} godownType={godownType} />
        </TabsContent>

        <TabsContent value="requestQueue" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryRequestQueueTab key={`queue-${godownType}`} refreshKey={refreshKey} godownType={godownType} />
        </TabsContent>

        <TabsContent value="transactions" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryTransactionsTab key={`txn-${godownType}`} refreshKey={refreshKey} godownType={godownType} />
        </TabsContent>

        <TabsContent value="stock" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryStockTab key={`stock-${godownType}`} refreshKey={refreshKey} godownType={godownType} />
        </TabsContent>

        <TabsContent value="audit" className="mt-0 flex min-h-0 flex-1 flex-col overflow-hidden">
          <InventoryAuditTab key={`audit-${godownType}`} godownType={godownType} onRefresh={handleRefresh} />
        </TabsContent>
      </Tabs>

      {pickModalOrder && (
        <StockPickModal
          saleOrderId={pickModalOrder.id}
          requiredEyes={{
            rightEye: pickModalOrder.rightEye,
            leftEye: pickModalOrder.leftEye,
          }}
          issueReadiness={pickModalOrder.issueReadiness || null}
          isAlternate={false}
          onConfirm={handleConfirmIssue}
          onCancel={() => {
            if (!issueBusy) setPickModalOrder(null);
          }}
        />
      )}

      <Dialog
        open={Boolean(scanError)}
        onOpenChange={(open) => {
          if (!open) setScanError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{scanError?.title || 'Scan error'}</DialogTitle>
            <DialogDescription className="text-sm text-foreground/90 pt-1">
              {scanError?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={() => setScanError(null)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default InventoryMain;
