import { Building, Trash2, PackageCheck, PencilLine, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { getStatusColor, getStatusLabel } from "./PurchaseOrder.constants";

// Allow receiving when PO is DRAFT or PARTIALLY_RECEIVED (and still has pending qty — checked via po.quantity vs po.receivedQty)
const canReceive = (po) =>
  ["DRAFT", "PARTIALLY_RECEIVED"].includes(po.status) &&
  (po.quantity || 0) > (po.receivedQty || 0);
// Allow editing the latest receipt when PO is RECEIVED
const canEditReceipt = (status) => status === "RECEIVED";

/**
 * Custom hook that returns the table columns configuration for the purchase order list
 * @param {Function} navigate - React Router navigate function
 * @param {Function} onDelete - Delete handler function
 * @param {Function} onReceive - Receive PO handler function
 * @param {Function} onEditReceive - Edit receipt handler function
 * @returns {Array} Array of column definitions
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
) => {
  return [
    // ── Checkbox column ──────────────────────────────────────────────────────
    {
      accessorKey: "__select",
      header: "",
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
        <button
          type="button"
          onClick={() => window.open(`/masters/purchase-orders/view/${po.id}`, '_blank')}
          className="flex items-center gap-1.5 hover:underline cursor-pointer text-left"
        >
          <div>
            <div className="font-medium text-xs text-primary">{po.poNumber}</div>
          </div>
        </button>
      ),
    },
    {
      accessorKey: "reference_id",
      header: "Customer Ref / Ref No",
      sortable: true,
      cell: (po) => {
        // For Single POs linked to an SO, prefer the SO's customer reference number
        const displayRef =
          po.orderType !== "Bulk" && po.saleOrder?.customerRefNo
            ? po.saleOrder.customerRefNo
            : (po.reference_id || "-");
        return <span className="text-xs">{displayRef}</span>;
      },
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      sortable: false,
      cell: (po) => (
        <div className="flex items-center gap-1.5">
          <Building className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs">{po.vendor?.name || "-"}</span>
        </div>
      ),
    },
    {
      accessorKey: "orderType",
      header: "Type",
      sortable: false,
      cell: (po) => (
        <Badge variant="outline" className="text-[10px] h-4 px-1">
          {po.orderType || "Single"}
        </Badge>
      ),
    },
    {
      accessorKey: "lensProduct",
      header: "Lens Name",
      sortable: false,
      width: 200,
      cell: (po) => (
        <span className="text-xs block min-w-[180px]">
          {po.lensProduct?.lens_name || "-"}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Lens Category",
      sortable: false,
      cell: (po) => (
        <span className="text-xs">
          {po.category?.name || "-"}
        </span>
      ),
    },
    {
      accessorKey: "orderDate",
      header: "Order Date",
      sortable: true,
      cell: (po) => (
        <span className="text-xs">
          {po.orderDate ? new Date(po.orderDate).toLocaleDateString() : "-"}
        </span>
      ),
    },
    {
      accessorKey: "quantity",
      header: "Ordered / Received",
      sortable: true,
      cell: (po) => (
        <div className="text-xs">
          <span>{po.quantity || 0}</span>
          {po.receivedQty > 0 && (
            <span className="text-green-600 ml-1">/ {po.receivedQty}</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "totalValue",
      header: "Total Value",
      sortable: true,
      cell: (po) => (
        <span className="text-xs font-medium">
          ₹{(po.totalValue || 0).toLocaleString("en-IN")}
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
          <Badge variant="outline" className={`${statusColor} text-xs`}>
            {getStatusLabel(po.status)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Expected Delivery",
      sortable: true,
      cell: (po) => (
        <span className="text-xs">
          {po.expectedDeliveryDate
            ? new Date(po.expectedDeliveryDate).toLocaleDateString()
            : "-"}
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
          {/* 
          {po.status === "RECEIVED" && (
            <Button
              variant="outline"
              size="xs"
              className="h-7 px-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-700 gap-1"
              onClick={() => onEditReceive && onEditReceive(po)}
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit Receive
            </Button>
          )}
          */}
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
            {/* Download button moved to batch action bar — comment kept for reference
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
              onClick={() => onDownload && onDownload(po)}
              disabled={downloadingId === po.id}
              title="Download PO as Excel"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
            */}
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
