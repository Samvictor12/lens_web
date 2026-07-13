import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Eye,
  Truck,
  CheckCircle,
  PauseCircle,
} from "lucide-react";
import { updateDispatchStatus } from "@/services/dispatch";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const STATUS_CONFIG = {
  PENDING: { label: "Ready for Pickup", className: "border-amber-300 bg-amber-50 text-amber-800" },
  IN_TRANSIT: { label: "In Transit", className: "border-blue-300 bg-blue-50 text-blue-800" },
  DELIVERED: { label: "Delivered", className: "border-green-300 bg-green-50 text-green-800" },
  ON_HOLD: { label: "On Hold", className: "border-red-300 bg-red-50 text-red-800" },
};

function DispatchRowActions({
  dispatch,
  onStatusUpdated,
  onSignatureRequest,
  onView,
}) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(null);

  const handleAction = async (action) => {
    if (action === "DELIVERED") {
      onSignatureRequest?.(dispatch.id);
      return;
    }
    try {
      setIsUpdating(action);
      await updateDispatchStatus(dispatch.id, action);
      toast({
        title: "Updated",
        description:
          action === "PICKUP"
            ? "Dispatch picked up — now In Transit"
            : action === "ON_HOLD"
              ? "Dispatch put on hold"
              : `Dispatch marked as ${action}`,
      });
      onStatusUpdated?.();
    } catch (err) {
      toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
    } finally {
      setIsUpdating(null);
    }
  };

  const loading = (action) => isUpdating === action;

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs gap-1"
        onClick={() => onView?.(dispatch)}
      >
        <Eye className="h-3 w-3" />
        View
      </Button>
      {dispatch.status !== "DELIVERED" && (
        <>
          {dispatch.status === "PENDING" && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1"
              disabled={!!isUpdating}
              onClick={() => handleAction("PICKUP")}
            >
              {loading("PICKUP") ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Truck className="h-3 w-3" />
              )}
              Pickup
            </Button>
          )}
          {dispatch.status === "IN_TRANSIT" && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1 bg-green-600 hover:bg-green-700"
              disabled={!!isUpdating}
              onClick={() => handleAction("DELIVERED")}
            >
              <CheckCircle className="h-3 w-3" />
              Delivered
            </Button>
          )}
          {(dispatch.status === "PENDING" || dispatch.status === "IN_TRANSIT") && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={!!isUpdating}
              onClick={() => handleAction("ON_HOLD")}
            >
              {loading("ON_HOLD") ? (
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <PauseCircle className="h-3 w-3" />
              )}
              Hold
            </Button>
          )}
          {dispatch.status === "ON_HOLD" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              disabled={!!isUpdating}
              onClick={() => handleAction("PICKUP")}
            >
              <Truck className="h-3 w-3" />
              Resume
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Table columns for Dispatch List (Cards | Table toggle).
 */
export const useDispatchColumns = ({
  onStatusUpdated,
  onSignatureRequest,
  onView,
}) => {
  return [
    {
      accessorKey: "dcNumber",
      header: "DC #",
      sortable: false,
      cell: (row) => (
        <button
          type="button"
          className="font-medium text-xs text-primary hover:underline"
          onClick={() => onView?.(row)}
        >
          {row.dcNumber}
        </button>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
      sortable: false,
      cell: (row) => (
        <div>
          <div className="font-medium text-xs">
            {row.customer?.shopname || row.customer?.name || "—"}
          </div>
          {row.customer?.city && (
            <div className="text-[11px] text-muted-foreground">{row.customer.city}</div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: false,
      cell: (row) => {
        const cfg = STATUS_CONFIG[row.status] ?? {
          label: row.status,
          className: "border-border bg-muted text-muted-foreground",
        };
        return (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.className}`}
          >
            {cfg.label}
          </span>
        );
      },
    },
    {
      accessorKey: "deliveryPerson",
      header: "Delivery Person",
      sortable: false,
      cell: (row) => (
        <span className="text-xs">{row.deliveryPerson?.name || "—"}</span>
      ),
    },
    {
      accessorKey: "saleOrders",
      header: "Orders",
      sortable: false,
      cell: (row) => {
        const orders = row.saleOrders || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-[180px]">
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {orders.length}
            </Badge>
            {orders.slice(0, 2).map((o) => (
              <span
                key={o.id}
                className="text-[10px] px-1 py-0.5 rounded bg-muted border"
              >
                {o.orderNo}
              </span>
            ))}
            {orders.length > 2 && (
              <span className="text-[10px] text-muted-foreground">
                +{orders.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "expectedDeliveryDate",
      header: "Expected",
      sortable: false,
      cell: (row) => {
        if (!row.expectedDeliveryDate) return <span className="text-xs text-muted-foreground">—</span>;
        return (
          <span className="text-xs">
            {new Date(row.expectedDeliveryDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "2-digit",
            })}
          </span>
        );
      },
    },
    {
      accessorKey: "actions",
      header: "Actions",
      sortable: false,
      cell: (row) => (
        <DispatchRowActions
          dispatch={row}
          onStatusUpdated={onStatusUpdated}
          onSignatureRequest={onSignatureRequest}
          onView={onView}
        />
      ),
    },
  ];
};
