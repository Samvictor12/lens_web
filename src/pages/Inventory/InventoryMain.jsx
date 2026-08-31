import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

import InventoryDashboard from './InventoryDashboard';
import InventoryInwardQueueTab from './InventoryInwardQueueTab';
import InventoryRequestQueueTab from './InventoryRequestQueueTab';
import InventoryTransactionsTab from './InventoryTransactionsTab';
import InventoryStockTab from './InventoryStockTab';
import InventoryAuditTab from './InventoryAuditTab';
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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Inventory Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage inward queue, SO Request Query, transactions, and stock levels for {godownLabel}
          </p>
        </div>
        <div className="flex gap-1.5">
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
    </div>
  );
};

export default InventoryMain;
