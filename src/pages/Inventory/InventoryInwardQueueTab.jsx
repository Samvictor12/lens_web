import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Warehouse } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { getInventoryInwardQueue } from '@/services/inventory';

const formatDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN');
};

export default function InventoryInwardQueueTab({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [queueItems, setQueueItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const loadQueue = async () => {
      try {
        setIsLoading(true);
        const response = await getInventoryInwardQueue({
          page: pageIndex + 1,
          limit: pageSize,
          search: searchQuery,
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
  }, [pageIndex, pageSize, refreshKey, searchQuery, toast]);

  const columns = useMemo(
    () => [
      {
        accessorKey: 'receiptNumber',
        header: 'Receipt',
        cell: (item) => (
          <div>
            <div className="text-xs font-medium text-primary">{item.receiptNumber}</div>
            <div className="text-xs text-muted-foreground">PO: {item.poNumber}</div>
          </div>
        ),
      },
      {
        accessorKey: 'vendor',
        header: 'Vendor / Lens',
        cell: (item) => (
          <div>
            <div className="text-xs font-medium">{item.vendor?.name || '-'}</div>
            <div className="text-xs text-muted-foreground">{item.lensProduct?.lens_name || '-'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'quantities',
        header: 'Received / Inward / Pending',
        cell: (item) => (
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
        header: 'Received Date',
        cell: (item) => (
          <span className="text-xs">{formatDate(item.receivedDate || item.createdAt)}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (item) => (
          <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
            Pending {item.pendingQty}
          </Badge>
        ),
      },
      {
        accessorKey: 'actions',
        header: 'Actions',
        cell: (item) => (
          <Button
            variant="outline"
            size="xs"
            className="h-7 gap-1 text-xs text-primary border-primary/30 hover:bg-primary/5"
            onClick={() => navigate(`/inventory/inward/${item.purchaseOrderId}/${item.receiptId}`)}
          >
            <Warehouse className="h-3.5 w-3.5" />
            Start Inward
          </Button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <div className="flex flex-col h-full gap-2">
      <Card className="p-1 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search receipt no, PO no, vendor, lens..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPageIndex(0);
            }}
            className="pl-9 h-8 text-sm"
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
          emptyMessage="No pending inward receipts found"
        />
      </div>
    </div>
  );
}
