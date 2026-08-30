import {
  TrendingUp,
  Wallet,
  ShoppingCart,
  Receipt,
  Target,
  Landmark,
  AlertCircle,
  CreditCard,
  Package,
  CalendarCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMoney(n) {
  const amount = Number.isFinite(Number(n)) ? Number(n) : 0;
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function KpiCard({ label, value, icon: Icon, iconColor, valueColor, loading }) {
  return (
    <Card className="shadow-none">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className={`text-lg font-bold ${valueColor || ""}`}>{loading ? "…" : value}</div>
      </CardContent>
    </Card>
  );
}

export default function FinanceDashboardKpis({ dashboard, loading }) {
  const today = dashboard?.today || {};
  const position = dashboard?.position || {};

  const row1 = [
    { key: "todaySales", label: "Today Sales", value: fmtMoney(today.todaySales), icon: TrendingUp, iconColor: "text-blue-500" },
    { key: "todayCollection", label: "Today Collection", value: fmtMoney(today.todayCollection), icon: CalendarCheck, iconColor: "text-emerald-500", valueColor: "text-emerald-600" },
    { key: "todayPurchases", label: "Today Purchases", value: fmtMoney(today.todayPurchases), icon: ShoppingCart, iconColor: "text-violet-500" },
    { key: "todayExpenses", label: "Today Expenses", value: fmtMoney(today.todayExpenses), icon: Receipt, iconColor: "text-orange-500", valueColor: "text-orange-600" },
    { key: "grossProfit", label: "Gross Profit", value: fmtMoney(today.grossProfit), icon: Target, iconColor: "text-cyan-500" },
    { key: "netProfit", label: "Net Profit", value: fmtMoney(today.netProfit), icon: Wallet, iconColor: "text-green-500", valueColor: "text-green-600" },
  ];

  const row2 = [
    { key: "cashBankTotal", label: "Cash & Bank Total", value: fmtMoney(position.cashBankTotal), icon: Landmark, iconColor: "text-blue-600" },
    { key: "collectionTarget", label: "Collection Target", value: fmtMoney(position.collectionTarget), icon: Target, iconColor: "text-violet-500" },
    { key: "receivableOutstanding", label: "Receivable Outstanding", value: fmtMoney(position.receivableOutstanding), icon: AlertCircle, iconColor: "text-orange-500", valueColor: "text-orange-600" },
    { key: "payablesPending", label: "Payables Pending", value: fmtMoney(position.payablesPending), icon: CreditCard, iconColor: "text-red-500", valueColor: "text-red-600" },
    { key: "inventoryValue", label: "Inventory Value", value: fmtMoney(position.inventoryValue), icon: Package, iconColor: "text-amber-500" },
  ];

  return (
    <div className="space-y-2 flex-shrink-0">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
        {row1.map((c) => (
          <KpiCard key={c.key} {...c} loading={loading} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
        {row2.map((c) => (
          <KpiCard key={c.key} {...c} loading={loading} />
        ))}
      </div>
    </div>
  );
}
