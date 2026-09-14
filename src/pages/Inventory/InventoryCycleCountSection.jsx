import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Play, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { useToast } from "@/hooks/use-toast";
import {
  acceptCycleCountVariance,
  createCycleCountSession,
  getCycleCountSession,
  getCycleCountTrayBook,
  getInventoryDropdowns,
  listCycleCountSessions,
  postCycleCountSession,
  recordCycleCount,
  recountCycleCountLine,
} from "@/services/inventory";

const OPEN = new Set(["PLANNED", "IN_PROGRESS", "PENDING_REVIEW"]);

function outcomeBadge(outcome) {
  const map = {
    MATCH: "default",
    SHORTAGE: "destructive",
    OVERAGE: "secondary",
    PENDING_RECOUNT: "outline",
    UNCOUNTED: "outline",
  };
  return <Badge variant={map[outcome] || "outline"}>{outcome || "UNCOUNTED"}</Badge>;
}

export default function InventoryCycleCountSection({ godownType, onRefresh }) {
  const { toast } = useToast();
  const [sessions, setSessions] = useState([]);
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [startLocationId, setStartLocationId] = useState("");
  const [recountThreshold, setRecountThreshold] = useState("0");
  const [trayId, setTrayId] = useState("");
  const [book, setBook] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadSessions = useCallback(async () => {
    const res = await listCycleCountSessions({ godownType, limit: 20 });
    if (res.success) setSessions(res.data || []);
    return res.data || [];
  }, [godownType]);

  const loadSession = useCallback(
    async (id) => {
      const res = await getCycleCountSession(id, { godownType });
      if (res.success) setSession(res.data);
      return res.data;
    },
    [godownType]
  );

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      setLoading(true);
      try {
        const [drop, list] = await Promise.all([
          getInventoryDropdowns({ godownType }),
          loadSessions(),
        ]);
        if (cancelled) return;
        if (drop.success) setLocations(drop.data?.locations || []);
        const open = (list || []).find((s) => OPEN.has(s.status));
        if (open) await loadSession(open.id);
        else setSession(null);
      } catch {
        if (!cancelled) {
          toast({ title: "Error", description: "Failed to load cycle counts", variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    boot();
    return () => {
      cancelled = true;
    };
  }, [godownType, loadSession, loadSessions, toast]);

  const trayOptions = useMemo(() => {
    const scope = session?.scopeTrays || [];
    return scope.map((t) => ({
      value: String(t.id),
      label: `${t.name}${t.location?.name ? ` · ${t.location.name}` : ""}`,
    }));
  }, [session]);

  const loadBook = async (id) => {
    if (!session?.id || !id) {
      setBook([]);
      return;
    }
    try {
      const res = await getCycleCountTrayBook(session.id, { trayId: id, godownType });
      if (res.success) {
        const rows = res.data?.book || [];
        setBook(rows);
        const next = {};
        rows.forEach((row) => {
          next[row.inventoryItemId] =
            row.countedQty != null ? String(row.countedQty) : "";
        });
        setCounts(next);
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Failed to load tray book",
        variant: "destructive",
      });
    }
  };

  const handleTrayChange = (value) => {
    setTrayId(value);
    loadBook(value);
  };

  const handleStart = async () => {
    setSaving(true);
    try {
      const res = await createCycleCountSession({
        godownType,
        locationId: startLocationId ? Number(startLocationId) : null,
        recountThreshold: Number(recountThreshold) || 0,
      });
      if (res.success) {
        toast({ title: "Cycle count opened", description: res.data?.sessionNo });
        await loadSessions();
        await loadSession(res.data.id);
        onRefresh?.();
      }
    } catch (err) {
      toast({
        title: "Error",
        description: err.message || "Could not start cycle count",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCount = async () => {
    const lines = book
      .map((row) => ({
        inventoryItemId: row.inventoryItemId,
        countedQty: counts[row.inventoryItemId],
      }))
      .filter((row) => row.countedQty !== "" && row.countedQty != null)
      .map((row) => ({ ...row, countedQty: Number(row.countedQty) }));
    if (!lines.length) {
      toast({ title: "Validation", description: "Enter at least one counted quantity", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await recordCycleCount(session.id, { trayId: Number(trayId), lines }, { godownType });
      if (res.success) {
        toast({ title: "Counts saved" });
        await loadSession(session.id);
        await loadBook(trayId);
        onRefresh?.();
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Count failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleRecount = async (line) => {
    const qty = Number(counts[line.inventoryItemId]);
    if (Number.isNaN(qty) || qty < 0) {
      toast({ title: "Validation", description: "Enter a recount quantity", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await recountCycleCountLine(session.id, line.lineId, { countedQty: qty }, { godownType });
      toast({ title: "Recount saved" });
      await loadSession(session.id);
      await loadBook(trayId);
      onRefresh?.();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Recount failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleAccept = async (line) => {
    setSaving(true);
    try {
      await acceptCycleCountVariance(session.id, line.lineId, { godownType });
      toast({ title: "Variance accepted" });
      await loadSession(session.id);
      await loadBook(trayId);
      onRefresh?.();
    } catch (err) {
      toast({ title: "Error", description: err.message || "Accept failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async () => {
    setSaving(true);
    try {
      const res = await postCycleCountSession(session.id, { godownType });
      if (res.success) {
        toast({ title: "Cycle count posted", description: "Verification only — stock quantities unchanged" });
        await loadSessions();
        await loadSession(session.id);
        onRefresh?.();
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Post failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const kpis = session?.kpis || {};
  const closed = session?.status === "POSTED" || session?.status === "CANCELLED";
  const hasOpen = sessions.some((s) => OPEN.has(s.status));
  const locationOptions = locations.map((l) => ({ value: String(l.id), label: l.name }));

  return (
    <Card id="cycle-count">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ClipboardList className="h-4 w-4" />
          Cycle Count
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Verify physical tray contents against book qty. Does not write ADJUSTMENT, DAMAGE, or inward.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <FormSelect
              label="Rack / location (optional)"
              value={startLocationId}
              onChange={setStartLocationId}
              options={locationOptions}
              placeholder="All godown trays"
            />
            <FormInput
              label="Recount threshold"
              type="number"
              min="0"
              step="1"
              value={recountThreshold}
              onChange={(e) => setRecountThreshold(e.target.value)}
            />
            <div className="flex items-end">
              <Button onClick={handleStart} disabled={saving || loading} className="gap-2 w-full">
                <Play className="h-4 w-4" />
                Start cycle count
              </Button>
            </div>
          </div>
        )}

        {session && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold">{session.sessionNo}</span>
              {outcomeBadge(session.status)}
              <span className="text-muted-foreground">
                Completion {kpis.completionPct ?? 0}% · Accuracy{" "}
                {kpis.accuracyPct == null ? "—" : `${kpis.accuracyPct}%`} · Match {kpis.matched ?? 0} ·
                Variance {kpis.variance ?? 0} · Pending {kpis.pendingRecount ?? 0}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => loadSession(session.id)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormSelect
                label="Tray"
                value={trayId}
                onChange={handleTrayChange}
                options={trayOptions}
                placeholder="Select tray to count"
              />
            </div>

            {book.length > 0 && (
              <div className="overflow-x-auto border rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-2">Product</th>
                      <th className="text-left p-2">Power</th>
                      <th className="text-right p-2">Book</th>
                      <th className="text-right p-2">Counted</th>
                      <th className="text-right p-2">Var</th>
                      <th className="text-left p-2">Outcome</th>
                      <th className="text-right p-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {book.map((row) => (
                      <tr key={row.inventoryItemId} className="border-t">
                        <td className="p-2">
                          {row.lens_name || "Item"}
                          {row.product_code ? ` (${row.product_code})` : ""}
                        </td>
                        <td className="p-2 text-muted-foreground">
                          SPH {row.sph ?? "0"} · CYL {row.cyl ?? "0"} · ADD {row.add ?? "0"}
                        </td>
                        <td className="p-2 text-right tabular-nums">{row.bookQty}</td>
                        <td className="p-2">
                          <input
                            className="w-20 border rounded px-1.5 py-1 text-right"
                            type="number"
                            min="0"
                            step="1"
                            disabled={closed}
                            value={counts[row.inventoryItemId] ?? ""}
                            onChange={(e) =>
                              setCounts((prev) => ({ ...prev, [row.inventoryItemId]: e.target.value }))
                            }
                          />
                        </td>
                        <td className="p-2 text-right tabular-nums">{row.varianceQty ?? "—"}</td>
                        <td className="p-2">{outcomeBadge(row.outcome)}</td>
                        <td className="p-2 text-right space-x-1">
                          {row.outcome === "PENDING_RECOUNT" && !closed && (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={saving}
                                onClick={() => handleRecount(row)}
                              >
                                Recount
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                disabled={saving}
                                onClick={() => handleAccept(row)}
                              >
                                Accept
                              </Button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button onClick={handleCount} disabled={saving || closed || !trayId} variant="outline">
                Save counts
              </Button>
              <Button onClick={handlePost} disabled={saving || closed}>
                Post session
              </Button>
            </div>
          </>
        )}

        {sessions.length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Recent sessions</p>
            {sessions.slice(0, 5).map((s) => (
              <button
                key={s.id}
                type="button"
                className="block hover:underline"
                onClick={() => loadSession(s.id)}
              >
                {s.sessionNo} · {s.status}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
