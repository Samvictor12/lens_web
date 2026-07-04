export const LEDGER_TYPES = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"];

export const TYPE_BADGE = {
  ASSET: "bg-blue-100 text-blue-800",
  LIABILITY: "bg-red-100 text-red-800",
  EQUITY: "bg-purple-100 text-purple-800",
  INCOME: "bg-green-100 text-green-800",
  EXPENSE: "bg-orange-100 text-orange-800",
};

export const emptyLedgerForm = {
  ledgerCode: "",
  ledgerName: "",
  ledgerType: "",
  accountGroupId: "",
  openingBalance: "0",
};

export const PNL_CLASSIFICATIONS = [
  "NOT_APPLICABLE",
  "DIRECT_INCOME",
  "INDIRECT_INCOME",
  "DIRECT_EXPENSE",
  "INDIRECT_EXPENSE",
];

export const emptyAccountGroupForm = {
  groupName: "",
  parentGroupId: "",
  pnlClassification: "NOT_APPLICABLE",
};
