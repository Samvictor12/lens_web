import { useEffect, useState, useCallback } from 'react';
import { Search, AlertCircle, ChevronDown, ChevronRight, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Refresh } from '@/components/ui/Refresh';
import { FormSelect } from '@/components/ui/form-select';
import { useToast } from '@/hooks/use-toast';
import {
  getInventorySoQueue,
  issueSoToPreQc,
  raisePoFromSo,
} from '@/services/saleOrder';
import { statusColors } from '@/pages/SaleOrder/SaleOrder.constants';
import { queueBadge } from '@/constants/saleOrderStatus';
import {
  soRequestQueueFilters,
  soRequestQueueGroupingOptions,
  procurementBadgeStyles,
} from './InventoryRequestQueue.constants';
import InventoryRequestQueueFilter from './InventoryRequestQueueFilter';
import RaisePoModal from '@/components/sale-order/RaisePoModal';
import StockPickModal from './StockPickModal';

function buildOrderSummary(order) {
  return {
    orderNo: order.orderNo,
    customerName: order.customer?.name,
    customerRefNo: order.customerRefNo,
    lensProductName: order.lensProduct?.lens_name,
    categoryName: order.category?.name || order.lensCategory?.name,
    typeName: order.lensType?.name || order.type?.name,
    coatingName: order.coating?.name,
    status: order.status,
    procurementType: order.procurementType || 'RX',
    rightEye: order.rightEye,
    leftEye: order.leftEye,
    rightSpherical: order.rightSpherical,
    rightCylindrical: order.rightCylindrical,
    rightAxis: order.rightAxis,
    rightAdd: order.rightAdd,
    rightDia: order.rightDia,
    leftSpherical: order.leftSpherical,
    leftCylindrical: order.leftCylindrical,
    leftAxis: order.leftAxis,
    leftAdd: order.leftAdd,
    leftDia: order.leftDia,
  };
}

function ProcurementBadge({ type }) {
  const procurementType = type || 'RX';
  const style =
    procurementBadgeStyles[procurementType] || procurementBadgeStyles.RX;

  return (
    <Badge variant="outline" className={`text-xs border ${style}`}>
      {procurementType}
    </Badge>
  );
}

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
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Procurement:</span>
        <ProcurementBadge type={order.procurementType} />
      </div>
      <p className="text-sm font-medium truncate text-foreground">{order.lensProduct?.lens_name || '—'}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <Button size="sm" onClick={() => onIssue(order)} disabled={busy}>
          Issue &amp; Pre-QC
        </Button>
        {['DRAFT', 'PO_CANCELLED'].includes(order.status) && (
          <Button size="sm" variant="outline" onClick={() => onRaisePo(order)} disabled={busy}>
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
  const [raisePoOrder, setRaisePoOrder] = useState(null);

  const [filters, setFilters] = useState(soRequestQueueFilters);
  const [tempFilters, setTempFilters] = useState(soRequestQueueFilters);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [groupBy, setGroupBy] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  const hasActiveFilters =
    filters.customerId != null ||
    filters.lensProductId != null ||
    Boolean(filters.customerRefNo?.trim()) ||
    Boolean(filters.orderNo?.trim());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        limit: 100,
        search: search || undefined,
        customerId: filters.customerId || undefined,
        lensProductId: filters.lensProductId || undefined,
        customerRefNo: filters.customerRefNo?.trim() || undefined,
        orderNo: filters.orderNo?.trim() || undefined,
      };
      const res = await getInventorySoQueue(params);
      if (res.success) setOrders(res.data || []);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, filters, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey, localRefreshKey]);

  const handleRefresh = () => {
    setLocalRefreshKey((k) => k + 1);
    toast({
      title: 'Refreshed',
      description: 'SO Request Queue has been refreshed.',
    });
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setShowFilterDialog(false);
  };

  const handleClearFilters = () => {
    const cleared = { ...soRequestQueueFilters };
    setFilters(cleared);
    setTempFilters(cleared);
    setShowFilterDialog(false);
  };

  const handleCancelFilters = () => {
    setTempFilters(filters);
    setShowFilterDialog(false);
  };

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

  const handleRaisePoClick = (order) => {
    setRaisePoOrder(order);
  };

  const handleRaisePoConfirm = async (vendorId) => {
    if (!raisePoOrder) return;
    setBusy(true);
    try {
      const res = await raisePoFromSo(raisePoOrder.id, { vendorId, source: 'INVENTORY' });
      if (res.success) {
        toast({ title: 'PO raised', description: res.data?.poNumber });
        setRaisePoOrder(null);
        load();
      }
    } catch (e) {
      toast({ title: 'Raise PO failed', description: e.message, variant: 'destructive' });
      setRaisePoOrder(null);
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
    if (!groupBy) return null;

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
      <Card className="p-1 sm:p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by SO # or Ref #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
              Group by:
            </span>
            <div className="w-40">
              <FormSelect
                name="groupBy"
                options={soRequestQueueGroupingOptions}
                value={groupBy}
                onChange={(value) => {
                  setGroupBy(value);
                  setExpandedGroups({});
                }}
                placeholder="None"
                isSearchable={false}
                isClearable={false}
              />
            </div>
          </div>

          <InventoryRequestQueueFilter
            open={showFilterDialog}
            onOpenChange={setShowFilterDialog}
            filters={tempFilters}
            onFilterChange={setTempFilters}
            onApply={handleApplyFilters}
            onCancel={handleCancelFilters}
            hasActiveFilters={hasActiveFilters}
          />

          <Refresh onClick={handleRefresh} />

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="xs"
              className="h-8 px-2"
              onClick={handleClearFilters}
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline ml-1">Clear</span>
            </Button>
          )}
        </div>
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
        ) : !groupBy ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-1">
            {orders.map((o) => (
              <QueueCard
                key={o.id}
                order={o}
                onIssue={handleIssueClick}
                onRaisePo={handleRaisePoClick}
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
                        onRaisePo={handleRaisePoClick}
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

      {raisePoOrder && (
        <RaisePoModal
          open={Boolean(raisePoOrder)}
          onOpenChange={(open) => !open && setRaisePoOrder(null)}
          summary={buildOrderSummary(raisePoOrder)}
          onConfirm={handleRaisePoConfirm}
          loading={busy}
          mode="raise"
        />
      )}

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
