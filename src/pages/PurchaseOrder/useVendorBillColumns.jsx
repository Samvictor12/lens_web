import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { vendorInvoiceCopyUrl } from "@/services/vendorPayment";

const STATUS_STYLES = {
  OUTSTANDING: "bg-amber-50 text-amber-800 border-amber-200",
  PARTIALLY_PAID: "bg-blue-50 text-blue-700 border-blue-200",
  PAID: "bg-emerald-50 text-emerald-800 border-emerald-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_LABELS = {
  OUTSTANDING: "Outstanding",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  CANCELLED: "Cancelled",
};

function formatInr(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function useVendorBillColumns() {
  return [
    {
      accessorKey: "invoiceDate",
      header: "Date",
      sortable: false,
      cell: (inv) => (
        <span className="text-[11px]">
          {inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "—"}
        </span>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      sortable: false,
      cell: (inv) => (
        <span className="text-[11px]">{inv.vendor?.name || inv.vendor?.shopname || "—"}</span>
      ),
    },
    {
      accessorKey: "supplierInvoiceNo",
      header: "Bill No",
      sortable: false,
      cell: (inv) => <span className="text-[11px] font-medium">{inv.supplierInvoiceNo || "—"}</span>,
    },
    {
      accessorKey: "invoiceNumber",
      header: "Invoice No",
      sortable: false,
      cell: (inv) => <span className="text-[11px] font-mono">{inv.invoiceNumber || "—"}</span>,
    },
    {
      accessorKey: "poNumbers",
      header: "PO(s)",
      sortable: false,
      cell: (inv) => {
        const pos = (inv.items || [])
          .map((item) => item.purchaseOrder?.poNumber)
          .filter(Boolean);
        return <span className="text-[11px]">{pos.length ? pos.join(", ") : "—"}</span>;
      },
    },
    {
      accessorKey: "subtotalAmount",
      header: "Amount",
      sortable: false,
      cell: (inv) => <span className="text-[11px] font-mono">{formatInr(inv.subtotalAmount)}</span>,
    },
    {
      accessorKey: "taxAmount",
      header: "GST",
      sortable: false,
      cell: (inv) => <span className="text-[11px] font-mono">{formatInr(inv.taxAmount)}</span>,
    },
    {
      accessorKey: "totalAmount",
      header: "Total",
      sortable: false,
      cell: (inv) => <span className="text-[11px] font-mono font-medium">{formatInr(inv.totalAmount)}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      sortable: false,
      cell: (inv) => (
        <Badge variant="outline" className={`text-3xs h-4 px-1 ${STATUS_STYLES[inv.status] || ""}`}>
          {STATUS_LABELS[inv.status] || inv.status}
        </Badge>
      ),
    },
    {
      accessorKey: "invoiceCopyPath",
      header: "Bill Copy",
      sortable: false,
      cell: (inv) => {
        const url = vendorInvoiceCopyUrl(inv.invoiceCopyPath);
        if (!url) return <span className="text-[11px] text-muted-foreground">—</span>;
        return (
          <Button variant="ghost" size="xs" className="h-7 px-2 text-xs gap-1" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer">
              <FileText className="h-3.5 w-3.5" />
              View
            </a>
          </Button>
        );
      },
    },
  ];
}
