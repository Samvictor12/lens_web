import { useCallback, useEffect, useState } from "react";
import { Table } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { getVendorIndirectExpenses } from "@/services/vendorIndirectExpense";
import { getLiabilityPostingLedgers } from "@/services/ledger";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

const STATUS_LABELS = {
  MARKED: "Marked",
  PARTIALLY_PAID: "Partially paid",
  PAID: "Paid",
};

function formatLiabilityLabel(ledger) {
  if (!ledger) return "—";
  return `${ledger.ledgerCode} — ${ledger.ledgerName}`;
}

export default function IndirectExpensesTab({ filters, refreshKey = 0 }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liabilityLedgerId, setLiabilityLedgerId] = useState("");
  const [liabilityOptions, setLiabilityOptions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getLiabilityPostingLedgers();
        setLiabilityOptions(
          (Array.isArray(list) ? list : []).map((l) => ({
            id: l.id,
            name: formatLiabilityLabel(l),
          }))
        );
      } catch {
        // non-critical
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        page: 1,
        limit: 200,
        ...(liabilityLedgerId && { liabilityLedgerId }),
        ...(filters.startDate && { from: filters.startDate }),
        ...(filters.endDate && { to: filters.endDate }),
      };
      const res = await getVendorIndirectExpenses(params);
      setRows(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load indirect expenses" });
    } finally {
      setLoading(false);
    }
  }, [liabilityLedgerId, filters.startDate, filters.endDate, refreshKey, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const columns = [
    { accessorKey: "expenseNumber", header: "No." },
    {
      accessorKey: "liabilityLedger",
      header: "Expense for",
      cell: (row) => formatLiabilityLabel(row.liabilityLedger),
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: (row) => row.category?.name || "—",
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: (row) => fmt(row.amount),
    },
    {
      accessorKey: "outstanding",
      header: "Outstanding",
      cell: (row) => fmt(row.outstanding),
    },
    {
      accessorKey: "vendorExpenseStatus",
      header: "Status",
      cell: (row) => STATUS_LABELS[row.vendorExpenseStatus] || row.vendorExpenseStatus,
    },
    {
      accessorKey: "dueDate",
      header: "Due",
      cell: (row) =>
        row.dueDate ? new Date(row.dueDate).toLocaleDateString("en-IN") : "—",
    },
  ];

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex flex-wrap items-end gap-2 flex-shrink-0">
        <div className="space-y-1 w-full sm:w-64">
          <Label className="text-xs">Expense for (liability)</Label>
          <FormSelect
            options={liabilityOptions}
            value={liabilityLedgerId || null}
            onChange={(v) => setLiabilityLedgerId(v != null ? String(v) : "")}
            placeholder="All liability accounts"
            isSearchable
            isClearable
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <Table
          data={rows}
          columns={columns}
          loading={loading}
          pagination={false}
          emptyMessage="No indirect expenses for the selected filters."
        />
      </div>
    </div>
  );
}
