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
import { Checkbox } from "@/components/ui/checkbox";
import {
    buildDispatchPrintPlan,
    executeDispatchPrintPlan,
} from "@/utils/dispatchLabelPrint";
import DispatchLabelsPreviewModal from "@/components/LensPrint/DispatchLabelsPreviewModal";

function todayDateInputValue() {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export default function CreateDispatchModal({
    open,
    onClose,
    selectedOrders = [],
    customer,
    onSuccess,
    initialPrintCard = false,
    initialPrintBarcode = false,
}) {
    const { toast } = useToast();
    const [users, setUsers] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [printCard, setPrintCard] = useState(initialPrintCard);
    const [printBarcode, setPrintBarcode] = useState(initialPrintBarcode);
    const [previewPlan, setPreviewPlan] = useState(null);
    const [isPreviewSubmitting, setIsPreviewSubmitting] = useState(false);
    const [pendingSuccess, setPendingSuccess] = useState(false);

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
        setPrintCard(initialPrintCard);
        setPrintBarcode(initialPrintBarcode);
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
    }, [open, customer, initialPrintCard, initialPrintBarcode]);

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

            if (printCard || printBarcode) {
                try {
                    const plan = await buildDispatchPrintPlan(selectedOrders, {
                        printCard,
                        printBarcode,
                    });
                    if (plan.needsExePreview) {
                        setPendingSuccess(true);
                        setPreviewPlan(plan);
                        return;
                    }
                    const result = await executeDispatchPrintPlan(plan);
                    toast({
                        title: "Print queued",
                        description: `${result.printed} label job(s) sent`,
                    });
                } catch (printErr) {
                    toast({
                        title: "Dispatch created — print failed",
                        description: printErr.message || "Reprint from DC modal",
                        variant: "destructive",
                    });
                }
            }

            onSuccess?.();
        } catch (err) {
            toast({ title: "Error", description: err?.message || String(err) || "Failed to create dispatch", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePreviewConfirm = async () => {
        if (!previewPlan) return;
        setIsPreviewSubmitting(true);
        try {
            const result = await executeDispatchPrintPlan(previewPlan);
            toast({
                title: "Print queued",
                description: `${result.printed} label job(s) sent`,
            });
            setPreviewPlan(null);
            if (pendingSuccess) {
                setPendingSuccess(false);
                onSuccess?.();
            }
        } catch (printErr) {
            toast({
                title: "Dispatch created — print failed",
                description: printErr.message || "Reprint from DC modal",
                variant: "destructive",
            });
        } finally {
            setIsPreviewSubmitting(false);
        }
    };

    const handlePreviewCancel = () => {
        setPreviewPlan(null);
        if (pendingSuccess) {
            setPendingSuccess(false);
            onSuccess?.();
        }
    };

    const customerAddress = [customer?.address, customer?.city, customer?.state, customer?.pincode]
        .filter(Boolean).join(", ");

    const canCreate = selectedOrders.length > 0 && !!form.deliveryPersonId && !isSubmitting;

    return (
        <>
        <Dialog open={open} onOpenChange={(v) => { if (!v && !isSubmitting) onClose(); }}>
            <DialogContent className="!w-[96vw] !max-w-[1650px] sm:!max-w-[1650px] max-h-[85vh] !flex flex-col gap-0 overflow-hidden p-0">
                <DialogHeader className="shrink-0 space-y-0 border-b px-6 py-4 pr-12 text-left">
                    <DialogTitle className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        Create Dispatch
                    </DialogTitle>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
                    <div className="flex flex-col gap-4">
                        {/* Top: Customer info & Orders summary side-by-side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Customer info (read-only) */}
                            <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Customer Information</p>
                                <div className="flex items-center gap-1.5 text-sm font-medium">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {customer?.name || customer?.shopname || "—"}
                                    {customer?.name && customer?.shopname ? (
                                        <span className="font-normal text-muted-foreground"> · {customer.shopname}</span>
                                    ) : null}
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
                            <div className="rounded-lg border bg-muted/20 p-3">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1.5">
                                    <Package className="h-4 w-4" />
                                    Orders Selected ({selectedOrders.length})
                                </p>
                                <div className="flex flex-col gap-1 max-h-24 overflow-y-auto pr-1">
                                    {selectedOrders.map((o) => (
                                        <div key={o.id} className="flex items-center justify-between text-xs py-0.5 border-b last:border-0">
                                            <span className="font-medium text-primary">{o.orderNo}</span>
                                            <span className="text-muted-foreground truncate ml-2">
                                                {o.lensProduct?.lens_name}{o.coating?.name ? ` · ${o.coating.name}` : ""}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Middle: 4-column form fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                                    className="h-9 text-sm"
                                    value={form.expectedDeliveryDate}
                                    onChange={(e) => handleChange("expectedDeliveryDate", e.target.value)}
                                />
                            </div>

                            {/* Vehicle Number */}
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Vehicle Number</Label>
                                <Input
                                    className="h-9 text-sm"
                                    placeholder="e.g. MH12AB1234"
                                    value={form.vehicleNumber}
                                    onChange={(e) => handleChange("vehicleNumber", e.target.value)}
                                />
                            </div>

                            {/* Driver Contact */}
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Driver Contact</Label>
                                <Input
                                    className="h-9 text-sm"
                                    placeholder="Phone number"
                                    value={form.driverContact}
                                    onChange={(e) => handleChange("driverContact", e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Bottom: Notes & Print Preferences side-by-side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Notes */}
                            <div className="grid gap-1.5">
                                <Label className="text-xs">Delivery Notes</Label>
                                <textarea
                                    className="flex min-h-[58px] w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Any delivery instructions..."
                                    rows={2}
                                    value={form.deliveryNotes}
                                    onChange={(e) => handleChange("deliveryNotes", e.target.value)}
                                />
                            </div>

                            {/* Print preferences */}
                            <div className="rounded-lg border p-3 flex flex-col justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                                        Print after create (optional)
                                    </p>
                                    <div className="flex flex-wrap gap-4">
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                            <Checkbox
                                                checked={printCard}
                                                onCheckedChange={(v) => setPrintCard(!!v)}
                                            />
                                            DC Customer Card
                                        </label>
                                        <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                                            <Checkbox
                                                checked={printBarcode}
                                                onCheckedChange={(v) => setPrintBarcode(!!v)}
                                            />
                                            DC Customer Barcode
                                        </label>
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-1.5">
                                    Barcode: R then L. Card: 1 per SO (10 mm top blank for thank line).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="shrink-0 gap-1.5 border-t px-6 py-2.5 sm:space-x-0 sm:justify-end">
                    <Button size="xs" variant="outline" onClick={onClose} disabled={isSubmitting} className="h-7 text-xs px-3">
                        Cancel
                    </Button>
                    <Button size="xs" onClick={handleSubmit} disabled={!canCreate} className="h-7 text-xs px-3 gap-1.5">
                        {isSubmitting ? (
                            <>
                                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Truck className="h-3 w-3" />
                                Create Dispatch
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <DispatchLabelsPreviewModal
            open={!!previewPlan}
            plan={previewPlan}
            isSubmitting={isPreviewSubmitting}
            onCancel={handlePreviewCancel}
            onConfirm={handlePreviewConfirm}
        />
        </>
    );
}
