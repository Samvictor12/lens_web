import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getBalanceSheet } from "@/services/financialReport";
import { fmt, todayInputDate } from "./reportUtils";

export default function BalanceSheetReport({ defaultAsOf, compact = false }) {
  const { toast } = useToast();
  const [asOf, setAsOf] = useState(defaultAsOf || todayInputDate());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await getBalanceSheet({ asOf: asOf || undefined });
      setData(res.data);
    } catch {
      toast({ variant: "destructive", title: "Failed to load balance sheet" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end">
        <div className="space-y-1">
          <Label className="text-xs">As Of</Label>
          <Input type="date" className="h-8 w-36 text-sm" value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </div>
        <Button size="sm" onClick={load} disabled={loading}>
          {loading ? "Loading..." : "Generate"}
        </Button>
        {data && (
          <Badge variant={data.isBalanced ? "default" : "destructive"}>
            {data.isBalanced ? "Balanced" : "Out of balance"}
          </Badge>
        )}
      </div>
      {data && (
        <div className="space-y-4">
          {data.sections?.map((s) => (
            <div key={s.groupCode}>
              <h3 className={`font-semibold uppercase text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}>
                {s.groupName}
              </h3>
              <div className={`flex justify-between py-2 font-bold border-b ${compact ? "text-sm" : ""}`}>
                <span>Total {s.groupName}</span>
                <span>{fmt(s.totalBalance)}</span>
              </div>
            </div>
          ))}
          <div className={`grid grid-cols-2 gap-4 pt-2 ${compact ? "text-xs" : "text-sm"}`}>
            <div className="font-bold">Total Assets: {fmt(data.totalAssets)}</div>
            <div className="font-bold">Liabilities + Capital: {fmt(data.totalLiabilitiesAndCapital)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
