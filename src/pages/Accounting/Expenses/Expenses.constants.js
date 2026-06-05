export const emptyExpenseForm = {
  categoryId: "",
  description: "",
  amount: "",
  expenseDate: new Date().toISOString().split("T")[0],
  paidTo: "",
  bankLedgerId: "",
  notes: "",
};
