import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, ChevronDown, ChevronRight } from "lucide-react";
import { PAYMENT_METHOD_LABELS } from "./VendorPayments.constants";

export const useVendorPaymentColumns = (onView, { expandedIds = [], onToggleExpand } = {}) => {
  const hasBreakdown = (p) => (p.items?.length > 0);

  return [
    {
      accessorKey: "_expand",
      header: "",
      sortable: false,
      cell: (p) =>
        hasBreakdown(p) ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onToggleExpand?.(p.id)}
            aria-label={expandedIds.includes(p.id) ? "Collapse" : "Expand"}
          >
            {expandedIds.includes(p.id) ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </Button>
        ) : null,
    },
    {
      accessorKey: "voucherNumber",
      header: "Voucher No.",
      sortable: true,
      cell: (p) => (
        <span className="font-mono text-xs font-medium">{p.voucherNumber}</span>
      ),
    },
    {
      accessorKey: "paymentDate",
      header: "Date",
      sortable: true,
      cell: (p) => (
        <span className="text-xs">
          {new Date(p.paymentDate).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      sortable: false,
      cell: (p) => (
        <span className="font-medium text-xs">{p.vendor?.name || "—"}</span>
      ),
    },
    {
      accessorKey: "paymentMethod",
      header: "Method",
      sortable: false,
      cell: (p) => (
        <Badge variant="outline" className="text-xs font-normal">
          {PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
        </Badge>
      ),
    },
    {
      accessorKey: "referenceNo",
      header: "Reference",
      sortable: false,
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {p.referenceNo || "—"}
        </span>
      ),
    },
    {
      accessorKey: "totalAmount",
      header: "Amount",
      sortable: true,
      align: "right",
      cell: (p) => (
        <span className="text-xs font-semibold">
          ₹{parseFloat(p.totalAmount || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      accessorKey: "closedStatus",
      header: "Status",
      sortable: false,
      cell: (p) => (
        <Badge
          variant="outline"
          className={`text-xs font-normal ${
            p.closedStatus
              ? "border-green-300 text-green-700 bg-green-50"
              : "border-amber-300 text-amber-700 bg-amber-50"
          }`}
        >
          {p.closedStatus ? "Closed" : "Open"}
        </Badge>
      ),
    },
    {
      accessorKey: "vendorInvoiceNo",
      header: "Vendor Inv.",
      sortable: false,
      cell: (p) => (
        <span className="text-xs text-muted-foreground">{p.vendorInvoiceNo || "—"}</span>
      ),
    },
    {
      accessorKey: "id",
      header: "",
      align: "right",
      cell: (p) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => onView(p)}
        >
          <Eye className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];
};
