import { Package, Calendar, Trash2, Building } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor } from "./PurchaseOrder.constants";

/**
 * PurchaseOrderCard component displays purchase order information in card format
 * @param {Object} purchaseOrder - Purchase order data object
 * @param {Function} onView - Callback function when view button is clicked
 * @param {Function} onEdit - Callback function when edit button is clicked
 * @param {Function} onDelete - Callback function when delete button is clicked
 */
export default function PurchaseOrderCard({ purchaseOrder, onView, onEdit, onDelete }) {
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
              <p className="text-xs text-transparent mt-0.5 h-4">
                &nbsp;
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className={`${statusColor} text-xs px-1.5 py-0 h-5`}
          >
            {purchaseOrder.status}
          </Badge>
        </div>

        <div className="space-y-1.5 min-h-[44px]">
          <div className="flex items-center gap-1.5 text-xs h-4">
            <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>Qty: {purchaseOrder.quantity || 0}</span>
            {purchaseOrder.lensProduct?.lens_name && (
              <span className="text-muted-foreground truncate">
                • {purchaseOrder.lensProduct.lens_name}
              </span>
            )}
          </div>
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
            <span className="text-xs text-muted-foreground">
              Unit Price:
            </span>
            <span className="font-semibold text-xs">
              ₹{(purchaseOrder.unitPrice || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Total Value:
            </span>
            <span className="font-semibold text-xs text-primary">
              ₹{(purchaseOrder.totalValue || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 pt-2 mt-auto">
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
