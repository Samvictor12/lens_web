import { Phone, Mail, Building } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * CustomerCard component displays customer information in card format
 * @param {Object} customer - Customer data object
 * @param {Function} onView - Callback function when view button is clicked
 * @param {Function} onEdit - Callback function when edit button is clicked
 */
export default function CustomerCard({ customer, onView, onEdit }) {
  return (
    <Card
      key={customer.id}
      className="p-3 hover:shadow-md transition-shadow"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-sm">{customer.name}</h3>
            <p className="text-xs text-muted-foreground">
              {customer.customerCode}
            </p>
            {customer.shopName && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3" />
                {customer.shopName}
              </p>
            )}
          </div>
          {customer.outstandingBalance > 0 && (
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/20 text-xs px-1.5 py-0 h-5"
            >
              Outstanding
            </Badge>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span>{customer.phone}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-1.5 text-xs">
              <Mail className="h-3 w-3 text-muted-foreground" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}
        </div>

        <div className="pt-2 border-t space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Credit Limit:
            </span>
            <span className="font-semibold text-xs">
              ₹{(customer.creditLimit || 0).toLocaleString("en-IN")}
            </span>
          </div>
          {customer.outstandingBalance > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Outstanding:
              </span>
              <span className="font-semibold text-xs text-warning">
                ₹{customer.outstandingBalance.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 pt-1.5">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-7 text-xs"
            onClick={() => onView(customer.id)}
          >
            View
          </Button>
        </div>
      </div>
    </Card>
  );
}
