import { Phone, Mail, Building, Trash2, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * VendorCard component displays vendor information in card format
 * @param {Object} vendor - Vendor data object
 * @param {Function} onView - Callback function when view button is clicked
 * @param {Function} onEdit - Callback function when edit button is clicked
 * @param {Function} onDelete - Callback function when delete button is clicked
 */
export default function VendorCard({ vendor, onView, onEdit, onDelete }) {
  return (
    <Card
      key={vendor.id}
      className="p-3 hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="font-semibold text-sm">{vendor.name}</h3>
            <p className="text-xs text-muted-foreground">
              {vendor.vendorCode}
            </p>
            {vendor.shopName ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3" />
                {vendor.shopName}
              </p>
            ) : (
              <p className="text-xs text-transparent mt-0.5 h-4">
                &nbsp;
              </p>
            )}
          </div>
          {/* {vendor.category && (
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/20 text-xs px-1.5 py-0 h-5"
            >
              {vendor.category}
            </Badge>
          )} */}
        </div>

        <div className="space-y-1.5 min-h-[44px]">
          <div className="flex items-center gap-1.5 text-xs h-4">
            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>{vendor.phone || '-'}</span>
          </div>
          {vendor.email ? (
            <div className="flex items-center gap-1.5 text-xs h-4">
              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{vendor.email}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs h-4 text-transparent">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span>&nbsp;</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Location:
            </span>
            <span className="font-semibold text-xs text-right">
              {[vendor.city, vendor.state].filter(Boolean).join(", ") || "-"}
            </span>
          </div>
          {vendor.gstNumber && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                GST:
              </span>
              <span className="font-mono text-xs">
                {vendor.gstNumber}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 pt-2 mt-auto">
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onView(vendor.id)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete && onDelete(vendor)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
