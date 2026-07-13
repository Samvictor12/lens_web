import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { checkPrintServiceHealth, getLocalPrinters, getPrinterConfigs, savePrinterConfig, testLocalPrinter } from "@/services/printerConfig";
import {
  getMyProfile,
  updateMyProfile,
  updateCredentials,
  updateCompanySettings,
} from "@/services/settings";
import {
  User,
  KeyRound,
  Building2,
  Upload,
  Eye,
  EyeOff,
  Loader2,
  Camera,
  Printer,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Save,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { DEFAULT_GST_RATES } from "@/utils/gstRates";
import PrintSettingsPreviewPanel, {
  configTypeToPreviewTab,
  previewTabToConfigType,
} from "@/components/LensPrint/previews/PrintSettingsPreviewPanel";

// ─────────────────────────────────────────────
// Tab config
// ─────────────────────────────────────────────
const TABS = [
  { id: "profile",     label: "Profile",           icon: User },
  { id: "credentials", label: "Login Credentials", icon: KeyRound },
  { id: "company",     label: "Company Details",   icon: Building2 },
  { id: "print",       label: "Print Service",     icon: Printer },
];

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function FieldRow({ label, children, hint, required }) {
  const isRequired = required || (typeof label === "string" && label.trim().endsWith("*"));
  const displayLabel =
    typeof label === "string" && label.trim().endsWith("*")
      ? label.replace(/\s*\*$/, "")
      : label;
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">
        {displayLabel}
        {isRequired && <span className="text-red-500"> *</span>}
      </Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function PasswordInput({ value, onChange, placeholder, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────
// Profile Tab
// ─────────────────────────────────────────────
function ProfileTab({ onClose }) {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", email: "", phonenumber: "", alternatenumber: "",
    bloodgroup: "", address: "", city: "", state: "", pincode: "",
  });

  useEffect(() => {
    getMyProfile()
      .then((r) => {
        if (r.success) setForm((prev) => ({ ...prev, ...r.data }));
      })
      .catch(() => {});
  }, []);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateMyProfile(form);
      if (res.success) {
        // Sync localStorage so header name updates immediately
        const stored = localStorage.getItem("lens_management_user");
        if (stored) {
          const parsed = JSON.parse(stored);
          localStorage.setItem(
            "lens_management_user",
            JSON.stringify({ ...parsed, name: form.name, email: form.email })
          );
          // Dispatch storage event so AuthContext re-reads
          window.dispatchEvent(new Event("storage"));
        }
        toast({ title: "Profile updated", description: "Your profile has been saved." });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to update profile", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const initials = (user?.name || "U").charAt(0).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="font-semibold text-base">{user?.name}</p>
          <p className="text-sm text-muted-foreground capitalize">{user?.roleName || "User"}</p>
          <p className="text-xs text-muted-foreground">{user?.usercode}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Full Name">
          <Input value={form.name} onChange={set("name")} placeholder="Your name" />
        </FieldRow>
        <FieldRow label="Email">
          <Input value={form.email} onChange={set("email")} placeholder="email@example.com" type="email" />
        </FieldRow>
        <FieldRow label="Phone">
          <Input value={form.phonenumber || ""} onChange={set("phonenumber")} placeholder="+91 XXXXX XXXXX" />
        </FieldRow>
        <FieldRow label="Alternate Phone">
          <Input value={form.alternatenumber || ""} onChange={set("alternatenumber")} placeholder="+91 XXXXX XXXXX" />
        </FieldRow>
        <FieldRow label="Blood Group">
          <Input value={form.bloodgroup || ""} onChange={set("bloodgroup")} placeholder="e.g. B+" />
        </FieldRow>
      </div>

      <FieldRow label="Address">
        <textarea
          value={form.address || ""}
          onChange={set("address")}
          placeholder="Street address"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </FieldRow>

      <div className="grid grid-cols-3 gap-4">
        <FieldRow label="City">
          <Input value={form.city || ""} onChange={set("city")} placeholder="City" />
        </FieldRow>
        <FieldRow label="State">
          <Input value={form.state || ""} onChange={set("state")} placeholder="State" />
        </FieldRow>
        <FieldRow label="Pincode">
          <Input value={form.pincode || ""} onChange={set("pincode")} placeholder="Pincode" />
        </FieldRow>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Profile
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Login Credentials Tab
// ─────────────────────────────────────────────
function CredentialsTab({ onClose }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    currentPassword: "",
    newUsername: "",
    newPassword: "",
    confirmPassword: "",
  });

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.currentPassword) {
      toast({ title: "Required", description: "Current password is required to make any change.", variant: "destructive" });
      return;
    }
    if (!form.newUsername && !form.newPassword) {
      toast({ title: "Nothing to change", description: "Enter a new username or new password.", variant: "destructive" });
      return;
    }
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      toast({ title: "Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const res = await updateCredentials({
        currentPassword:  form.currentPassword,
        newUsername:      form.newUsername || undefined,
        newPassword:      form.newPassword || undefined,
        confirmPassword:  form.confirmPassword || undefined,
      });
      if (res.success) {
        toast({ title: "Credentials updated", description: "Please log in again with your new credentials." });
        onClose();
        setTimeout(() => {
          logout();
          navigate("/login");
        }, 800);
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to update credentials", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3">
        <p className="text-sm text-amber-800 font-medium">⚠ Saves will log you out</p>
        <p className="text-xs text-amber-700 mt-0.5">
          Any credential change requires re-login for security.
        </p>
      </div>

      <FieldRow label="Current Password" hint="Required to confirm your identity">
        <PasswordInput
          value={form.currentPassword}
          onChange={set("currentPassword")}
          placeholder="Enter current password"
          disabled={saving}
        />
      </FieldRow>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Change Username (optional)
        </p>
        <FieldRow label="New Username">
          <Input
            value={form.newUsername}
            onChange={set("newUsername")}
            placeholder={`Current: ${user?.username || ""}`}
            disabled={saving}
          />
        </FieldRow>
      </div>

      <div className="border-t pt-4 space-y-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Change Password (optional)
        </p>
        <FieldRow label="New Password">
          <PasswordInput
            value={form.newPassword}
            onChange={set("newPassword")}
            placeholder="Min 6 characters"
            disabled={saving}
          />
        </FieldRow>
        <FieldRow label="Confirm New Password">
          <PasswordInput
            value={form.confirmPassword}
            onChange={set("confirmPassword")}
            placeholder="Re-enter new password"
            disabled={saving}
          />
        </FieldRow>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2" variant="destructive">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save & Logout
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Company Details Tab
// ─────────────────────────────────────────────
function CompanyTab() {
  const { company, updateCompanyLocal } = useCompany();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "", gstin: "", logo: "", address: "",
    city: "", state: "", pincode: "", phone: "", email: "", website: "", tagline: "",
    gstRates: DEFAULT_GST_RATES,
  });
  const logoInputRef = useRef(null);

  useEffect(() => {
    if (company) {
      const rates = company.customAttributes?.gstRates;
      setForm((prev) => ({
        ...prev,
        ...company,
        gstRates: Array.isArray(rates) && rates.length > 0 ? rates : DEFAULT_GST_RATES,
      }));
    }
  }, [company]);

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      toast({ title: "Logo too large", description: "Please use an image under 500 KB.", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Only image files are allowed.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => setForm((p) => ({ ...p, logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setForm((p) => ({ ...p, logo: "" }));
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!form.companyName?.trim()) {
      toast({ title: "Required", description: "Company name is required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { gstRates, ...companyFields } = form;
      const res = await updateCompanySettings({
        ...companyFields,
        customAttributes: { gstRates },
      });
      if (res.success) {
        updateCompanyLocal(res.data);
        toast({ title: "Company details saved", description: "Changes will reflect across all reports." });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save company details", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Logo upload */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Company Logo</Label>
        <div className="flex items-center gap-4">
          <div
            className="h-20 w-20 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/20 overflow-hidden cursor-pointer hover:border-primary/50 transition-colors flex-shrink-0"
            onClick={() => logoInputRef.current?.click()}
          >
            {form.logo ? (
              <img src={form.logo} alt="Company logo" className="h-full w-full object-contain p-1" />
            ) : (
              <Camera className="h-8 w-8 text-muted-foreground/40" />
            )}
          </div>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={() => logoInputRef.current?.click()}>
                <Upload className="h-3.5 w-3.5" />
                {form.logo ? "Change Logo" : "Upload Logo"}
              </Button>
              {form.logo && (
                <Button size="sm" variant="ghost" className="h-8 text-destructive hover:text-destructive" onClick={handleRemoveLogo}>
                  Remove
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPG or SVG · Max 500 KB · Used in reports, invoices & favicon
            </p>
          </div>
        </div>
        <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Company Name *">
          <Input value={form.companyName} onChange={set("companyName")} placeholder="Your Company Name" />
        </FieldRow>
        <FieldRow label="GSTIN">
          <Input value={form.gstin || ""} onChange={set("gstin")} placeholder="22AAAAA0000A1Z5" className="uppercase" />
        </FieldRow>
        <FieldRow label="Phone">
          <Input value={form.phone || ""} onChange={set("phone")} placeholder="+91 XXXXX XXXXX" />
        </FieldRow>
        <FieldRow label="Email">
          <Input value={form.email || ""} onChange={set("email")} placeholder="company@example.com" type="email" />
        </FieldRow>
        <FieldRow label="Website">
          <Input value={form.website || ""} onChange={set("website")} placeholder="https://example.com" />
        </FieldRow>
        <FieldRow label="Tagline" hint="Appears in letterheads & print footers">
          <Input value={form.tagline || ""} onChange={set("tagline")} placeholder="e.g. Quality Lenses Since 1990" />
        </FieldRow>
      </div>

      <FieldRow label="Address">
        <textarea
          value={form.address || ""}
          onChange={set("address")}
          placeholder="Street address"
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
        />
      </FieldRow>

      <div className="grid grid-cols-3 gap-4">
        <FieldRow label="City">
          <Input value={form.city || ""} onChange={set("city")} placeholder="City" />
        </FieldRow>
        <FieldRow label="State">
          <Input value={form.state || ""} onChange={set("state")} placeholder="State" />
        </FieldRow>
        <FieldRow label="Pincode">
          <Input value={form.pincode || ""} onChange={set("pincode")} placeholder="Pincode" />
        </FieldRow>
      </div>

      <div className="space-y-3 border rounded-lg p-4">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">GST Rates (for Purchase Orders)</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 gap-1"
            onClick={() =>
              setForm((p) => ({
                ...p,
                gstRates: [...(p.gstRates || []), { label: "GST 0%", value: 0 }],
              }))
            }
          >
            <Plus className="h-3.5 w-3.5" /> Add rate
          </Button>
        </div>
        <div className="space-y-2">
          {(form.gstRates || []).map((rate, idx) => (
            <div key={idx} className="flex gap-2 items-center">
              <Input
                value={rate.label}
                onChange={(e) => {
                  const next = [...form.gstRates];
                  next[idx] = { ...next[idx], label: e.target.value };
                  setForm((p) => ({ ...p, gstRates: next }));
                }}
                placeholder="Label e.g. GST 18%"
                className="flex-1 h-8 text-sm"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={rate.value}
                onChange={(e) => {
                  const next = [...form.gstRates];
                  next[idx] = { ...next[idx], value: parseFloat(e.target.value) || 0 };
                  setForm((p) => ({ ...p, gstRates: next }));
                }}
                className="w-24 h-8 text-sm"
              />
              <span className="text-xs text-muted-foreground">%</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-destructive"
                onClick={() =>
                  setForm((p) => ({
                    ...p,
                    gstRates: p.gstRates.filter((_, i) => i !== idx),
                  }))
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Used as dropdown options when receiving purchase orders. Include 0% if no tax applies.
        </p>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Company Details
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Print Service Tab
// ─────────────────────────────────────────────
const PRINT_SERVICE_DOWNLOAD_URL = "/LensPrintService.exe"; // update to your CDN/static URL

const CONFIG_LABELS = {
  AUTHENTICITY_CARD: { label: "Authenticity Card", desc: "Evolis Primacy 2 · 84 × 55 mm card", usesService: true },
  BARCODE_LABEL:     { label: "Barcode Label",     desc: "TSC TTP-244 · 75 × 50 mm label",     usesService: true },
  SALE_ORDER:        { label: "Invoice / Bill",    desc: "Canon LBP6030 · A4 sale invoice",    usesService: false },
  DISPATCH_NOTE:     { label: "Dispatch Challan",  desc: "Canon LBP6030 · A4 delivery note",   usesService: false },
};
const PAPER_SIZES = {
  AUTHENTICITY_CARD: ["Card_84x55"],
  BARCODE_LABEL:     ["Label_75x50"],
  SALE_ORDER:        ["A4"],
  DISPATCH_NOTE:     ["A4"],
};
const DEFAULT_PAPER = {
  AUTHENTICITY_CARD: "Card_84x55",
  BARCODE_LABEL:     "Label_75x50",
  SALE_ORDER:        "A4",
  DISPATCH_NOTE:     "A4",
};

function PrintServiceTab() {
  const { toast } = useToast();
  const [serviceStatus, setServiceStatus] = useState(null); // null=checking, true=ok, false=down
  const [checking, setChecking]           = useState(false);
  const [localPrinters, setLocalPrinters] = useState([]); // [{ name, status_code, status }]
  const [previewTemplate, setPreviewTemplate] = useState("AUTHENTICITY_CARD");
  const [highlightConfig, setHighlightConfig] = useState(null);
  const [configs, setConfigs]             = useState({
    AUTHENTICITY_CARD: { printer_name: "", paper_size: "Card_84x55", label_width: null, label_height: null, extra_config: "" },
    BARCODE_LABEL:     { printer_name: "", paper_size: "Label_75x50", label_width: 600, label_height: 400, extra_config: "" },
    SALE_ORDER:        { printer_name: "", paper_size: "A4", label_width: null, label_height: null, extra_config: "" },
    DISPATCH_NOTE:     { printer_name: "", paper_size: "A4", label_width: null, label_height: null, extra_config: "" },
  });
  const [saving, setSaving] = useState({});
  const [testing, setTesting] = useState({});

  const pingService = async () => {
    setChecking(true);
    const res = await checkPrintServiceHealth();
    setServiceStatus(!!res);
    if (res) {
      try {
        const p = await getLocalPrinters();
        setLocalPrinters(p.details || (p.printers || []).map(name => ({ name, status: "Ready" })));
      } catch { setLocalPrinters([]); }
    }
    setChecking(false);
  };

  useEffect(() => {
    // Load saved configs from backend
    getPrinterConfigs()
      .then((res) => {
        if (res?.success && Array.isArray(res.data)) {
          const map = {};
          res.data.forEach((c) => {
            const type = c.config_type === "LENS_SPECIFICATION" ? "AUTHENTICITY_CARD" : c.config_type;
            if (!CONFIG_LABELS[type]) return;
            map[type] = {
              printer_name:  c.printer_name  || "",
              paper_size:    c.paper_size    || DEFAULT_PAPER[type] || "",
              label_width:   c.label_width   ?? (type === "BARCODE_LABEL" ? 600 : null),
              label_height:  c.label_height  ?? (type === "BARCODE_LABEL" ? 400 : null),
              extra_config:  c.extra_config  || "",
            };
          });
          setConfigs((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => {});
    pingService();
  }, []);

  const handleSave = async (configType) => {
    setSaving((s) => ({ ...s, [configType]: true }));
    try {
      const cfg = configs[configType];
      const res = await savePrinterConfig({ config_type: configType, ...cfg });
      if (res.success) {
        toast({ title: "Saved", description: `${CONFIG_LABELS[configType].label} config saved.` });
      }
    } catch (err) {
      toast({ title: "Error", description: err.message || "Failed to save", variant: "destructive" });
    } finally {
      setSaving((s) => ({ ...s, [configType]: false }));
    }
  };

  const handleTestPrint = async (type) => {
    const printerName = configs[type].printer_name;
    if (!printerName) {
      toast({ title: "No Printer Selected", description: "Please select or enter a printer name before testing.", variant: "destructive" });
      return;
    }
    setTesting((t) => ({ ...t, [type]: true }));
    try {
      await testLocalPrinter({ printerName, printType: type });
      toast({ title: "Success", description: `Test print request spooled to ${printerName}` });
    } catch (err) {
      toast({ title: "Test Print Failed", description: err.message || "Could not execute test print.", variant: "destructive" });
    } finally {
      setTesting((t) => ({ ...t, [type]: false }));
    }
  };

  const setField = (type, field, value) =>
    setConfigs((prev) => ({ ...prev, [type]: { ...prev[type], [field]: value } }));

  const handlePreviewTabChange = (tabId) => {
    setPreviewTemplate(tabId);
    setHighlightConfig(previewTabToConfigType(tabId));
  };

  const handleConfigFocus = (type) => {
    setHighlightConfig(type);
    setPreviewTemplate(configTypeToPreviewTab(type));
  };

  return (
    <div className="space-y-5">

      {/* ── Template Preview ── */}
      <PrintSettingsPreviewPanel
        activeTemplate={previewTemplate}
        onTemplateChange={handlePreviewTabChange}
      />

      {/* ── Service Status ── */}
      <div className="rounded-lg border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Local Print Service</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Runs on your Windows PC to send labels to local printers
            </p>
          </div>
          <div className="flex items-center gap-2">
            {serviceStatus === null || checking ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Checking…
              </span>
            ) : serviceStatus ? (
              <span className="flex items-center gap-1.5 text-xs font-medium text-green-600">
                <CheckCircle2 className="h-4 w-4" /> Running on port 9333
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <XCircle className="h-4 w-4" /> Not running
              </span>
            )}
            <Button size="xs" variant="outline" className="h-7 gap-1.5" onClick={pingService} disabled={checking}>
              <RefreshCw className={`h-3 w-3 ${checking ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {!serviceStatus && (
          <div className="flex items-center gap-3 pt-1 border-t">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                Download and run <strong>LensPrintService.exe</strong> on this Windows PC.
                It installs itself silently and starts automatically with Windows.
              </p>
            </div>
            <a href={PRINT_SERVICE_DOWNLOAD_URL} download>
              <Button size="xs" className="h-8 gap-1.5 flex-shrink-0">
                <Download className="h-3.5 w-3.5" />
                Download .exe
              </Button>
            </a>
          </div>
        )}
      </div>

      {/* ── Config Cards ── */}
      {Object.entries(CONFIG_LABELS).map(([type, meta]) => (
        <div
          key={type}
          className={cn(
            "rounded-lg border p-4 space-y-3 transition-colors cursor-pointer",
            highlightConfig === type && "border-teal-500 ring-1 ring-teal-500/30 bg-teal-50/30"
          )}
          onClick={() => handleConfigFocus(type)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && handleConfigFocus(type)}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{meta.desc}</p>
            </div>
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              {configs[type].printer_name && (
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  className="h-7 gap-1.5"
                  onClick={() => handleTestPrint(type)}
                  disabled={testing[type] || !serviceStatus}
                  title={!serviceStatus ? "Start local service to run test prints" : ""}
                >
                  {testing[type] ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Printer className="h-3 w-3" />
                  )}
                  Test Print
                </Button>
              )}
              <Button
                size="xs"
                className="h-7 gap-1.5"
                onClick={() => handleSave(type)}
                disabled={saving[type]}
              >
                {saving[type]
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <Save className="h-3 w-3" />}
                Save
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Printer name */}
            <FieldRow label="Printer Name">
              {meta.usesService && serviceStatus && localPrinters.length > 0 ? (
                <select
                  value={configs[type].printer_name}
                  onChange={(e) => setField(type, "printer_name", e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">— Select printer —</option>
                  {localPrinters.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.name} {p.status ? `(${p.status})` : ""}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  value={configs[type].printer_name}
                  onChange={(e) => setField(type, "printer_name", e.target.value)}
                  placeholder={meta.usesService ? "Start service to auto-detect printers" : "e.g. HP LaserJet M1005"}
                />
              )}
            </FieldRow>

            {/* Paper size */}
            <FieldRow label="Paper / Label Size">
              <select
                value={configs[type].paper_size}
                onChange={(e) => setField(type, "paper_size", e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {(PAPER_SIZES[type] || ["A4"]).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </FieldRow>

            {/* Label dimensions (barcode only — 75×50 mm @ 203 dpi) */}
            {type === "BARCODE_LABEL" && (
              <>
                <FieldRow label="Label Width (dots)" hint="75 mm ≈ 600 dots @ 203 dpi">
                  <Input
                    type="number"
                    value={configs[type].label_width ?? ""}
                    onChange={(e) => setField(type, "label_width", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="600"
                  />
                </FieldRow>
                <FieldRow label="Label Height (dots)" hint="50 mm ≈ 400 dots @ 203 dpi">
                  <Input
                    type="number"
                    value={configs[type].label_height ?? ""}
                    onChange={(e) => setField(type, "label_height", e.target.value ? parseInt(e.target.value) : null)}
                    placeholder="400"
                  />
                </FieldRow>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Settings Modal
// ─────────────────────────────────────────────
export function SettingsModal({ open, onOpenChange, defaultTab = "profile" }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Sync defaultTab when modal opens
  useEffect(() => {
    if (open) setActiveTab(defaultTab);
  }, [open, defaultTab]);

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="p-0 overflow-hidden gap-0"
        style={{ width: "90vw", maxWidth: activeTab === "print" ? "1100px" : "1000px", maxHeight: "92vh" }}
      >
        <div className="flex" style={{ height: "min(680px, 85vh)" }}>
          {/* ── Left sidebar ── */}
          <div className="w-52 bg-muted/40 border-r flex flex-col flex-shrink-0">
            <div className="px-4 pt-5 pb-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Settings
              </p>
            </div>
            <nav className="px-2 space-y-0.5 flex-1">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-md text-sm text-left transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <tab.icon className="h-4 w-4 flex-shrink-0" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ── Right content ── */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 border-b flex-shrink-0">
              <DialogTitle className="text-base font-semibold">
                {TABS.find((t) => t.id === activeTab)?.label}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {activeTab === "profile"     && <ProfileTab     onClose={handleClose} />}
              {activeTab === "credentials" && <CredentialsTab onClose={handleClose} />}
              {activeTab === "company"     && <CompanyTab />}
              {activeTab === "print"       && <PrintServiceTab />}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SettingsModal;
