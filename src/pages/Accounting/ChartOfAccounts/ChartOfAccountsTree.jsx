import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, FolderTree, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TYPE_BADGE } from "@/pages/Accounting/ChartOfAccounts/ChartOfAccounts.constants";

function filterGroupNode(group, typeFilter, searchQuery) {
  const q = searchQuery.trim().toLowerCase();

  const filteredLedgers = (group.ledgers || []).filter((l) => {
    if (typeFilter !== "all" && l.ledgerType !== typeFilter) return false;
    if (q) {
      const hay = `${l.ledgerName} ${l.ledgerCode}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const filteredChildGroups = (group.childGroups || [])
    .map((cg) => filterGroupNode(cg, typeFilter, searchQuery))
    .filter(Boolean);

  const groupMatchesSearch =
    !q ||
    group.groupName?.toLowerCase().includes(q) ||
    group.groupCode?.toLowerCase().includes(q);

  if (filteredLedgers.length === 0 && filteredChildGroups.length === 0) {
    if (typeFilter !== "all" && group.nature !== typeFilter) return null;
    if (q && !groupMatchesSearch) return null;
  }

  return {
    ...group,
    ledgers: filteredLedgers,
    childGroups: filteredChildGroups,
  };
}

export function filterAccountGroupTree(tree, typeFilter = "all", searchQuery = "") {
  if (typeFilter === "all" && !searchQuery.trim()) return tree;
  return (tree || []).map((g) => filterGroupNode(g, typeFilter, searchQuery)).filter(Boolean);
}

function GroupNode({ group, depth, onEditLedger, onViewSummary, onViewStatement }) {
  const [open, setOpen] = useState(depth < 2);
  const hasChildren =
    (group.childGroups?.length > 0) || (group.ledgers?.length > 0);

  return (
    <div className={cn(depth > 0 && "ml-4 border-l pl-2")}>
      <div className="flex items-center gap-2 py-1.5 text-sm">
        {hasChildren ? (
          <button type="button" onClick={() => setOpen((v) => !v)} className="shrink-0">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="w-3.5" />
        )}
        <FolderTree className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium flex-1">{group.groupName}</span>
        <Badge variant="outline" className={cn("text-[10px]", TYPE_BADGE[group.nature])}>
          {group.nature}
        </Badge>
        {group.pnlClassification && group.pnlClassification !== "NOT_APPLICABLE" && (
          <Badge variant="secondary" className="text-[10px]">
            {group.pnlClassification.replace(/_/g, " ")}
          </Badge>
        )}
        <span className="font-mono text-xs text-muted-foreground">{group.groupCode}</span>
        {onViewSummary && (
          <Button variant="ghost" size="xs" className="h-6 text-xs" onClick={() => onViewSummary(group)}>
            Summary
          </Button>
        )}
      </div>

      {open && (
        <div className="space-y-0.5">
          {(group.ledgers || []).map((l) => (
            <div
              key={l.id}
              className="flex items-center gap-2 py-1 pl-6 text-xs hover:bg-muted/40 rounded"
            >
              <BookOpen className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="font-mono text-muted-foreground">{l.ledgerCode}</span>
              <span className="flex-1">{l.ledgerName}</span>
              {l.isGroupLedger && (
                <Badge variant="outline" className="text-[10px]">Control</Badge>
              )}
              {!l.isGroupLedger && onEditLedger && (
                <Button variant="ghost" size="xs" className="h-6" onClick={() => onEditLedger(l)}>
                  Edit
                </Button>
              )}
              {!l.isGroupLedger && onViewStatement && (
                <Button variant="ghost" size="xs" className="h-6" onClick={() => onViewStatement(l)}>
                  Statement
                </Button>
              )}
            </div>
          ))}
          {(group.childGroups || []).map((cg) => (
            <GroupNode
              key={cg.id}
              group={cg}
              depth={depth + 1}
              onEditLedger={onEditLedger}
              onViewSummary={onViewSummary}
              onViewStatement={onViewStatement}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChartOfAccountsTree({
  tree,
  typeFilter = "all",
  searchQuery = "",
  onEditLedger,
  onViewSummary,
  onViewStatement,
}) {
  const filteredTree = useMemo(
    () => filterAccountGroupTree(tree, typeFilter, searchQuery),
    [tree, typeFilter, searchQuery]
  );

  if (!tree?.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No account groups loaded. Run account groups migration and seed.
      </p>
    );
  }

  if (!filteredTree.length) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        No accounts match the current filters.
      </p>
    );
  }

  return (
    <div className="space-y-1 p-2">
      {filteredTree.map((g) => (
        <GroupNode
          key={g.id}
          group={g}
          depth={0}
          onEditLedger={onEditLedger}
          onViewSummary={onViewSummary}
          onViewStatement={onViewStatement}
        />
      ))}
    </div>
  );
}
