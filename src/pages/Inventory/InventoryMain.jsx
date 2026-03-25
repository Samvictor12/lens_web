import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table } from '@/components/ui/table';
import { ViewToggle } from '@/components/ui/view-toggle';
import { CardGrid } from '@/components/ui/card-grid';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import { Refresh } from '@/components/ui/Refresh';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, ArrowRightLeft } from 'lucide-react';

import InventoryCard from './InventoryCard';
import InventoryFilter from './InventoryFilter';
import InventoryDashboard from './InventoryDashboard';
import InventoryInwardQueueTab from './InventoryInwardQueueTab';
import InventoryTransactionsTab from './InventoryTransactionsTab';
import InventoryStockTab from './InventoryStockTab';
import { useInventoryColumns } from './useInventoryColumns';
import { inventoryService } from '@/services/inventory';
import { inventoryFilters as defaultFilters } from './Inventory.constants';

const tabRoutes = {
  dashboard: '/inventory/dashboard',
  items: '/inventory/items',
  inward: '/inventory/inward',
  transactions: '/inventory/transactions',
  stock: '/inventory/stock',
};

const getActiveTab = (pathname) => {
  if (pathname.startsWith('/inventory/dashboard')) return 'dashboard';
  if (pathname === '/inventory/inward') return 'inward';
  if (pathname.startsWith('/inventory/transactions')) return 'transactions';
  if (pathname.startsWith('/inventory/stock')) return 'stock';
  if (pathname.startsWith('/inventory/reports')) return 'dashboard';
  return 'items';
};
const InventoryMain = () => {
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const activeTab = useMemo(() => getActiveTab(location.pathname), [location.pathname]);
  const [view, setView] = useState(() => localStorage.getItem('inventoryView') || 'card');

  const [inventoryItems, setInventoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [sorting, setSorting] = useState([]);

  const [dashboardStats, setDashboardStats] = useState({});
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dropdownData, setDropdownData] = useState({});

  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [showFilterDialog, setShowFilterDialog] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const columns = useInventoryColumns(
    (item) => navigate(`/inventory/items/view/${item.id}`),
    (item) => navigate(`/inventory/items/edit/${item.id}`),
    (item) => {
      setItemToDelete(item);
      setDeleteDialogOpen(true);
    }
  );

  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const res = await inventoryService.getInventoryDropdowns();
        if (res.success) setDropdownData(res.data || {});
      } catch (error) {
        console.error('Error loading dropdown data:', error);
      }
    };

    loadDropdownData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'items') return;

    const loadInventoryItems = async () => {
      try {
        setIsLoading(true);
        const sortField = sorting[0]?.id || 'createdAt';
        const sortDirection = sorting[0]?.desc ? 'desc' : 'asc';
        const response = await inventoryService.getInventoryItems({
          ...filters,
          page: pageIndex + 1,
          limit: pageSize,
          search: searchQuery,
          sortBy: sortField,
          sortOrder: sortDirection,
        });

        if (response.success) {
          setInventoryItems(response.data || []);
          setTotalCount(response.pagination?.total || 0);
          return;
        }

        throw new Error(response.message || 'Failed to load inventory items');
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load inventory items',
          variant: 'destructive',
        });
        setInventoryItems([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadInventoryItems();
  }, [activeTab, filters, pageIndex, pageSize, searchQuery, sorting, toast, refreshKey]);

  useEffect(() => {
    if (activeTab !== 'dashboard') return;

    const loadDashboardStats = async () => {
      try {
        setDashboardLoading(true);
        const res = await inventoryService.getInventoryDashboard();
        if (res.success) setDashboardStats(res.data || {});
      } catch (error) {
        console.error('Error loading dashboard stats:', error);
      } finally {
        setDashboardLoading(false);
      }
    };

    loadDashboardStats();
  }, [activeTab, refreshKey]);

  const bumpRefreshKey = () => setRefreshKey((key) => key + 1);

  const hasActiveFilters = useMemo(
    () => (
      filters.status !== 'all' ||
      filters.lens_id !== null ||
      filters.category_id !== null ||
      filters.location_id !== null ||
      searchQuery !== ''
    ),
    [filters, searchQuery]
  );

  const handleViewChange = (newView) => {
    setView(newView);
    localStorage.setItem('inventoryView', newView);
  };

  const handleRefresh = () => {
    bumpRefreshKey();
    if (activeTab === 'items') {
      setPageIndex(0);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      const response = await inventoryService.deleteInventoryItem(itemToDelete.id);

      if (!response.success) {
        throw new Error(response.message || 'Failed to delete inventory item');
      }

      toast({ title: 'Success', description: 'Inventory item deleted successfully.' });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      setPageIndex(0);
      bumpRefreshKey();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inventory item.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">Inventory Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage inventory items, inward queue, transactions, and stock levels
          </p>
        </div>
        <div className="flex gap-1.5">
          <Refresh onClick={handleRefresh} />
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate('/inventory/transactions/add')}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Transaction</span>
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => navigate('/inventory/items/add')}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Item</span>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => navigate(tabRoutes[value])} className="flex flex-col h-full gap-2">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="inward">Inward Queue</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="stock">Stock Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-0">
          <InventoryDashboard stats={dashboardStats} isLoading={dashboardLoading} />
        </TabsContent>

        <TabsContent value="items" className="flex flex-col h-full gap-2 mt-0">
          <Card className="p-1 sm:p-1 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search inventory items..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPageIndex(0);
                  }}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <ViewToggle view={view} onViewChange={handleViewChange} />
                <InventoryFilter
                  filters={filters}
                  tempFilters={tempFilters}
                  setTempFilters={setTempFilters}
                  showFilterDialog={showFilterDialog}
                  setShowFilterDialog={setShowFilterDialog}
                  hasActiveFilters={hasActiveFilters}
                  onApplyFilters={() => {
                    setFilters(tempFilters);
                    setShowFilterDialog(false);
                    setPageIndex(0);
                  }}
                  onClearFilters={() => {
                    setTempFilters(defaultFilters);
                    setFilters(defaultFilters);
                    setShowFilterDialog(false);
                    setPageIndex(0);
                  }}
                  onCancelFilters={() => {
                    setTempFilters(filters);
                    setShowFilterDialog(false);
                  }}
                  dropdownData={dropdownData}
                />
              </div>
            </div>
          </Card>

          {view === 'table' && (
            <div className="flex-1 min-h-0">
              <Table
                data={inventoryItems}
                columns={columns}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPageIndex}
                loading={isLoading}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
                setSorting={setSorting}
                sorting={sorting}
                pagination={true}
                emptyMessage="No inventory items found"
              />
            </div>
          )}

          {view === 'card' && (
            <div className="flex-1 min-h-0">
              <CardGrid
                items={inventoryItems}
                renderCard={(item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onView={(selectedItem) => navigate(`/inventory/items/view/${selectedItem.id}`)}
                    onEdit={(selectedItem) => navigate(`/inventory/items/edit/${selectedItem.id}`)}
                    onDelete={(selectedItem) => {
                      setItemToDelete(selectedItem);
                      setDeleteDialogOpen(true);
                    }}
                  />
                )}
                isLoading={isLoading}
                emptyMessage="No inventory items found"
                pagination={true}
                pageIndex={pageIndex}
                pageSize={pageSize}
                totalCount={totalCount}
                onPageChange={setPageIndex}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPageIndex(0);
                }}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="inward" className="flex flex-col h-full mt-0">
          <InventoryInwardQueueTab refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="transactions" className="flex flex-col h-full mt-0">
          <InventoryTransactionsTab refreshKey={refreshKey} />
        </TabsContent>

        <TabsContent value="stock" className="flex flex-col h-full mt-0">
          <InventoryStockTab refreshKey={refreshKey} />
        </TabsContent>
      </Tabs>

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Inventory Item?"
        description={
          itemToDelete
            ? `Are you sure you want to delete "${itemToDelete.lensProduct?.lens_name || 'this item'}"? This action cannot be undone.`
            : 'Are you sure you want to delete this inventory item?'
        }
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default InventoryMain;
