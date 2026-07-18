import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Warehouse, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Refresh } from '@/components/ui/Refresh';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { getInventoryInwardQueue, dispositionQcReturn } from '@/services/inventory';
import { godownTypeToSlug, inventoryInwardDetailPath } from './inventoryGodown';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
};

export default function InventoryInwardQueueTab({ refreshKey = 0, godownType = 'STOCK' }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [queueItems, setQueueItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [localRefreshKey, setLocalRefreshKey] = useState(0);

  const [dispositionRow, setDispositionRow] = useState(null);
  const [dispositionAction, setDispositionAction] = useState(null); // REUSE | DISPOSE
  const [dispositionRemark, setDispositionRemark] = useState('');
  const [isSubmittingDisposition, setIsSubmittingDisposition] = useState(false);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setIsLoading(true);
        const response = await getInventoryInwardQueue({
          page: pageIndex + 1,
          limit: pageSize,
          search: searchQuery,
          godownType,
        });

        if (response.success) {
          setQueueItems(response.data || []);
          setTotalCount(response.pagination?.totalItems || 0);
          return;
        }

        throw new Error(response.message || 'Failed to load inward queue');
      } catch (error) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load inward queue',
          variant: 'destructive',
        });
        setQueueItems([]);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    loadQueue();
  }, [pageIndex, pageSize, refreshKey, searchQuery, toast, localRefreshKey, godownType]);

  const openDisposition = (item, action) => {
    setDispositionRow(item);
    setDispositionAction(action);
    setDispositionRemark('');
  };

  const closeDisposition = (force = false) => {
    if (isSubmittingDisposition && !force) return;
    setDispositionRow(null);
    setDispositionAction(null);
    setDispositionRemark('');
  };

  const submitDisposition = async () => {
    if (!dispositionRow?.qcReturnId || !dispositionAction) return;
    try {
      setIsSubmittingDisposition(true);
      const response = await dispositionQcReturn(dispositionRow.qcReturnId, {
        disposition: dispositionAction,
        remark: dispositionRemark.trim() || undefined,
      });
      if (!response.success) {
        throw new Error(response.message || 'Failed to process return');
      }
      toast({
        title: dispositionAction === 'REUSE' ? 'Returned to stock' : 'Disposed',
        description:
          dispositionAction === 'REUSE'
            ? 'Lens is available again in the same godown.'
            : 'Lens marked damaged and not usable.',
      });
      closeDisposition(true);
      setLocalRefreshKey((prev) => prev + 1);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to process return',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingDisposition(false);
    }
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'receiptNumber',
        header: 'Receipt / Order',
        cell: (item) => (
          <div>
            <div className="flex items-center gap-1.5">
              <div className="text-xs font-medium text-primary">{item.receiptNumber}</div>
              {item.queueType === 'QC_RETURN' && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-5 bg-amber-50 text-amber-800 border-amber-200"
                >
                  QC Return
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {item.queueType === 'QC_RETURN'
                ? item.sourceLabel || 'QC Return'
                : `PO: ${item.poNumber}`}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'vendor',
        header: 'Vendor / Customer',
        cell: (item) => (
          <div>
            <div className="text-xs font-medium">{item.vendor?.name || '-'}</div>
            <div className="text-xs text-muted-foreground">
              {item.queueType === 'QC_RETURN'
                ? item.eyeSummary || item.lensProduct?.lens_name || '-'
                : item.lensProduct?.lens_name || '-'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'quantities',
        header: 'Received / Inward / Pending',
        cell: (item) =>
          item.queueType === 'QC_RETURN' ? (
            <div className="text-xs text-muted-foreground max-w-[180px] truncate" title={item.rejectRemark || ''}>
              {item.rejectRemark || '—'}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs">
              <span>{item.totalReceivedQty}</span>
              <span className="text-muted-foreground">/</span>
              <span className="text-green-700">{item.inwardedQty}</span>
              <span className="text-muted-foreground">/</span>
              <span className="font-semibold text-orange-600">{item.pendingQty}</span>
            </div>
          ),
      },
      {
        accessorKey: 'receivedDate',
        header: 'Date',
        cell: (item) => (
          <span className="text-xs">{formatDate(item.receivedDate || item.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (item) =>
          item.queueType === 'QC_RETURN' ? (
            <Badge
              variant="outline"
              className="text-xs bg-amber-50 text-amber-800 border-amber-200"
            >
              Pending disposition
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-xs bg-orange-50 text-orange-700 border-orange-200"
            >
              Pending {item.pendingQty}
            </Badge>
          ),
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        cell: (item) =>
          item.queueType === 'QC_RETURN' ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                className="h-7 gap-1 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                onClick={() => openDisposition(item, 'REUSE')}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reuse
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="h-7 gap-1 text-xs text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => openDisposition(item, 'DISPOSE')}
              >
                Dispose
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="xs"
              className="h-7 gap-1 text-xs text-primary border-primary/30 hover:bg-primary/5"
              onClick={() =>
                navigate(
                  inventoryInwardDetailPath(
                    godownTypeToSlug(godownType),
                    item.purchaseOrderId,
                    item.receiptId
                  )
                )
              }
            >
              <Warehouse className="h-3.5 w-3.5" />
              Start Inward
            </Button>
          ),
      },
    ],
    [navigate, godownType]
  );

  return (
    <div className="flex flex-col h-full gap-2">
      <Card className="p-1 flex-shrink-0">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search receipt, PO, SO, vendor, customer, lens, remark..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPageIndex(0);
              }}
              className="pl-9 h-8 text-sm"
            />
          </div>
          <Refresh
            onClick={() => {
              setLocalRefreshKey((prev) => prev + 1);
              setPageIndex(0);
            }}
          />
        </div>
      </Card>

      <div className="flex-1 min-h-0">
        <Table
          data={queueItems}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          loading={isLoading}
          pagination={true}
          emptyMessage="No pending inward receipts or QC returns found"
        />
      </div>

      <Dialog open={Boolean(dispositionRow)} onOpenChange={(open) => !open && closeDisposition()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dispositionAction === 'REUSE' ? 'Reuse lens' : 'Dispose lens'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-md border bg-muted/40 px-3 py-2 space-y-1">
              <div>
                <span className="text-muted-foreground">Order: </span>
                {dispositionRow?.receiptNumber || '—'}
              </div>
              <div>
                <span className="text-muted-foreground">Source: </span>
                {dispositionRow?.sourceLabel || '—'}
              </div>
              {dispositionRow?.rejectRemark ? (
                <div>
                  <span className="text-muted-foreground">QC remark: </span>
                  {dispositionRow.rejectRemark}
                </div>
              ) : null}
            </div>
            <p className="text-muted-foreground text-xs">
              {dispositionAction === 'REUSE'
                ? 'Lens will become AVAILABLE in the same godown.'
                : 'Lens will be marked DAMAGED and not usable.'}
            </p>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Inventory note (optional)</label>
              <Textarea
                value={dispositionRemark}
                onChange={(e) => setDispositionRemark(e.target.value)}
                placeholder="Optional note for this disposition"
                rows={3}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={closeDisposition}
              disabled={isSubmittingDisposition}
            >
              Cancel
            </Button>
            <Button
              onClick={submitDisposition}
              disabled={isSubmittingDisposition}
              className={
                dispositionAction === 'DISPOSE'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : undefined
              }
            >
              {isSubmittingDisposition
                ? 'Saving…'
                : dispositionAction === 'REUSE'
                  ? 'Confirm Reuse'
                  : 'Confirm Dispose'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
