import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export const useIncomeColumns = (onDelete) => {
  return [
    {
      accessorKey: "incomeNumber",
      header: "No.",
      sortable: true,
      cell: (e) => (
        <span className="font-mono text-xs font-medium">{e.incomeNumber}</span>
      ),
    },
    {
      accessorKey: "incomeDate",
      header: "Date",
      sortable: true,
      cell: (e) => (
        <span className="text-xs">
          {new Date(e.incomeDate).toLocaleDateString("en-IN")}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
      sortable: false,
      cell: (e) => (
        <span className="font-medium text-xs">{e.category?.name || "—"}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (e) => (
        <span className="text-xs text-muted-foreground line-clamp-1">
          {e.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "fromLedger",
      header: "From",
      sortable: false,
      cell: (e) => (
        <span className="text-xs text-muted-foreground">
          {e.fromLedger?.ledgerName || "—"}
        </span>
      ),
    },
    {
      accessorKey: "toLedger",
      header: "To",
      sortable: false,
      cell: (e) => (
        <span className="text-xs text-muted-foreground">
          {e.toLedger?.ledgerName || e.bankLedger?.ledgerName || "—"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      sortable: true,
      align: "right",
      cell: (e) => (
        <span className="text-xs font-semibold">
          ₹{parseFloat(e.amount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      accessorKey: "id",
      header: "Actions",
      align: "right",
      cell: (e) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600"
          onClick={() => onDelete?.(e)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];
};
