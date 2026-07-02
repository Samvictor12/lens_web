import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ShieldCheck,
  LogOut,
  Package,
  Truck,
  IndianRupee,
  CheckCircle2,
  Clock,
  AlertCircle,
  Phone,
  MapPin,
  TrendingUp,
  ClipboardList,
  Receipt,
} from "lucide-react";

import { getPublicCompanySettings } from "@/services/settings";

const BUSINESS_NAME = "XYZ Optics";

// ─── Dummy Data ───────────────────────────────────────────────────────────────
const ORDERS = [
  { id: 1, orderNo: "SO-2026-048", status: "IN_FITTING",      orderDate: "2026-05-10", category: "Progressive",   product: "Essilor Varilux X",  coating: "Anti-Reflection",   amount: 8400, urgent: true },
  { id: 2, orderNo: "SO-2026-039", status: "READY_FOR_DISPATCH", orderDate: "2026-05-06", category: "Single Vision", product: "Zeiss DuraVision",   coating: "Blue Cut",          amount: 3200, urgent: false },
  { id: 3, orderNo: "SO-2026-031", status: "CONFIRMED",          orderDate: "2026-04-29", category: "Bifocal",       product: "Hoya HD",            coating: "UV Protection",     amount: 2800, urgent: false },
  { id: 4, orderNo: "SO-2026-022", status: "DELIVERED",          orderDate: "2026-04-18", category: "Single Vision", product: "Crizal Easy",        coating: "Anti-Reflection",   amount: 1950, urgent: false },
  { id: 5, orderNo: "SO-2026-011", status: "DELIVERED",          orderDate: "2026-04-03", category: "Progressive",   product: "Nikon SeeMax",       coating: "Scratch Resistant", amount: 6750, urgent: false },
];

const DISPATCHES = [
  { id: 1, dcNumber: "DC-2026-018", status: "IN_TRANSIT", orders: ["SO-2026-039"],                expectedDate: "2026-05-14", actualDate: null,         deliveryPerson: "Suresh" },
  { id: 2, dcNumber: "DC-2026-012", status: "DELIVERED",  orders: ["SO-2026-022", "SO-2026-011"], expectedDate: "2026-04-20", actualDate: "2026-04-20", deliveryPerson: "Suresh" },
  { id: 3, dcNumber: "DC-2026-007", status: "DELIVERED",  orders: ["SO-2026-005"],                expectedDate: "2026-03-28", actualDate: "2026-03-29", deliveryPerson: "Ravi" },
];

