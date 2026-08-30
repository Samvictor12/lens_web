import { useCallback, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FormSelect } from "@/components/ui/form-select";
import { Refresh } from "@/components/ui/Refresh";
import { useToast } from "@/hooks/use-toast";
import { getCustomerDropdown } from "@/services/customer";
import { getCustomer360Overview } from "@/services/customer360";
import Customer360Metrics from "./Customer360Metrics";
import Customer360Cards from "./Customer360Cards";
import Customer360Charts from "./Customer360Charts";
import Customer360Tabs from "./Customer360Tabs";

/**
 * Customer 360 view — picker + Sections 1–4 (PRD-4.3 / FD-2.3).
 */
export default function Customer360Main() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await getCustomerDropdown();
        if (res.success) setCustomers(res.data || []);
      } catch {
        // non-critical
      }
    })();
  }, []);

  const loadOverview = useCallback(async () => {
    if (!customerId) {
      setOverview(null);
      return;
    }
    setLoading(true);
    try {
      const res = await getCustomer360Overview(customerId);
      setOverview(res.data || null);
    } catch (e) {
      setOverview(null);
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || "Failed to load Customer 360",
      });
    } finally {
      setLoading(false);
    }
  }, [customerId, toast, refreshKey]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  return (
    <div className="flex flex-col gap-4 p-3 md:p-4 min-h-0 h-full overflow-y-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Users className="h-5 w-5" />
          Customer 360
        </h1>
        <Refresh
          onClick={() => setRefreshKey((k) => k + 1)}
          disabled={!customerId}
        />
      </div>

      <Card className="p-3 flex-shrink-0">
        <div className="space-y-1 w-full max-w-md">
          <Label className="text-xs">Customer</Label>
          <FormSelect
            options={customers}
            value={customerId || null}
            onChange={(v) => setCustomerId(v != null ? String(v) : "")}
            placeholder="Select customer"
            isSearchable
            isClearable
          />
        </div>
      </Card>

      {!customerId ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Select a customer to view the 360 overview.
        </Card>
      ) : (
        <>
        <div className="space-y-4">
          <Customer360Metrics overview={overview} loading={loading} />
          <Customer360Cards
            customerId={customerId}
            cards={overview?.cards}
            loading={loading}
          />
          <Customer360Charts
            topLens={overview?.topLens}
            aging={overview?.aging30_60_90}
            loading={loading}
          />
          <Customer360Tabs
            customerId={customerId}
            ledgerId={overview?.customer?.ledgerId}
            refreshKey={refreshKey}
          />
        </div>
        </>
      )}
    </div>
  );
}
