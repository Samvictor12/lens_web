import { Badge } from "@/components/ui/badge";

/**
 * Column definitions for the Expenses table.
 */
export const useExpenseColumns = () => {
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
  ];
};
