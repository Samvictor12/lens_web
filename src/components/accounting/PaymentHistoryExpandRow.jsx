import PaymentBreakdownTree from "./PaymentBreakdownTree";

/**
 * Inline breakdown row for payment history tables.
 * @param {'customer'|'vendor'} type
 */
export default function PaymentHistoryExpandRow({ type, payment }) {
  if (!payment) return null;

  const isCustomer = type === "customer";

  return (
    <div className="py-2 px-1">
      <PaymentBreakdownTree
        type={type}
        documentNumber={isCustomer ? payment.receiptNumber : payment.voucherNumber}
        totalAmount={payment.totalAmount}
        advanceAmount={isCustomer ? payment.advanceAmount : 0}
        items={payment.items || []}
        defaultOpen
        compact
        className="border-dashed bg-muted/10"
      />
    </div>
  );
}
