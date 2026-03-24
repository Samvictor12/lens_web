import { Package, Calendar, Trash2, Building, PackageCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor, getStatusLabel } from "./PurchaseOrder.constants";

const canReceive = (po) => ["DRAFT", "RECEIVED"].includes(po.status) && (po.quantity || 0) > (po.receivedQty || 0);

/**
 * PurchaseOrderCard component displays purchase order information in card format
 */
export default function PurchaseOrderCard({ purchaseOrder, onView, onEdit, onDelete, onReceive }) {
  const statusColor = getStatusColor(purchaseOrder.status);

  return (
    <Card
      key={purchaseOrder.id}
      className="p-3 hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="font-semibold text-sm">{purchaseOrder.poNumber}</h3>
            {purchaseOrder.reference_id && (
              <p className="text-xs text-muted-foreground">
                Ref: {purchaseOrder.reference_id}
              </p>
            )}
            {purchaseOrder.vendor?.name ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3" />
                {purchaseOrder.vendor.name}
              </p>
            ) : (
              <p className="text-xs text-transparent mt-0.5 h-4">&nbsp;</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`${statusColor} text-xs px-1.5 py-0 h-5`}>
              {getStatusLabel(purchaseOrder.status)}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
              {purchaseOrder.orderType || "Single"}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5 min-h-[44px]">
          <div className="flex items-center gap-1.5 text-xs h-4">
            <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>Ordered: {purchaseOrder.quantity || 0}</span>
            {purchaseOrder.receivedQty > 0 && (
              <span className="text-green-600">• Received: {purchaseOrder.receivedQty}</span>
            )}
          </div>
          {purchaseOrder.lensProduct?.lens_name && (
            <div className="text-xs text-muted-foreground truncate">
              {purchaseOrder.lensProduct.lens_name}
            </div>
          )}
          {purchaseOrder.orderDate ? (
            <div className="flex items-center gap-1.5 text-xs h-4">
              <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{new Date(purchaseOrder.orderDate).toLocaleDateString()}</span>
              {purchaseOrder.expectedDeliveryDate && (
                <span className="text-muted-foreground">
                  → {new Date(purchaseOrder.expectedDeliveryDate).toLocaleDateString()}
                </span>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs h-4 text-transparent">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>&nbsp;</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Unit Price:</span>
            <span className="font-semibold text-xs">₹{(purchaseOrder.unitPrice || 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Total Value:</span>
            <span className="font-semibold text-xs text-primary">₹{(purchaseOrder.totalValue || 0).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 pt-2 mt-auto">
        {canReceive(purchaseOrder) && (
          <Button
            variant="outline"
            size="xs"
            className="flex-1 h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50 gap-1"
            onClick={() => onReceive && onReceive(purchaseOrder)}
          >
            <PackageCheck className="h-3 w-3" /> Receive
          </Button>
        )}
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onView(purchaseOrder.id)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete && onDelete(purchaseOrder)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
