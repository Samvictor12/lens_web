import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ArrowRightLeft } from 'lucide-react';

import InventoryDashboard from './InventoryDashboard';
import InventoryInwardQueueTab from './InventoryInwardQueueTab';
import InventoryRequestQueueTab from './InventoryRequestQueueTab';
import InventoryTransactionsTab from './InventoryTransactionsTab';
import InventoryStockTab from './InventoryStockTab';
import { inventoryService } from '@/services/inventory';
import {
  parseInventoryPath,
  inventoryTabPath,
  inventoryTransactionAddPath,
  godownDisplayLabel,
} from './inventoryGodown';

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Inventory Management</h1>
            <Badge variant="outline" className="text-xs">
              {godownLabel}
            </Badge>
          </div>
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
        <TabsList className="grid w-full grid-cols-5 mb-4 flex-shrink-0">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="inward">Inward Queue</TabsTrigger>
          <TabsTrigger value="requestQueue">SO Request Query</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="stock">Stock Summary</TabsTrigger>
        </TabsList>

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
      </Tabs>
    </div>
  );
};

export default InventoryMain;
