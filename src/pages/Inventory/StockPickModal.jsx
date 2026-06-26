import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getMatchingInventoryFIFO } from "@/services/saleOrder";

/**
 * Standalone "Inventory Stock Pick (FIFO Allocation)" modal.
 * Ported from SaleOrderForm.jsx's inline FIFO modal (~lines 3239-3400) so it
 * can be reused by the Request Queue tab's "Issue & Pre-QC" action, ahead of
 * the IN_PRODUCTION-transition usage that already exists in SaleOrderForm.
 *
 * Props:
 *  - saleOrderId: number — order to fetch FIFO matches for
 *  - requiredEyes: { rightEye: boolean, leftEye: boolean }
 *  - onConfirm(itemIds: number[]): called with the selected inventory item id(s)
 *  - onCancel(): called when the modal is dismissed without confirming
 */
export default function StockPickModal({ saleOrderId, requiredEyes = {}, onConfirm, onCancel }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [fifoMatches, setFifoMatches] = useState({ rightEyeMatches: [], leftEyeMatches: [] });
  const [selectedFifoItems, setSelectedFifoItems] = useState({});

  const wantsRight = Boolean(requiredEyes.rightEye);
  const wantsLeft = Boolean(requiredEyes.leftEye);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const response = await getMatchingInventoryFIFO(saleOrderId);
        if (!isMounted) return;
        if (response.success) {
          const matches = response.data || {};
          const rightMatches = matches.rightEyeMatches || [];
          const leftMatches = matches.leftEyeMatches || [];
          setFifoMatches({ rightEyeMatches: rightMatches, leftEyeMatches: leftMatches });

          const initialSelections = {};
          if (wantsRight && rightMatches.length > 0) initialSelections.rightEyeItemId = rightMatches[0].id;
          if (wantsLeft && leftMatches.length > 0) initialSelections.leftEyeItemId = leftMatches[0].id;
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
  }, [saleOrderId, wantsRight, wantsLeft, toast]);

  const handleConfirm = async () => {
    const itemIds = [];
    if (selectedFifoItems.rightEyeItemId) itemIds.push(selectedFifoItems.rightEyeItemId);
    if (selectedFifoItems.leftEyeItemId) itemIds.push(selectedFifoItems.leftEyeItemId);
    try {
      setIsConfirming(true);
      await onConfirm?.(itemIds);
    } finally {
      setIsConfirming(false);
    }
  };

  const renderEyeSection = (label, badgeColor, matches, eyeKey, selectedId, onSelect) => (
    <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
          <Badge className={`${badgeColor} hover:${badgeColor} border`}>{label[0]}</Badge>
          {label} Eye
        </h3>
        {matches.length === 0 ? (
          <Badge variant="destructive">No Stock Available</Badge>
        ) : (
          <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
            {matches.length} matching item(s) found
          </Badge>
        )}
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-6 text-sm text-red-500 bg-red-50/50 rounded-lg border border-dashed border-red-100">
          No matching items found in inventory for {label} Eye specifications.
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b text-xs uppercase">
              <tr>
                <th className="p-3 w-12 text-center">Select</th>
                <th className="p-3">Inward Date (FIFO)</th>
                <th className="p-3">Tray</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Available Qty</th>
                <th className="p-3 text-right">Cost Price</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {matches.map((item, idx) => (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`hover:bg-slate-50/50 cursor-pointer ${selectedId === item.id ? "bg-blue-50/30 font-medium" : ""}`}
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
                  <td className="p-3 text-slate-700 flex items-center gap-2">
                    {idx === 0 && (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">Oldest / FIFO</Badge>
                    )}
                    {item.inwardDate ? new Date(item.inwardDate).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    }) : "—"}
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    {item.tray ? `${item.tray.name} (Cap: ${item.tray.capacity})` : "N/A"}
                  </td>
                  <td className="p-3 text-slate-600">
                    {item.location ? item.location.name : "N/A"}
                  </td>
                  <td className="p-3 text-right font-medium text-slate-700">{item.quantity}</td>
                  <td className="p-3 text-right text-slate-600 font-mono">
                    ₹{parseFloat(item.costPrice || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel?.(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Inventory Stock Pick (FIFO Allocation)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-slate-500">
            Select the matching available lenses to issue from inventory before moving this order to Pre-QC.
          </p>

          {isLoading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">Loading matching stock...</div>
          ) : (
            <>
              {wantsRight && renderEyeSection(
                "Right", "bg-blue-100 text-blue-800 border-blue-200",
                fifoMatches.rightEyeMatches, "rightEye",
                selectedFifoItems.rightEyeItemId,
                (id) => setSelectedFifoItems((prev) => ({ ...prev, rightEyeItemId: id }))
              )}
              {wantsLeft && renderEyeSection(
                "Left", "bg-purple-100 text-purple-800 border-purple-200",
                fifoMatches.leftEyeMatches, "leftEye",
                selectedFifoItems.leftEyeItemId,
                (id) => setSelectedFifoItems((prev) => ({ ...prev, leftEyeItemId: id }))
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isConfirming}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={
              isLoading ||
              isConfirming ||
              (wantsRight && !selectedFifoItems.rightEyeItemId) ||
              (wantsLeft && !selectedFifoItems.leftEyeItemId)
            }
            onClick={handleConfirm}
          >
            {isConfirming ? "Processing..." : "Confirm & Issue to Pre-QC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
