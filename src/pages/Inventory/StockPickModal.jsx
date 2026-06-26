import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getMatchingInventoryFIFO } from "@/services/saleOrder";

/**
 * StockPickModal
 * Standalone, reusable "Inventory Stock Pick (FIFO Allocation)" modal — ported
 * from the inline FIFO modal in SaleOrderForm.jsx (IN_PRODUCTION transition)
 * so the same UI/pattern can be reused for the Request Queue's "Issue & Pre-QC"
 * step, which needs to pick inventory items *before* issuing to Pre-QC.
 *
 * Props:
 *  - isOpen, onCancel
 *  - saleOrder: the sale order row (needs orderNo, rightEye/leftEye, right/leftSpherical/Cylindrical/Add)
 *  - onConfirm(itemIds): called with the selected InventoryItem id(s) on confirm
 */
export default function StockPickModal({ isOpen, saleOrder, onConfirm, onCancel }) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fifoMatches, setFifoMatches] = useState({ rightEyeMatches: [], leftEyeMatches: [] });
  const [selectedItems, setSelectedItems] = useState({ rightEyeItemId: null, leftEyeItemId: null });

  useEffect(() => {
    if (!isOpen || !saleOrder?.id) return;

    const loadMatches = async () => {
      setIsLoading(true);
      try {
        const response = await getMatchingInventoryFIFO(saleOrder.id);
        if (response.success) {
          const rightMatches = response.data?.rightEyeMatches || [];
          const leftMatches = response.data?.leftEyeMatches || [];
          setFifoMatches({ rightEyeMatches: rightMatches, leftEyeMatches: leftMatches });

          const initialSelections = {};
          if (saleOrder.rightEye && rightMatches.length > 0) {
            initialSelections.rightEyeItemId = rightMatches[0].id;
          }
          if (saleOrder.leftEye && leftMatches.length > 0) {
            initialSelections.leftEyeItemId = leftMatches[0].id;
          }
          setSelectedItems(initialSelections);
        }
      } catch (error) {
        toast({
          title: "Error finding matching stock",
          description: error.message || "Failed to search inventory on FIFO basis.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadMatches();
  }, [isOpen, saleOrder?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleConfirm = async () => {
    const itemIds = [];
    if (saleOrder.rightEye) {
      if (!selectedItems.rightEyeItemId) {
        toast({
          title: "Selection missing",
          description: "Please select an inventory item for the Right Eye.",
          variant: "destructive",
        });
        return;
      }
      itemIds.push(selectedItems.rightEyeItemId);
    }
    if (saleOrder.leftEye) {
      if (!selectedItems.leftEyeItemId) {
        toast({
          title: "Selection missing",
          description: "Please select an inventory item for the Left Eye.",
          variant: "destructive",
        });
        return;
      }
      itemIds.push(selectedItems.leftEyeItemId);
    }

    try {
      setIsSubmitting(true);
      await onConfirm(itemIds);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!saleOrder) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel?.()}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Inventory Stock Pick (FIFO Allocation)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-slate-500">
            Select the matching available lenses physically being taken from inventory to issue Sale Order{" "}
            <strong className="text-slate-800">{saleOrder.orderNo}</strong> to Pre-QC.
          </p>

          {isLoading ? (
            <div className="text-center py-10 text-sm text-slate-500">Loading matching stock…</div>
          ) : (
            <>
              {/* Right Eye Stock Section */}
              {saleOrder.rightEye && (
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">R</Badge>
                      Right Eye Specs:
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        SPH: {saleOrder.rightSpherical} | CYL: {saleOrder.rightCylindrical}{" "}
                        {saleOrder.rightAdd ? `| ADD: ${saleOrder.rightAdd}` : ""}
                      </span>
                    </h3>
                    {fifoMatches.rightEyeMatches.length === 0 ? (
                      <Badge variant="destructive">No Stock Available</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
                        {fifoMatches.rightEyeMatches.length} matching item(s) found
                      </Badge>
                    )}
                  </div>

                  {fifoMatches.rightEyeMatches.length === 0 ? (
                    <div className="text-center py-6 text-sm text-red-500 bg-red-50/50 rounded-lg border border-dashed border-red-100">
                      No matching items found in inventory for Right Eye specifications.
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
                          {fifoMatches.rightEyeMatches.map((item, idx) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedItems((prev) => ({ ...prev, rightEyeItemId: item.id }))}
                              className={`hover:bg-slate-50/50 cursor-pointer ${selectedItems.rightEyeItemId === item.id ? "bg-blue-50/30 font-medium" : ""}`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="radio"
                                  name="rightEyeItem"
                                  checked={selectedItems.rightEyeItemId === item.id}
                                  onChange={() => setSelectedItems((prev) => ({ ...prev, rightEyeItemId: item.id }))}
                                  className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                />
                              </td>
                              <td className="p-3 text-slate-700 flex items-center gap-2">
                                {idx === 0 && (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">
                                    Oldest / FIFO
                                  </Badge>
                                )}
                                {new Date(item.inwardDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                {item.tray ? `${item.tray.name} (Cap: ${item.tray.capacity})` : "N/A"}
                              </td>
                              <td className="p-3 text-slate-600">{item.location ? item.location.name : "N/A"}</td>
                              <td className="p-3 text-right font-medium text-slate-700">{item.quantity}</td>
                              <td className="p-3 text-right text-slate-600 font-mono">
                                ₹{parseFloat(item.costPrice).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Left Eye Stock Section */}
              {saleOrder.leftEye && (
                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex justify-between items-center flex-wrap gap-2">
                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">L</Badge>
                      Left Eye Specs:
                      <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        SPH: {saleOrder.leftSpherical} | CYL: {saleOrder.leftCylindrical}{" "}
                        {saleOrder.leftAdd ? `| ADD: ${saleOrder.leftAdd}` : ""}
                      </span>
                    </h3>
                    {fifoMatches.leftEyeMatches.length === 0 ? (
                      <Badge variant="destructive">No Stock Available</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-50">
                        {fifoMatches.leftEyeMatches.length} matching item(s) found
                      </Badge>
                    )}
                  </div>

                  {fifoMatches.leftEyeMatches.length === 0 ? (
                    <div className="text-center py-6 text-sm text-red-500 bg-red-50/50 rounded-lg border border-dashed border-red-100">
                      No matching items found in inventory for Left Eye specifications.
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
                          {fifoMatches.leftEyeMatches.map((item, idx) => (
                            <tr
                              key={item.id}
                              onClick={() => setSelectedItems((prev) => ({ ...prev, leftEyeItemId: item.id }))}
                              className={`hover:bg-slate-50/50 cursor-pointer ${selectedItems.leftEyeItemId === item.id ? "bg-purple-50/30 font-medium" : ""}`}
                            >
                              <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                <input
                                  type="radio"
                                  name="leftEyeItem"
                                  checked={selectedItems.leftEyeItemId === item.id}
                                  onChange={() => setSelectedItems((prev) => ({ ...prev, leftEyeItemId: item.id }))}
                                  className="h-4 w-4 text-purple-600 border-slate-300 focus:ring-purple-500"
                                />
                              </td>
                              <td className="p-3 text-slate-700 flex items-center gap-2">
                                {idx === 0 && (
                                  <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">
                                    Oldest / FIFO
                                  </Badge>
                                )}
                                {new Date(item.inwardDate).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </td>
                              <td className="p-3 font-semibold text-slate-800">
                                {item.tray ? `${item.tray.name} (Cap: ${item.tray.capacity})` : "N/A"}
                              </td>
                              <td className="p-3 text-slate-600">{item.location ? item.location.name : "N/A"}</td>
                              <td className="p-3 text-right font-medium text-slate-700">{item.quantity}</td>
                              <td className="p-3 text-right text-slate-600 font-mono">
                                ₹{parseFloat(item.costPrice).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            disabled={
              isLoading ||
              isSubmitting ||
              (saleOrder.rightEye && !selectedItems.rightEyeItemId) ||
              (saleOrder.leftEye && !selectedItems.leftEyeItemId)
            }
            onClick={handleConfirm}
          >
            {isSubmitting ? "Processing..." : "Confirm & Issue to Pre-QC"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
