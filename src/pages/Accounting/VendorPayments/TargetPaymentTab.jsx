import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { getVendorPayments, getOutstandingVendorInvoices } from "@/services/vendorPayment";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Target Payment tab — per-vendor target, paid in period, and balance to pay (like Collection tab).
 */
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
          cancelledStatus: false,
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

  const remainingByVendor = useMemo(() => {
    return collectGroups
      .map((g) => {
        const remaining = (g.invoices || []).reduce(
          (s, inv) => s + parseFloat(inv.outstanding || 0),
          0
        );
        return {
          vendorId: g.vendorId,
          name: g.vendorName || g.shopname || `Vendor #${g.vendorId}`,
          code: g.vendorCode || "",
          remaining,
        };
      })
      .filter((r) => r.remaining > 0.01);
  }, [collectGroups]);

  const paidByVendor = useMemo(() => {
    const map = new Map();
    for (const p of payments) {
      if (p.cancelledStatus) continue;
      const key = p.vendorId;
      if (!map.has(key)) {
        map.set(key, {
          vendorId: key,
          name: p.vendor?.name || p.vendor?.shopname || `Vendor #${key}`,
          code: p.vendor?.code || "",
          paid: 0,
        });
      }
      map.get(key).paid += parseFloat(p.totalAmount || 0);
    }
    return map;
  }, [payments]);

  const rows = useMemo(() => {
    const map = new Map();
    for (const r of remainingByVendor) {
      map.set(r.vendorId, {
        vendorId: r.vendorId,
        name: r.name,
        code: r.code,
        remaining: r.remaining,
        paid: 0,
      });
    }
    for (const r of paidByVendor.values()) {
      if (!map.has(r.vendorId)) {
        map.set(r.vendorId, {
          vendorId: r.vendorId,
          name: r.name,
          code: r.code,
          remaining: 0,
          paid: 0,
        });
      }
      map.get(r.vendorId).paid += r.paid;
    }
    return Array.from(map.values())
      .map((r) => ({
        ...r,
        id: r.vendorId,
        target: r.remaining + r.paid,
        balance: r.remaining,
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [remainingByVendor, paidByVendor]);

  const loading = loadingCollect || loadingPayments;

  const columns = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Vendor",
        cell: (row) => (
          <div>
            <div className="font-medium truncate">{row.name}</div>
            {row.code ? (
              <div className="text-xs text-muted-foreground">{row.code}</div>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "target",
        header: "Target",
        align: "right",
        cell: (row) => <span className="font-mono">{fmt(row.target)}</span>,
      },
      {
        accessorKey: "paid",
        header: "Paid",
        align: "right",
        cell: (row) => (
          <span className="font-mono text-green-600">{fmt(row.paid)}</span>
        ),
      },
      {
        accessorKey: "balance",
        header: "Balance",
        align: "right",
        cell: (row) => (
          <span className="font-mono font-semibold text-violet-600">{fmt(row.balance)}</span>
        ),
      },
    ],
    []
  );

  if (loading && !rows.length) {
    return <p className="text-sm text-muted-foreground text-center py-8">Loading target payment…</p>;
  }

  if (!loading && !rows.length) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        No target payment rows for the selected period.
      </Card>
    );
  }

  return (
    <div className="min-h-0 flex-1 pb-4">
      <Table
        data={rows}
        columns={columns}
        loading={loading}
        emptyMessage="No target payment rows for the selected period."
      />
    </div>
  );
}
