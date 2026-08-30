import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { getOutstandingInvoices } from "@/services/customerPayment";
import { getCashBankLedgers } from "@/services/ledger";
import { getCustomerDropdown } from "@/services/customer";
import CreateCustomerPaymentDialog from "@/pages/Accounting/CustomerPayments/CreateCustomerPaymentDialog";
import { BILLING_AND_INVOICING_PATH } from "@/constants/accountingPaths";

/**
 * Deep-link entry for Record Payment — opens the same popup dialog used on the main workspace.
 */
export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const urlCustomerId = searchParams.get("customerId") || "";
  const urlInvoiceId = searchParams.get("invoiceId");
  const urlInvoiceIds = searchParams.get("invoiceIds");
  const urlAmount = searchParams.get("amount") || "";

  const preselectedIds = useMemo(() => {
    if (urlInvoiceIds) {
      return urlInvoiceIds
        .split(",")
        .map((x) => parseInt(x, 10))
        .filter((n) => !Number.isNaN(n));
    }
    if (urlInvoiceId) return [parseInt(urlInvoiceId, 10)];
    return [];
  }, [urlInvoiceId, urlInvoiceIds]);

  const [customers, setCustomers] = useState([]);
  const [bankLedgers, setBankLedgers] = useState([]);
  const [flatInvoices, setFlatInvoices] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [custRes, ledgers, outRes] = await Promise.all([
          getCustomerDropdown(),
          getCashBankLedgers(),
          getOutstandingInvoices({ groupBy: "flat" }),
        ]);
        if (cancelled) return;
        if (custRes.success) setCustomers(custRes.data || []);
        setBankLedgers(Array.isArray(ledgers) ? ledgers : []);
        setFlatInvoices(outRes.data?.invoices || []);
        setReady(true);
      } catch {
        if (!cancelled) {
          toast({ variant: "destructive", title: "Failed to load payment form data" });
          navigate(BILLING_AND_INVOICING_PATH);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  const preselectedCustomerId = useMemo(() => {
    if (urlCustomerId) return urlCustomerId;
    if (!preselectedIds.length) return "";
    const inv = flatInvoices.find((i) => i.id === preselectedIds[0]);
    return inv?.customerId ? String(inv.customerId) : "";
  }, [urlCustomerId, preselectedIds, flatInvoices]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading payment form…
      </div>
    );
  }

  return (
    <CreateCustomerPaymentDialog
      open
      onOpenChange={(open) => {
        if (!open) navigate(BILLING_AND_INVOICING_PATH);
      }}
      mode="record"
      customers={customers}
      bankLedgers={bankLedgers}
      preselectedCustomerId={preselectedCustomerId}
      preselectedInvoiceIds={preselectedIds}
      preselectedInvoices={flatInvoices}
      prefillAmount={urlAmount}
      onCreated={() => navigate(`${BILLING_AND_INVOICING_PATH}?tab=payments`)}
    />
  );
}
