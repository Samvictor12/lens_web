import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FormSelect } from "@/components/ui/form-select";
import { Calendar, User, Truck, MapPin, Phone, Package, Clock, Eye, Printer } from "lucide-react";
import { updateDispatch, getDispatchById } from "@/services/dispatch";
import { getDeliveryPersonsDropdown } from "@/services/user";
import { useToast } from "@/hooks/use-toast";
import { useCompany } from "@/contexts/CompanyContext";
import { printDispatch } from "../Dispatch.constants";
import DispatchPreviewDialog from "./DispatchPreviewDialog";

const STATUS_CONFIG = {
    PENDING:     { label: "Ready for Pickup", className: "bg-amber-50 text-amber-800 border-amber-300" },
    IN_TRANSIT:  { label: "In Transit",  className: "bg-blue-50 text-blue-800 border-blue-300" },
    DELIVERED:   { label: "Delivered",   className: "bg-green-50 text-green-800 border-green-300" },
    ON_HOLD:     { label: "On Hold",     className: "bg-red-50 text-red-800 border-red-300" },
};

/**
 * View/Edit Modal for DispatchCopy record
 * Shows products delivered + Preview/Print; allows editing expected date, delivery person, notes
 */
export default function ViewDispatchModal({ open, onClose, dispatch, onUpdated }) {
    const { toast } = useToast();
    const { company } = useCompany();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [deliveryPersons, setDeliveryPersons] = useState([]);
    const [detail, setDetail] = useState(null);
    const [showPreview, setShowPreview] = useState(false);

    // Editable fields
    const [expectedDate, setExpectedDate] = useState("");
    const [deliveryPersonId, setDeliveryPersonId] = useState("");
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [driverContact, setDriverContact] = useState("");
    const [deliveryNotes, setDeliveryNotes] = useState("");
    const [notes, setNotes] = useState("");

    const record = detail || dispatch;

    useEffect(() => {
        if (!open || !dispatch?.id) {
            setDetail(null);
            setShowPreview(false);
            return;
        }

        let cancelled = false;
        setIsLoadingDetail(true);
        getDispatchById(dispatch.id)
            .then((res) => {
                if (cancelled) return;
                const data = res?.data || res;
                if (data) setDetail(data);
            })
            .catch(() => {
                if (!cancelled) setDetail(null);
            })
            .finally(() => {
                if (!cancelled) setIsLoadingDetail(false);
            });

        return () => {
            cancelled = true;
        };
    }, [open, dispatch?.id]);

    useEffect(() => {
        if (open && record) {
            setExpectedDate(record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toISOString().split("T")[0] : "");
            setDeliveryPersonId(record.deliveryPersonId || "");
            setVehicleNumber(record.vehicleNumber || "");
            setDriverContact(record.driverContact || "");
            setDeliveryNotes(record.deliveryNotes || "");
            setNotes(record.notes || "");
            setIsEditing(false);
        }
    }, [open, record]);

    useEffect(() => {
        if (open) {
            getDeliveryPersonsDropdown()
                .then((res) => {
                    const list = res?.data || [];
                    setDeliveryPersons(list.map((u) => ({
                        value: u.value ?? u.id,
                        label: u.label ?? u.name,
                        phonenumber: u.phonenumber || "",
                        vehicleNumber: u.vehicleNumber || "",
                    })));
                })
                .catch(() => {});
        }
    }, [open]);

    const handleDeliveryPersonChange = (value) => {
        const person = deliveryPersons.find((u) => String(u.value) === String(value));
        setDeliveryPersonId(value || "");
        setDriverContact(person?.phonenumber || "");
        setVehicleNumber(person?.vehicleNumber || "");
    };

    if (!dispatch || !record) return null;

    const cfg = STATUS_CONFIG[record.status] ?? { label: record.status, className: "bg-muted text-muted-foreground" };
    const saleOrders = record.saleOrders || [];
    const orderCount = saleOrders.length;
    const companyForPrint = record.company || company;

    const handleSave = async () => {
        if (!deliveryPersonId) {
            toast({ title: "Validation", description: "Delivery person is required", variant: "destructive" });
            return;
        }
        try {
            setIsSaving(true);
            const res = await updateDispatch(record.id, {
                deliveryPersonId: Number(deliveryPersonId),
                expectedDeliveryDate: expectedDate || null,
                vehicleNumber: vehicleNumber || null,
                driverContact: driverContact || null,
                deliveryNotes: deliveryNotes || null,
                notes: notes || null,
            });
            toast({ title: "Saved", description: "Dispatch record updated successfully" });
            setIsEditing(false);
            if (res?.data) {
                setDetail((prev) => ({ ...(prev || {}), ...res.data }));
                setExpectedDate(
                    res.data.expectedDeliveryDate
                        ? new Date(res.data.expectedDeliveryDate).toISOString().split("T")[0]
                        : ""
                );
                setDeliveryPersonId(res.data.deliveryPersonId || "");
                setVehicleNumber(res.data.vehicleNumber || "");
                setDriverContact(res.data.driverContact || "");
                setDeliveryNotes(res.data.deliveryNotes || "");
                setNotes(res.data.notes || "");
            }
            onUpdated?.(res?.data);
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err), variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setExpectedDate(record.expectedDeliveryDate ? new Date(record.expectedDeliveryDate).toISOString().split("T")[0] : "");
        setDeliveryPersonId(record.deliveryPersonId || "");
        setVehicleNumber(record.vehicleNumber || "");
        setDriverContact(record.driverContact || "");
        setDeliveryNotes(record.deliveryNotes || "");
        setNotes(record.notes || "");
        setIsEditing(false);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose?.(); }}>
                <DialogContent className="max-w-3xl max-h-[90vh] !flex flex-col gap-0 overflow-hidden p-0">
                    <DialogHeader className="flex-shrink-0 space-y-0 border-b px-6 py-4 pr-12">
                        <div className="flex items-center justify-between gap-3">
                            <DialogTitle className="flex items-center gap-2 text-left">
                                <Truck className="h-5 w-5 text-primary shrink-0" />
                                <span className="truncate">Dispatch Record — {record.dcNumber}</span>
                            </DialogTitle>
                            <Badge className={`${cfg.className} border text-xs shrink-0`}>{cfg.label}</Badge>
                        </div>
                    </DialogHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 space-y-4">
                        {/* Customer Info (read-only) */}
                        <div className="rounded-lg border p-3 bg-muted/20">
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                <User className="h-4 w-4" />
                                Customer Information
                            </h3>
                            <div className="grid gap-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Shop Name:</span>
                                    <span className="font-medium">{record.customer?.shopname || record.customer?.name || "—"}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Phone:</span>
                                    <span className="font-medium">{record.customer?.phone || "—"}</span>
                                </div>
                                <div className="flex justify-between items-start">
                                    <span className="text-muted-foreground">Address:</span>
                                    <span className="font-medium text-right max-w-xs">
                                        {[record.customer?.address, record.customer?.city, record.customer?.state]
                                            .filter(Boolean).join(", ") || "—"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Products delivered */}
                        <div className="rounded-lg border p-3 bg-muted/20">
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                                <Package className="h-4 w-4" />
                                Products Delivered ({orderCount})
                                {isLoadingDetail && (
                                    <span className="text-[10px] font-normal text-muted-foreground ml-1">Loading…</span>
                                )}
                            </h3>
                            {orderCount === 0 ? (
                                <p className="text-xs text-muted-foreground">No sale orders linked to this dispatch.</p>
                            ) : (
                                <div className="overflow-x-auto rounded border bg-background">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="border-b bg-muted/40 text-left">
                                                <th className="px-2 py-1.5 font-medium">Order #</th>
                                                <th className="px-2 py-1.5 font-medium">Customer Ref</th>
                                                <th className="px-2 py-1.5 font-medium">Product</th>
                                                <th className="px-2 py-1.5 font-medium">Coating</th>
                                                <th className="px-2 py-1.5 font-medium">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {saleOrders.map((o) => (
                                                <tr key={o.id} className="border-b last:border-0">
                                                    <td className="px-2 py-1.5 font-medium whitespace-nowrap">{o.orderNo || "—"}</td>
                                                    <td className="px-2 py-1.5 whitespace-nowrap">{o.customerRefNo || "—"}</td>
                                                    <td className="px-2 py-1.5">{o.lensProduct?.lens_name || "—"}</td>
                                                    <td className="px-2 py-1.5">{o.coating?.name || "—"}</td>
                                                    <td className="px-2 py-1.5">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted/50">
                                                            {o.dispatchStatus || o.status || "—"}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

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
                                    Delivery Person <span className="text-red-500">*</span>
                                </Label>
                                <FormSelect
                                    options={deliveryPersons}
                                    value={deliveryPersonId}
                                    onChange={handleDeliveryPersonChange}
                                    placeholder="Select delivery person"
                                    isSearchable
                                    isClearable={false}
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
                        {record.status === "DELIVERED" && record.actualDeliveryDate && (
                            <div className="rounded-lg border p-3 bg-green-50/50">
                                <h3 className="text-sm font-semibold mb-2 text-green-800 flex items-center gap-1.5">
                                    <Clock className="h-4 w-4" />
                                    Delivered
                                </h3>
                                <div className="text-xs text-muted-foreground">
                                    {new Date(record.actualDeliveryDate).toLocaleString("en-IN", {
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </div>
                                {record.deliverySignature && (
                                    <div className="mt-2 text-xs text-green-700">✓ Signature captured</div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="flex-shrink-0 border-t bg-background px-6 py-4 flex-wrap gap-2 sm:space-x-0">
                        {!isEditing ? (
                            <>
                                <Button variant="outline" onClick={onClose}>Close</Button>
                                <Button
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => setShowPreview(true)}
                                    disabled={isLoadingDetail && !detail}
                                >
                                    <Eye className="h-3.5 w-3.5" />
                                    Preview
                                </Button>
                                <Button
                                    variant="outline"
                                    className="gap-1.5"
                                    onClick={() => printDispatch(record, companyForPrint)}
                                    disabled={isLoadingDetail && !detail}
                                >
                                    <Printer className="h-3.5 w-3.5" />
                                    Print
                                </Button>
                                {record.status !== "DELIVERED" && (
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

            <DispatchPreviewDialog
                open={showPreview}
                onClose={() => setShowPreview(false)}
                dispatch={record}
            />
        </>
    );
}
