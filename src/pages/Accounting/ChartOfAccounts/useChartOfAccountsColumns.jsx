import { Lock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TYPE_BADGE } from "./ChartOfAccounts.constants";

/**
 * Column definitions for the Chart of Accounts table.
 * System ledgers show a lock icon and no edit/delete actions.
 */
export const useChartOfAccountsColumns = (onEdit, onDelete) => {
  return [
    {
      accessorKey: "ledgerCode",
      header: "Code",
      sortable: true,
      cell: (l) => (
        <span className="font-mono text-xs font-medium">{l.ledgerCode}</span>
      ),
    },
    {
      accessorKey: "ledgerName",
      header: "Ledger Name",
      sortable: true,
      cell: (l) => (
        <div className="flex items-center gap-1.5">
          {l.isSystemLedger && (
            <Lock className="h-3 w-3 text-muted-foreground flex-shrink-0" />
          )}
          <span className="font-medium text-xs">{l.ledgerName}</span>
        </div>
      ),
    },
    {
      accessorKey: "ledgerType",
      header: "Type",
      sortable: true,
      cell: (l) => (
        <Badge className={`${TYPE_BADGE[l.ledgerType]} border-0 text-xs`}>
          {l.ledgerType}
        </Badge>
      ),
    },
    {
      accessorKey: "openingBalance",
      header: "Opening Bal.",
      sortable: false,
      cell: (l) => (
        <span className="text-xs font-mono">
          ₹{parseFloat(l.openingBalance || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
          })}
        </span>
      ),
    },
    {
      accessorKey: "currentBalance",
      header: "Current Bal.",
      sortable: false,
      cell: (l) => {
        const v = parseFloat(l.currentBalance || 0);
        return (
          <span
            className={`text-xs font-mono font-semibold ${
              v < 0 ? "text-red-600" : "text-green-700"
            }`}
          >
            ₹{v.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        );
      },
    },
    {
      accessorKey: "id",
      header: "Actions",
      align: "right",
      cell: (l) =>
        l.isSystemLedger ? (
          <span className="text-xs text-muted-foreground italic px-2">
            System
          </span>
        ) : (
          <div className="flex gap-1 justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onEdit(l)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-red-500 hover:text-red-700"
              onClick={() => onDelete(l)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
    },
  ];
};
