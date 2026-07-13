import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, User, MapPin, Glasses } from "lucide-react";
import { getSaleOrderById } from "@/services/saleOrder";
import { useToast } from "@/hooks/use-toast";

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-right">{value || "—"}</span>
    </div>
  );
}

function PrescriptionTable({ order }) {
  const hasRight = order.rightEye;
  const hasLeft = order.leftEye;

  if (!hasRight && !hasLeft) {
    return <p className="text-sm text-muted-foreground py-2">No prescription data.</p>;
  }

  const headers = ["Eye", "Sph", "Cyl", "Axis", "Add", "Dia"];

  const renderRow = (label, sph, cyl, axis, add, dia) => (
    <tr className="border-b border-border/50 last:border-0">
      <td className="py-2 pr-3 text-xs font-semibold text-muted-foreground w-8">{label}</td>
      {[sph, cyl, axis, add, dia].map((v, i) => (
        <td key={i} className="py-2 pr-2 text-sm font-medium text-center">
          {v || "—"}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto py-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border">
            {headers.map((h) => (
              <th
                key={h}
                className="py-1.5 pr-2 text-xs font-semibold text-muted-foreground text-center first:text-left"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {hasRight &&
            renderRow(
              "R",
              order.rightSpherical,
              order.rightCylindrical,
              order.rightAxis,
              order.rightAdd,
              order.rightDia
            )}
          {hasLeft &&
            renderRow(
              "L",
              order.leftSpherical,
              order.leftCylindrical,
              order.leftAxis,
              order.leftAdd,
              order.leftDia
            )}
        </tbody>
      </table>
    </div>
  );
}

function OrderDetailBlock({ order }) {
  const lensName =
    order.lensProduct?.lens_name ||
    order.lensProduct?.product_code ||
    "—";

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-muted/40 border-b">
        <div className="flex items-center gap-2 min-w-0">
          <Package className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold text-sm truncate">{order.orderNo}</span>
        </div>
        {order.customerRefNo && (
          <Badge variant="secondary" className="text-[10px] shrink-0">
            Ref: {order.customerRefNo}
          </Badge>
        )}
      </div>

      <div className="p-3 space-y-3">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Lens Details
          </h4>
          <InfoRow label="Lens Product" value={lensName} />
          <InfoRow label="Category" value={order.lensProduct?.category?.name || order.category?.name} />
          <InfoRow label="Material" value={order.lensProduct?.material?.name || order.material?.name} />
          <InfoRow label="Coating" value={order.coating?.name} />
          <InfoRow label="Fitting" value={order.fitting?.name} />
          <InfoRow label="Tinting" value={order.tinting?.name} />
          <InfoRow label="Diameter" value={order.dia?.name || order.dia} />
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
            <Glasses className="h-3 w-3" />
            Prescription
          </h4>
          <PrescriptionTable order={order} />
        </div>

        {order.remark && (
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">
              Remark
            </h4>
            <p className="text-sm">{order.remark}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Read-only sale order + lens details for Dispatch Window.
 * No edit, no delivery person (viewer is already the assigned agent).
 */
export default function DispatchOrderDetailsModal({ open, onClose, dispatch }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open || !dispatch?.saleOrders?.length) {
      setOrders([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        const results = await Promise.all(
          dispatch.saleOrders.map(async (so) => {
            try {
              const res = await getSaleOrderById(so.id);
              return res?.data || res || so;
            } catch {
              return so;
            }
          })
        );
        if (!cancelled) setOrders(results);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Error",
            description: err?.message || "Failed to load order details",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, dispatch, toast]);

  if (!dispatch) return null;

  const customerName =
    dispatch.customer?.shopname || dispatch.customer?.name || "—";
  const address = [dispatch.customer?.address, dispatch.customer?.city, dispatch.customer?.state]
    .filter(Boolean)
    .join(", ");

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose?.();
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] !flex flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="flex-shrink-0 space-y-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-left">
            <Package className="h-5 w-5 text-primary shrink-0" />
            <span className="truncate">Order Details — {dispatch.dcNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="rounded-lg border p-3 bg-muted/20">
            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <User className="h-4 w-4" />
              Customer
            </h3>
            <div className="text-sm font-medium">{customerName}</div>
            {dispatch.customer?.phone && (
              <div className="text-xs text-muted-foreground mt-0.5">{dispatch.customer.phone}</div>
            )}
            {address && (
              <div className="flex items-start gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{address}</span>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No sale orders on this dispatch.
            </p>
          ) : (
            orders.map((order) => (
              <OrderDetailBlock key={order.id} order={order} />
            ))
          )}
        </div>

        <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
