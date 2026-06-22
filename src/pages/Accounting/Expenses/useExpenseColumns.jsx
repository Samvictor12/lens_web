import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";

/**
 * Column definitions for the Expenses table.
 */
export const useExpenseColumns = (onEdit) => {
  return [
    {
      accessorKey: "expenseNumber",
      header: "No.",
      sortable: true,
      cell: (e) => (
        <span className="font-mono text-xs font-medium">{e.expenseNumber}</span>
      ),
    },
    {
      accessorKey: "expenseDate",
      header: "Date",
      sortable: true,
      cell: (e) => (
        <span className="text-xs">
          {new Date(e.expenseDate).toLocaleDateString("en-IN")}
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
      accessorKey: "expenseType",
      header: "Classification",
      sortable: false,
      cell: (e) => (
        <Badge
          variant="outline"
          className={
            e.category?.expenseType === "DIRECT"
              ? "text-xs font-normal bg-blue-100 text-blue-700 border-blue-300"
              : "text-xs font-normal bg-gray-100 text-gray-700 border-gray-300"
          }
        >
          {e.category?.expenseType === "DIRECT" ? "Direct" : "Indirect"}
        </Badge>
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
      accessorKey: "paidTo",
      header: "Paid To",
      sortable: false,
      cell: (e) => (
        <span className="text-xs">{e.paidTo || "—"}</span>
      ),
    },
    {
      accessorKey: "bankLedger",
      header: "Account",
      sortable: false,
      cell: (e) => (
        <span className="text-xs text-muted-foreground">
          {e.bankLedger?.ledgerName || "—"}
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
          className="h-7 w-7"
          onClick={() => onEdit?.(e)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ];
};
