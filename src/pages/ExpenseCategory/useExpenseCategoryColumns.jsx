import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom hook that returns the table column configuration for expense categories.
 * @param {Function} onEdit - Called with the category object to edit
 * @param {Function} onDelete - Called with the category object to delete
 * @returns {Array} Column definitions for the smart Table component
 */
export const useExpenseCategoryColumns = (onEdit, onDelete) => {
  return [
    {
      accessorKey: "name",
      header: "Category Name",
      sortable: true,
      cell: (cat) => (
        <span className="font-medium text-xs">{cat.name}</span>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      sortable: false,
      cell: (cat) => (
        <span className="text-xs text-muted-foreground">
          {cat.description || "—"}
        </span>
      ),
    },
    {
      accessorKey: "ledger",
      header: "Linked Ledger",
      sortable: false,
      cell: (cat) =>
        cat.ledger ? (
          <span className="text-xs font-mono">
            {cat.ledger.ledgerCode} — {cat.ledger.ledgerName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "expenseType",
      header: "Classification",
      sortable: false,
      cell: (cat) => (
        <Badge
          variant="outline"
          className={
            cat.expenseType === "DIRECT"
              ? "text-xs font-normal bg-blue-100 text-blue-700 border-blue-300"
              : "text-xs font-normal bg-gray-100 text-gray-700 border-gray-300"
          }
        >
          {cat.expenseType === "DIRECT" ? "Direct" : "Indirect"}
        </Badge>
      ),
    },
    {
      accessorKey: "id",
      header: "Actions",
      align: "right",
      cell: (cat) => (
        <div className="flex gap-1 justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(cat)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-red-500 hover:text-red-700"
            onClick={() => onDelete(cat)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];
};
