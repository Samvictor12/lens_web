import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { VENDOR_PAYMENTS_PATH } from "@/constants/accountingPaths";

/** Legacy route shim — redirects to hub with payment dialog query params preserved. */
export default function RecordPaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", "bills");
    next.set("openPayment", "1");
    navigate(`${VENDOR_PAYMENTS_PATH}?${next.toString()}`, { replace: true });
  }, [navigate, searchParams]);

  return (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  );
}
