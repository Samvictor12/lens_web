import { useState, useEffect, useCallback } from "react";
import { Plus, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getBankAccounts, createBankAccount } from "@/services/bankAccount";
import { fmt } from "../FinancialReports/reportUtils";
import { ReportExportButtons, downloadExcel, exportPdf, tableHtml } from "../FinancialReports/reportExport";

const emptyForm = {
  ledgerName: "",
  accountType: "BANK",
  openingBalance: "0",
  description: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branch: "",
};

export default function CashBankAccountsTab() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBankAccounts();
      setAccounts(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load cash & bank accounts" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async () => {
    if (!form.ledgerName.trim()) {
      toast({ variant: "destructive", title: "Account name is required" });
      return;
    }
    setSaving(true);
    try {
      const bankDetails =
        form.accountType === "CASH"
          ? null
          : {
              bankName: form.bankName || null,
              accountNumber: form.accountNumber || null,
              ifscCode: form.ifscCode || null,
              branch: form.branch || null,
            };
      await createBankAccount({
        ledgerName: form.ledgerName.trim(),
        accountType: form.accountType,
        openingBalance: parseFloat(form.openingBalance) || 0,
        description: form.description || null,
        bankDetails,
      });
      toast({ title: "Account created" });
      setDialogOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || e.message || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  const excelRows = accounts.map((a) => [
    a.ledgerCode,
    a.ledgerName,
    parseFloat(a.currentBalance || 0),
    a.bankDetails?.accountNumber || "",
    a.bankDetails?.ifscCode || "",
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-end justify-between">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5" onClick={() => { setForm(emptyForm); setDialogOpen(true); }}>
            <Plus className="h-4 w-4" /> Add
          </Button>
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
          <ReportExportButtons
            disabled={!accounts.length}
            onExcel={() =>
              downloadExcel({
                filename: "cash-bank-accounts",
                sheetName: "Cash and Bank",
                headers: ["Code", "Name", "Balance", "Account No", "IFSC"],
                rows: excelRows,
              })
            }
            onPdf={() =>
              exportPdf(
                "Cash & Bank",
                tableHtml(
                  ["Code", "Name", "Balance", "Account No", "IFSC"],
                  excelRows,
                  "Cash & Bank Accounts"
                )
              )
            }
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No cash/bank accounts found</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className="shadow-none">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{acc.ledgerName}</p>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{acc.ledgerCode}</p>
                <p className="text-sm font-semibold">{fmt(acc.currentBalance)}</p>
                {acc.bankDetails?.accountNumber && (
                  <p className="text-xs text-muted-foreground">
                    A/c {acc.bankDetails.accountNumber}
                    {acc.bankDetails.ifscCode ? ` · ${acc.bankDetails.ifscCode}` : ""}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.ledgerName}
                onChange={(e) => setForm((f) => ({ ...f, ledgerName: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Type</Label>
              <Select
                value={form.accountType}
                onValueChange={(v) => setForm((f) => ({ ...f, accountType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK">Bank</SelectItem>
                  <SelectItem value="CASH">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Opening Balance</Label>
              <Input
                type="number"
                step="0.01"
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
              />
            </div>
            {form.accountType !== "CASH" && (
              <>
                <div className="space-y-1">
                  <Label>Bank Name</Label>
                  <Input
                    value={form.bankName}
                    onChange={(e) => setForm((f) => ({ ...f, bankName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Account Number</Label>
                  <Input
                    value={form.accountNumber}
                    onChange={(e) => setForm((f) => ({ ...f, accountNumber: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label>IFSC</Label>
                    <Input
                      value={form.ifscCode}
                      onChange={(e) => setForm((f) => ({ ...f, ifscCode: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Branch</Label>
                    <Input
                      value={form.branch}
                      onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))}
                    />
                  </div>
                </div>
              </>
            )}
            <div className="space-y-1">
              <Label>Description</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
