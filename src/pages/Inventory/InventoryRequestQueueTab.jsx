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
import QueueCardLensSpecs from './QueueCardLensSpecs';

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
    shortageRight: order.shortageRight,
    shortageLeft: order.shortageLeft,
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

function hasActiveLinkedPo(order) {
  return order?.purchaseOrders?.some(
    (p) =>
      p.status !== 'CANCELLED' &&
      ['DRAFT', 'PO_PARTIAL_RECEIVED', 'RECEIVED'].includes(p.status)
  );
}

function hasSpecValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function DetailRow({ label, value }) {
  if (!hasSpecValue(value)) return null;
  return (
    <div className="text-xs text-muted-foreground">
      <span className="font-semibold text-foreground">{label}:</span> {value}
    </div>
  );
}

function QueueCard({ order, onIssue, onRaisePo, busy }) {
  const badge = queueBadge(order.status);
  const statusClass = statusColors[order.status] || statusColors.DRAFT;
  const canRaisePo =
    ['DRAFT', 'PO_CANCELLED'].includes(order.status) &&
    !hasActiveLinkedPo(order) &&
    !order.isStockAvailable;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border p-4 space-y-3 shadow-sm hover:shadow-md transition duration-200 flex flex-col">
      <div className="flex justify-between gap-2">
        <span className="font-semibold text-foreground">{order.orderNo}</span>
        <Badge className={`${statusClass} text-xs border shrink-0`}>
          {order.status?.replace(/_/g, ' ')}
        </Badge>
      </div>

      {badge && (
        <Badge variant="outline" className="text-xs w-fit">
          {badge}
        </Badge>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <div className="space-y-2 min-w-0">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
            Details
          </h4>
          <div className="space-y-1">
            <DetailRow label="Customer" value={order.customer?.name} />
            <DetailRow label="Ref" value={order.customerRefNo} />
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Procurement:</span>
              <ProcurementBadge type={order.procurementType} />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <span className="font-semibold text-foreground">Stock Status:</span>
              {order.isStockAvailable ? (
                <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] py-0 px-1.5 uppercase font-bold">
                  In Stock
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">
                  Out of Stock
                </Badge>
              )}
            </div>
            <DetailRow label="Product" value={order.lensProduct?.lens_name} />
            <DetailRow label="Category" value={order.category?.name || order.lensCategory?.name} />
            <DetailRow label="Type" value={order.lensType?.name || order.type?.name} />
            <DetailRow label="Coating" value={order.coating?.name} />
          </div>
        </div>

        <div className="space-y-2 min-w-0">
          <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[10px]">
            Lens Specifications
          </h4>
          <div className="space-y-2">
            <QueueCardLensSpecs order={order} />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1 border-t">
        <Button size="sm" onClick={() => onIssue(order)} disabled={busy}>
          Issue &amp; Pre-QC
        </Button>
        {canRaisePo && (
          <Button size="sm" variant="outline" onClick={() => onRaisePo(order)} disabled={busy}>
            Raise PO
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(`${window.location.origin}/sales/orders/view/${order.id}`, "_blank")}
        >
          View SO
        </Button>
      </div>
    </div>
  );
}

export default function InventoryRequestQueueTab({ refreshKey = 0, godownType = 'STOCK' }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [softReservedQty, setSoftReservedQty] = useState(0);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  const [pickModalOrder, setPickModalOrder] = useState(null);
  const [raisePoOrder, setRaisePoOrder] = useState(null);
  const [isRaisePoModalOpen, setIsRaisePoModalOpen] = useState(false);
  const [isRaisingPo, setIsRaisingPo] = useState(false);

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
        procurementType: godownType || undefined,
      };
      const res = await getInventorySoQueue(params);
      if (res.success) {
        setOrders(res.data || []);
        setSoftReservedQty(Number(res.softReservedQty) || 0);
      }
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, filters, toast, godownType]);

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
    setIsRaisePoModalOpen(true);
  };

  const closeRaisePoModal = () => {
    setIsRaisePoModalOpen(false);
    setRaisePoOrder(null);
  };

  const handleRaisePoConfirm = async (vendorId, eyes = {}) => {
    if (!raisePoOrder) return;
    setIsRaisingPo(true);
    try {
      const res = await raisePoFromSo(raisePoOrder.id, {
        vendorId,
        source: 'INVENTORY',
        rightEye: eyes.rightEye,
        leftEye: eyes.leftEye,
      });
      if (res.success) {
        toast({
          title: 'Success',
          description: `PO ${res.data?.poNumber} raised successfully`,
        });
        closeRaisePoModal();
        load();
      }
    } catch (e) {
      toast({
        title: 'Failed to raise PO',
        description: e.message || 'Could not raise purchase order',
        variant: 'destructive',
      });
      closeRaisePoModal();
    } finally {
      setIsRaisingPo(false);
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

      {softReservedQty > 0 && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 dark:bg-sky-950/30 dark:border-sky-800 px-3 py-2 text-xs text-sky-900 dark:text-sky-100 flex-shrink-0">
          Soft-reserved to queue: <span className="font-semibold">{softReservedQty}</span> unit
          {softReservedQty === 1 ? '' : 's'} (FIFO display allocation — hard reserve on Issue &amp; Pre-QC)
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 p-1">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
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

      <RaisePoModal
        open={isRaisePoModalOpen}
        onOpenChange={(open) => {
          if (!open) closeRaisePoModal();
          else setIsRaisePoModalOpen(true);
        }}
        summary={raisePoOrder ? buildOrderSummary(raisePoOrder) : null}
        onConfirm={handleRaisePoConfirm}
        loading={isRaisingPo}
        mode="inventory"
      />

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
