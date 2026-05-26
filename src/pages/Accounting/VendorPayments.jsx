import { useState, useEffect, useCallback } from "react";
import { Plus, Search, CreditCard, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { getVendorPayments, getVendorPaymentById, createVendorPayment, getOutstandingPOs } from "@/services/vendorPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getVendors } from "@/services/vendor";

const emptyForm = {
  vendorId: "",
  bankLedgerId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "",
  notes: "",
  items: [],
};

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHEQUE", "UPI", "NEFT", "RTGS"];

export default function VendorPayments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);

  const [vendors, setVendors] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);
  const [outstandingPOs, setOutstandingPOs] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingPOs, setLoadingPOs] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const loadMeta = useCallback(async () => {
    try {
      const [vendRes, bankRes] = await Promise.all([
        getVendors(1, 100),
        getCashBankLedgers(),
      ]);
      setVendors(vendRes.data || []);
      setBankLedgers(bankRes.data || []);
    } catch {
      // silently fail
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { page, limit: pageSize };
      if (search) params.search = search;
      const res = await getVendorPayments(params);
      setPayments(res.data || []);
      setTotal(res.pagination?.total || res.data?.length || 0);
    } catch {
      toast({ variant: "destructive", title: "Failed to load payments" });
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize, search, toast]);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const handleVendorChange = async (vendorId) => {
    setForm(f => ({ ...f, vendorId, items: [] }));
    if (!vendorId) return;
    setLoadingPOs(true);
    try {
      const res = await getOutstandingPOs(vendorId);
      setOutstandingPOs(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load outstanding POs" });
    } finally {
      setLoadingPOs(false);
    }
  };

  const togglePO = (po) => {
    setForm(f => {
      const exists = f.items.find(i => i.purchaseOrderId === po.purchaseOrderId);
      if (exists) return { ...f, items: f.items.filter(i => i.purchaseOrderId !== po.purchaseOrderId) };
      return { ...f, items: [...f.items, { purchaseOrderId: po.purchaseOrderId, amount: po.outstanding }] };
    });
  };

  const updateItemAmount = (poId, amount) => {
    setForm(f => ({ ...f, items: f.items.map(i => i.purchaseOrderId === poId ? { ...i, amount } : i) }));
  };

  const totalAmount = form.items.reduce((s, i) => s + parseFloat(i.amount || 0), 0);

  const handleCreate = async () => {
    if (!form.vendorId || !form.bankLedgerId || form.items.length === 0) {
      toast({ variant: "destructive", title: "Vendor, bank account, and at least one PO are required" });
      return;
    }
    setSaving(true);
    try {
      await createVendorPayment({
        vendorId: parseInt(form.vendorId),
        bankLedgerId: parseInt(form.bankLedgerId),
        paymentDate: form.paymentDate,
        paymentMethod: form.paymentMethod,
        referenceNumber: form.referenceNumber || null,
        notes: form.notes || null,
        totalAmount,
        items: form.items.map(i => ({ purchaseOrderId: i.purchaseOrderId, amount: parseFloat(i.amount) })),
      });
      toast({ title: "Payment voucher created" });
      setDialogOpen(false);
      setForm(emptyForm);
      setOutstandingPOs([]);
      fetchPayments();
    } catch (e) {
      toast({ variant: "destructive", title: e?.message || "Failed to create payment" });
    } finally {
      setSaving(false);
    }
  };

  const viewDetail = async (row) => {
    try {
      const res = await getVendorPaymentById(row.id);
      setSelectedPayment(res.data);
      setDetailOpen(true);
    } catch {
      toast({ variant: "destructive", title: "Failed to load details" });
    }
  };

  const columns = [
    { accessorKey: "voucherNumber", header: "Voucher No.", cell: ({ value }) => <span className="font-mono text-sm font-medium">{value}</span> },
    { accessorKey: "paymentDate", header: "Date", cell: ({ value }) => <span>{new Date(value).toLocaleDateString("en-IN")}</span> },
    { accessorKey: "vendor", header: "Vendor", cell: ({ row }) => <span className="font-medium">{row.vendor?.name}</span> },
    { accessorKey: "paymentMethod", header: "Method", cell: ({ value }) => <Badge variant="outline" className="text-xs">{value}</Badge> },
    {
      accessorKey: "totalAmount", header: "Amount", align: "right",
      cell: ({ value }) => <span className="font-semibold">₹{parseFloat(value).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>,
    },
    {
      accessorKey: "id", header: "", align: "right",
      cell: ({ row }) => <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => viewDetail(row)}>View</Button>,
    },
  ];

  return (
    <div className="p-2 sm:p-4 space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2"><CreditCard className="h-5 w-5" />Vendor Payments</h1>
          <p className="text-xs text-muted-foreground">Manage vendor payment vouchers</p>
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5"><Plus className="h-3.5 w-3.5" />New Payment</Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input className="pl-8 h-8 text-sm" placeholder="Search payments..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <Card>
        <DataTable
          columns={columns}
          data={payments}
          totalCount={total}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          isLoading={isLoading}
          emptyMessage="No payments found"
        />
      </Card>

      {/* Create Payment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>New Vendor Payment Voucher</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Vendor *</Label>
                <Select value={form.vendorId} onValueChange={handleVendorChange}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select vendor" /></SelectTrigger>
                  <SelectContent>
                    {vendors.map(v => <SelectItem key={v.id} value={String(v.id)}>{v.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Date *</Label>
                <Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Payment Account *</Label>
                <Select value={form.bankLedgerId} onValueChange={v => setForm(f => ({ ...f, bankLedgerId: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {bankLedgers.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.ledgerName}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Payment Method</Label>
                <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                  <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Reference / Cheque No.</Label>
              <Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="UTR / Cheque number" />
            </div>

            {/* Outstanding POs */}
            {form.vendorId && (
              <div className="space-y-2">
                <Label>Select POs to Pay *</Label>
                {loadingPOs ? (
                  <p className="text-sm text-muted-foreground">Loading outstanding POs...</p>
                ) : outstandingPOs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No outstanding POs for this vendor</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto border rounded-md p-2">
                    {outstandingPOs.map(po => {
                      const selected = form.items.find(i => i.purchaseOrderId === po.purchaseOrderId);
                      return (
                        <div key={po.purchaseOrderId} className={`flex items-center gap-2 p-2 rounded cursor-pointer ${selected ? "bg-primary/10" : "hover:bg-muted"}`} onClick={() => togglePO(po)}>
                          <input type="checkbox" readOnly checked={!!selected} className="h-3.5 w-3.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-mono font-medium">{po.poNumber}</p>
                            <p className="text-xs text-muted-foreground">Outstanding: ₹{parseFloat(po.outstanding).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p>
                          </div>
                          {selected && (
                            <Input
                              type="number"
                              className="w-32 h-7 text-sm"
                              value={selected.amount}
                              onClick={e => e.stopPropagation()}
                              onChange={e => updateItemAmount(po.purchaseOrderId, e.target.value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {form.items.length > 0 && (
              <div className="flex justify-between items-center p-3 bg-muted rounded-md">
                <span className="text-sm font-medium">Total Payment</span>
                <span className="text-lg font-bold">₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            )}

            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Voucher"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedPayment && (
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Payment Voucher — {selectedPayment.voucherNumber}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-muted-foreground">Vendor</p><p className="font-medium">{selectedPayment.vendor?.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p>{new Date(selectedPayment.paymentDate).toLocaleDateString("en-IN")}</p></div>
                <div><p className="text-xs text-muted-foreground">Method</p><p>{selectedPayment.paymentMethod}</p></div>
                <div><p className="text-xs text-muted-foreground">Reference</p><p>{selectedPayment.referenceNumber || "—"}</p></div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">PO Allocations</p>
                <div className="space-y-1">
                  {selectedPayment.items?.map(item => (
                    <div key={item.id} className="flex justify-between text-sm bg-muted rounded px-3 py-1.5">
                      <span className="font-mono">{item.purchaseOrder?.poNumber}</span>
                      <span className="font-semibold">₹{parseFloat(item.allocatedAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center p-3 bg-primary/10 rounded font-bold">
                <span>Total</span>
                <span>₹{parseFloat(selectedPayment.totalAmount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
