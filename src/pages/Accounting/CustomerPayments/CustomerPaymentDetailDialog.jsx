import { Printer } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import PaymentBreakdownTree from "@/components/accounting/PaymentBreakdownTree";
import {
  PAYMENT_METHOD_LABELS,
  printCustomerPaymentReceipt,
} from "./CustomerPayments.constants";

export default function CustomerPaymentDetailDialog({ open, onOpenChange, payment }) {
  if (!payment) return null;

  const advance = parseFloat(payment.advanceAmount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Receipt — {payment.receiptNumber}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-2">
          <div>
            <p className="text-xs text-muted-foreground">Customer</p>
            <p className="font-medium">{payment.customer?.name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Payment Date</p>
            <p className="font-medium">
              {new Date(payment.paymentDate).toLocaleDateString("en-IN")}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Method</p>
            <Badge variant="outline" className="text-xs font-normal mt-0.5">
              {PAYMENT_METHOD_LABELS[payment.paymentMethod] || payment.paymentMethod}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reference No.</p>
            <p className="font-medium">{payment.referenceNo || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Receiving Account</p>
            <p className="font-medium">{payment.bankLedger?.ledgerName || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-bold text-base">
              ₹{parseFloat(payment.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          {advance > 0 && (
            <div>
              <p className="text-xs text-muted-foreground">Advance Credit</p>
              <p className="font-medium text-blue-700">
                ₹{advance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
          {payment.notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{payment.notes}</p>
            </div>
          )}
        </div>

        {(payment.items?.length > 0 || advance > 0) && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payment Breakdown
            </p>
            <PaymentBreakdownTree
              type="customer"
              documentNumber={payment.receiptNumber}
              totalAmount={payment.totalAmount}
              advanceAmount={advance}
              items={payment.items || []}
              onBeforeNavigate={() => onOpenChange(false)}
            />
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => printCustomerPaymentReceipt(payment)}
          >
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
