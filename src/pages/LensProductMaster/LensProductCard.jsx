import { Phone, Mail, Building, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * CustomerCard component displays customer information in card format
 * @param {Object} customer - Customer data object
 * @param {Function} onView - Callback function when view button is clicked
 * @param {Function} onEdit - Callback function when edit button is clicked
 * @param {Function} onDelete - Callback function when delete button is clicked
 */
export default function CustomerCard({ customer, onView, onEdit, onDelete }) {
  return (
    <Card
      key={customer.id}
      className="p-3 hover:shadow-md transition-shadow flex flex-col h-full"
    >
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <div className="min-h-[60px]">
            <h3 className="font-semibold text-sm">{customer.name}</h3>
            <p className="text-xs text-muted-foreground">
              {customer.customerCode}
            </p>
            {customer.shopName ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Building className="h-3 w-3" />
                {customer.shopName}
              </p>
            ) : (
              <p className="text-xs text-transparent mt-0.5 h-4">
                &nbsp;
              </p>
            )}
          </div>
          {(customer.outstandingBalance || 0) > 0 && (
            <Badge
              variant="outline"
              className="bg-warning/10 text-warning border-warning/20 text-xs px-1.5 py-0 h-5"
            >
              Outstanding
            </Badge>
          )}
        </div>

        <div className="space-y-1.5 min-h-[44px]">
          <div className="flex items-center gap-1.5 text-xs h-4">
            <Phone className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            <span>{customer.phone || '-'}</span>
          </div>
          {customer.email ? (
            <div className="flex items-center gap-1.5 text-xs h-4">
              <Mail className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
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
              Credit Limit:
            </span>
            <span className="font-semibold text-xs">
              ₹{(customer.creditLimit || 0).toLocaleString("en-IN")}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Outstanding:
            </span>
            <span className={`font-semibold text-xs ${(customer.outstandingBalance || 0) > 0 ? 'text-warning' : 'text-muted-foreground'}`}>
              ₹{(customer.outstandingBalance || 0).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 pt-2 mt-auto">
        <Button
          variant="outline"
          size="xs"
          className="flex-1 h-7 text-xs"
          onClick={() => onView(customer.id)}
        >
          View
        </Button>
        <Button
          variant="outline"
          size="xs"
          className="h-7 px-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete && onDelete(customer)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}
