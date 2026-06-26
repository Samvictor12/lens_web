import { useEffect, useState, useCallback } from 'react';
import { Search, AlertCircle, SlidersHorizontal, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Refresh } from '@/components/ui/Refresh';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getInventorySoQueue,
  raisePoFromSo,
  issueSoToPreQc,
  getCustomersDropdown,
  getLensProductsDropdown,
} from '@/services/saleOrder';
import { statusColors } from '@/pages/SaleOrder/SaleOrder.constants';
import { queueBadge } from '@/constants/saleOrderStatus';
import StockPickModal from './StockPickModal';

function QueueCard({ order, onIssue, onRaisePo, busy }) {
  const badge = queueBadge(order.status);
  const statusClass = statusColors[order.status] || statusColors.DRAFT;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3 shadow-sm hover:shadow-md transition duration-200">
      <div className="flex justify-between gap-2">
        <span className="font-semibold text-foreground">{order.orderNo}</span>
        <Badge className={`${statusClass} text-xs border`}>
          {order.status?.replace(/_/g, ' ')}
        </Badge>
      </div>
      {badge && (
        <Badge variant="outline" className="text-xs">
          {badge}
        </Badge>
      )}
      <p className="text-sm text-muted-foreground truncate">
        {order.customer?.name} {order.customerRefNo ? `· Ref: ${order.customerRefNo}` : ''}
      </p>
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>Procurement: {order.procurementType || 'RX'}</span>
      </div>
      <p className="text-sm font-medium truncate text-foreground">{order.lensProduct?.lens_name || '—'}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => onIssue(order)} disabled={busy}>
          Issue &amp; Pre-QC
        </Button>
        {['DRAFT', 'PO_CANCELLED'].includes(order.status) && (
          <Button size="sm" variant="outline" onClick={() => onRaisePo(order.id)} disabled={busy}>
            Raise PO
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(`/sales/orders/view/${order.id}`, '_blank')}
        >
          View SO
        </Button>
      </div>
    </div>
  );
}

