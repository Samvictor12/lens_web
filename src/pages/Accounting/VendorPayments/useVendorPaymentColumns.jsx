import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import { PAYMENT_METHOD_LABELS } from "./VendorPayments.constants";

/**
 * Column definitions for the Vendor Payments table.
 */
export const useVendorPaymentColumns = (onView) => {
  return [
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
      accessorKey: "referenceNumber",
      header: "Reference",
      sortable: false,
      cell: (p) => (
        <span className="text-xs text-muted-foreground">
          {p.referenceNumber || "—"}
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
