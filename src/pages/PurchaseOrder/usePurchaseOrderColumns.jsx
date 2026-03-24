import { Building, Trash2, PackageCheck, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getStatusLabel } from "./PurchaseOrder.constants";

// Allow receiving when PO is DRAFT or RECEIVED (and still has pending qty — checked via po.quantity vs po.receivedQty)
const canReceive = (po) =>
  ["DRAFT"].includes(po.status) &&
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
) => {
  return [
    {
      accessorKey: "poNumber",
      header: "PO Number",
      sortable: true,
      cell: (po) => (
        <a
          href={`/masters/purchase-orders/view/${po.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.preventDefault();
            window.open(`/masters/purchase-orders/view/${po.id}`, "_blank");
          }}
          className="flex items-center gap-1.5 hover:underline cursor-pointer"
        >
          <div>
            <div className="font-medium text-xs text-primary">
              {po.poNumber}
            </div>
            {po.reference_id && (
              <div className="text-xs text-muted-foreground">
                Ref: {po.reference_id}
              </div>
            )}
          </div>
        </a>
      ),
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
              className="h-7 px-2 text-xs text-amber-700 border-amber-200 hover:bg-amber-50 hover:text-amber-700 gap-1"
              onClick={() => onEditReceive && onEditReceive(po)}
            >
              <PencilLine className="h-3.5 w-3.5" />
              Edit Receive
            </Button>
          )}
        </div>
      ),
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (po) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="xs"
            className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete && onDelete(po)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
