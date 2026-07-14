export const emptyExpenseForm = {
  categoryId: "",
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().split("T")[0],
  dueDate: "",
  paidTo: "",
  bankLedgerId: "",
  paymentMethod: "CASH",
  notes: "",
};
