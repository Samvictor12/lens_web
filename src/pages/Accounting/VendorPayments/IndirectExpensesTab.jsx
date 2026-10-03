import { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Table } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { getVendorIndirectExpenses } from "@/services/vendorIndirectExpense";
import { getLiabilityPostingLedgers } from "@/services/ledger";
import { getExpenseCategories } from "@/services/expense";
import { INDIRECT_EXPENSE_STATUS_FILTER_OPTIONS } from "./VendorPayments.constants";

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

function rowSearchHaystack(row) {
  return [
    row.expenseNumber,
    formatLiabilityLabel(row.liabilityLedger),
    row.category?.name,
    row.expenseDate,
    row.amount,
    row.outstanding,
    STATUS_LABELS[row.vendorExpenseStatus] || row.vendorExpenseStatus,
    row.dueDate,
    row.description,
    row.referenceNo,
  ]
    .filter((v) => v != null && v !== "")
    .join(" ")
    .toLowerCase();
}

export default function IndirectExpensesTab({ filters, refreshKey = 0 }) {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [liabilityLedgerId, setLiabilityLedgerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenseStatus, setExpenseStatus] = useState("");
  const [search, setSearch] = useState("");
  const [liabilityOptions, setLiabilityOptions] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [list, catRes] = await Promise.all([
          getLiabilityPostingLedgers(),
          getExpenseCategories(),
        ]);
        setLiabilityOptions(
          (Array.isArray(list) ? list : []).map((l) => ({
            id: l.id,
            name: formatLiabilityLabel(l),
          }))
        );
        const cats = catRes?.data ?? catRes ?? [];
        setCategoryOptions(
          (Array.isArray(cats) ? cats : []).map((c) => ({
            id: c.id,
            name: c.name || `Category #${c.id}`,
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
        limit: 500,
        ...(liabilityLedgerId && { liabilityLedgerId }),
        ...(categoryId && { categoryId }),
        ...(expenseStatus && { status: expenseStatus }),
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
  }, [
    liabilityLedgerId,
    categoryId,
    expenseStatus,
    filters.startDate,
    filters.endDate,
    refreshKey,
    toast,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((row) => rowSearchHaystack(row).includes(q));
  }, [rows, search]);

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
      accessorKey: "expenseDate",
      header: "Bill date",
      cell: (row) =>
        row.expenseDate ? new Date(row.expenseDate).toLocaleDateString("en-IN") : "—",
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
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-end gap-2 flex-shrink-0">
        <div className="relative flex-1 min-w-[12rem]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search all columns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>
        <div className="space-y-1 w-full sm:w-52">
          <Label className="text-xs">Expense category</Label>
          <FormSelect
            options={categoryOptions}
            value={categoryId || null}
            onChange={(v) => setCategoryId(v != null ? String(v) : "")}
            placeholder="All categories"
            isSearchable
            isClearable
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
          />
        </div>
        <div className="space-y-1 w-full sm:w-40">
          <Label className="text-xs">Status</Label>
          <FormSelect
            options={INDIRECT_EXPENSE_STATUS_FILTER_OPTIONS}
            value={expenseStatus || null}
            onChange={(v) => setExpenseStatus(v != null ? String(v) : "")}
            placeholder="All statuses"
            isSearchable={false}
            isClearable
            menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
            menuPosition="fixed"
          />
        </div>
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
          data={filteredRows}
          columns={columns}
          loading={loading}
          pagination={false}
          emptyMessage="No indirect expenses for the selected filters."
        />
      </div>
    </div>
  );
}
