import {
  Receipt,
  AlertCircle,
  PackageCheck,
  Target,
  Wallet,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export default function BillingAndInvoicingKpis({ stats, loading }) {
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
    },
    {
      key: "awaitingBills",
      label: "Awaiting Bills",
      value: stats?.awaitingBills ?? 0,
      icon: PackageCheck,
      iconColor: "text-yellow-500",
      valueColor: "text-yellow-600",
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
    },
    {
      key: "todayCollection",
      label: "Today Collection",
      value: fmtMoney(stats?.todayCollection),
      icon: CalendarCheck,
      iconColor: "text-emerald-500",
      valueColor: "text-emerald-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6 flex-shrink-0">
      {cards.map((s) => {
        const Icon = s.icon;
        return (
          <Card key={s.key} className="shadow-none">
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
