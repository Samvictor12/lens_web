import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getBalanceSheet } from "@/services/financialReport";
import { fmt, todayInputDate } from "./reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf } from "./reportExport";

function flattenSection(section, depth = 0, lines = []) {
  const indent = "  ".repeat(depth);
  lines.push({
    name: `${indent}${section.groupName || section.group?.groupName || ""}`,
    amount: section.totalBalance,
    depth,
    kind: "group",
  });
  for (const l of section.ledgers || []) {
    lines.push({
      name: `${indent}  ${l.ledgerName}`,
      amount: l.balance ?? l.currentBalance,
      depth: depth + 1,
      kind: "ledger",
    });
  }
  for (const child of section.childGroups || []) {
    flattenSection(
      {
        groupName: child.group?.groupName,
        totalBalance: child.totalBalance,
        ledgers: child.ledgers,
        childGroups: child.childGroups,
      },
      depth + 1,
      lines
    );
  }
  return lines;
}

function NestedGroup({ node, compact, depth = 0 }) {
  const name = node.groupName || node.group?.groupName;
  const ledgers = node.ledgers || [];
  const children = node.childGroups || [];
  const pad = { paddingLeft: `${depth * 12}px` };

  return (
    <div className="space-y-0.5">
      {name && (
        <div
          className={`flex justify-between font-semibold ${compact ? "text-xs" : "text-sm"}`}
          style={pad}
        >
          <span>{name}</span>
          <span>{fmt(node.totalBalance)}</span>
        </div>
      )}
      {ledgers.map((l) => (
        <div
          key={l.id || l.ledgerCode}
          className={`flex justify-between text-muted-foreground ${compact ? "text-xs" : "text-sm"}`}
          style={{ paddingLeft: `${(depth + 1) * 12}px` }}
        >
          <span>
            <span className="font-mono text-[10px] mr-1">{l.ledgerCode}</span>
            {l.ledgerName}
          </span>
          <span>{fmt(l.balance ?? l.currentBalance)}</span>
        </div>
      ))}
      {children.map((child) => (
        <NestedGroup
          key={child.group?.groupCode || child.group?.id}
          node={child}
          compact={compact}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

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

  const assets = data?.sections?.find((s) => s.groupCode === "GRP-ASSETS");
  const liabilities = data?.sections?.find((s) => s.groupCode === "GRP-LIABILITIES");

  const handleExcel = () => {
    const rows = [];
    const max = Math.max(
      flattenSection(assets || {}).length,
      flattenSection(liabilities || {}).length
    );
    const aLines = flattenSection(assets || {});
    const lLines = flattenSection(liabilities || {});
    for (let i = 0; i < max; i++) {
      rows.push([
        aLines[i]?.name || "",
        aLines[i] != null ? aLines[i].amount : "",
        lLines[i]?.name || "",
        lLines[i] != null ? lLines[i].amount : "",
      ]);
    }
    rows.push(["Total Assets", data.totalAssets, "Liabilities + Capital", data.totalLiabilitiesAndCapital]);
    downloadExcel({
      filename: `balance-sheet_${asOf}`,
      sheetName: "Balance Sheet",
      headers: ["Assets", "Amount", "Liabilities", "Amount"],
      rows,
    });
  };

  const handlePdf = () => {
    const renderCol = (section) =>
      flattenSection(section || {})
        .map(
          (l) =>
            `<tr><td>${l.name}</td><td class="text-right">${fmt(l.amount)}</td></tr>`
        )
        .join("");
    exportPdf(
      "Balance Sheet",
      `<h1>Balance Sheet as of ${asOf}</h1>
      <table><thead><tr><th colspan="2">Assets</th><th colspan="2">Liabilities</th></tr></thead>
      <tbody>
        <tr>
          <td colspan="2"><table>${renderCol(assets)}</table></td>
          <td colspan="2"><table>${renderCol(liabilities)}</table></td>
        </tr>
        <tr style="font-weight:bold">
          <td>Total Assets</td><td class="text-right">${fmt(data.totalAssets)}</td>
          <td>Liabilities + Capital</td><td class="text-right">${fmt(data.totalLiabilitiesAndCapital)}</td>
        </tr>
      </tbody></table>`
    );
  };

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
        <ReportExportButtons disabled={!data} onExcel={handleExcel} onPdf={handlePdf} />
      </div>
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 border rounded-md p-3">
            <h3 className={`font-semibold uppercase ${compact ? "text-xs" : "text-sm"}`}>Assets</h3>
            {assets ? (
              <NestedGroup node={assets} compact={compact} />
            ) : (
              <p className="text-xs text-muted-foreground">No asset groups</p>
            )}
            <div className={`flex justify-between font-bold border-t pt-2 ${compact ? "text-sm" : ""}`}>
              <span>Total Assets</span>
              <span>{fmt(data.totalAssets)}</span>
            </div>
          </div>
          <div className="space-y-2 border rounded-md p-3">
            <h3 className={`font-semibold uppercase ${compact ? "text-xs" : "text-sm"}`}>Liabilities</h3>
            {liabilities ? (
              <NestedGroup node={liabilities} compact={compact} />
            ) : (
              <p className="text-xs text-muted-foreground">No liability groups</p>
            )}
            <div className={`flex justify-between font-bold border-t pt-2 ${compact ? "text-sm" : ""}`}>
              <span>Liabilities + Capital</span>
              <span>{fmt(data.totalLiabilitiesAndCapital)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
