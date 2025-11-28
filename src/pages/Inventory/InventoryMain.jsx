import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { ViewToggle } from '@/components/ui/view-toggle';
import { CardGrid } from '@/components/ui/card-grid';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  ArrowUpDown,
  Upload
} from 'lucide-react';

import InventoryForm from './InventoryForm';
import InventoryCard from './InventoryCard';
import InventoryFilter from './InventoryFilter';
import InventoryTransactionForm from './InventoryTransactionForm';
import { inventoryService } from '@/services/inventory';
import {
  inventoryStatusOptions,
  inventoryFilters as defaultFilters,
  inventoryItemColumns,
  getStatusColor,
  formatCurrency,
  formatDate,
} from './Inventory.constants';

const InventoryMain = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // State Management
  const [activeTab, setActiveTab] = useState('items');
  const [inventoryItems, setInventoryItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const [dropdownData, setDropdownData] = useState({});
  
  // Loading States
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Search and View
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState(
    () => localStorage.getItem('inventoryView') || 'card'
  );
  
  // Pagination states (matching CustomerMain pattern)
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Sorting state
  const [sorting, setSorting] = useState([]);
  
  // Filter States
  const [filters, setFilters] = useState(defaultFilters);
  const [tempFilters, setTempFilters] = useState(defaultFilters);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  
  // Dialog States
  const [showForm, setShowForm] = useState(false);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [viewingItem, setViewingItem] = useState(null);
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load dropdown data on mount
  useEffect(() => {
    loadDropdownData();
  }, []);

  // Load data when dependencies change
  useEffect(() => {
    if (activeTab === 'items') {
      loadInventoryItems();
    } else if (activeTab === 'transactions') {
      loadTransactions();
    } else if (activeTab === 'stock') {
      loadStockSummary();
    } else if (activeTab === 'dashboard') {
      loadDashboardStats();
    }
  }, [activeTab, pageIndex, pageSize, searchQuery, filters, sorting]);

  // Load Functions
  const loadDropdownData = async () => {
    try {
      const data = await inventoryService.getInventoryDropdowns();
      setDropdownData(data);
    } catch (error) {
      console.error('Error loading dropdown data:', error);
      toast.error('Failed to load dropdown data');
    }
  };

  const loadInventoryItems = async () => {
    try {
      setIsLoading(true);
      const sortField = sorting[0]?.id || 'createdAt';
      const sortDirection = sorting[0]?.desc ? 'desc' : 'asc';
      
      const response = await inventoryService.getInventoryItems({
        ...filters,
        page: pageIndex + 1, // Backend uses 1-indexed pages
        limit: pageSize,
        search: searchQuery,
        sortBy: sortField,
        sortOrder: sortDirection,
      });
      
      if (response.success) {
        setInventoryItems(response.data || []);
        setTotalCount(response.total || 0);
      }
    } catch (error) {
      console.error('Error loading inventory items:', error);
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

  const loadTransactions = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventoryTransactions({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setTransactions(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        totalPages: Math.ceil((response.total || 0) / prev.limit),
      }));
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const loadStockSummary = async () => {
    try {
      setLoading(true);
      const response = await inventoryService.getInventoryStock({
        ...filters,
        page: pagination.page,
        limit: pagination.limit,
      });
      
      setStockSummary(response.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.total || 0,
        totalPages: Math.ceil((response.total || 0) / prev.limit),
      }));
    } catch (error) {
      console.error('Error loading stock summary:', error);
      toast.error('Failed to load stock summary');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const stats = await inventoryService.getInventoryDashboard();
      setDashboardStats(stats);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  // Handle delete item click
  const handleDeleteClick = (item) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== 'all' ||
      filters.lens_id !== null ||
      filters.category_id !== null ||
      filters.location_id !== null ||
      searchQuery !== ''
    );
  }, [filters, searchQuery]);

  // Save view preference
  const handleViewChange = (newView) => {
    setView(newView);
    localStorage.setItem('inventoryView', newView);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleClearFilters = () => {
    const clearedFilters = defaultFilters;
    setTempFilters(clearedFilters);
    setFilters(clearedFilters);
    setShowFilterDialog(false);
    setPageIndex(0);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleView = (item) => {
    setViewingItem(item);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setIsDeleting(true);
      await inventoryService.deleteInventoryItem(itemToDelete.id);
      
      toast({
        title: 'Success',
        description: `Inventory item "${itemToDelete.lensProduct?.name || 'Item'}" has been deleted successfully.`,
      });
      
      setDeleteDialogOpen(false);
      setItemToDelete(null);
      
      // Refresh inventory list
      loadInventoryItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete inventory item.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingItem) {
        await inventoryService.updateInventoryItem(editingItem.id, formData);
        toast({
          title: 'Success',
          description: 'Inventory item updated successfully',
        });
      } else {
        await inventoryService.createInventoryItem(formData);
        toast({
          title: 'Success', 
          description: 'Inventory item created successfully',
        });
      }
      
      setShowForm(false);
      setEditingItem(null);
      loadInventoryItems();
    } catch (error) {
      console.error('Error saving item:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save inventory item',
        variant: 'destructive',
      });
    }
  };

  const handleTransactionSubmit = async (transactionData) => {
    try {
      await inventoryService.createInventoryTransaction(transactionData);
      toast({
        title: 'Success',
        description: 'Transaction created successfully',
      });
      setShowTransactionForm(false);
      
      // Refresh current tab data
      if (activeTab === 'items') loadInventoryItems();
      else if (activeTab === 'transactions') loadTransactions();
      else if (activeTab === 'stock') loadStockSummary();
    } catch (error) {
      console.error('Error creating transaction:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create transaction',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      if (activeTab === 'items') loadInventoryItems();
      else if (activeTab === 'transactions') loadTransactions();
      else if (activeTab === 'stock') loadStockSummary();
      else if (activeTab === 'dashboard') loadDashboardStats();
      setRefreshing(false);
    }, 500);
  };

  // For display, use the inventory items directly from API
  const displayItems = inventoryItems;

  return (
    <div className="flex flex-col h-full p-1 sm:p-1 md:p-3 gap-2 sm:gap-2">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            Inventory Management
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage inventory items, transactions, and stock levels
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button
            variant="outline"
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => setShowTransactionForm(true)}
          >
            <Package className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">New Transaction</span>
          </Button>
          <Button
            size="xs"
            className="gap-1.5 h-8"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Add Item</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col h-full gap-2">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="stock">Stock Summary</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Items</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {dashboardStats.totalItems || 0}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Available Items</p>
                    <p className="text-2xl font-bold text-green-600">
                      {dashboardStats.availableItems || 0}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Reserved Items</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {dashboardStats.reservedItems || 0}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
                    <p className="text-2xl font-bold text-red-600">
                      {dashboardStats.lowStockItems || 0}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="flex flex-col h-full gap-2">
          {/* Search and Filters */}
          <Card className="p-1 sm:p-1 flex-shrink-0">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search inventory items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
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
                  onApplyFilters={handleApplyFilters}
                  onClearFilters={handleClearFilters}
                  onCancelFilters={handleCancelFilters}
                  dropdownData={dropdownData}
                />
              </div>
            </div>
          </Card>

          {/* Table View */}
          {view === 'table' && (
            <div className="flex-1 min-h-0">
              <Table
                data={displayItems}
                columns={inventoryItemColumns}
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
                renderRow={(item) => (
                  <tr key={item.id}>
                    <td className="font-medium">{item.id}</td>
                    <td>{item.batchNo || '-'}</td>
                    <td>{item.lensProduct?.name || '-'}</td>
                    <td>{item.category?.name || '-'}</td>
                    <td>{item.location?.name || '-'}</td>
                    <td>{item.tray?.name || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.costPrice)}</td>
                    <td>{formatCurrency(item.sellingPrice)}</td>
                    <td>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </td>
                    <td>{formatDate(item.inwardDate)}</td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingItem(item)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              />
            </div>
          )}

          {/* Card View */}
          {view === 'card' && (
            <div className="flex-1 min-h-0">
              <CardGrid
                items={displayItems}
                renderCard={(item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleEdit(item)}
                    onDelete={() => handleDeleteClick(item)}
                    onView={() => setViewingItem(item)}
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

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-gray-600">Transaction management interface will be implemented here</p>
          </div>
        </TabsContent>

        {/* Stock Summary Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="text-center py-8">
            <p className="text-gray-600">Stock summary interface will be implemented here</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </DialogTitle>
          </DialogHeader>
          <InventoryForm
            initialData={editingItem}
            dropdownData={dropdownData}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingItem(null);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={showTransactionForm} onOpenChange={setShowTransactionForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Inventory Transaction</DialogTitle>
          </DialogHeader>
          <InventoryTransactionForm
            dropdownData={dropdownData}
            onSubmit={handleTransactionSubmit}
            onCancel={() => setShowTransactionForm(false)}
          />
        </DialogContent>
      </Dialog>



      {/* Item Details Dialog */}
      {viewingItem && (
        <Dialog open={!!viewingItem} onOpenChange={() => setViewingItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Inventory Item Details</DialogTitle>
            </DialogHeader>
            <InventoryCard 
              item={viewingItem} 
              detailed={true}
              onEdit={() => {
                setViewingItem(null);
                handleEdit(viewingItem);
              }}
              onDelete={() => {
                setViewingItem(null);
                handleDelete(viewingItem.id);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Delete Inventory Item?"
        description={
          itemToDelete
            ? `Are you sure you want to delete "${itemToDelete.lensProduct?.name || 'this item'}"? This action cannot be undone.`
            : "Are you sure you want to delete this inventory item?"
        }
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default InventoryMain;