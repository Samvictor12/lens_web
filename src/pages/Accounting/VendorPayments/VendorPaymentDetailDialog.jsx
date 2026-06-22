import { useState } from "react";
import { Printer, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { closeVendorPayment } from "@/services/vendorPayment";
import {
  PAYMENT_METHOD_LABELS,
  printVendorPaymentVoucher,
} from "./VendorPayments.constants";

export default function VendorPaymentDetailDialog({ open, onOpenChange, payment, onClosed }) {
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);

  if (!payment) return null;

  const handleClose = async () => {
    setIsClosing(true);
    try {
      await closeVendorPayment(payment.id);
      toast({ title: "Voucher closed" });
      onClosed?.();
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Failed to close voucher",
        description: err?.message,
      });
    } finally {
      setIsClosing(false);
    }
  };

  const totalAllocated = (payment.items || []).reduce(
    (s, i) => s + parseFloat(i.allocatedAmount || 0),
    0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Payment — {payment.voucherNumber}
            <Badge
              variant="outline"
              className={
                payment.closedStatus
                  ? "text-xs font-normal bg-gray-100 text-gray-700 border-gray-300"
                  : "text-xs font-normal bg-green-100 text-green-700 border-green-300"
              }
            >
              {payment.closedStatus ? "Closed" : "Open"}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm py-2">
          <div>
            <p className="text-xs text-muted-foreground">Vendor</p>
            <p className="font-medium">{payment.vendor?.name || "—"}</p>
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
            <p className="text-xs text-muted-foreground">Payment Account</p>
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
          {payment.notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{payment.notes}</p>
            </div>
          )}
        </div>

        {/* PO Allocations */}
        {payment.items?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              PO Allocations
            </p>
            <div className="border rounded-md divide-y text-xs">
              <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 bg-muted/40 font-medium text-muted-foreground">
                <span>PO Number</span>
                <span className="text-right">Amount</span>
              </div>
              {payment.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] gap-2 items-center px-3 py-2"
                >
                  <div>
                    <p className="font-medium">
                      {item.purchaseOrder?.poNumber || `PO #${item.purchaseOrderId}`}
                    </p>
                    {item.purchaseOrder?.orderDate && (
                      <p className="text-muted-foreground">
                        {new Date(item.purchaseOrder.orderDate).toLocaleDateString("en-IN")}
                      </p>
                    )}
                  </div>
                  <span className="font-mono font-semibold">
                    ₹{parseFloat(item.allocatedAmount || 0).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              ))}
              <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-2 bg-muted/20 font-semibold">
                <span>Total</span>
                <span className="font-mono">
                  ₹{totalAllocated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex flex-wrap gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => printVendorPaymentVoucher(payment)}
          >
            <Printer className="h-4 w-4" /> Print Voucher
          </Button>
          {!payment.closedStatus && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-orange-300 text-orange-700 hover:bg-orange-50"
              onClick={handleClose}
              disabled={isClosing}
            >
              <Lock className="h-4 w-4" /> Close Voucher
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
