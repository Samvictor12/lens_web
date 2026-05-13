import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  getPortalStatus,
  activateCustomerPortal,
  changeCustomerPortalPin,
  getCustomerPendingInvoices,
} from "@/services/customer";
import {
  ShieldCheck,
  ShieldOff,
  MessageCircle,
  Copy,
  KeyRound,
  RotateCcw,
  ReceiptText,
  Loader2,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

const BUSINESS_NAME = "XYZ Optics";

function buildPortalUrl(token) {
  return `${window.location.origin}/portal/${token}`;
}

function openWhatsApp(phone, message) {
  const cleaned = phone.replace(/\D/g, "");
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

// ─── PIN Input ────────────────────────────────────────────────────────────────
function PinInput({ value, onChange, placeholder = "Enter 6-digit PIN", disabled }) {
  return (
    <Input
      type="password"
      inputMode="numeric"
      maxLength={6}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 6))}
      placeholder={placeholder}
      disabled={disabled}
      className="text-center text-lg tracking-[0.4em] font-mono h-12"
    />
  );
}

// ─── Action Card ──────────────────────────────────────────────────────────────
function ActionCard({ icon: Icon, title, description, onClick, variant = "default", disabled }) {
  const colorMap = {
    default: "hover:border-primary/50 hover:bg-primary/5",
    success: "hover:border-green-500/50 hover:bg-green-50",
    warning: "hover:border-yellow-500/50 hover:bg-yellow-50",
    blue: "hover:border-blue-500/50 hover:bg-blue-50",
  };
  const iconColorMap = {
    default: "text-primary",
    success: "text-green-600",
    warning: "text-yellow-600",
    blue: "text-blue-600",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-start gap-3 p-4 rounded-lg border text-left transition-all ${colorMap[variant]} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${iconColorMap[variant]}`} />
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </button>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CustomerActionsModal({ customer, open, onClose }) {
  const { toast } = useToast();
  const [status, setStatus] = useState(null);       // portal status from API
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  // Sub-flow state: null = action menu, "activate" | "change-pin" | "invoices"
  const [flow, setFlow] = useState(null);
  const [step, setStep] = useState(1);

  // Form state
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [activatedData, setActivatedData] = useState(null); // after successful activation
  const [invoiceData, setInvoiceData] = useState(null);

  // Fetch portal status each time modal opens
  useEffect(() => {
    if (!open || !customer) return;
    setFlow(null);
    setStep(1);
    setPin("");
    setPinConfirm("");
    setActivatedData(null);
    setInvoiceData(null);

    (async () => {
      try {
        setLoading(true);
        const res = await getPortalStatus(customer.id);
        setStatus(res.data || res);
      } catch {
        toast({ title: "Error", description: "Failed to load portal status.", variant: "destructive" });
        onClose();
      } finally {
        setLoading(false);
      }
    })();
  }, [open, customer]);

  const resetFlow = () => {
    setFlow(null);
    setStep(1);
    setPin("");
    setPinConfirm("");
    setActivatedData(null);
    setInvoiceData(null);
  };

  // ─── Activation Flow ──────────────────────────────────────────────────────
  const handleActivate = async () => {
    if (pin !== pinConfirm) {
      toast({ title: "PIN mismatch", description: "The PINs you entered do not match.", variant: "destructive" });
      return;
    }
    if (pin.length !== 6) {
      toast({ title: "Invalid PIN", description: "PIN must be exactly 6 digits.", variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      const res = await activateCustomerPortal(customer.id, pin);
      const data = res.data || res;
      setActivatedData(data);
      setStatus((prev) => ({ ...prev, portal_active: true, portal_token: data.portal_token }));
      setStep(3);
    } catch (err) {
      toast({ title: "Activation failed", description: err?.message || "Could not activate portal.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleSendActivationWhatsApp = () => {
    const token = activatedData?.portal_token;
    if (!token) return;
    const portalUrl = buildPortalUrl(token);
    const phone = customer.phone || status?.phone;
    const name = customer.name || status?.name;
    const msg =
      `Dear ${name},\n\nYour customer portal with ${BUSINESS_NAME} is now active.\n\n` +
      `*Login Link:* ${portalUrl}\n` +
      `*Your PIN:* ${pin}\n\n` +
      `Please keep your PIN confidential. Contact us if you need help.`;
    openWhatsApp(phone, msg);
  };

  // ─── Change PIN Flow ─────────────────────────────────────────────────────
  const handleChangePin = async () => {
    if (pin !== pinConfirm) {
      toast({ title: "PIN mismatch", description: "The PINs you entered do not match.", variant: "destructive" });
      return;
    }
    if (pin.length !== 6) {
      toast({ title: "Invalid PIN", description: "PIN must be exactly 6 digits.", variant: "destructive" });
      return;
    }
    try {
      setBusy(true);
      await changeCustomerPortalPin(customer.id, pin);
      setStep(2); // success step
      toast({ title: "PIN changed", description: "Portal PIN updated successfully." });
    } catch (err) {
      toast({ title: "Failed", description: err?.message || "Could not change PIN.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleResendLogin = () => {
    const token = status?.portal_token;
    if (!token) return;
    const portalUrl = buildPortalUrl(token);
    const phone = customer.phone || status?.phone;
    const name = customer.name || status?.name;
    const currentPin = status?.portal_pin_hash;
    const msg =
      `Dear ${name},\n\nHere is your ${BUSINESS_NAME} customer portal login link:\n\n` +
      `*Login Link:* ${portalUrl}\n` +
      (currentPin ? `*Your PIN:* ${currentPin}\n` : "") +
      `\nPlease keep your PIN confidential. Contact us if you need help.`;
    openWhatsApp(phone, msg);
  };

  // ─── Invoice Reminder Flow ────────────────────────────────────────────────
  const handleFetchAndSendInvoice = async () => {
    const phone = customer.phone || status?.phone;
    const name = customer.name || status?.name;
    const token = status?.portal_token;

    try {
      setBusy(true);
      const res = await getCustomerPendingInvoices(customer.id);
      const data = res.data || res;
      setInvoiceData(data);

      const outstanding = data.outstanding_credit || 0;
      const orderCount = data.pending_orders?.length || 0;
      const portalUrl = token ? buildPortalUrl(token) : "";

      const msg =
        `Dear ${name},\n\nFriendly reminder from ${BUSINESS_NAME}:\n\n` +
        (outstanding > 0 ? `*Outstanding Amount:* Rs.${outstanding.toLocaleString("en-IN")}\n` : "") +
        (orderCount > 0 ? `*Pending Orders:* ${orderCount}\n` : "") +
        (portalUrl ? `\n*View your account:* ${portalUrl}` : "") +
        `\n\nPlease contact us for any queries. Thank you!`;

      openWhatsApp(phone, msg);
    } catch (err) {
      toast({ title: "Error", description: err?.message || "Could not fetch invoices.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = () => {
    const token = status?.portal_token;
    if (!token) return;
    navigator.clipboard.writeText(buildPortalUrl(token)).then(() => {
      toast({ title: "Copied!", description: "Portal link copied to clipboard." });
    });
  };

  // ─── Render helpers ───────────────────────────────────────────────────────
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading portal status…</p>
    </div>
  );

  const renderActiveMenu = () => (
    <div className="space-y-2.5 mt-4">
      <p className="text-xs text-muted-foreground mb-3">Choose an action for this customer's portal:</p>
      <ActionCard
        icon={KeyRound}
        title="Change PIN"
        description="Set a new 6-digit login PIN for this customer"
        variant="default"
        onClick={() => { setFlow("change-pin"); setStep(1); }}
      />
      <ActionCard
        icon={RotateCcw}
        title="Resend Login Link"
        description={
          status?.pin_needs_reset
            ? "PIN needs to be reset — please use Change PIN first"
            : "Send the portal URL and PIN to customer via WhatsApp"
        }
        variant="blue"
        disabled={!!status?.pin_needs_reset}
        onClick={handleResendLogin}
      />
      {status?.pin_needs_reset && (
        <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
          This customer's PIN was set before the current system. Please use <strong>Change PIN</strong> to set a new one, then Resend Login will include the PIN automatically.
        </p>
      )}
      <ActionCard
        icon={ReceiptText}
        title="Send Invoice Reminder"
        description="Fetch outstanding balance and send WhatsApp reminder"
        variant="warning"
        disabled={busy}
        onClick={handleFetchAndSendInvoice}
      />
      <ActionCard
        icon={Copy}
        title="Copy Portal Link"
        description="Copy the secure portal URL to clipboard"
        variant="success"
        onClick={handleCopyLink}
      />
    </div>
  );

  const renderActivationFlow = () => {
    if (step === 1) {
      return (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Set a 6-digit PIN that the customer will use to log in to their portal.
          </p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New PIN</label>
              <PinInput value={pin} onChange={setPin} disabled={busy} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm PIN</label>
              <PinInput value={pinConfirm} onChange={setPinConfirm} placeholder="Re-enter PIN" disabled={busy} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={resetFlow} disabled={busy}>Cancel</Button>
            <Button
              className="flex-1"
              disabled={pin.length !== 6 || pinConfirm.length !== 6 || busy}
              onClick={() => setStep(2)}
            >
              Next: Review & Activate
            </Button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4 mt-4">
          <div className="rounded-lg bg-muted/50 border p-4 space-y-2">
            <p className="text-sm font-medium">Review before activating</p>
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">{customer.name}</span>
              <span className="text-muted-foreground">Phone:</span>
              <span>{customer.phone || "—"}</span>
              <span className="text-muted-foreground">PIN:</span>
              <span className="font-mono tracking-widest">{"•".repeat(6)}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Activating will create a secure portal URL and send the customer access. This action cannot be
            undone — to disable access, you'll need to change the PIN.
          </p>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => setStep(1)} disabled={busy}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button className="flex-1" onClick={handleActivate} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <ShieldCheck className="h-4 w-4 mr-1.5" />}
              Activate Portal
            </Button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      const token = activatedData?.portal_token;
      const portalUrl = token ? buildPortalUrl(token) : "";
      return (
        <div className="space-y-4 mt-4">
          <div className="flex flex-col items-center gap-2 py-2">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-semibold">Portal Activated!</p>
            <p className="text-xs text-muted-foreground text-center">
              The customer portal is now live. Click "Send via WhatsApp" to share the login details.
            </p>
          </div>
          {portalUrl && (
            <div className="rounded-lg bg-muted/50 border p-3 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Portal URL</p>
              <p className="text-xs break-all font-mono">{portalUrl}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => { resetFlow(); setStatus((prev) => ({ ...prev })); }}>
              Done
            </Button>
            <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={handleSendActivationWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-1.5" /> Send via WhatsApp
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderChangePinFlow = () => {
    if (step === 1) {
      return (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">Enter a new 6-digit PIN for this customer's portal.</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">New PIN</label>
              <PinInput value={pin} onChange={setPin} disabled={busy} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Confirm New PIN</label>
              <PinInput value={pinConfirm} onChange={setPinConfirm} placeholder="Re-enter new PIN" disabled={busy} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={resetFlow} disabled={busy}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
            <Button
              className="flex-1"
              disabled={pin.length !== 6 || pinConfirm.length !== 6 || busy}
              onClick={handleChangePin}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              Change PIN
            </Button>
          </div>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="space-y-4 mt-4">
          <div className="flex flex-col items-center gap-2 py-4">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="font-semibold">PIN Changed Successfully</p>
            <p className="text-xs text-muted-foreground text-center">
              The customer's new PIN is active. You can share the updated login details via WhatsApp.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={resetFlow}>Done</Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={() => {
                const token = status?.portal_token;
                const portalUrl = token ? buildPortalUrl(token) : "";
                const phone = customer.phone || status?.phone;
                const name = customer.name || status?.name;
                const msg =
                  `Dear ${name},\n\nYour ${BUSINESS_NAME} portal PIN has been updated.\n\n` +
                  `*Login Link:* ${portalUrl}\n` +
                  `*New PIN:* ${pin}\n\n` +
                  `Please keep your PIN confidential.`;
                openWhatsApp(phone, msg);
              }}
            >
              <MessageCircle className="h-4 w-4 mr-1.5" /> Send Updated PIN
            </Button>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderContent = () => {
    if (loading) return renderLoading();

    if (!status) return null;

    if (flow === "activate") return renderActivationFlow();
    if (flow === "change-pin") return renderChangePinFlow();

    // Default menu
    if (!status.portal_active) {
      return (
        <div className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            This customer does not have portal access yet. Activate their account to let them view their
            orders and outstanding balance online.
          </p>
          <ActionCard
            icon={ShieldCheck}
            title="Activate Account"
            description="Set a PIN and enable online portal access for this customer"
            variant="success"
            onClick={() => { setFlow("activate"); setStep(1); }}
          />
        </div>
      );
    }

    return renderActiveMenu();
  };

  const getTitle = () => {
    if (flow === "activate") return "Activate Customer Portal";
    if (flow === "change-pin") return "Change Portal PIN";
    return "Customer Actions";
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle>{getTitle()}</DialogTitle>
            {status && (
              <Badge
                variant="outline"
                className={
                  status.portal_active
                    ? "bg-green-50 text-green-700 border-green-200 text-xs"
                    : "bg-gray-50 text-gray-600 border-gray-200 text-xs"
                }
              >
                {status.portal_active ? (
                  <><ShieldCheck className="h-3 w-3 mr-1" />Portal Active</>
                ) : (
                  <><ShieldOff className="h-3 w-3 mr-1" />Not Activated</>
                )}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground font-normal mt-1">
            {customer?.name}
          </p>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
