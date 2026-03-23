import React, { useRef } from "react";
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
import LensSpecificationPrint from "./LensSpecificationPrint";

/**
 * PrintPreviewModal Component
 * Shows a preview of the A5 lens specification sheet and handles printing
 */
export function PrintPreviewModal({
  isOpen,
  onClose,
  onConfirm,
  saleOrder,
  coatings,
  isPrinting = false,
}) {
  const printRef = useRef(null);

  const handlePrint = () => {
    if (!printRef.current) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print");
      return;
    }

    // Get the HTML content
    const printContent = printRef.current.innerHTML;

    // Write content to the new window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Lens Specification - ${saleOrder?.orderNo || 'Print'}</title>
          <style>
            @page {
              size: A5;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait a moment for the content to load, then print
    setTimeout(() => {
      printWindow.print();
      // Note: We don't close the window automatically as the user might want to cancel the print dialog
    }, 250);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Preview - Lens Specification (A5)</DialogTitle>
          <DialogDescription>
            Review the lens specification before printing. This will print on an A5 sheet.
          </DialogDescription>
        </DialogHeader>

        {/* Preview Container */}
        <div className="flex justify-center bg-gray-100 p-4 rounded border border-gray-300 overflow-auto">
          <div
            className="bg-white shadow-lg"
            style={{
              width: "148mm",
              height: "210mm",
              overflowY: "auto",
              zoom: "0.75",
              transformOrigin: "top center",
            }}
          >
            <LensSpecificationPrint
              ref={printRef}
              saleOrder={saleOrder}
              coatings={coatings}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isPrinting}
          >
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            {isPrinting ? "Printing..." : "Print"}
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPrinting}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            Confirm & Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PrintPreviewModal;
