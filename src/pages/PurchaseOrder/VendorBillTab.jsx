import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, IndianRupee, FileText, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getVendorDropdown } from "@/services/vendor";
import { getVendorInvoices, getVendorInvoiceSummary } from "@/services/vendorInvoice";
import { getIstMonthRange } from "./PurchaseOrder.constants";
import { useVendorBillColumns } from "./useVendorBillColumns";

const ALL_VENDOR = "__all__";
const EMPTY_SUMMARY = { billCount: 0, totalBilled: 0, outstanding: 0 };

function formatInr(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function csvEscape(value) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export default function VendorBillTab({ refreshKey = 0 }) {
  const { toast } = useToast();
  const monthRange = useMemo(() => getIstMonthRange(), []);
  const [from, setFrom] = useState(monthRange.start);
  const [to, setTo] = useState(monthRange.end);
  const [vendorId, setVendorId] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const columns = useVendorBillColumns();

  const isThisMonth = from === monthRange.start && to === monthRange.end;
  const isAllRange = !from && !to;

  useEffect(() => {
    getVendorDropdown()
      .then((res) => {
        if (res.success) setVendors(res.data || []);
      })
      .catch(() => {});
  }, []);

  const queryParams = useMemo(() => {
    const params = {
      page: pageIndex + 1,
      limit: pageSize,
    };
    if (from) params.from = from;
    if (to) params.to = to;
    if (vendorId) params.vendorId = vendorId;
    return params;
  }, [from, to, vendorId, pageIndex, pageSize]);

  const fetchBills = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getVendorInvoices(queryParams);
      if (res.success) {
        setRows(res.data || []);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to load vendor bills",
        variant: "destructive",
      });
      setRows([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [queryParams, toast]);

  const fetchSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      if (vendorId) params.vendorId = vendorId;
      const res = await getVendorInvoiceSummary(params);
      if (res.success) {
        setSummary({ ...EMPTY_SUMMARY, ...(res.data || {}) });
      }
    } catch {
      setSummary(EMPTY_SUMMARY);
    } finally {
      setSummaryLoading(false);
    }
  }, [from, to, vendorId]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills, refreshKey]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary, refreshKey]);

  const handleThisMonth = () => {
    setFrom(monthRange.start);
    setTo(monthRange.end);
    setPageIndex(0);
  };

  const handleAll = () => {
    setFrom("");
    setTo("");
    setPageIndex(0);
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const params = { page: 1, limit: 5000 };
      if (from) params.from = from;
      if (to) params.to = to;
      if (vendorId) params.vendorId = vendorId;
      const res = await getVendorInvoices(params);
      const data = res.data || [];
      const headers = [
        "Date",
        "Vendor",
        "Bill No",
        "Invoice No",
        "PO Numbers",
        "Amount",
        "GST",
        "Courier",
        "Total",
        "Outstanding",
        "Status",
      ];
      const lines = [
        headers.map(csvEscape).join(","),
        ...data.map((inv) =>
          [
            inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleDateString("en-IN") : "",
            inv.vendor?.name || "",
            inv.supplierInvoiceNo || "",
            inv.invoiceNumber || "",
            (inv.items || []).map((item) => item.purchaseOrder?.poNumber).filter(Boolean).join("; "),
            parseFloat(inv.subtotalAmount) || 0,
            parseFloat(inv.taxAmount) || 0,
            parseFloat(inv.courierCharges) || 0,
            parseFloat(inv.totalAmount) || 0,
            parseFloat(inv.outstanding) || 0,
            inv.status || "",
          ]
            .map(csvEscape)
            .join(",")
        ),
      ];
      const blob = new Blob([`\uFEFF${lines.join("\n")}`], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `vendor-bills_${from || "all"}_${to || "all"}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: error.message || "Could not export vendor bills.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const summaryCards = [
    {
      key: "billCount",
      label: isAllRange ? "Bills" : isThisMonth ? "Bills this month" : "Bills",
      value: summaryLoading ? "…" : summary.billCount,
      icon: FileText,
      theme: {
        card: "bg-gradient-to-br from-blue-50 to-blue-100/80 border-blue-200/80",
        iconWrap: "bg-blue-500 text-white shadow-sm shadow-blue-200",
        label: "text-blue-700/80",
        value: "text-blue-950",
      },
    },
    {
      key: "totalBilled",
      label: "Total billed",
      value: summaryLoading ? "…" : formatInr(summary.totalBilled),
      icon: IndianRupee,
      theme: {
        card: "bg-gradient-to-br from-emerald-50 to-teal-100/70 border-emerald-200/80",
        iconWrap: "bg-emerald-500 text-white shadow-sm shadow-emerald-200",
        label: "text-emerald-700/80",
        value: "text-emerald-950",
      },
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: summaryLoading ? "…" : formatInr(summary.outstanding),
      icon: Wallet,
      theme: {
        card: "bg-gradient-to-br from-amber-50 to-orange-100/70 border-amber-200/80",
        iconWrap: "bg-amber-500 text-white shadow-sm shadow-amber-200",
        label: "text-amber-700/80",
        value: "text-amber-950",
      },
    },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
        <h2 className="text-sm font-semibold">
          {isThisMonth ? "Summary of bills this month" : "Summary of vendor bills"}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="xs"
            variant={isThisMonth ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={handleThisMonth}
          >
            This month
          </Button>
          <Button
            type="button"
            size="xs"
            variant={isAllRange ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            onClick={handleAll}
          >
            All
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-shrink-0">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          const t = card.theme;
          return (
            <div key={card.key} className={cn("rounded-xl border shadow-sm", t.card)}>
              <div className="p-3 flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className={cn("text-[11px] font-semibold leading-tight", t.label)}>{card.label}</p>
                  <span className={cn("inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", t.iconWrap)}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className={cn("text-xl font-bold tracking-tight leading-none truncate", t.value)}>
                  {card.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <Card className="p-2 flex-shrink-0">
        <div className="flex w-full flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Recent Vendor Bills</span>
          <Input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value || "");
              setPageIndex(0);
            }}
            className="!h-8 min-w-[110px] max-w-[140px] text-xs px-1.5"
            title="From date"
          />
          <Input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value || "");
              setPageIndex(0);
            }}
            className="!h-8 min-w-[110px] max-w-[140px] text-xs px-1.5"
            title="To date"
          />
          <div className="min-w-[120px] flex-1 max-w-[220px]">
            <Select
              value={vendorId == null ? ALL_VENDOR : String(vendorId)}
              onValueChange={(v) => {
                setVendorId(v === ALL_VENDOR ? null : Number(v));
                setPageIndex(0);
              }}
            >
              <SelectTrigger className="!h-8 !w-full text-xs px-2">
                <SelectValue placeholder="Vendor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VENDOR} className="text-xs">
                  Vendor
                </SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={String(v.id)} className="text-xs">
                    {v.name || v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="h-8 gap-1.5 ml-auto"
            onClick={handleDownload}
            disabled={downloading}
          >
            <Download className="h-3.5 w-3.5" />
            Download
          </Button>
        </div>
      </Card>

      <div className="flex-1 min-h-0 [&_table]:text-[13px] [&_th]:text-[11px]">
        <Table
          data={rows}
          columns={columns}
          pageIndex={pageIndex}
          pageSize={pageSize}
          totalCount={totalCount}
          onPageChange={setPageIndex}
          loading={loading}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          pagination={true}
          emptyMessage="No vendor bills found"
        />
      </div>
    </div>
  );
}
