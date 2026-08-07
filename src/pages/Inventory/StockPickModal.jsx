import { useEffect, useState } from "react";
import { Package, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getMatchingInventoryFIFO, getAlternateMatchingInventory } from "@/services/saleOrder";

/**
 * Standalone "Inventory Stock Pick (FIFO Allocation)" modal.
 *
 * Props:
 *  - saleOrderId: number
 *  - requiredEyes: { rightEye: boolean, leftEye: boolean }
 *  - issueReadiness: optional { right: { needsIssue, alreadyHasLens, ... }, left: {...} }
 *  - isAlternate: boolean
 *  - onConfirm({ itemIds, rightItemId, leftItemId }): called with selected picks
 *  - onCancel(): dismissed without confirming
 */
export default function StockPickModal({
  saleOrderId,
  requiredEyes = {},
  issueReadiness = null,
  isAlternate = false,
  onConfirm,
  onCancel,
}) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [saleOrder, setSaleOrder] = useState(null);
  const [fifoMatches, setFifoMatches] = useState({ rightEyeMatches: [], leftEyeMatches: [] });
  const [selectedFifoItems, setSelectedFifoItems] = useState({});

  const soWantsRight = Boolean(requiredEyes.rightEye);
  const soWantsLeft = Boolean(requiredEyes.leftEye);

  const needsRight =
    soWantsRight &&
    (issueReadiness?.right?.needsIssue !== undefined
      ? Boolean(issueReadiness.right.needsIssue)
      : true);
  const needsLeft =
    soWantsLeft &&
    (issueReadiness?.left?.needsIssue !== undefined
      ? Boolean(issueReadiness.left.needsIssue)
      : true);
  const alreadyRight = soWantsRight && !needsRight;
  const alreadyLeft = soWantsLeft && !needsLeft;

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const response = isAlternate
          ? await getAlternateMatchingInventory(saleOrderId)
          : await getMatchingInventoryFIFO(saleOrderId);
        if (!isMounted) return;
        if (response.success) {
          const matches = response.data || {};
          setSaleOrder(matches.saleOrder || null);
          
          const rightMatches = matches.rightEyeMatches || [];
          const leftMatches = matches.leftEyeMatches || [];
          setFifoMatches({ rightEyeMatches: rightMatches, leftEyeMatches: leftMatches });

          const usedCount = {};
          const takeNext = (eyeMatches) => {
            for (const m of eyeMatches) {
              const available = Number(m.quantity) || 0;
              const used = usedCount[m.id] || 0;
              if (used < available) {
                usedCount[m.id] = used + 1;
                return m.id;
              }
            }
            return eyeMatches[0]?.id;
          };

          const initialSelections = {};
          if (needsRight && rightMatches.length > 0) {
            initialSelections.rightEyeItemId = takeNext(rightMatches);
          }
          if (needsLeft && leftMatches.length > 0) {
            initialSelections.leftEyeItemId = takeNext(leftMatches);
          }
          setSelectedFifoItems(initialSelections);
        }
      } catch (error) {
        toast({
          title: "Error finding matching stock",
          description: error.message || "Failed to search inventory on FIFO basis.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    if (saleOrderId) load();
    return () => { isMounted = false; };
  }, [saleOrderId, needsRight, needsLeft, isAlternate, toast]);

  const handleConfirm = async () => {
    const rightItemId = needsRight ? selectedFifoItems.rightEyeItemId || null : null;
    const leftItemId = needsLeft ? selectedFifoItems.leftEyeItemId || null : null;
    const itemIds = [];
    if (rightItemId) itemIds.push(rightItemId);
    if (leftItemId) itemIds.push(leftItemId);

    if (
      needsRight &&
      needsLeft &&
      rightItemId &&
      leftItemId &&
      rightItemId === leftItemId
    ) {
      const match =
        fifoMatches.rightEyeMatches.find((m) => m.id === rightItemId) ||
        fifoMatches.leftEyeMatches.find((m) => m.id === rightItemId);
      const available = Number(match?.quantity) || 0;
      if (available < 2) {
        toast({
          title: "Select different stock for each eye",
          description:
            "The selected line only has 1 unit. Pick a separate RE and LE stock row (or a line with qty ≥ 2).",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setIsConfirming(true);
      await onConfirm?.({ itemIds, rightItemId, leftItemId });
    } finally {
      setIsConfirming(false);
    }
  };

  const renderAlreadyHas = (label, badgeColor, readiness) => (
    <div className="space-y-2 bg-emerald-50/60 p-4 rounded-xl border border-emerald-100">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
          <Badge className={`${badgeColor} hover:${badgeColor} border`}>{label[0]}</Badge>
          {label} Eye
        </h3>
        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
          Already has lens
        </Badge>
      </div>
      <p className="text-sm text-emerald-900">
        This eye stays reserved on the SO
        {readiness?.serialNo ? ` (serial ${readiness.serialNo})` : readiness?.reservedItemId ? ` (item #${readiness.reservedItemId})` : ""}.
        No pick required.
      </p>
    </div>
  );

  const renderEyeSection = (label, badgeColor, matches, eyeKey, selectedId, onSelect) => (
    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
          <Badge className={`${badgeColor} hover:${badgeColor} border`}>{label[0]}</Badge>
          {label} Eye
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-200 text-amber-800 bg-amber-50">
            Issue stock
          </Badge>
          {matches.length === 0 ? (
            <Badge variant="destructive">No Stock Available</Badge>
          ) : (
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
              {matches.length} matching item(s) found
            </Badge>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-6 text-sm text-red-500 bg-red-50/50 rounded-lg border border-dashed border-red-100">
          No matching items found in inventory or inward queue for {label} Eye specifications.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b text-xs uppercase">
              <tr>
                <th className="p-3 w-12 text-center">Select</th>
                {isAlternate && <th className="p-3">Product</th>}
                <th className="p-3">Inward Date / Receipt Date</th>
                <th className="p-3">Source</th>
                <th className="p-3">Tray</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Available Qty</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {matches.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                    selectedId === item.id 
                      ? item.isReceipt 
                        ? "bg-purple-50/40 border-purple-200 font-medium" 
                        : "bg-blue-50/30 border-blue-200 font-medium" 
                      : item.isReceipt 
                      ? "bg-purple-50/10 hover:bg-purple-50/20" 
                      : ""
                  }`}
                >
                  <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="radio"
                      name={`${eyeKey}Item`}
                      checked={selectedId === item.id}
                      onChange={() => onSelect(item.id)}
                      className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                    />
                  </td>
                  {isAlternate && (
                    <td className="p-3">
                      <div className="text-slate-800 font-semibold">{item.lensProduct?.brand?.name || "—"}</div>
                      <div className="text-slate-600 text-xs">{item.lensProduct?.lens_name || "—"}</div>
                      <div className="text-slate-500 text-xs">{item.coating?.name || "No Coating"}</div>
                    </td>
                  )}
                  <td className="p-3 text-slate-700 flex items-center gap-2">
                    {idx === 0 && !item.isReceipt && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">Oldest / FIFO</Badge>
                    )}
                    {item.isReceipt && (
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border border-purple-200 text-[10px] py-0 px-1.5 uppercase font-bold">Inward Queue</Badge>
                    )}
                    {item.isReused && (
                      <Badge className="bg-violet-100 text-violet-800 hover:bg-violet-100 border border-violet-200 text-[10px] py-0 px-1.5 uppercase font-bold">
                        REUSED
                      </Badge>
                    )}
                    {item.inwardDate ? new Date(item.inwardDate).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    }) : "—"}
                  </td>
                  <td className="p-3">
                    {item.sourceType === 'RX' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border border-green-200 text-[10px] py-0 px-1.5 font-bold uppercase">
                        RX {item.poNumber ? `(${item.poNumber})` : ''}
                      </Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border border-blue-200 text-[10px] py-0 px-1.5 font-bold uppercase">
                        Stock
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    {item.isReceipt ? (
                      <span className="text-purple-700 bg-purple-50/70 px-2 py-0.5 rounded border border-purple-100 text-[11px] font-medium">
                        Pending Inward
                      </span>
                    ) : item.tray ? (
                      `${item.tray.name} (Cap: ${item.tray.capacity})`
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="p-3 text-slate-600">
                    {item.isReceipt ? (
                      <span className="text-purple-600 font-semibold">Inward Queue</span>
                    ) : item.location ? (
                      item.location.name
                    ) : (
                      "N/A"
                    )}
                  </td>
                  <td className="p-3 text-right font-medium text-slate-700">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open size="wide" onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <DialogContent className="max-h-[85vh] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            {isAlternate ? "Alternate Lens Pick (Power Match Only)" : "Inventory Stock Pick (FIFO Allocation)"}
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto pr-2 space-y-4 py-3">
          {saleOrder && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs shadow-sm">
              <div>
                <h4 className="font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-[10px]">Product & Coating</h4>
                <div className="space-y-1 text-slate-600">
                  <div><span className="font-semibold text-slate-800">Name:</span> {saleOrder.lensProduct?.lens_name || "—"}</div>
                  <div><span className="font-semibold text-slate-800">Category:</span> {saleOrder.category?.name || "—"}</div>
                  <div><span className="font-semibold text-slate-800">Coating:</span> {saleOrder.coating?.name || "—"}</div>
                  {saleOrder.lensType?.name && (
                    <div><span className="font-semibold text-slate-800">Type:</span> {saleOrder.lensType.name}</div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {soWantsRight && (
                  <div className="bg-blue-50/50 p-2.5 border border-blue-100 rounded-lg">
                    <span className="font-bold text-blue-800 block mb-1 text-[11px]">Right Eye Specs</span>
                    <div className="space-y-0.5 text-slate-600">
                      <div>SPH: <span className="font-bold text-slate-800">{saleOrder.rightSpherical || "0.00"}</span></div>
                      <div>CYL: <span className="font-bold text-slate-800">{saleOrder.rightCylindrical || "0.00"}</span></div>
                      {saleOrder.rightAdd && <div>ADD: <span className="font-bold text-slate-800">{saleOrder.rightAdd}</span></div>}
                    </div>
                  </div>
                )}
                {soWantsLeft && (
                  <div className="bg-purple-50/50 p-2.5 border border-purple-100 rounded-lg">
                    <span className="font-bold text-purple-800 block mb-1 text-[11px]">Left Eye Specs</span>
                    <div className="space-y-0.5 text-slate-600">
                      <div>SPH: <span className="font-bold text-slate-800">{saleOrder.leftSpherical || "0.00"}</span></div>
                      <div>CYL: <span className="font-bold text-slate-800">{saleOrder.leftCylindrical || "0.00"}</span></div>
                      {saleOrder.leftAdd && <div>ADD: <span className="font-bold text-slate-800">{saleOrder.leftAdd}</span></div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="text-sm text-slate-500">
            {isAlternate
              ? "Select an in-stock alternate lens matching this order's SPH/CYL/ADD power only (coating, brand, and category may differ). The original order details are not changed."
              : "Select matching lenses only for eyes that need issue. Accepted eyes already reserved on the SO do not require a pick."}
          </p>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground flex flex-col items-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
              Loading matching stock...
            </div>
          ) : (
            <>
              {alreadyRight && renderAlreadyHas(
                "Right",
                "bg-blue-100 text-blue-800 border-blue-200",
                issueReadiness?.right
              )}
              {needsRight && renderEyeSection(
                "Right", "bg-blue-100 text-blue-800 border-blue-200",
                fifoMatches.rightEyeMatches, "rightEye",
                selectedFifoItems.rightEyeItemId,
                (id) => setSelectedFifoItems((prev) => ({ ...prev, rightEyeItemId: id }))
              )}
              {alreadyLeft && renderAlreadyHas(
                "Left",
                "bg-purple-100 text-purple-800 border-purple-200",
                issueReadiness?.left
              )}
              {needsLeft && renderEyeSection(
                "Left", "bg-purple-100 text-purple-800 border-purple-200",
                fifoMatches.leftEyeMatches, "leftEye",
                selectedFifoItems.leftEyeItemId,
                (id) => setSelectedFifoItems((prev) => ({ ...prev, leftEyeItemId: id }))
              )}
            </>
          )}
        </div>

        <DialogFooter className="shrink-0 gap-2 sm:gap-0 border-t pt-3 mt-2 bg-background">
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={
              isLoading ||
              isConfirming ||
              (needsRight && !selectedFifoItems.rightEyeItemId) ||
              (needsLeft && !selectedFifoItems.leftEyeItemId) ||
              (!needsRight && !needsLeft)
            }
            onClick={handleConfirm}
          >
            {isConfirming ? "Processing..." : isAlternate ? "Confirm Alternate & Issue to Pre-QC" : "Confirm & Issue to Pre-QC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
