import { Package, MapPin, Calendar, Trash2, Eye, Edit } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor, formatCurrency, formatDate } from "./Inventory.constants";

/**
 * InventoryCard — compact card styled after PurchaseOrderCard.
 * Inline action buttons (View / Edit / Delete) sit at the bottom.
 * Fixed-height inner sections keep card-grid rows aligned.
 */
export default function InventoryCard({ item, onView, onEdit, onDelete, detailed = false }) {
  const isExpired = item.expiryDate && new Date(item.expiryDate) < new Date();
  const statusColor = getStatusColor(item.status);

  // ─── Detailed / dialog view ──────────────────────────────────────────
  if (detailed) {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold">
              {item.lensProduct?.lens_name || "Unknown Product"}
            </h3>
            <p className="text-xs text-muted-foreground">ID: {item.id}</p>
          </div>
          <Badge className={statusColor}>{item.status}</Badge>
        </div>

        {/* Two-column detail grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Product Details
            </h4>
            <div className="space-y-1.5 text-sm">
              {[
                ["Lens Product", item.lensProduct?.lens_name],
                ["Category", item.category?.name],
                ["Type", item.lensType?.name || item.type?.name],
                ["Coating", item.coating?.name],
                ["Fitting", item.fitting?.name],
                ["Tinting", item.tinting?.name],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className={!val ? "text-muted-foreground" : "font-medium"}>{val || "-"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Inventory Details
            </h4>
            <div className="space-y-1.5 text-sm">
              {[
                ["Location", item.location?.name],
                ["Tray", item.tray?.name],
                ["Vendor", item.vendor?.name],
                ["Batch No", item.batchNo],
                ["Serial No", item.serialNo],
                ["Quality Grade", item.qualityGrade],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="font-mono text-xs">{val || "-"}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity:</span>
                <span className="font-semibold">{item.quantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cost Price:</span>
                <span className="font-semibold">{formatCurrency(item.costPrice)}</span>
              </div>
              {item.sellingPrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Selling Price:</span>
                  <span className="font-semibold">{formatCurrency(item.sellingPrice)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dates</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            {[
              ["Inward Date", formatDate(item.inwardDate)],
              ["Manufacture Date", formatDate(item.manufactureDate)],
              ["Expiry Date", formatDate(item.expiryDate)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}:</span>
                <span className={label === "Expiry Date" && isExpired ? "text-red-600 font-medium" : ""}>
                  {val || "-"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes</h4>
            <p className="text-sm text-muted-foreground bg-muted/40 p-3 rounded-md">{item.notes}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={() => onEdit(item)} className="gap-1.5">
              <Edit className="h-3.5 w-3.5" />
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(item)}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ─── Compact card view (matches PurchaseOrderCard layout) ────────────
  return (
    <Card className="p-3 hover:shadow-md transition-shadow flex flex-col h-full">
      <div className="flex-1 space-y-2">
        {/* Header row: name + status badge */}
        <div className="flex items-start justify-between">
          <div className="min-h-[52px] flex-1">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">
              {item.lensProduct?.lens_name || "Unknown Product"}
            </h3>
            {item.batchNo ? (
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">Batch: {item.batchNo}</p>
            ) : (
              <p className="text-xs text-transparent mt-0.5">&nbsp;</p>
            )}
            {item.category?.name ? (
              <p className="text-xs text-muted-foreground">{item.category.name}</p>
            ) : (
              <p className="text-xs text-transparent">&nbsp;</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 ml-2 flex-shrink-0">
            <Badge variant="outline" className={`${statusColor} text-xs px-1.5 py-0 h-5`}>
              {item.status}
            </Badge>
            {(item.rightEye || item.leftEye) && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {item.rightEye && item.leftEye ? "B/E" : item.rightEye ? "R" : "L"}
              </Badge>
            )}
          </div>
        </div>

        {/* Location / Qty / Inward row */}
        <div className="space-y-1.5 min-h-[48px]">
          <div className="flex items-center gap-1.5 text-xs h-4">
            <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span className="text-muted-foreground truncate">
              {item.location?.name || "-"}
              {item.tray?.name ? ` / ${item.tray.name}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs h-4">
            <Package className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>Qty:</span>
            <span className="font-semibold">{item.quantity}</span>
            {item.rightSpherical && (
              <span className="text-muted-foreground ml-1">Sph {item.rightSpherical}</span>
            )}
          </div>
          {item.inwardDate ? (
            <div className="flex items-center gap-1.5 text-xs h-4">
              <Calendar className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span>{formatDate(item.inwardDate)}</span>
              {isExpired && (
                <Badge className="bg-red-100 text-red-800 text-[10px] px-1 py-0 h-4 ml-auto">
                  Expired
                </Badge>
              )}
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>

        {/* Pricing */}
        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Cost Price:</span>
            <span className="font-semibold text-xs">{formatCurrency(item.costPrice)}</span>
          </div>
          {item.sellingPrice ? (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Selling Price:</span>
              <span className="font-semibold text-xs text-primary">{formatCurrency(item.sellingPrice)}</span>
            </div>
          ) : (
            <div className="h-4" />
          )}
        </div>
      </div>

      {/* Action buttons — matching PurchaseOrderCard */}
      <div className="flex gap-1.5 pt-2 mt-auto">
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onView && onView(item)}
        >
          <Eye className="h-3 w-3 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onEdit && onEdit(item)}
        >
          <Edit className="h-3 w-3 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete && onDelete(item)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}