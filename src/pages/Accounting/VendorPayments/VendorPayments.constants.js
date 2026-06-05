export const PAYMENT_METHODS = [
  "CASH",
  "BANK_TRANSFER",
  "CHEQUE",
  "UPI",
  "NEFT",
  "RTGS",
];

export const PAYMENT_METHOD_LABELS = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CHEQUE: "Cheque",
  UPI: "UPI",
  NEFT: "NEFT",
  RTGS: "RTGS",
};

export const emptyPaymentForm = {
  vendorId: "",
  bankLedgerId: "",
  paymentDate: new Date().toISOString().split("T")[0],
  paymentMethod: "BANK_TRANSFER",
  referenceNumber: "",
  notes: "",
  items: [],
};
