import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, User, MapPin, Package } from "lucide-react";
import { FormSelect } from "@/components/ui/form-select";
import { createDispatch } from "@/services/dispatch";
import { getDeliveryPersonsDropdown } from "@/services/user";
import { useToast } from "@/hooks/use-toast";

function todayDateInputValue() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function CreateDispatchModal({ open, onClose, selectedOrders = [], customer, onSuccess }) {
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [form, setForm] = useState({
        deliveryPersonId: "",
        expectedDeliveryDate: todayDateInputValue(),
        notes: "",
        vehicleNumber: "",
        driverName: "",
        driverContact: "",
        deliveryNotes: "",
    });

    // Reset form and pre-fill delivery person + phone from customer's default
    useEffect(() => {
        if (!open) return;
        const defaultPersonId = customer?.delivery_person_id
            ? String(customer.delivery_person_id)
            : "";
        setForm({
            deliveryPersonId: defaultPersonId,
            expectedDeliveryDate: todayDateInputValue(),
            notes: "",
            vehicleNumber: "",
            driverName: "",
            driverContact: "",
            deliveryNotes: "",
        });
        getDeliveryPersonsDropdown()
            .then((res) => {
                const list = res?.data || [];
                const mapped = list.map((u) => ({
                    value: u.value ?? u.id,
                    label: u.label ?? u.name,
                    phonenumber: u.phonenumber || "",
                    vehicleNumber: u.vehicleNumber || "",
                }));
                setUsers(mapped);
                if (defaultPersonId) {
                    const person = mapped.find((u) => String(u.value) === defaultPersonId);
                    if (person) {
                        setForm((f) => ({
                            ...f,
                            driverContact: person.phonenumber || "",
                            vehicleNumber: person.vehicleNumber || "",
                        }));
                    }
                }
            })
            .catch(() => {
                toast({ title: "Error", description: "Failed to load delivery persons", variant: "destructive" });
            });
    }, [open, customer]);

    const handleChange = (field, value) => setForm((f) => ({ ...f, [field]: value }));

    const handleDeliveryPersonChange = (value) => {
        const person = users.find((u) => String(u.value) === String(value));
        setForm((f) => ({
            ...f,
            deliveryPersonId: value || "",
            driverContact: person?.phonenumber || "",
            vehicleNumber: person?.vehicleNumber || "",
        }));
    };

    const handleSubmit = async () => {
        if (!customer?.id) {
            toast({ title: "Error", description: "Customer is required", variant: "destructive" });
            return;
        }
        if (selectedOrders.length === 0) {
            toast({ title: "Error", description: "No orders selected", variant: "destructive" });
            return;
        }
        if (!form.deliveryPersonId) {
            toast({ title: "Validation", description: "Delivery person is required", variant: "destructive" });
            return;
        }
        try {
            setIsSubmitting(true);
            await createDispatch({
                saleOrderIds: selectedOrders.map((o) => o.id),
                customerId: customer.id,
                deliveryPersonId: Number(form.deliveryPersonId),
                expectedDeliveryDate: form.expectedDeliveryDate || todayDateInputValue(),
                notes: form.notes || undefined,
                vehicleNumber: form.vehicleNumber || undefined,
                driverName: form.driverName || undefined,
                driverContact: form.driverContact || undefined,
                deliveryNotes: form.deliveryNotes || undefined,
            });
            toast({ title: "Dispatch created", description: `${selectedOrders.length} order(s) added to dispatch` });
            onSuccess?.();
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err) || "Failed to create dispatch", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const customerAddress = [customer?.address, customer?.city, customer?.state, customer?.pincode]
        .filter(Boolean).join(", ");

    const canCreate = selectedOrders.length > 0 && !!form.deliveryPersonId && !isSubmitting;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
            <DialogContent className="sm:max-w-lg w-full max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Create Dispatch
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-1">
                    {/* Customer info (read-only) */}
                    <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer</p>
                        <div className="flex items-center gap-1 text-sm font-medium">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            {customer?.shopname || customer?.name || "—"}
                        </div>
                        {customerAddress && (
                            <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                                <span>{customerAddress}</span>
                            </div>
                        )}
                        {customer?.phone && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-4">{customer.phone}</p>
                        )}
                    </div>

                    {/* Selected orders summary */}
                    <div className="rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            Orders ({selectedOrders.length})
                        </p>
                        <div className="flex flex-col gap-1 max-h-28 overflow-y-auto">
                            {selectedOrders.map((o) => (
                                <div key={o.id} className="flex items-center justify-between text-xs">
                                    <span className="font-medium">{o.orderNo}</span>
                                    <span className="text-muted-foreground truncate ml-2">
                                        {o.lensProduct?.lens_name}{o.coating?.name ? ` · ${o.coating.name}` : ""}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Delivery person */}
                    <div className="grid gap-1.5">
                        <Label className="text-xs">
                            Delivery Person <span className="text-red-500">*</span>
                        </Label>
                        <FormSelect
                            options={users}
                            value={form.deliveryPersonId}
                            onChange={handleDeliveryPersonChange}
                            placeholder="Select delivery person"
                            isClearable={false}
                            required
                        />
                    </div>

                    {/* Expected delivery date */}
                    <div className="grid gap-1.5">
                        <Label className="text-xs">Expected Delivery Date</Label>
                        <Input
                            type="date"
                            className="h-8 text-sm"
                            value={form.expectedDeliveryDate}
                            onChange={(e) => handleChange("expectedDeliveryDate", e.target.value)}
                        />
                    </div>

                    {/* Vehicle & driver info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Vehicle Number</Label>
                            <Input
                                className="h-8 text-sm"
                                placeholder="e.g. MH12AB1234"
                                value={form.vehicleNumber}
                                onChange={(e) => handleChange("vehicleNumber", e.target.value)}
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <Label className="text-xs">Driver Contact</Label>
                            <Input
                                className="h-8 text-sm"
                                placeholder="Phone number"
                                value={form.driverContact}
                                onChange={(e) => handleChange("driverContact", e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="grid gap-1.5">
                        <Label className="text-xs">Delivery Notes</Label>
                        <textarea
                            className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder="Any delivery instructions..."
                            value={form.deliveryNotes}
                            onChange={(e) => handleChange("deliveryNotes", e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 pt-2">
                    <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="h-8">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!canCreate} className="h-8 gap-1.5">
                        {isSubmitting ? (
                            <>
                                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Truck className="h-3.5 w-3.5" />
                                Create Dispatch
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
