import { useState, useEffect, useCallback } from "react";
import { LayoutDashboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getDashboard } from "@/services/financialReport";
import FinanceDashboardKpis from "./FinanceDashboardKpis";
import FyTrendChart from "./FyTrendChart";
import ReceivablesRiskTable from "./ReceivablesRiskTable";
import ExpenseBreakupChart from "./ExpenseBreakupChart";
import EmbeddedPnLSnapshot from "./EmbeddedPnLSnapshot";
import FinanceDashboardReportsTabs from "./FinanceDashboardReportsTabs";
import { todayInputDate } from "../FinancialReports/reportUtils";

export default function FinanceDashboardMain() {
  const { toast } = useToast();
  const [asOf, setAsOf] = useState(todayInputDate());
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDashboard({ asOf: asOf || undefined });
      setDashboard(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load finance dashboard" });
    } finally {
      setLoading(false);
    }
  }, [asOf, toast]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5" />
            Finance Dashboard
          </h1>
          <p className="text-xs text-muted-foreground">
            Accounting overview — KPIs, trends, receivables risk, and embedded reports
            {dashboard?.financialYear?.label && (
              <span className="ml-1">· {dashboard.financialYear.label}</span>
            )}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">As of</Label>
            <Input
              type="date"
              className="h-8 w-36 text-sm"
              value={asOf}
              onChange={(e) => setAsOf(e.target.value)}
            />
          </div>
          <Button size="sm" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </div>

      <FinanceDashboardKpis dashboard={dashboard} loading={loading} />

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
        <FyTrendChart
          fyTrend={dashboard?.fyTrend}
          financialYear={dashboard?.financialYear}
          loading={loading}
        />
        <ReceivablesRiskTable rows={dashboard?.receivablesRisk} loading={loading} />
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <ExpenseBreakupChart expenseBreakup={dashboard?.expenseBreakup} loading={loading} />
        </div>
        <div className="lg:col-span-3">
          <EmbeddedPnLSnapshot snapshot={dashboard?.profitLossSnapshot} loading={loading} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">Reports</h2>
        <FinanceDashboardReportsTabs asOf={dashboard?.asOf || asOf} />
      </div>
    </div>
  );
}
