import { Printer, ExternalLink } from "lucide-react";
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
import { vendorInvoiceCopyUrl } from "@/services/vendorPayment";
import {
  PAYMENT_METHOD_LABELS,
  printVendorPaymentVoucher,
} from "./VendorPayments.constants";

export default function VendorPaymentDetailDialog({ open, onOpenChange, payment }) {
  if (!payment) return null;

  const invoiceUrl = vendorInvoiceCopyUrl(payment.invoiceCopyPath);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Payment — {payment.voucherNumber}
          </DialogTitle>
        </DialogHeader>

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
          {payment.vendorInvoiceNo && (
            <div>
              <p className="text-xs text-muted-foreground">Vendor Invoice No.</p>
              <p className="font-medium">{payment.vendorInvoiceNo}</p>
            </div>
          )}
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
          {(payment.subtotalAmount != null || payment.taxAmount != null) && (
            <>
              <div>
                <p className="text-xs text-muted-foreground">Invoice Subtotal</p>
                <p className="font-medium">
                  ₹{parseFloat(payment.subtotalAmount || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">GST</p>
                <p className="font-medium">
                  ₹{parseFloat(payment.taxAmount || 0).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
            </>
          )}
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="font-bold text-base">
              ₹{parseFloat(payment.totalAmount || 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </p>
          </div>
          {invoiceUrl && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground mb-1">Invoice Copy</p>
              <Button variant="outline" size="sm" className="gap-1.5" asChild>
                <a href={invoiceUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> View uploaded invoice
                </a>
              </Button>
            </div>
          )}
          {payment.notes && (
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Notes</p>
              <p className="text-sm">{payment.notes}</p>
            </div>
          )}
        </div>

        {payment.items?.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payment Breakdown
            </p>
            <PaymentBreakdownTree
              type="vendor"
              documentNumber={payment.voucherNumber}
              totalAmount={payment.totalAmount}
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
            onClick={() => printVendorPaymentVoucher(payment)}
          >
            <Printer className="h-4 w-4" /> Print Voucher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
