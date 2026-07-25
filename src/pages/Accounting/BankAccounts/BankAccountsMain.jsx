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
import { Refresh } from "@/components/ui/Refresh";
import { getBankAccounts, createBankAccount, updateBankAccount } from "@/services/bankAccount";

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

export default function BankAccountsMain() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBankAccounts();
      setAccounts(res.data || []);
    } catch {
      toast({ variant: "destructive", title: "Failed to load bank accounts" });
    } finally {
      setLoading(false);
    }
  }, [refreshKey, toast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (acc) => {
    const bd = acc.bankDetails || {};
    setEditing(acc);
    setForm({
      ledgerName: acc.ledgerName || "",
      accountType: "BANK",
      openingBalance: String(acc.currentBalance ?? 0),
      description: acc.description || "",
      bankName: bd.bankName || "",
      accountNumber: bd.accountNumber || "",
      ifscCode: bd.ifscCode || "",
      branch: bd.branch || "",
    });
    setDialogOpen(true);
  };

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
      if (editing) {
        await updateBankAccount(editing.id, {
          ledgerName: form.ledgerName.trim(),
          description: form.description || null,
          bankDetails,
        });
        toast({ title: "Bank account updated" });
      } else {
        await createBankAccount({
          ledgerName: form.ledgerName.trim(),
          accountType: form.accountType,
          openingBalance: parseFloat(form.openingBalance) || 0,
          description: form.description || null,
          bankDetails,
        });
        toast({ title: "Bank account created" });
      }
      setDialogOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (e) {
      toast({
        variant: "destructive",
        title: e?.response?.data?.message || e.message || "Save failed",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold">Bank Accounts</h1>
          <p className="text-xs text-muted-foreground">
            Manage cash and bank posting ledgers (GRP-CASH / GRP-BANK)
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Refresh onClick={() => setRefreshKey((k) => k + 1)} />
          <Button size="sm" className="gap-1.5" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No cash/bank accounts found</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card
              key={acc.id}
              className="cursor-pointer hover:border-primary/40"
              onClick={() => openEdit(acc)}
            >
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">{acc.ledgerName}</p>
                </div>
                <p className="text-xs text-muted-foreground font-mono">{acc.ledgerCode}</p>
                <p className="text-sm font-semibold">
                  ₹{parseFloat(acc.currentBalance || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </p>
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
            <DialogTitle>{editing ? "Edit Account" : "Add Bank Account"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1">
              <Label>Name <span className="text-red-500">*</span></Label>
              <Input
                value={form.ledgerName}
                onChange={(e) => setForm((f) => ({ ...f, ledgerName: e.target.value }))}
              />
            </div>
            {!editing && (
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
            )}
            {!editing && (
              <div className="space-y-1">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                />
              </div>
            )}
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