const BILLING = [
  { id: 1, invoiceNo: "INV-2026-031", date: "2026-05-06", orders: ["SO-2026-039"],               amount: 3200,  paid: 0,    status: "UNPAID"  },
  { id: 2, invoiceNo: "INV-2026-024", date: "2026-04-18", orders: ["SO-2026-022"],               amount: 1950,  paid: 1950, status: "PAID"    },
  { id: 3, invoiceNo: "INV-2026-018", date: "2026-04-03", orders: ["SO-2026-011"],               amount: 6750,  paid: 3000, status: "PARTIAL" },
  { id: 4, invoiceNo: "INV-2026-009", date: "2026-03-15", orders: ["SO-2026-005", "SO-2026-003"], amount: 4800,  paid: 4800, status: "PAID"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_META = {
  DRAFT:              { label: "Draft",          cls: "bg-gray-50 text-gray-500 border-gray-200" },
  CONFIRMED:          { label: "Confirmed",       cls: "bg-blue-50 text-blue-700 border-blue-200" },
  IN_FITTING:      { label: "In Fitting",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ON_HOLD:            { label: "On Hold",         cls: "bg-orange-50 text-orange-700 border-orange-200" },
  AWAITING_QUALITY:   { label: "Awaiting QC",     cls: "bg-orange-50 text-orange-700 border-orange-200" },
  READY_FOR_DISPATCH: { label: "Ready to Ship",   cls: "bg-green-50 text-green-700 border-green-200" },
  READY_FOR_PICKUP:   { label: "Ready for Pickup", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  DELIVERED:          { label: "Delivered",       cls: "bg-gray-100 text-gray-500 border-gray-200" },
  CLOSED:             { label: "Closed",          cls: "bg-gray-50 text-gray-400 border-gray-200" },
  IN_TRANSIT:         { label: "In Transit",      cls: "bg-sky-50 text-sky-700 border-sky-200" },
  PENDING:            { label: "Ready for Pickup", cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return (
    <Badge variant="outline" className={`text-[11px] font-medium ${meta.cls}`}>
      {meta.label}
    </Badge>
  );
}

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

const activeOrders      = ORDERS.filter((o) => !["DELIVERED", "CLOSED"].includes(o.status));
const pendingDispatches = DISPATCHES.filter((d) => d.status !== "DELIVERED");

const BILLING_STATUS_META = {
  PAID:    { label: "Paid",           cls: "bg-green-50 text-green-700 border-green-200" },
  UNPAID:  { label: "Unpaid",         cls: "bg-red-50 text-red-600 border-red-200" },
  PARTIAL: { label: "Partial",        cls: "bg-amber-50 text-amber-700 border-amber-200" },
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "orders",   label: "Sales",    icon: Package },
  { id: "dispatch", label: "Dispatch", icon: Truck },
  { id: "billing",  label: "Billing",  icon: Receipt },
];

export default function CustomerPortalDashboard() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("orders");
  const [company, setCompany] = useState({ companyName: BUSINESS_NAME, logo: '' });

  useEffect(() => {
    getPublicCompanySettings()
      .then((r) => { if (r?.data?.companyName) setCompany(r.data); })
      .catch(() => {});
  }, []);

  // Real customer data from session (set during portal login)
  const session = JSON.parse(sessionStorage.getItem("portal_session") || "{}");
  const customer = {
    name:                session.name               || "—",
    shopname:            session.shopname            || "",
    phone:               session.phone               || "",
    city:                session.city                || "",
    outstanding_credit:  session.outstanding_credit  ?? 0,
    credit_limit:        session.credit_limit        ?? 0,
  };

  const handleLogout = () => {
    sessionStorage.removeItem("portal_session");
    navigate(`/portal/${token}`, { replace: true });
  };

  return (
    <div className="fixed inset-0 overflow-y-auto bg-slate-50">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b sticky top-0 z-20 shadow-sm">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {company.logo ? (
              <img src={company.logo} alt={company.companyName} className="h-8 w-8 sm:h-9 sm:w-9 object-contain rounded-full flex-shrink-0" />
            ) : (
              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            )}
            <div>
              <p className="text-sm sm:text-base font-bold leading-none">{company.companyName}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">Customer Portal</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="h-8 sm:h-9 gap-1.5 text-xs sm:text-sm" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row lg:gap-6 xl:gap-8 gap-4">

          {/* ── Sidebar ─────────────────────────────────────────────────── */}
          <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0 space-y-4">

            {/* Customer card */}
            <Card className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary font-bold text-lg">
                  {customer.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-base leading-tight truncate">{customer.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{customer.shopname}</p>
                  {customer.phone && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3 w-3 flex-shrink-0" />{customer.phone}
                    </div>
                  )}
                  {customer.city && (
                    <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 flex-shrink-0" />{customer.city}
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* Stats tiles — 3-col on mobile/tablet, stacked on lg */}
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              {[
                { label: "Active Orders",    value: activeOrders.length,      color: "text-blue-600",  bg: "bg-blue-50",  Icon: ClipboardList },
                { label: "Pending Dispatch", value: pendingDispatches.length, color: "text-amber-600", bg: "bg-amber-50", Icon: Truck },
                { label: "Total Orders",     value: ORDERS.length,            color: "text-green-600", bg: "bg-green-50", Icon: TrendingUp },
              ].map(({ label, value, color, bg, Icon }) => (
                <Card key={label} className="p-3 sm:p-4">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`h-7 w-7 rounded-md ${bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <p className="text-[11px] sm:text-xs text-muted-foreground leading-tight">{label}</p>
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                </Card>
              ))}
            </div>

            {/* Account summary */}
            <Card className="p-4 sm:p-5 space-y-3">
              <h2 className="text-sm font-semibold flex items-center gap-1.5">
                <IndianRupee className="h-3.5 w-3.5" /> Account Summary
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credit Limit</span>
                  <span className="font-medium">₹{customer.credit_limit.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Used</span>
                  <span className="font-medium">₹{customer.outstanding_credit.toLocaleString("en-IN")}</span>
                </div>
                {/* Credit usage bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${customer.credit_limit > 0 ? Math.min(100, (customer.outstanding_credit / customer.credit_limit) * 100) : 0}%` }}
                  />
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium text-muted-foreground">Outstanding</span>
                  <span className="font-bold text-amber-600">₹{customer.outstanding_credit.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Please contact <strong>{company.companyName}</strong> to clear your outstanding dues.
                </p>
              </div>
            </Card>

          </aside>

          {/* ── Main content ──────────────────────────────────────────────── */}
          <main className="flex-1 min-w-0 space-y-4">

            {/* Tabs */}
            <div className="flex border-b bg-white rounded-t-lg overflow-x-auto">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-5 sm:px-6 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    activeTab === id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>

            {/* Orders */}
            {activeTab === "orders" && (
              <div className="space-y-3">
                {ORDERS.map((order) => (
                  <Card key={order.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="text-sm sm:text-base font-semibold">{order.orderNo}</span>
                        {order.urgent && (
                          <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200 px-1.5 py-0 flex-shrink-0">
                            Urgent
                          </Badge>
                        )}
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5">
                      <div>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {[order.category, order.product, order.coating].filter(Boolean).join(" · ")}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">Ordered: {fmt(order.orderDate)}</p>
                      </div>
                      <p className="text-base sm:text-lg font-bold whitespace-nowrap">
                        ₹{order.amount.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Dispatch */}
            {activeTab === "dispatch" && (
              <div className="space-y-3">
                {DISPATCHES.map((d) => (
                  <Card key={d.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <span className="text-sm sm:text-base font-semibold">{d.dcNumber}</span>
                      <StatusBadge status={d.status} />
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Orders: {d.orders.join(", ")}</p>
                      <p className="flex items-center gap-1">
                        {d.status === "DELIVERED" ? (
                          <><CheckCircle2 className="h-3 w-3 text-green-600 flex-shrink-0" /> Delivered on {fmt(d.actualDate)}</>
                        ) : (
                          <><Clock className="h-3 w-3 text-amber-500 flex-shrink-0" /> Expected by {fmt(d.expectedDate)}</>
                        )}
                      </p>
                      <p>Delivery by: {d.deliveryPerson}</p>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Billing */}
            {activeTab === "billing" && (
              <div className="space-y-3">
                {/* Summary bar */}
                <Card className="p-4 sm:p-5 bg-white">
                  <div className="grid grid-cols-3 divide-x text-center">
                    <div className="px-2">
                      <p className="text-xs text-muted-foreground">Total Billed</p>
                      <p className="text-base sm:text-lg font-bold">₹{BILLING.reduce((s, b) => s + b.amount, 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p className="text-base sm:text-lg font-bold text-green-600">₹{BILLING.reduce((s, b) => s + b.paid, 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div className="px-2">
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className="text-base sm:text-lg font-bold text-red-600">₹{BILLING.reduce((s, b) => s + (b.amount - b.paid), 0).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                </Card>

                {BILLING.map((b) => {
                  const bMeta = BILLING_STATUS_META[b.status] || { label: b.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                  return (
                    <Card key={b.id} className="p-4 sm:p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <span className="text-sm sm:text-base font-semibold">{b.invoiceNo}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{fmt(b.date)}</p>
                        </div>
                        <Badge variant="outline" className={`text-[11px] font-medium ${bMeta.cls}`}>{bMeta.label}</Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-1.5">
                        <p className="text-xs text-muted-foreground">Orders: {b.orders.join(", ")}</p>
                        <div className="text-right">
                          <p className="text-base sm:text-lg font-bold">₹{b.amount.toLocaleString("en-IN")}</p>
                          {b.paid > 0 && b.paid < b.amount && (
                            <p className="text-xs text-green-600">Paid: ₹{b.paid.toLocaleString("en-IN")}</p>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}

          </main>
        </div>
      </div>
    </div>
  );
}
