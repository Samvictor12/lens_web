import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Calculator, Play, Package, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    createSaleOrder,
    getSaleOrderById,
    updateSaleOrder,
    updateSaleOrderStatus,
    getCustomersDropdown,
    getLensProductsDropdown,
    getLensCategoriesDropdown,
    getLensTypesDropdown,
    getLensDiaDropdown,
    getLensFittingsDropdown,
    getLensCoatingsDropdown,
    getLensTintingsDropdown,
    getUsersDropdown,
    getLensPriceId,
    calculateProductCost,
} from "@/services/saleOrder.js";
import {
    defaultSaleOrder,
    orderStatusOptions,
    orderTypeOptions,
    dispatchStatusOptions,
    eyeSpecRanges,
} from "./SaleOrder.constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";

export default function SaleOrderForm() {
    const navigate = useNavigate();
    const { mode, id } = useParams();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
    const [errors, setErrors] = useState({});
    const [formData, setFormData] = useState(defaultSaleOrder);
    const [originalData, setOriginalData] = useState(defaultSaleOrder);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculating, setIsCalculating] = useState(false);

    // Master data states
    const [customers, setCustomers] = useState([]);
    const [lensProducts, setLensProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [lensTypes, setLensTypes] = useState([]);
    const [dias, setDias] = useState([]);
    const [fittings, setFittings] = useState([]);
    const [coatings, setCoatings] = useState([]);
    const [tintings, setTintings] = useState([{ label: "None", value: "none" }]);
    const [users, setUsers] = useState([]);

    // Fetch master data for dropdowns
    useEffect(() => {
        fetchMasterData();
    }, []);

    const fetchMasterData = async () => {
        try {
            const [
                customersRes,
                lensProductsRes,
                categoriesRes,
                lensTypesRes,
                diasRes,
                fittingsRes,
                coatingsRes,
                // tintingsRes,
                usersRes,
            ] = await Promise.all([
                getCustomersDropdown(),
                getLensProductsDropdown(),
                getLensCategoriesDropdown(),
                getLensTypesDropdown(),
                getLensDiaDropdown(),
                getLensFittingsDropdown(),
                getLensCoatingsDropdown(),
                // getLensTintingsDropdown(),
                getUsersDropdown(),
            ]);


            if (customersRes.success) setCustomers(customersRes.data || []);
            if (lensProductsRes.success) setLensProducts(lensProductsRes.data || []);
            if (categoriesRes.success) setCategories(categoriesRes.data || []);
            if (lensTypesRes.success) setLensTypes(lensTypesRes.data || []);
            if (diasRes.success) setDias(diasRes.data || []);
            if (fittingsRes.success) setFittings(fittingsRes.data || []);
            if (coatingsRes.success) setCoatings(coatingsRes.data || []);
            // if (tintingsRes.success) setTintings(tintingsRes.data || []);
            if (usersRes.success) setUsers(usersRes.data || []);
        } catch (error) {
            console.error("Error fetching master data:", error);
            toast({
                title: "Warning",
                description: "Some dropdown options may not be available",
                variant: "default",
            });
        }
    };

    // Fetch sale order data for edit/view mode
    useEffect(() => {
        fetchSaleOrder();
    }, [id, mode, navigate]);
    const fetchSaleOrder = async () => {
        if (id && (mode === "view" || mode === "edit")) {
            try {
                setIsLoading(true);
                const response = await getSaleOrderById(parseInt(id));

                if (response.success) {
                    const order = response.data;
                    setFormData(order);
                    setOriginalData(order);
                } else {
                    toast({
                        title: "Error",
                        description: "Sale order not found",
                        variant: "destructive",
                    });
                    navigate("/sales/orders", { replace: true });
                }
            } catch (error) {
                console.error("Error fetching sale order:", error);
                toast({
                    title: "Error",
                    description: error.message || "Failed to fetch sale order details",
                    variant: "destructive",
                });
                navigate("/sales/orders", { replace: true });
            } finally {
                setIsLoading(false);
            }
        }
    };


    // Generate customer ref no when customer is selected
    useEffect(() => {
        if (formData.customerId && mode === "add" && !formData.customerRefNo) {
            setFormData((prev) => ({
                ...prev,
                customerRefNo: `CREF-${Date.now()}`,
            }));
        }
    }, [formData.customerId, mode]);

    const validateForm = () => {
        const newErrors = {};

        // Block 1: Order Information
        if (!formData.customerId) newErrors.customerId = "Customer is required";
        if (!formData.orderDate) newErrors.orderDate = "Order date is required";
        if (!formData.type) newErrors.type = "Order type is required";
        if (!formData.status) newErrors.status = "Status is required";

        // Block 2: Lens Information
        if (!formData.lens_id) newErrors.lens_id = "Lens name is required";
        if (!formData.category_id) newErrors.category_id = "Category is required";
        if (!formData.Type_id) newErrors.Type_id = "Type is required";
        if (!formData.dia_id) newErrors.dia_id = "Dia is required";
        if (!formData.fitting_id) newErrors.fitting_id = "Fitting type is required";
        if (!formData.coating_id) newErrors.coating_id = "Coating is required";
        if (!formData.tinting_id) newErrors.tinting_id = "Tinting is required";

        // Block 3: Eye Specifications
        if (!formData.rightEye && !formData.leftEye) {
            newErrors.eyeSelection = "At least one eye must be selected";
        }

        // Validate right eye specs if selected
        if (formData.rightEye) {
            if (!formData.rightSpherical) newErrors.rightSpherical = "Required";
            if (!formData.rightCylindrical) newErrors.rightCylindrical = "Required";
            if (!formData.rightAxis) newErrors.rightAxis = "Required";
            if (!formData.rightAdd) newErrors.rightAdd = "Required";

            // Range validations
            if (formData.rightSpherical) {
                const val = parseFloat(formData.rightSpherical);
                if (val < eyeSpecRanges.spherical.min || val > eyeSpecRanges.spherical.max) {
                    newErrors.rightSpherical = `Must be between ${eyeSpecRanges.spherical.min} and ${eyeSpecRanges.spherical.max}`;
                }
            }
        }

        // Validate left eye specs if selected
        if (formData.leftEye) {
            if (!formData.leftSpherical) newErrors.leftSpherical = "Required";
            if (!formData.leftCylindrical) newErrors.leftCylindrical = "Required";
            if (!formData.leftAxis) newErrors.leftAxis = "Required";
            if (!formData.leftAdd) newErrors.leftAdd = "Required";

            // Range validations
            if (formData.leftSpherical) {
                const val = parseFloat(formData.leftSpherical);
                if (val < eyeSpecRanges.spherical.min || val > eyeSpecRanges.spherical.max) {
                    newErrors.leftSpherical = `Must be between ${eyeSpecRanges.spherical.min} and ${eyeSpecRanges.spherical.max}`;
                }
            }
        }

        // Block 4: Dispatch Information (if status is READY_FOR_DISPATCH)
        if (formData.status === "READY_FOR_DISPATCH") {
            if (!formData.dispatchStatus) newErrors.dispatchStatus = "Dispatch status is required";
            if (!formData.estimatedDate) newErrors.estimatedDate = "Estimated date is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === "checkbox" ? checked : value;

        setFormData((prev) => ({ ...prev, [name]: newValue }));

        // Clear error for this field
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }

        // Clear eye specs when eye is unchecked
        if (name === "rightEye" && !checked) {
            setFormData((prev) => ({
                ...prev,
                rightSpherical: "",
                rightCylindrical: "",
                rightAxis: "",
                rightAdd: "",
                rightDia: "",
                rightBase: "",
                rightBaseSize: "",
                rightBled: "",
            }));
        }

        if (name === "leftEye" && !checked) {
            setFormData((prev) => ({
                ...prev,
                leftSpherical: "",
                leftCylindrical: "",
                leftAxis: "",
                leftAdd: "",
                leftDia: "",
                leftBase: "",
                leftBaseSize: "",
                leftBled: "",
            }));
        }
    };

    const handleSelectChange = (name, value) => {
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors((prev) => ({ ...prev, [name]: "" }));
        }
    };

    const handleCalculatePrice = async () => {
        // Validate required fields
        if (!formData.customerId || !formData.lens_id || !formData.coating_id) {
            toast({
                title: "Missing Information",
                description: "Please select Customer, Lens Name, and Coating to calculate price.",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsCalculating(true);

            // Step 1: Get lensPrice_id from LensPriceMaster
            const lensPriceResponse = await getLensPriceId(
                formData.lens_id,
                formData.coating_id
            );

            if (!lensPriceResponse.success || !lensPriceResponse.data) {
                toast({
                    title: "Price Not Found",
                    description: "No price configured for this lens and coating combination.",
                    variant: "destructive",
                });
                return;
            }

            const lensPriceId = lensPriceResponse.data.id;

            // Step 2: Calculate cost using existing API
            const response = await calculateProductCost({
                customer_id: formData.customerId,
                lensPrice_id: lensPriceId,
                quantity: 1,
            });

            if (response.success) {
                // Update form with calculated values
                setFormData((prev) => ({
                    ...prev,
                    lensPrice: response.data.pricing.basePrice,
                    discount: response.data.pricing.discountRate,
                }));

                toast({
                    title: "Price Calculated",
                    description: response.data.pricing.hasPriceMapping
                        ? `Base: ₹${response.data.pricing.basePrice}, Discount: ${response.data.pricing.discountRate}%, Final: ₹${response.data.pricing.finalCost}`
                        : `Price: ₹${response.data.pricing.finalCost} (No discount available)`,
                    success: true,
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to calculate price",
                variant: "destructive",
            });
        } finally {
            setIsCalculating(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields correctly",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsSaving(true);

            if (mode === "add") {
                const response = await createSaleOrder(formData);
                if (response.success) {
                    toast({
                        title: "Success",
                        description: "Sale order created successfully!",
                        success: true,
                    });
                    navigate("/sales/orders");
                }
            } else if (mode === "edit" || isEditing) {
                const response = await updateSaleOrder(parseInt(id), formData);
                if (response.success) {
                    toast({
                        title: "Success",
                        description: "Sale order updated successfully!",
                        success: true,
                    });
                    setOriginalData(formData);
                    setIsEditing(false);
                    navigate("/sales/orders");
                }
            }
        } catch (error) {
            console.error("Error saving sale order:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save sale order",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        if (mode === "add" || isEditing) {
            const confirmCancel = window.confirm(
                "Are you sure? Any unsaved changes will be lost."
            );
            if (confirmCancel) {
                window.close();
            }
        } else {
            window.close();

        }
    };

    const toggleEdit = () => {
        if (isEditing) {
            setFormData(originalData);
            setErrors({});
        }
        setIsEditing(!isEditing);
    };

    const getStatusActionButton = () => {
        const currentStatus = formData.status;

        switch (currentStatus) {
            case "DRAFT":
                return {
                    label: "Start Production",
                    nextStatus: "IN_PRODUCTION",
                    icon: Play,
                    variant: "default",
                };
            case "IN_PRODUCTION":
                return {
                    label: "Ready for Dispatch",
                    nextStatus: "READY_FOR_DISPATCH",
                    icon: Package,
                    variant: "default",
                };
            case "READY_FOR_DISPATCH":
                return {
                    label: "Mark as Delivered",
                    nextStatus: "DELIVERED",
                    icon: Check,
                    variant: "default",
                };
            default:
                return null;
        }
    };

    const handleStatusTransition = async () => {
        const statusAction = getStatusActionButton();
        if (!statusAction) return;

        const confirmMessage = `Are you sure you want to change status to "${statusAction.label}"?`;
        if (!window.confirm(confirmMessage)) return;

        try {
            setIsSaving(true);
            const response = await updateSaleOrderStatus(parseInt(id), statusAction.nextStatus);

            if (response.success) {
                toast({
                    title: "Success",
                    description: `Status updated to ${statusAction.nextStatus}`,
                    success: true,
                });

                // Refresh order data
                const refreshResponse = await getSaleOrderById(parseInt(id));
                if (refreshResponse.success) {
                    setFormData(refreshResponse.data);
                    setOriginalData(refreshResponse.data);
                }
            }
        } catch (error) {
            toast({
                title: "Error",
                description: error.message || "Failed to update status",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const isReadOnly = mode === "view" && !isEditing;
    const statusActionButton = mode === "view" ? getStatusActionButton() : null;

    if (isLoading) {
        return (
            <div className="p-2 sm:p-3 md:p-4">
                <Card>
                    <CardContent className="p-8 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm text-muted-foreground">
                                Loading sale order details...
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
                        {mode === "add"
                            ? "New Sale Order"
                            : mode === "edit"
                                ? "Edit Sale Order"
                                : "Sale Order Details"}
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        {mode === "add"
                            ? "Fill in the sale order information below"
                            : mode === "edit"
                                ? "Update sale order information"
                                : "View sale order information"}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="h-8 gap-1.5"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back
                    </Button>

                    {mode === "view" && statusActionButton && (
                        <Button
                            size="xs"
                            className="h-8 gap-1.5"
                            onClick={handleStatusTransition}
                            disabled={isSaving}
                        >
                            <statusActionButton.icon className="h-3.5 w-3.5" />
                            {statusActionButton.label}
                        </Button>
                    )}

                    {mode === "view" && (
                        <Button
                            size="xs"
                            className="h-8 gap-1.5"
                            variant={isEditing ? "outline" : "default"}
                            onClick={toggleEdit}
                        >
                            {isEditing ? (
                                <>
                                    <X className="h-3.5 w-3.5" />
                                    Cancel Edit
                                </>
                            ) : (
                                <>
                                    <Edit className="h-3.5 w-3.5" />
                                    Edit
                                </>
                            )}
                        </Button>
                    )}

                    {(mode !== "view" || isEditing) && (
                        <Button
                            type="submit"
                            size="xs"
                            className="h-8 gap-1.5"
                            onClick={handleSubmit}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-3.5 w-3.5" />
                                    {mode === "add" ? "Create Order" : "Update Order"}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>

            {/* Form with 4 Blocks */}
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-3">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Block 1: Order Information */}
                    <Card className="w-[35%] flex flex-col">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Order Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">

                            <FormSelect
                                label="Customer"
                                name="customerId"
                                options={customers}
                                value={formData.customerId}
                                onChange={(value) => handleSelectChange("customerId", value)}
                                placeholder="Select customer"
                                isSearchable={true}

                                disabled={isReadOnly}
                                required
                                error={errors.customerId}
                            />
                            <FormInput
                                label="Customer Ref No"
                                name="customerRefNo"
                                value={formData.customerRefNo}
                                onChange={handleChange}
                                disabled={true}
                                helperText="Auto-generated"
                            />
                            <FormInput
                                label="Order Date"
                                type="date"
                                name="orderDate"
                                value={formData.orderDate}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                required
                                error={errors.orderDate}
                            />
                            <FormSelect
                                label="Type"
                                name="type"
                                options={orderTypeOptions}
                                value={formData.type}
                                onChange={(value) => handleSelectChange("type", value)}
                                placeholder="Select order type"
                                isSearchable={false}
                                disabled={isReadOnly}
                                required
                                error={errors.type}
                            />
                            <FormInput
                                label="Delivery Schedule"
                                type="datetime-local"
                                name="deliverySchedule"
                                value={formData.deliverySchedule || ""}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                            <FormSelect
                                label="Status"
                                name="status"
                                options={orderStatusOptions.map((opt) => ({
                                    id: opt.value,
                                    name: opt.label,
                                }))}
                                value={formData.status}
                                onChange={(value) => handleSelectChange("status", value)}
                                placeholder="Select status"
                                isSearchable={false}
                                disabled={isReadOnly}
                                required
                                error={errors.status}
                            />
                            <FormTextarea
                                label="Remarks"
                                name="remark"
                                value={formData.remark}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                rows={3}
                                placeholder="Enter any additional remarks"
                            />
                            <FormInput
                                label="Item Ref No"
                                name="itemRefNo"
                                value={formData.itemRefNo}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                placeholder="Optional item reference"
                            />

                            <Checkbox
                                label="Free Lens"
                                id="freeLens"
                                name="freeLens"
                                checked={formData.freeLens}
                                onCheckedChange={(checked) =>
                                    handleSelectChange("freeLens", checked)
                                }
                                disabled={isReadOnly}
                            />
                            {errors.eyeSelection && (
                                <Alert variant="destructive" className="mt-2">
                                    <AlertDescription>{errors.eyeSelection}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>

                    {/* Block 2, 3, 4: Tabbed View */}
                    <div className="flex w-[65%]">
                        <Tabs value="lens-info">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="lens-info">Lens Info</TabsTrigger>
                                <TabsTrigger value="dispatch">Dispatch</TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Lens Information + Eye Specifications */}
                            <TabsContent value="lens-info" >
                                {/* Block 2: Lens Information */}
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Lens Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3.5">
                                        {/* Row 1 */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormSelect
                                                label="Lens Name"
                                                name="lens_id"
                                                options={lensProducts}
                                                value={formData.lens_id}
                                                onChange={(value) => handleSelectChange("lens_id", value)}
                                                placeholder="Select lens"
                                                isSearchable={true}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.lens_id}
                                            />
                                            <FormSelect
                                                label="Category"
                                                name="category_id"
                                                options={categories}
                                                value={formData.category_id}
                                                onChange={(value) => handleSelectChange("category_id", value)}
                                                placeholder="Select category"
                                                isSearchable={false}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.category_id}
                                            />
                                            <FormSelect
                                                label="Type"
                                                name="Type_id"
                                                options={lensTypes}
                                                value={formData.Type_id}
                                                onChange={(value) => handleSelectChange("Type_id", value)}
                                                placeholder="Select type"
                                                isSearchable={false}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.Type_id}
                                            />
                                        </div>

                                        {/* Row 2 */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                            <FormSelect
                                                label="Dia"
                                                name="dia_id"
                                                options={dias}
                                                value={formData.dia_id}
                                                onChange={(value) => handleSelectChange("dia_id", value)}
                                                placeholder="Select dia"
                                                isSearchable={false}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.dia_id}
                                            />
                                            <FormSelect
                                                label="Fitting Type"
                                                name="fitting_id"
                                                options={fittings}
                                                value={formData.fitting_id}
                                                onChange={(value) => handleSelectChange("fitting_id", value)}
                                                placeholder="Select fitting"
                                                isSearchable={false}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.fitting_id}
                                            />
                                            <FormSelect
                                                label="Tinting Name"
                                                name="tinting_id"
                                                options={tintings}
                                                value={formData.tinting_id}
                                                onChange={(value) => handleSelectChange("tinting_id", value)}
                                                placeholder="Select tinting"
                                                isSearchable={false}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.tinting_id}
                                            />
                                        </div>

                                        {/* Row 4 - Coating (changed order as per MD) */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-3">
                                                <FormSelect
                                                    label="Coating Name"
                                                    name="coating_id"
                                                    options={coatings}
                                                    value={formData.coating_id}
                                                    onChange={(value) => handleSelectChange("coating_id", value)}
                                                    placeholder="Select coating"
                                                    isSearchable={true}
                                                    disabled={isReadOnly}
                                                    required
                                                    error={errors.coating_id}
                                                />
                                            </div>
                                        </div>

                                        {/* Row 5 - Calculate Price Button and Price Display */}
                                        {!isReadOnly && (
                                            <>
                                                <Separator />
                                                <div className="flex items-center justify-center m-0">
                                                    <div className="flex-1 grid grid-cols-2 gap-4">
                                                        <FormInput
                                                            label="Lens Price"
                                                            type="number"
                                                            name="lensPrice"
                                                            value={formData.lensPrice}
                                                            onChange={handleChange}
                                                            disabled={true}
                                                        />
                                                        <FormInput
                                                            label="Discount (%)"
                                                            type="number"
                                                            name="discount"
                                                            value={formData.discount}
                                                            onChange={handleChange}
                                                            disabled={true}
                                                        />
                                                    </div>
                                                    <div className="">
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            className="gap-1.5"
                                                            onClick={handleCalculatePrice}
                                                            disabled={
                                                                isCalculating ||
                                                                !formData.customerId ||
                                                                !formData.lens_id ||
                                                                !formData.coating_id
                                                            }
                                                        >
                                                            {isCalculating ? (
                                                                <>
                                                                    <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                                                    Calculating...
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Calculator className="h-4 w-4" />
                                                                    Calculate Price
                                                                </>
                                                            )}
                                                        </Button>
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        {isReadOnly && (
                                            <>
                                                <Separator />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label className="text-sm text-muted-foreground">
                                                            Lens Price
                                                        </Label>
                                                        <p className="text-base font-semibold">
                                                            ₹{formData.lensPrice.toLocaleString("en-IN")}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <Label className="text-sm text-muted-foreground">
                                                            Discount
                                                        </Label>
                                                        <p className="text-base font-semibold">
                                                            {formData.discount}%
                                                        </p>
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Block 3: Eye Specifications */}
                                <Card>
                                    <CardHeader >
                                        <CardTitle className="text-base">Eye Specifications</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {/* Right Eye Section */}
                                            <div className="space-y-3 p-4 border rounded-lg">
                                                <Checkbox
                                                    label={
                                                        <span className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                                            Right Eye
                                                        </span>
                                                    }
                                                    id="rightEye"
                                                    name="rightEye"
                                                    checked={formData.rightEye}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectChange("rightEye", checked)
                                                    }
                                                    disabled={isReadOnly}
                                                />

                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormInput
                                                        label="Spherical"
                                                        type="number"
                                                        step="0.25"
                                                        name="rightSpherical"
                                                        value={formData.rightSpherical}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        error={errors.rightSpherical}
                                                        placeholder="-0.75"
                                                    />
                                                    <FormInput
                                                        label="Cylindrical"
                                                        type="number"
                                                        step="0.25"
                                                        name="rightCylindrical"
                                                        value={formData.rightCylindrical}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        error={errors.rightCylindrical}
                                                        placeholder="0.00"
                                                    />
                                                    <FormInput
                                                        label="Axis"
                                                        type="number"
                                                        name="rightAxis"
                                                        value={formData.rightAxis}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        error={errors.rightAxis}
                                                        placeholder="0"
                                                    />
                                                    <FormInput
                                                        label="Add"
                                                        type="number"
                                                        step="0.25"
                                                        name="rightAdd"
                                                        value={formData.rightAdd}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        error={errors.rightAdd}
                                                        placeholder="1.25"
                                                    />
                                                    <FormInput
                                                        label="Dia"
                                                        name="rightDia"
                                                        value={formData.rightDia}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        placeholder="70"
                                                    />
                                                    <FormInput
                                                        label="Base"
                                                        name="rightBase"
                                                        value={formData.rightBase}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        placeholder="RBASE"
                                                    />
                                                    <FormInput
                                                        label="Base Size"
                                                        name="rightBaseSize"
                                                        value={formData.rightBaseSize}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        placeholder="PRISM"
                                                    />
                                                    <FormInput
                                                        label="Bled"
                                                        name="rightBled"
                                                        value={formData.rightBled}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.rightEye}
                                                        placeholder="RNGH"
                                                    />
                                                </div>
                                            </div>

                                            {/* Left Eye Section */}
                                            <div className="space-y-3 p-4 border rounded-lg">
                                                <Checkbox
                                                    label={
                                                        <span className="flex items-center gap-2">
                                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                                            Left Eye
                                                        </span>
                                                    }
                                                    id="leftEye"
                                                    name="leftEye"
                                                    checked={formData.leftEye}
                                                    onCheckedChange={(checked) =>
                                                        handleSelectChange("leftEye", checked)
                                                    }
                                                    disabled={isReadOnly}
                                                />

                                                <div className="grid grid-cols-2 gap-3">
                                                    <FormInput
                                                        label="Spherical"
                                                        type="number"
                                                        step="0.25"
                                                        name="leftSpherical"
                                                        value={formData.leftSpherical}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        error={errors.leftSpherical}
                                                        placeholder="-0.75"
                                                    />
                                                    <FormInput
                                                        label="Cylindrical"
                                                        type="number"
                                                        step="0.25"
                                                        name="leftCylindrical"
                                                        value={formData.leftCylindrical}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        error={errors.leftCylindrical}
                                                        placeholder="0.00"
                                                    />
                                                    <FormInput
                                                        label="Axis"
                                                        type="number"
                                                        name="leftAxis"
                                                        value={formData.leftAxis}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        error={errors.leftAxis}
                                                        placeholder="0"
                                                    />
                                                    <FormInput
                                                        label="Add"
                                                        type="number"
                                                        step="0.25"
                                                        name="leftAdd"
                                                        value={formData.leftAdd}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        error={errors.leftAdd}
                                                        placeholder="1.25"
                                                    />
                                                    <FormInput
                                                        label="Dia"
                                                        name="leftDia"
                                                        value={formData.leftDia}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        placeholder="70"
                                                    />
                                                    <FormInput
                                                        label="Base"
                                                        name="leftBase"
                                                        value={formData.leftBase}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        placeholder="RBASE"
                                                    />
                                                    <FormInput
                                                        label="Base Size"
                                                        name="leftBaseSize"
                                                        value={formData.leftBaseSize}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        placeholder="PRISM"
                                                    />
                                                    <FormInput
                                                        label="Bled"
                                                        name="leftBled"
                                                        value={formData.leftBled}
                                                        onChange={handleChange}
                                                        disabled={isReadOnly || !formData.leftEye}
                                                        placeholder="RNGH"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Tab 2: Dispatch Information */}
                            <TabsContent value="dispatch">
                                <Card>
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-base">Dispatch Information</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">


                                        {/* Row 2 */}
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <FormInput
                                                label="Dispatch ID"
                                                name="dispatchId"
                                                value={formData.dispatchId}
                                                onChange={handleChange}
                                                disabled={isReadOnly}
                                                placeholder="Auto-generated or manual"
                                            />
                                            <FormSelect
                                                label="Dispatch Status"
                                                name="dispatchStatus"
                                                options={dispatchStatusOptions.map((opt) => ({
                                                    id: opt.value,
                                                    name: opt.label,
                                                }))}
                                                value={formData.dispatchStatus}
                                                onChange={(value) =>
                                                    handleSelectChange("dispatchStatus", value)
                                                }
                                                placeholder="Select dispatch status"
                                                isSearchable={false}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.dispatchStatus}
                                            />
                                            <FormSelect
                                                label="Assigned Person"
                                                name="assignedPerson_id"
                                                options={users.map((u) => ({ id: u.id, name: u.name }))}
                                                value={formData.assignedPerson_id}
                                                onChange={(value) =>
                                                    handleSelectChange("assignedPerson_id", value)
                                                }
                                                placeholder="Select person"
                                                isSearchable={true}
                                                disabled={isReadOnly}
                                            />

                                        </div>

                                        {/* Row 3 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormInput
                                                label="Estimated Date"
                                                type="date"
                                                name="estimatedDate"
                                                value={formData.estimatedDate || ""}
                                                onChange={handleChange}
                                                disabled={isReadOnly}
                                                required
                                                error={errors.estimatedDate}
                                            />
                                            <FormInput
                                                label="Estimated Time"
                                                type="time"
                                                name="estimatedTime"
                                                value={formData.estimatedTime}
                                                onChange={handleChange}
                                                disabled={isReadOnly}
                                            />
                                        </div>

                                        {/* Row 4 */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <FormInput
                                                label="Actual Date"
                                                type="date"
                                                name="actualDate"
                                                value={formData.actualDate || ""}
                                                onChange={handleChange}
                                                disabled={isReadOnly}
                                            />
                                            <FormInput
                                                label="Actual Time"
                                                type="time"
                                                name="actualTime"
                                                value={formData.actualTime}
                                                onChange={handleChange}
                                                disabled={isReadOnly}
                                            />
                                        </div>

                                        {/* Row 5 - Dispatch Notes (full width) */}
                                        <FormTextarea
                                            label="Dispatch Notes"
                                            name="dispatchNotes"
                                            value={formData.dispatchNotes}
                                            onChange={handleChange}
                                            disabled={isReadOnly}
                                            rows={3}
                                            placeholder="Special delivery instructions"
                                        />
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                </div>

                {/* Info Alert for Add Mode */}
                {
                    mode === "add" && (
                        <Alert className="bg-primary/5 border-primary/20">
                            <AlertDescription className="text-xs">
                                Fields marked with <span className="text-destructive">*</span> are
                                required. Make sure to calculate the price before saving.
                            </AlertDescription>
                        </Alert>
                    )
                }
            </form >
        </div >
    );
}
