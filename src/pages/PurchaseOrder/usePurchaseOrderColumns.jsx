import { Building, Trash2, PackageCheck, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getStatusColor, getStatusLabel } from "./PurchaseOrder.constants";

// Allow receiving when PO is DRAFT or partially received (and still has pending qty)
const canReceive = (po) =>
  ["DRAFT", "PARTIALLY_RECEIVED", "PO_PARTIAL_RECEIVED"].includes(po.status) &&
  (po.quantity || 0) > (po.receivedQty || 0);

function formatListDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString();
}

function formatLensNameWithIndex(po) {
  const name = po.lensProduct?.lens_name;
  if (!name) return "-";
  const indexName = po.lensProduct?.index?.index_name;
  return indexName ? `${name} [${indexName}]` : name;
}

/**
 * Custom hook that returns the table columns configuration for the purchase order list
 */
export const usePurchaseOrderColumns = (
  navigate,
  onDelete,
  onReceive,
  onEditReceive,
  onInward,
  onDownload,
  downloadingId,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
  allPageSelected = false,
  somePageSelected = false,
  selectAllDisabled = false,
) => {
  return [
    // ── Checkbox column ──────────────────────────────────────────────────────
    {
      accessorKey: "__select",
      header: (
        <div
          className="flex items-center justify-center px-1"
          onClick={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={
              allPageSelected
                ? true
                : somePageSelected
                  ? "indeterminate"
                  : false
            }
            onCheckedChange={(checked) =>
              onSelectAll && onSelectAll(checked === true)
            }
            disabled={selectAllDisabled}
            aria-label="Select all on this page"
            title="Select all on this page"
          />
        </div>
      ),
      sortable: false,
      width: 40,
      cell: (po) => (
        <div className="flex items-center justify-center px-1">
          <Checkbox
            checked={selectedIds.has(po.id)}
            onCheckedChange={() => onToggleSelect && onToggleSelect(po)}
            aria-label={`Select ${po.poNumber}`}
          />
        </div>
      ),
    },
    {
      accessorKey: "poNumber",
      header: "PO Number",
      sortable: true,
      cell: (po) => (
        <a
          href={`/masters/purchase-orders/view/${po.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:underline cursor-pointer text-left"
        >
          <div>
            <div className="font-medium text-[11px] text-primary">{po.poNumber}</div>
          </div>
        </a>
      ),
    },
    {
      accessorKey: "reference_id",
      header: "Customer Ref / Ref No",
      sortable: true,
      cell: (po) => {
        const displayRef =
          po.orderType !== "Bulk" && po.saleOrder?.customerRefNo
            ? po.saleOrder.customerRefNo
            : (po.reference_id || "-");
        return <span className="text-[11px]">{displayRef}</span>;
      },
    },
    {
      accessorKey: "soCustomer",
      header: "SO Customer",
      sortable: false,
      cell: (po) => (
        <span className="text-[11px]">
          {po.saleOrder?.customer?.name || "-"}
        </span>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      sortable: false,
      cell: (po) => (
        <div className="flex items-center gap-1.5">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span className="text-[11px]">{po.vendor?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "orderType",
      header: "Type",
      sortable: false,
      cell: (po) => (
        <Badge variant="outline" className="text-3xs h-4 px-1">
          {po.orderType || "Single"}
        </Badge>
      ),
    },
    {
      accessorKey: "lensProduct",
      header: "Lens Name",
      sortable: false,
      width: 220,
      cell: (po) => (
        <span className="text-[11px] block min-w-[180px]">
          {formatLensNameWithIndex(po)}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: true,
      cell: (po) => {
        const statusColor = getStatusColor(po.status);
        return (
          <Badge variant="outline" className={`${statusColor} text-3xs`}>
            {getStatusLabel(po.status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "orderDate",
      header: "Ordered Date",
      sortable: true,
      cell: (po) => (
        <span className="text-[11px]">{formatListDate(po.orderDate)}</span>
      ),
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Expected Date",
      sortable: true,
      cell: (po) => (
        <span className="text-[11px]">
          {formatListDate(po.expectedDeliveryDate)}
        </span>
      ),
    },
    {
      accessorKey: "receivedDate",
      header: "Received Date",
      sortable: false,
      cell: (po) => (
        <span className="text-[11px]">{formatListDate(po.receivedDate)}</span>
      ),
    },
    {
      accessorKey: "tatDays",
      header: "TAT",
      sortable: false,
      cell: (po) => (
        <span className="text-[11px]">
          {po.tatDays == null ? "-" : `${po.tatDays}d`}
        </span>
      ),
    },
    {
      accessorKey: "activities",
      header: "Activities",
      sortable: false,
      cell: (po) => (
        <div className="flex gap-1">
          {canReceive(po) && (
            <Button
              variant="outline"
              size="xs"
              className="h-7 px-2 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 hover:text-blue-700 gap-1"
              onClick={() => onReceive && onReceive(po)}
            >
              <PackageCheck className="h-3.5 w-3.5" />
              Receive
            </Button>
          )}
          {po.status === "RECEIVED" && (
            <Button
              variant="outline"
              size="xs"
              className="h-7 px-2 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 gap-1"
              onClick={() => onInward && onInward(po)}
            >
              <Warehouse className="h-3.5 w-3.5" />
              Inward
            </Button>
          )}
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (po) => {
        return (
          <div className="flex gap-1">
            {po.status !== "RECEIVED" && po.status !== "PARTIALLY_RECEIVED" && (po.receivedQty || 0) === 0 && (
              <Button
                variant="ghost"
                size="xs"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onDelete && onDelete(po)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];
};
