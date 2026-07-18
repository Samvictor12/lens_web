import { useState, useEffect, useCallback } from "react";
import { Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TablePrimitive as RawTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Refresh } from "@/components/ui/Refresh";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { getVendorCreditDebitNotes, cancelVendorCreditDebitNote } from "@/services/vendorCreditDebitNote";
import { printCreditDebitNote } from "@/utils/creditDebitNotePrint";
import CreateVendorCreditDebitNoteDialog from "./CreateVendorCreditDebitNoteDialog";

function fmt(n) {
  return `₹${parseFloat(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}

/**
 * Vendor Credit Note / Debit Note tab (M5).
 * type: 'credit' | 'debit'
 */
export default function VendorCreditDebitNotesTab({ type = "credit", vendors = [] }) {
  const { toast } = useToast();
  const { company } = useCompany();
  const isCredit = type === "credit";
  const label = isCredit ? "Credit Note" : "Debit Note";

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVendorCreditDebitNotes({ type, limit: 100 });
      if (res.success) setNotes(res.data || []);
    } catch (e) {
      toast({ variant: "destructive", title: `Failed to load ${label.toLowerCase()}s`, description: e.message });
    } finally {
      setLoading(false);
    }
  }, [type, refreshKey, toast, label]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async (note) => {
    if (!window.confirm(`Cancel ${label} ${note.noteNumber}? This will reverse its balance effect.`)) return;
    try {
      const res = await cancelVendorCreditDebitNote(note.id, type);
      if (res.success) {
        toast({ title: `${label} cancelled` });
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Cancel failed", description: e.message });
    }
  };

  return (
    <div className="flex flex-col gap-2 min-h-0 flex-1">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-muted-foreground">
          {isCredit ? "Reduces the vendor's outstanding AP balance." : "Increases the vendor's outstanding AP balance."}
        </p>
        <div className="flex items-center gap-1.5">
          <Refresh onClick={() => setRefreshKey((k) => k + 1)} />
          <Button size="xs" className="gap-1.5 h-8" onClick={() => setCreateOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New {label}
          </Button>
        </div>
      </div>

      <Card className="p-2 flex-1 min-h-0 overflow-y-auto">
        {loading ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Loading...</p>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No {label.toLowerCase()}s recorded</p>
        ) : (
          <RawTable>
            <TableHeader>
              <TableRow>
                <TableHead>Note No.</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Tax</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {notes.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="font-medium">{n.noteNumber}</TableCell>
                  <TableCell className="text-muted-foreground">{new Date(n.noteDate).toLocaleDateString("en-IN")}</TableCell>
                  <TableCell>{n.vendor?.name || n.vendor?.code || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{n.vendorInvoice?.invoiceNumber || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{fmt(n.amount)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{fmt(n.taxAmount)}</TableCell>
                  <TableCell className="text-muted-foreground truncate max-w-[200px]">{n.reason || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        n.status === "CANCELLED"
                          ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                      }
                    >
                      {n.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        title="Print"
                        onClick={() => printCreditDebitNote(n, type, company, "vendor")}
                      >
                        <Printer className="h-3.5 w-3.5" />
                      </Button>
                      {n.status !== "CANCELLED" && (
                        <Button variant="ghost" size="xs" onClick={() => handleCancel(n)}>
                          Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </RawTable>
        )}
      </Card>

      <CreateVendorCreditDebitNoteDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        type={type}
        vendors={vendors}
        onCreated={() => setRefreshKey((k) => k + 1)}
      />
    </div>
  );
}
