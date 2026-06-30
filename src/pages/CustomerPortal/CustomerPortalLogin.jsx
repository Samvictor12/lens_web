import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPortalCustomerByToken, portalLogin } from "@/services/customer";
import { getPublicCompanySettings } from "@/services/settings";
import { Eye, EyeOff, ShieldCheck, Loader2, AlertCircle } from "lucide-react";

export default function CustomerPortalLogin() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [customer, setCustomer] = useState(null);      // minimal customer info
  const [company, setCompany] = useState({ companyName: '', logo: '' });
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);

  // Fetch public customer info from token
  useEffect(() => {
    getPublicCompanySettings()
      .then((r) => { if (r?.data) setCompany(r.data); })
      .catch(() => { });
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoadingCustomer(true);
        const res = await getPortalCustomerByToken(token);
        setCustomer(res.data || res);
      } catch {
        setNotFound(true);
      } finally {
        setLoadingCustomer(false);
      }
    })();
  }, [token]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (pin.length !== 6) {
      setError("Please enter your 6-digit PIN.");
      return;
    }
    try {
      setLoggingIn(true);
      setError("");
      const res = await portalLogin(token, pin);
      const data = res.data || res;
      // Store portal session in sessionStorage (cleared when tab closes)
      sessionStorage.setItem("portal_session", JSON.stringify({ ...data, token }));
      navigate(`/portal/${token}/dashboard`, { replace: true });
    } catch (err) {
      setError(err?.message || "Invalid PIN. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  // ─── Not found ──────────────────────────────────────────────────────────────
  if (notFound) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Portal Not Found</h1>
          <p className="text-sm text-muted-foreground">
            This portal link is invalid or has been disabled. Please contact your supplier for a new link.
          </p>
        </div>
      </div>
    );
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loadingCustomer) {
    return (
      <div className="min-h-svh bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Login Form ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-svh bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-1">
            {company.logo ? (
              <img src={company.logo} alt={company.companyName} className="h-10 w-10 object-contain rounded-full" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ShieldCheck className="h-6 w-6 text-primary" />
              </div>
            )}
          </div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">
            {company.companyName || 'Customer Portal'}
          </p>
          <h1 className="text-2xl font-bold">
            Welcome{customer?.name ? `,` : "!"}
          </h1>
          {customer?.name && (
            <p className="text-base text-muted-foreground">{customer.name}</p>
          )}
          <p className="text-sm text-muted-foreground">
            Enter your 6-digit PIN to access your account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Your PIN</label>
            <div className="relative">
              <Input
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setError("");
                  setPin(e.target.value.replace(/\D/g, "").slice(0, 6));
                }}
                placeholder="••••••"
                className="text-center text-2xl tracking-[0.5em] font-mono h-14 pr-10"
                autoFocus
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPin((v) => !v)}
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="h-3 w-3 flex-shrink-0" /> {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full h-11"
            disabled={pin.length !== 6 || loggingIn}
          >
            {loggingIn ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Signing in…</>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Forgot your PIN? Contact {company.companyName || 'your supplier'} for assistance.
        </p>
      </div>
    </div>
  );
}