export default function InventoryRequestQueueTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [pickModalOrder, setPickModalOrder] = useState(null);

  // Filters & Grouping state
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [filterCustomerRefNo, setFilterCustomerRefNo] = useState('');
  const [filterOrderNo, setFilterOrderNo] = useState('');
  const [groupBy, setGroupBy] = useState('none');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState({});

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [custRes, prodRes] = await Promise.all([
          getCustomersDropdown(),
          getLensProductsDropdown(),
        ]);
        if (custRes.success) setCustomers(custRes.data || []);
        if (prodRes.success) setProducts(prodRes.data || []);
      } catch (err) {
        console.error('Failed to load filter dropdowns', err);
      }
    }
    loadDropdowns();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        search: search || undefined,
        customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
        lensProductId: selectedProductId !== 'all' ? selectedProductId : undefined,
        customerRefNo: filterCustomerRefNo || undefined,
        orderNo: filterOrderNo || undefined,
      };
      const res = await getInventorySoQueue(params);
      if (res.success) setOrders(res.data || []);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, selectedCustomerId, selectedProductId, filterCustomerRefNo, filterOrderNo, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey, localRefreshKey]);

  const handleIssueClick = (order) => {
    setPickModalOrder(order);
  };

  const handleConfirmIssue = async (itemIds) => {
    if (!pickModalOrder) return;
    setBusy(true);
    try {
      const res = await issueSoToPreQc(pickModalOrder.id, itemIds);
      if (res.success) {
        toast({ title: 'Issued to Pre-QC' });
        setPickModalOrder(null);
        load();
      }
    } catch (e) {
      toast({ title: 'Issue failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleRaisePo = async (id) => {
    setBusy(true);
    try {
      const res = await raisePoFromSo(id, 'INVENTORY');
      if (res.success) {
        toast({ title: 'PO raised', description: res.data?.poNumber });
        window.open(`/masters/purchase-orders/edit/${res.data.id}`, '_blank');
        load();
      }
    } catch (e) {
      toast({ title: 'Raise PO failed', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupKey]: prev[groupKey] === false ? true : false,
    }));
  };

  const getGroupedOrders = () => {
    if (groupBy === 'none') return null;

    return orders.reduce((groups, order) => {
      let key = 'Unknown';
      if (groupBy === 'customer') {
        key = order.customer ? `${order.customer.name} (${order.customer.code})` : 'Unknown Customer';
      } else if (groupBy === 'product') {
        key = order.lensProduct ? `${order.lensProduct.lens_name} (${order.lensProduct.product_code})` : 'Unknown Product';
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(order);
      return groups;
    }, {});
  };

  const groupedOrders = getGroupedOrders();

  return (
    <div className="flex flex-col h-full gap-2">
      <Card className="p-1.5 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by SO # or Ref #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="pl-9 h-8 text-sm bg-white dark:bg-slate-900"
            />
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`h-8 gap-1.5 text-xs bg-white dark:bg-slate-900 ${
              showFilters ? 'bg-slate-100 dark:bg-slate-800 border-primary' : ''
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {(selectedCustomerId !== 'all' || selectedProductId !== 'all' || filterCustomerRefNo || filterOrderNo) && (
              <Badge variant="secondary" className="ml-1 px-1 h-3.5 bg-primary text-primary-foreground text-[9px]">
                Active
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Group By:</span>
            <Select value={groupBy} onValueChange={setGroupBy}>
              <SelectTrigger className="w-[110px] h-8 text-xs bg-white dark:bg-slate-900 border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="product">Product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Refresh onClick={() => setLocalRefreshKey((k) => k + 1)} className="h-8 w-8 bg-white dark:bg-slate-900" />
        </div>

        {showFilters && (
          <div className="border-t mt-2 pt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="w-full h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">All Customers</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name} {c.code ? `(${c.code})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Lens Product</label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="w-full h-8 text-xs bg-white dark:bg-slate-900">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.label || p.lens_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Customer Ref No</label>
              <Input
                placeholder="Ref number..."
                value={filterCustomerRefNo}
                onChange={(e) => setFilterCustomerRefNo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && load()}
                className="h-8 text-xs bg-white dark:bg-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">SO Number</label>
              <div className="flex gap-2">
                <Input
                  placeholder="SO-XXXX..."
                  value={filterOrderNo}
                  onChange={(e) => setFilterOrderNo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && load()}
                  className="h-8 text-xs flex-1 bg-white dark:bg-slate-900"
                />
                {(selectedCustomerId !== 'all' || selectedProductId !== 'all' || filterCustomerRefNo || filterOrderNo) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCustomerId('all');
                      setSelectedProductId('all');
                      setFilterCustomerRefNo('');
                      setFilterOrderNo('');
                    }}
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                    title="Clear all filters"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground flex flex-col items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            No orders in queue
          </div>
        ) : groupBy === 'none' ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-1">
            {orders.map((o) => (
              <QueueCard
                key={o.id}
                order={o}
                onIssue={handleIssueClick}
                onRaisePo={handleRaisePo}
                busy={busy}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-4 p-1">
            {Object.entries(groupedOrders).map(([key, groupOrders]) => (
              <div key={key} className="space-y-2">
                <div 
                  onClick={() => toggleGroup(key)}
                  className="bg-slate-50 dark:bg-slate-900 border px-4 py-2 flex justify-between items-center rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition duration-200"
                >
                  <div className="flex items-center gap-2">
                    {expandedGroups[key] === false ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm text-foreground">{key}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs bg-slate-200/60 dark:bg-slate-850 text-muted-foreground">
                    {groupOrders.length} {groupOrders.length === 1 ? 'order' : 'orders'}
                  </Badge>
                </div>
                
                {expandedGroups[key] !== false && (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 pl-2 transition-all">
                    {groupOrders.map((o) => (
                      <QueueCard
                        key={o.id}
                        order={o}
                        onIssue={handleIssueClick}
                        onRaisePo={handleRaisePo}
                        busy={busy}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {pickModalOrder && (
        <StockPickModal
          saleOrderId={pickModalOrder.id}
          requiredEyes={{ rightEye: pickModalOrder.rightEye, leftEye: pickModalOrder.leftEye }}
          onConfirm={handleConfirmIssue}
          onCancel={() => setPickModalOrder(null)}
        />
      )}
    </div>
  );
}
