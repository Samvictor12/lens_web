import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { buildInvoiceHtml, printInvoice } from "./Billing.constants";

/**
 * InvoicePreviewDialog
 * Shows a read-only, print-formatted preview of an invoice (same layout
 * printInvoice() would print/export) inside an isolated iframe, so the
 * embedded @page/@media print CSS never leaks into app styles.
 */
export default function InvoicePreviewDialog({ invoice, open, onClose }) {
  const html = invoice ? buildInvoiceHtml(invoice) : "";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Invoice Preview{invoice ? ` - ${invoice.invoiceNo}` : ""}
          </DialogTitle>
          <DialogDescription>
            Review the invoice in its final, print-ready layout before finalizing.
          </DialogDescription>
        </DialogHeader>

        {/* Preview Container */}
        <div className="flex justify-center bg-gray-100 p-4 rounded border border-gray-300 overflow-auto">
          <div
            className="bg-white shadow-lg"
            style={{ width: "210mm", height: "297mm" }}
          >
            <iframe
              srcDoc={html}
              title="Invoice preview"
              className="w-full h-full border-0"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Close
          </Button>
          <Button
            type="button"
            onClick={() => printInvoice(invoice)}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
