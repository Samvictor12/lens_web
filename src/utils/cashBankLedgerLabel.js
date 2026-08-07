/**
 * Label for cash/bank ledger selects: "{ledgerName} — ₹{currentBalance}".
 * Missing/null balance → ₹0.00 (en-IN, 2 decimals).
 */
export function formatCashBankLedgerLabel(ledger) {
  const name = ledger?.ledgerName ?? ledger?.name ?? "";
  const balance = parseFloat(ledger?.currentBalance ?? 0);
  const amount = Number.isFinite(balance) ? balance : 0;
  return `${name} — ₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
}
