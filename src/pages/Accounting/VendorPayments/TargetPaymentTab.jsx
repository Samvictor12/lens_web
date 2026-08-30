import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { getVendorPayments, getOutstandingVendorInvoices } from "@/services/vendorPayment";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/** Target Payment tab — per-vendor balance due (cumulative cap) vs payments in period. */
export default function TargetPaymentTab({ filters, collectibleParams, refreshKey = 0 }) {
  const [payments, setPayments] = useState([]);
  const [collectGroups, setCollectGroups] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [loadingCollect, setLoadingCollect] = useState(false);

  const targetParams = collectibleParams ?? {
    endDate: filters.endDate,
    vendorId: filters.vendorId,
    productId: filters.productId,
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingCollect(true);
      try {
        const params = {
          groupBy: "vendor",
          collectible: true,
          ...(targetParams.endDate && { endDate: targetParams.endDate }),
          ...(targetParams.vendorId && { vendorId: targetParams.vendorId }),
          ...(targetParams.productId && { productId: targetParams.productId }),
        };
        const res = await getOutstandingVendorInvoices(params);
        if (!cancelled) setCollectGroups(res.data?.groups || []);
      } catch {
        if (!cancelled) setCollectGroups([]);
      } finally {
        if (!cancelled) setLoadingCollect(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetParams.endDate, targetParams.vendorId, targetParams.productId, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingPayments(true);
      try {
        const params = {
          page: 1,
          limit: 500,
          ...(filters.vendorId && { vendorId: filters.vendorId }),
          ...(filters.startDate && { from: filters.startDate }),
          ...(filters.endDate && { to: filters.endDate }),
        };
        const res = await getVendorPayments(params);
        if (!cancelled) setPayments(res.data || []);
      } catch {
        if (!cancelled) setPayments([]);
      } finally {
        if (!cancelled) setLoadingPayments(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filters.vendorId, filters.startDate, filters.endDate, refreshKey]);

  const balanceRows = useMemo(() => {
    return collectGroups
      .map((g) => {
        const total = (g.invoices || []).reduce(
          (s, inv) => s + parseFloat(inv.outstanding || 0),
          0
        );
        return {
          vendorId: g.vendorId,
          name: g.vendorName || `Vendor #${g.vendorId}`,
          code: g.vendorCode || "",
          total,
          count: (g.invoices || []).length,
        };
      })
      .filter((r) => r.total > 0.01)
      .sort((a, b) => b.total - a.total);
  }, [collectGroups]);

  const receiptRows = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      if (p.cancelledStatus) continue;
      const key = p.vendorId;
      if (!map.has(key)) {
        map.set(key, {
          vendorId: key,
          name: p.vendor?.name || p.vendor?.shopname || `Vendor #${key}`,
          code: p.vendor?.code || "",
          total: 0,
          count: 0,
        });
      }
      const row = map.get(key);
      row.total += parseFloat(p.totalAmount || 0);
      row.count += 1;
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [payments]);

  const loading = loadingCollect || loadingPayments;

  if (loading && !balanceRows.length && !receiptRows.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading target payment…</p>;
  }

  return (
    <div className="space-y-6 pb-4">
      <section>
        <h3 className="text-sm font-semibold mb-2">Balance to Pay</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Cumulative payable balance per vendor (bills due on or before today or filter end date).
        </p>
        {loadingCollect ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading balances…</p>
        ) : !balanceRows.length ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No balance to pay for the selected filters.
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {balanceRows.map((r) => (
              <Card key={r.vendorId} className="p-3">
                <div className="font-medium text-sm truncate">{r.name}</div>
                {r.code && <div className="text-xs text-muted-foreground">{r.code}</div>}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-violet-600">{fmt(r.total)}</span>
                  <span className="text-xs text-muted-foreground">{r.count} bill(s)</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold mb-2">Payments Made</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Vendor payment vouchers recorded in the selected period.
        </p>
        {loadingPayments ? (
          <p className="text-sm text-muted-foreground text-center py-4">Loading payments…</p>
        ) : !receiptRows.length ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No payments in the selected period.
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {receiptRows.map((r) => (
              <Card key={r.vendorId} className="p-3">
                <div className="font-medium text-sm truncate">{r.name}</div>
                {r.code && <div className="text-xs text-muted-foreground">{r.code}</div>}
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-lg font-bold text-green-600">{fmt(r.total)}</span>
                  <span className="text-xs text-muted-foreground">{r.count} voucher(s)</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
