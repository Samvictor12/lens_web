import { useEffect, useState, useCallback } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Refresh } from '@/components/ui/Refresh';
import { useToast } from '@/hooks/use-toast';
import {
  getInventorySoQueue,
  raisePoFromSo,
  issueSoToPreQc,
} from '@/services/saleOrder';
import { statusColors } from '@/pages/SaleOrder/SaleOrder.constants';
import { queueBadge } from '@/constants/saleOrderStatus';
import StockPickModal from './StockPickModal';

function QueueCard({ order, onIssue, onRaisePo, busy }) {
  const badge = queueBadge(order.status);
  const statusClass = statusColors[order.status] || statusColors.DRAFT;

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex justify-between gap-2">
        <span className="font-semibold">{order.orderNo}</span>
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
        {order.customer?.name} · {order.procurementType || 'RX'}
      </p>
      <p className="text-sm truncate">{order.lensProduct?.lens_name || '—'}</p>
      <div className="flex flex-wrap gap-2">
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getInventorySoQueue({ search: search || undefined, limit: 100 });
      if (res.success) setOrders(res.data || []);
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [search, toast]);

  useEffect(() => {
    load();
  }, [load, refreshKey, localRefreshKey]);

  const handleIssueClick = (order) => {
    // Open the Stock Pick modal first — the user must select actual
    // InventoryItem(s) before the order can move to PRE_QC.
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

  return (
    <div className="flex flex-col h-full gap-2">
      <Card className="p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search order no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && load()}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Refresh onClick={() => setLocalRefreshKey((k) => k + 1)} />
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
        ) : (
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
