import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getSaleOrderById, updateSaleOrderStatus } from "@/services/saleOrder";
import { statusColors } from "@/pages/SaleOrder/SaleOrder.constants";

const STATUS_LABELS = {
  DRAFT: "Draft",
  CONFIRMED: "Confirmed",
  IN_PRODUCTION: "In Production",
  ON_HOLD: "On Hold",
  AWAITING_QUALITY: "Awaiting Quality",
  READY_FOR_DISPATCH: "Ready for Dispatch",
  DELIVERED: "Delivered",
  CLOSED: "Closed",
};

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-500 shrink-0 w-32">{label}</span>
      <span className="text-sm text-gray-900 text-right font-medium">{value || "—"}</span>
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

function PrescriptionTable({ order }) {
  const hasRight = order.rightEye;
  const hasLeft = order.leftEye;

  if (!hasRight && !hasLeft) {
    return <p className="text-sm text-gray-400 py-3">No prescription data.</p>;
  }

  const headers = ["Eye", "Sph", "Cyl", "Axis", "Add", "Dia"];

  const renderRow = (label, sph, cyl, axis, add, dia) => (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2 pr-3 text-xs font-semibold text-gray-500 w-8">{label}</td>
      {[sph, cyl, axis, add, dia].map((v, i) => (
        <td key={i} className="py-2 pr-2 text-sm text-gray-900 font-medium text-center">
          {v || "—"}
        </td>
      ))}
    </tr>
  );

  return (
    <div className="overflow-x-auto py-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-gray-200">
            {headers.map((h) => (
              <th key={h} className="py-1.5 pr-2 text-xs font-semibold text-gray-400 text-center first:text-left">
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

function ActionBar({ order, onStatusChange, isUpdating }) {
  const { status } = order;

  const btn = (label, nextStatus, variant, extraClass = "") => (
    <Button
      key={nextStatus}
      variant={variant}
      className={`flex-1 h-12 text-base font-semibold ${extraClass}`}
      disabled={isUpdating}
      onClick={() => onStatusChange(nextStatus)}
    >
      {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : label}
    </Button>
  );

  if (status === "CONFIRMED") {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg z-50 safe-area-bottom">
        {btn("Start Production", "IN_PRODUCTION", "default")}
      </div>
    );
  }

  if (status === "IN_PRODUCTION") {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg z-50">
        {btn("Hold", "ON_HOLD", "outline", "border-orange-400 text-orange-600 hover:bg-orange-50")}
        {btn("Complete", "AWAITING_QUALITY", "default", "bg-green-600 hover:bg-green-700")}
      </div>
    );
  }

  if (status === "ON_HOLD") {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex gap-3 shadow-lg z-50">
        {btn("Resume", "IN_PRODUCTION", "default")}
        {btn("Complete", "AWAITING_QUALITY", "default", "bg-green-600 hover:bg-green-700")}
      </div>
    );
  }

  // Read-only for other statuses
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-50 border-t border-gray-200 px-4 py-3 z-50">
      <p className="text-center text-sm text-gray-400">
        Order is <span className="font-medium">{STATUS_LABELS[status] || status}</span> — no actions available.
      </p>
    </div>
  );
}

export default function ProductionOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const fetchOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await getSaleOrderById(id);
      if (response.success) {
        setOrder(response.data);
      } else {
        setError("Order not found.");
      }
    } catch {
      setError("Failed to load order details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleStatusChange = async (newStatus) => {
    const labels = {
      IN_PRODUCTION: "Start Production",
      ON_HOLD: "Hold",
      READY_FOR_DISPATCH: "Complete",
    };
    const confirmed = window.confirm(
      `Are you sure you want to mark this order as "${STATUS_LABELS[newStatus]}"?`
    );
    if (!confirmed) return;

    setIsUpdating(true);
    try {
      const response = await updateSaleOrderStatus(id, newStatus);
      if (response.success) {
        toast({ title: `Order marked as ${STATUS_LABELS[newStatus]}` });
        setOrder(response.data);
        // If completed, go back to production list
        if (newStatus === "AWAITING_QUALITY") {
          navigate("/production/operator");
        }
      }
    } catch (err) {
      toast({
        title: "Update failed",
        description: err.message || "Could not update order status.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-24" />
              {[1, 2, 3, 4].map((j) => (
                <Skeleton key={j} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-4 flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
        <AlertCircle className="w-10 h-10" />
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchOrder}>
          Retry
        </Button>
      </div>
    );
  }

  if (!order) return null;

  const statusClass = statusColors[order.status] || "bg-gray-100 text-gray-800 border-gray-200";

  return (
    <div className="max-w-lg mx-auto pb-24">
      {/* Sticky header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-3 py-3 flex items-center gap-3 shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => navigate(-1)}
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 truncate text-base">{order.orderNo}</p>
          {order.customer && (
            <p className="text-xs text-gray-500 truncate">
              {order.customer.shopname || order.customer.name}
            </p>
          )}
        </div>
        <Badge className={`${statusClass} border shrink-0 text-xs`}>
          {STATUS_LABELS[order.status] || order.status}
        </Badge>
      </div>

      <div className="p-3 space-y-3">
        {/* Order Info */}
        <SectionCard title="Order Info">
          <InfoRow label="Order No" value={order.orderNo} />
          <InfoRow
            label="Order Date"
            value={new Date(order.orderDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          />
          <InfoRow label="Type" value={order.type} />
          {order.deliverySchedule && (
            <InfoRow
              label="Delivery Schedule"
              value={new Date(order.deliverySchedule).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            />
          )}
          <InfoRow label="Item Ref No" value={order.itemRefNo} />
          <InfoRow label="Customer Ref No" value={order.customerRefNo} />
          {order.remark && <InfoRow label="Remark" value={order.remark} />}
        </SectionCard>

        {/* Lens Details */}
        <SectionCard title="Lens Details">
          <InfoRow label="Lens" value={order.lensProduct?.lens_name} />
          <InfoRow label="Product Code" value={order.lensProduct?.product_code} />
          <InfoRow label="Category" value={order.category?.name} />
          <InfoRow label="Material" value={order.material?.name} />
          <InfoRow label="Coating" value={order.coating?.name} />
          <InfoRow label="Fitting" value={order.fitting?.name} />
          <InfoRow label="Tinting" value={order.tinting?.name} />
          <InfoRow label="Diameter" value={order.dia?.name} />
        </SectionCard>

        {/* Prescription */}
        <SectionCard title="Prescription">
          <PrescriptionTable order={order} />
        </SectionCard>

        {/* Flags */}
        {(order.urgentOrder || order.freeLens || order.freeFitting) && (
          <SectionCard title="Flags">
            <div className="flex flex-wrap gap-2 py-3">
              {order.urgentOrder && (
                <Badge className="bg-red-100 text-red-700 border-red-200 border">
                  Urgent Order
                </Badge>
              )}
              {order.freeLens && (
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">
                  Free Lens
                </Badge>
              )}
              {order.freeFitting && (
                <Badge className="bg-green-100 text-green-700 border-green-200 border">
                  Free Fitting
                </Badge>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Action bar */}
      <ActionBar order={order} onStatusChange={handleStatusChange} isUpdating={isUpdating} />
    </div>
  );
}
