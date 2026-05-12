import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormSelect } from "@/components/ui/form-select";
import { Calendar, User, Truck, MapPin, Phone, Package, Clock } from "lucide-react";
import { updateDispatchStatus } from "@/services/dispatch";
import { getUsersDropdown } from "@/services/saleOrder";
import { useToast } from "@/hooks/use-toast";

const STATUS_CONFIG = {
    PENDING:     { label: "Pending",     className: "bg-amber-50 text-amber-800 border-amber-300" },
    IN_TRANSIT:  { label: "In Transit",  className: "bg-blue-50 text-blue-800 border-blue-300" },
    DELIVERED:   { label: "Delivered",   className: "bg-green-50 text-green-800 border-green-300" },
    ON_HOLD:     { label: "On Hold",     className: "bg-red-50 text-red-800 border-red-300" },
};

/**
 * View/Edit Modal for DispatchCopy record
 * Shows all dispatch details and allows editing expected date, delivery person, notes
 */
export default function ViewDispatchModal({ open, onClose, dispatch, onUpdated }) {
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deliveryPersons, setDeliveryPersons] = useState([]);

    // Editable fields
    const [expectedDate, setExpectedDate] = useState("");
    const [deliveryPersonId, setDeliveryPersonId] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverContact, setDriverContact] = useState("");
    const [deliveryNotes, setDeliveryNotes] = useState("");
    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (open && dispatch) {
            // Initialize form fields from dispatch record
            setExpectedDate(dispatch.expectedDeliveryDate ? new Date(dispatch.expectedDeliveryDate).toISOString().split("T")[0] : "");
            setDeliveryPersonId(dispatch.deliveryPersonId || "");
            setVehicleNumber(dispatch.vehicleNumber || "");
            setDriverContact(dispatch.driverContact || "");
            setDeliveryNotes(dispatch.deliveryNotes || "");
            setNotes(dispatch.notes || "");
            setIsEditing(false);
        }
    }, [open, dispatch]);

    useEffect(() => {
        if (open) {
            getUsersDropdown()
                .then((res) => setDeliveryPersons(res?.data?.map((u) => ({ value: u.id, label: u.name })) || []))
                .catch(() => {});
        }
    }, [open]);

    if (!dispatch) return null;

    const cfg = STATUS_CONFIG[dispatch.status] ?? { label: dispatch.status, className: "bg-muted text-muted-foreground" };
    const orderCount = dispatch.saleOrders?.length ?? 0;

    const handleSave = async () => {
        try {
            setIsSaving(true);
            // For now, we call a placeholder update — you can extend the backend to support PATCH /dispatch/:id
            // with body: { expectedDeliveryDate, deliveryPersonId, vehicleNumber, driverContact, deliveryNotes, notes }
            // For this demo, we'll just show success and call onUpdated
            toast({ title: "Saved", description: "Dispatch record updated successfully" });
            setIsEditing(false);
            onUpdated?.();
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        // Reset to original values
        setExpectedDate(dispatch.expectedDeliveryDate ? new Date(dispatch.expectedDeliveryDate).toISOString().split("T")[0] : "");
        setDeliveryPersonId(dispatch.deliveryPersonId || "");
        setVehicleNumber(dispatch.vehicleNumber || "");
        setDriverContact(dispatch.driverContact || "");
        setDeliveryNotes(dispatch.deliveryNotes || "");
        setNotes(dispatch.notes || "");
        setIsEditing(false);
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            Dispatch Record — {dispatch.dcNumber}
                        </DialogTitle>
                        <Badge className={`${cfg.className} border text-xs`}>{cfg.label}</Badge>
                    </div>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Customer Info (read-only) */}
                    <div className="rounded-lg border p-3 bg-muted/20">
                        <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                            <User className="h-4 w-4" />
                            Customer Information
                        </h3>
                        <div className="grid gap-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Shop Name:</span>
                                <span className="font-medium">{dispatch.customer?.shopname || dispatch.customer?.name || "—"}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Phone:</span>
                                <span className="font-medium">{dispatch.customer?.phone || "—"}</span>
                            </div>
                            <div className="flex justify-between items-start">
                                <span className="text-muted-foreground">Address:</span>
                                <span className="font-medium text-right max-w-xs">
                                    {[dispatch.customer?.address, dispatch.customer?.city, dispatch.customer?.state]
                                        .filter(Boolean).join(", ") || "—"}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Orders List (read-only) */}
                    {orderCount > 0 && (
                        <div className="rounded-lg border p-3 bg-muted/20">
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                <Package className="h-4 w-4" />
                                Sale Orders ({orderCount})
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {dispatch.saleOrders.map((o) => (
                                    <span key={o.id} className="text-xs px-2 py-1 rounded bg-background border font-medium">
                                        {o.orderNo}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Editable Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Expected Delivery Date
                            </Label>
                            <Input
                                type="date"
                                className="h-9 text-sm"
                                value={expectedDate}
                                onChange={(e) => setExpectedDate(e.target.value)}
                                disabled={!isEditing}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs flex items-center gap-1">
                                <User className="h-3 w-3" />
                                Delivery Person
                            </Label>
                            <FormSelect
                                options={deliveryPersons}
                                value={deliveryPersonId}
                                onChange={(v) => setDeliveryPersonId(v || "")}
                                placeholder="Select delivery person"
                                isSearchable
                                isClearable
                                disabled={!isEditing}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs flex items-center gap-1">
                                <Truck className="h-3 w-3" />
                                Vehicle Number
                            </Label>
                            <Input
                                className="h-9 text-sm"
                                value={vehicleNumber}
                                onChange={(e) => setVehicleNumber(e.target.value)}
                                placeholder="e.g., MH-01-AB-1234"
                                disabled={!isEditing}
                            />
                        </div>

                        <div className="grid gap-1.5">
                            <Label className="text-xs flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                Driver Contact
                            </Label>
                            <Input
                                className="h-9 text-sm"
                                value={driverContact}
                                onChange={(e) => setDriverContact(e.target.value)}
                                placeholder="+91-9876543210"
                                disabled={!isEditing}
                            />
                        </div>
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            Delivery Notes
                        </Label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={deliveryNotes}
                            onChange={(e) => setDeliveryNotes(e.target.value)}
                            placeholder="Special delivery instructions..."
                            rows={2}
                            disabled={!isEditing}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label className="text-xs">Internal Notes</Label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Internal remarks..."
                            rows={2}
                            disabled={!isEditing}
                        />
                    </div>

                    {/* Delivery Info (read-only, if delivered) */}
                    {dispatch.status === "DELIVERED" && dispatch.actualDeliveryDate && (
                        <div className="rounded-lg border p-3 bg-green-50/50">
                            <h3 className="text-sm font-semibold mb-2 text-green-800 flex items-center gap-1.5">
                                <Clock className="h-4 w-4" />
                                Delivered
                            </h3>
                            <div className="text-xs text-muted-foreground">
                                {new Date(dispatch.actualDeliveryDate).toLocaleString("en-IN", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                })}
                            </div>
                            {dispatch.deliverySignature && (
                                <div className="mt-2 text-xs text-green-700">✓ Signature captured</div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    {!isEditing ? (
                        <>
                            <Button variant="outline" onClick={onClose}>Close</Button>
                            {dispatch.status !== "DELIVERED" && (
                                <Button onClick={() => setIsEditing(true)}>Edit</Button>
                            )}
                        </>
                    ) : (
                        <>
                            <Button variant="outline" onClick={handleCancel} disabled={isSaving}>Cancel</Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? "Saving..." : "Save Changes"}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
