export const emptyIncomeForm = {
  categoryId: "",
  description: "",
  amount: "",
  incomeDate: new Date().toISOString().split("T")[0],
  fromLedgerId: "",
  toLedgerId: "",
  paymentMethod: "CASH",
  referenceNo: "",
  notes: "",
};
