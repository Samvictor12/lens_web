import { Fragment, useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import { getLedgerStatement } from "@/services/financialReport";
import { getCustomerById } from "@/services/customer";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Customer Ledger tab — ledger statement for the selected customer's AR ledger.
 */
export default function CustomerLedgerTab({ customers = [], filters }) {
  const { toast } = useToast();
  const [customerId, setCustomerId] = useState(filters.customerId || "");
  const [from, setFrom] = useState(filters.startDate || "");
  const [to, setTo] = useState(filters.endDate || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState({});

  useEffect(() => {
    if (filters.customerId) setCustomerId(String(filters.customerId));
    if (filters.startDate) setFrom(filters.startDate);
    if (filters.endDate) setTo(filters.endDate);
  }, [filters.customerId, filters.startDate, filters.endDate]);

  const load = async () => {
    if (!customerId) {
      toast({ variant: "destructive", title: "Select a customer" });
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const custRes = await getCustomerById(customerId);
      const ledgerId = custRes.data?.ledgerId;
      if (!ledgerId) {
        toast({
          variant: "destructive",
          title: "Customer has no linked ledger",
        });
        return;
      }
      const res = await getLedgerStatement({
        ledgerId,
        from: from || undefined,
        to: to || undefined,
      });
      setData(res.data);
      setExpandedRows({});
    } catch {
      toast({ variant: "destructive", title: "Failed to load ledger statement" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 min-h-0 flex-1 overflow-hidden">
      <Card className="p-2 flex-shrink-0">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1 w-56">
            <Label className="text-xs">Customer</Label>
            <FormSelect
              options={customers}
              value={customerId || null}
              onChange={(v) => setCustomerId(v != null ? String(v) : "")}
              placeholder="Select customer"
              isSearchable
              isClearable
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">From</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">To</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          <Button size="sm" className="h-8" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Generate"}
          </Button>
        </div>
      </Card>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        {!data ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Select a customer and generate the ledger statement.
          </Card>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-4 text-sm px-1">
              <span>
                <span className="text-muted-foreground">Opening: </span>
                <strong>{fmt(data.openingBalance)}</strong>
              </span>
              <span>
                <span className="text-muted-foreground">Closing: </span>
                <strong>{fmt(data.closingBalance)}</strong>
              </span>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted text-xs">
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Txn No.</th>
                    <th className="p-2 text-left">Ref.</th>
                    <th className="p-2 text-left">Narration</th>
                    <th className="p-2 text-right">Debit</th>
                    <th className="p-2 text-right">Credit</th>
                    <th className="p-2 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.entries || []).map((e, i) => {
                    const hasBreakdown =
                      e.breakdown?.items?.length > 0 ||
                      parseFloat(e.breakdown?.advanceAmount || 0) > 0;
                    const isExpanded = expandedRows[i];
                    return (
                      <Fragment key={`entry-${i}`}>
                        <tr className="border-b hover:bg-muted/40">
                          <td className="p-2">
                            {new Date(e.date).toLocaleDateString("en-IN")}
                          </td>
                          <td className="p-2 font-mono text-xs">
                            {hasBreakdown ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1 text-left hover:text-primary"
                                onClick={() =>
                                  setExpandedRows((prev) => ({
                                    ...prev,
                                    [i]: !prev[i],
                                  }))
                                }
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-3 w-3 shrink-0" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 shrink-0" />
                                )}
                                {e.transactionNumber}
                              </button>
                            ) : (
                              e.transactionNumber
                            )}
                          </td>
                          <td className="p-2 text-xs text-muted-foreground">
                            {e.referenceNumber || "—"}
                          </td>
                          <td className="p-2 text-xs">{e.narration}</td>
                          <td className="p-2 text-right">
                            {parseFloat(e.debit) > 0 ? fmt(e.debit) : ""}
                          </td>
                          <td className="p-2 text-right">
                            {parseFloat(e.credit) > 0 ? fmt(e.credit) : ""}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {fmt(e.balance)}
                          </td>
                        </tr>
                        {isExpanded && e.breakdown && (
                          <tr className="bg-muted/20">
                            <td colSpan={7} className="p-2 text-xs text-muted-foreground">
                              {(e.breakdown.items || [])
                                .map(
                                  (it) =>
                                    `${it.invoiceNo || it.documentNo}: ${fmt(it.amount)}`
                                )
                                .join(" · ")}
                              {parseFloat(e.breakdown.advanceAmount || 0) > 0 &&
                                ` · Advance ${fmt(e.breakdown.advanceAmount)}`}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
