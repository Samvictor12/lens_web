export const expenseCategoryFilters = {
  active_status: "all",
  expenseType: "all",
};

export const defaultExpenseCategory = {
  name: "",
  expenseType: "INDIRECT",
  activeStatus: true,
};

export const activeStatusOptions = [
  { value: true, label: "Active" },
  { value: false, label: "Inactive" },
];

export const expenseTypeOptions = [
  { value: "DIRECT", label: "Direct Expense" },
  { value: "INDIRECT", label: "Indirect Expense" },
];
