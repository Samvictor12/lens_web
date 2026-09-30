import {
  Receipt,
  AlertCircle,
  PackageCheck,
  Target,
  Wallet,
  CalendarCheck,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function BillingAndInvoicingKpis({ stats, loading, onKpiNavigate }) {
  const cards = [
    {
      key: "totalBilling",
      label: "Total Billing",
      value: fmtMoney(stats?.totalBilling),
      icon: Receipt,
      iconColor: "text-blue-500",
    },
    {
      key: "outstanding",
      label: "Outstanding",
      value: fmtMoney(stats?.outstanding),
      icon: AlertCircle,
      iconColor: "text-orange-500",
      valueColor: "text-orange-600",
      navigateKey: "outstanding",
    },
    {
      key: "awaitingBills",
      label: "Awaiting Bills",
      value: stats?.awaitingBills ?? 0,
      icon: PackageCheck,
      iconColor: "text-yellow-500",
      valueColor: "text-yellow-600",
      navigateKey: "awaitingBills",
    },
    {
      key: "draftedInvoiceCount",
      label: "Drafted Invoice",
      value: stats?.draftedInvoiceCount ?? 0,
      icon: FileText,
      iconColor: "text-slate-500",
      valueColor: "text-slate-700",
      navigateKey: "draftedInvoiceCount",
    },
    {
      key: "targetCollection",
      label: "Target Collection",
      value: fmtMoney(stats?.targetCollection),
      icon: Target,
      iconColor: "text-violet-500",
    },
    {
      key: "totalCollection",
      label: "Total Collection",
      value: fmtMoney(stats?.totalCollection),
      icon: Wallet,
      iconColor: "text-green-500",
      valueColor: "text-green-600",
      navigateKey: "totalCollection",
    },
    {
      key: "todayCollection",
      label: "Today Collection",
      value: fmtMoney(stats?.todayCollection),
      icon: CalendarCheck,
      iconColor: "text-emerald-500",
      valueColor: "text-emerald-600",
      navigateKey: "todayCollection",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 flex-shrink-0">
      {cards.map((s) => {
        const Icon = s.icon;
        const clickable = s.navigateKey && onKpiNavigate;
        return (
          <Card
            key={s.key}
            className={`shadow-none${clickable ? " cursor-pointer transition-colors hover:bg-muted/50" : ""}`}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onClick={
              clickable
                ? () => onKpiNavigate(s.navigateKey)
                : undefined
            }
            onKeyDown={
              clickable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onKpiNavigate(s.navigateKey);
                    }
                  }
                : undefined
            }
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <Icon className={`h-3.5 w-3.5 ${s.iconColor}`} />
            </CardHeader>
            <CardContent className="px-3 pb-3 pt-0">
              <div className={`text-lg font-bold ${s.valueColor || ""}`}>
                {loading ? "…" : s.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
