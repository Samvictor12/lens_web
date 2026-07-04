import { apiClient } from "./apiClient";

const BASE = "/account-groups";

export const getAccountGroupTree = () => apiClient("get", BASE);
export const createAccountGroup = (data) => apiClient("post", BASE, { data });
export const getAccountGroupById = (id) => apiClient("get", `${BASE}/${id}`);
export const getAccountGroupSummary = (id, params = {}) =>
  apiClient("get", `${BASE}/${id}/summary`, { params });

/** Flatten tree for select options */
export function flattenAccountGroups(nodes, depth = 0) {
  const out = [];
  for (const n of nodes || []) {
    out.push({
      id: n.id,
      groupCode: n.groupCode,
      groupName: n.groupName,
      nature: n.nature,
      pnlClassification: n.pnlClassification,
      reportSection: n.reportSection,
      label: `${"  ".repeat(depth)}${n.groupName}`,
    });
    out.push(...flattenAccountGroups(n.childGroups, depth + 1));
  }
  return out;
}

/** Leaf posting groups only (exclude top-level roots without posting) */
export function flattenPostingGroups(nodes, depth = 0) {
  const out = [];
  for (const n of nodes || []) {
    const isLeafGroup =
      n.groupCode?.startsWith("GRP-") &&
      !["GRP-ASSETS", "GRP-LIABILITIES", "GRP-CAPITAL", "GRP-INCOME", "GRP-EXPENSES", "GRP-CURRENT-ASSETS", "GRP-CURRENT-LIAB"].includes(n.groupCode);
    if (isLeafGroup || (n.ledgers?.length === 0 && n.childGroups?.length === 0)) {
      out.push({
        id: n.id,
        groupCode: n.groupCode,
        groupName: n.groupName,
        nature: n.nature,
        label: `${"  ".repeat(depth)}${n.groupName}`,
      });
    }
    out.push(...flattenPostingGroups(n.childGroups, depth + 1));
  }
  return out.filter(
    (g, i, arr) => arr.findIndex((x) => x.id === g.id) === i
  );
}
