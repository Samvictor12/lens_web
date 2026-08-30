import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAwaitingVendorBills } from "@/services/vendorInvoice";
import { getStatusLabel } from "@/pages/PurchaseOrder/PurchaseOrder.constants";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

function PoStatusBadge({ status }) {
  const label = getStatusLabel(status);
  const isPartial = status === "PO_PARTIAL_RECEIVED";
  return (
    <Badge
      variant="secondary"
      className={
        isPartial
          ? "text-[10px] bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100"
          : "text-[10px] bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
      }
    >
      {label}
    </Badge>
  );
}

export default function AwaitingVendorBillsTab({ filters, refreshKey = 0 }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = {
          ...(filters.vendorId && { vendorId: filters.vendorId }),
          ...(filters.productId && { productId: filters.productId }),
          ...(filters.startDate && { startDate: filters.startDate }),
          ...(filters.endDate && { endDate: filters.endDate }),
        };
        const res = await getAwaitingVendorBills(params);
        if (!cancelled) setGroups(res.data?.groups || []);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.vendorId, filters.productId, filters.startDate, filters.endDate, refreshKey]);

  if (loading) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading awaiting bills…</p>;
  }

  if (!groups.length) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        No POs awaiting vendor bill registration for the selected filters.
      </Card>
    );
  }

  return (
    <div className="space-y-3 pb-4">
      {groups.map((g) => (
        <Card key={g.vendorId} className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="font-semibold text-sm truncate">{g.vendorName}</span>
                {g.vendorCode && (
                  <span className="text-xs text-muted-foreground">({g.vendorCode})</span>
                )}
              </div>
            </div>
            <Badge variant="secondary" className="text-[10px] shrink-0">
              {g.purchaseOrders?.length || 0} PO(s)
            </Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b">
                  <th className="text-left py-1 pr-2">PO</th>
                  <th className="text-left py-1 pr-2">Status</th>
                  <th className="text-left py-1 pr-2">Order date</th>
                  <th className="text-right py-1">Value</th>
                </tr>
              </thead>
              <tbody>
                {(g.purchaseOrders || []).map((po) => (
                  <tr key={po.purchaseOrderId} className="border-b border-muted/40">
                    <td className="py-1.5 pr-2 font-medium">{po.poNumber}</td>
                    <td className="py-1.5 pr-2">
                      <PoStatusBadge status={po.status} />
                    </td>
                    <td className="py-1.5 pr-2 text-muted-foreground">
                      {po.orderDate
                        ? new Date(po.orderDate).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="py-1.5 text-right font-mono">{fmt(po.totalValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  );
}
