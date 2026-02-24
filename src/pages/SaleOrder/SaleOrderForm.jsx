import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Calculator, Play, Package, Check, Plus, Delete, DeleteIcon, Trash2 } from "lucide-react";
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
    getLensMaterialsDropdown,
    getLensTintingsDropdown,
    getUsersDropdown,
    getLensPriceId,
    calculateProductCost,
    getLensProductById,
    getFittingById,
    getTintingById,
} from "@/services/saleOrder.js";
import {
    defaultSaleOrder,
    orderStatusOptions,
    orderTypeOptions,
    dispatchStatusOptions,
    eyeSpecRanges,
} from "./SaleOrder.constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { check } from "express-validator";
import { checkCreditLimit } from "../../services/saleOrder";
import { set } from "zod";

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
    const [customerCreditLimit, setCustomerCreditLimit] = useState({ outstanding_credit: 0, credit_limit: null });
    const [priceBreakdown, setPriceBreakdown] = useState(null);

    // Master data states
    const [customers, setCustomers] = useState([]);
    const [lensProducts, setLensProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [lensTypes, setLensTypes] = useState([]);
    const [dias, setDias] = useState([]);
    const [fittings, setFittings] = useState([]);
    const [coatings, setCoatings] = useState([]);
    const [materials, setMaterials] = useState([]);
    const [tintings, setTintings] = useState([]);
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
                materialsRes,
                tintingsRes,
                usersRes,
            ] = await Promise.all([
                getCustomersDropdown(),
                getLensProductsDropdown(),
                getLensCategoriesDropdown(),
                getLensTypesDropdown(),
                getLensDiaDropdown(),
                getLensFittingsDropdown(),
                getLensCoatingsDropdown(),
                getLensMaterialsDropdown(),
                getLensTintingsDropdown(),
                getUsersDropdown(),
            ]);


            if (customersRes.success) setCustomers(customersRes.data || []);
            if (lensProductsRes.success) setLensProducts(lensProductsRes.data || []);
            if (categoriesRes.success) setCategories(categoriesRes.data || []);
            if (lensTypesRes.success) setLensTypes(lensTypesRes.data || []);
            if (diasRes.success) setDias(diasRes.data || []);
            if (fittingsRes.success) setFittings(fittingsRes.data || []);
            if (coatingsRes.success) setCoatings(coatingsRes.data || []);
            if (materialsRes.success) setMaterials(materialsRes.data || []);
            if (tintingsRes.success) setTintings(tintingsRes.data || []);
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
                    document.title = `${order.orderNo} - View Sale Order`
                    console.log("Field Order", order);
                    
                    // Reconstruct price breakdown from saved data
                    if (order.lensPrice || order.fittingPrice || order.tintingPrice) {
                        const reconstructedBreakdown = {
                            lensPrice: order.lensPrice || 0,
                            rightEyeExtra: order.rightEyeExtra || 0,
                            leftEyeExtra: order.leftEyeExtra || 0,
                            fittingPrice: order.fittingPrice || 0,
                            tintingPrice: order.tintingPrice || 0,
                            coatingPrice: order.lensPrice || 0, // Coating price stored in lensPrice
                            extraCharges: {
                                rightSphere: 0,
                                leftSphere: 0,
                                rightCylinder: 0,
                                leftCylinder: 0,
                                total: (order.rightEyeExtra || 0) + (order.leftEyeExtra || 0)
                            },
                            baseLensPrice: (order.lensPrice || 0) + (order.rightEyeExtra || 0) + (order.leftEyeExtra || 0) + (order.fittingPrice || 0) + (order.tintingPrice || 0),
                            additionalPriceTotal: order.additionalPrice?.reduce((acc, curr) => acc + (parseFloat(curr.value) || 0), 0) || 0,
                            subtotal: 0,
                            freeLensDeduction: order.freeLens ? (order.lensPrice || 0) : 0,
                            freeFittingDeduction: order.freeFitting ? (order.fittingPrice || 0) : 0,
                            discountPercentage: order.discount || 0,
                            discountAmount: 0,
                            finalTotal: 0
                        };
                        
                        // Calculate subtotal
                        reconstructedBreakdown.subtotal = reconstructedBreakdown.baseLensPrice + reconstructedBreakdown.additionalPriceTotal;
                        
                        // Calculate discount
                        const subtotalAfterFreeItems = reconstructedBreakdown.subtotal - reconstructedBreakdown.freeLensDeduction - reconstructedBreakdown.freeFittingDeduction;
                        reconstructedBreakdown.discountAmount = (subtotalAfterFreeItems * reconstructedBreakdown.discountPercentage) / 100;
                        
                        // Calculate final total
                        reconstructedBreakdown.finalTotal = subtotalAfterFreeItems - reconstructedBreakdown.discountAmount;
                        
                        setPriceBreakdown(reconstructedBreakdown);
                    }
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
        else {
            document.title = "Add Sale Order";
        }
    };

    const validateForm = () => {
        const newErrors = {};

        // Block 1: Order Information - Required Fields
        if (!formData.customerId) {
            newErrors.customerId = "Customer is required";
        }
        if (!formData.orderDate) {
            newErrors.orderDate = "Order date is required";
        }
        if (!formData.status) {
            newErrors.status = "Status is required";
        }

        // Delivery schedule validation (should be after order date if provided)
        if (formData.deliverySchedule && formData.orderDate) {
            const orderDate = new Date(formData.orderDate);
            const deliveryDate = new Date(formData.deliverySchedule);
            if (deliveryDate < orderDate) {
                newErrors.deliverySchedule = "Delivery date cannot be before order date";
            }
        }

        // Block 2: Lens Information - All fields required
        if (!formData.Type_id) {
            newErrors.Type_id = "Type is required";
        }
        if (!formData.category_id) {
            newErrors.category_id = "Category is required";
        }
        if (!formData.lens_id) {
            newErrors.lens_id = "Lens name is required";
        }
        // Dia is optional - removed required validation
        if (!formData.fitting_id && !formData.freeFitting) {
            newErrors.fitting_id = "Fitting type is required (or check Free Fitting)";
        }
        if (!formData.material_id) {
            newErrors.material_id = "Material is required";
        }
        if (!formData.tinting_id) {
            newErrors.tinting_id = "Tinting is required";
        }
        if (!formData.coating_id) {
            newErrors.coating_id = "Coating is required";
        }

        // Block 3: Eye Specifications - At least one eye must be selected
        if (!formData.rightEye && !formData.leftEye) {
            newErrors.eyeSelection = "At least one eye must be selected";
        }

        // Validate right eye specs if selected
        if (formData.rightEye) {
            // Required fields for right eye
            if (!formData.rightSpherical || formData.rightSpherical === "") {
                newErrors.rightSpherical = "Spherical is required";
            }
            if (!formData.rightCylindrical || formData.rightCylindrical === "") {
                newErrors.rightCylindrical = "Cylindrical is required";
            }
            // Axis is optional - removed required validation
            // Add is optional - removed required validation

            // Range validations for right eye
            if (formData.rightSpherical && formData.rightSpherical !== "") {
                const val = parseFloat(formData.rightSpherical);
                if (isNaN(val)) {
                    newErrors.rightSpherical = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.spherical.min || val > eyeSpecRanges.spherical.max) {
                //     newErrors.rightSpherical = `Range: ${eyeSpecRanges.spherical.min} to ${eyeSpecRanges.spherical.max}`;
                // }
            }

            if (formData.rightCylindrical && formData.rightCylindrical !== "") {
                const val = parseFloat(formData.rightCylindrical);
                if (isNaN(val)) {
                    newErrors.rightCylindrical = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.cylindrical.min || val > eyeSpecRanges.cylindrical.max) {
                //     newErrors.rightCylindrical = `Range: ${eyeSpecRanges.cylindrical.min} to ${eyeSpecRanges.cylindrical.max}`;
                // }
            }

            if (formData.rightAxis && formData.rightAxis !== "") {
                const val = parseFloat(formData.rightAxis);
                if (isNaN(val)) {
                    newErrors.rightAxis = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.axis.min || val > eyeSpecRanges.axis.max) {
                //     newErrors.rightAxis = `Range: ${eyeSpecRanges.axis.min} to ${eyeSpecRanges.axis.max}`;
                // }
            }

            if (formData.rightAdd && formData.rightAdd !== "") {
                const val = parseFloat(formData.rightAdd);
                if (isNaN(val)) {
                    newErrors.rightAdd = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.add.min || val > eyeSpecRanges.add.max) {
                //     newErrors.rightAdd = `Range: ${eyeSpecRanges.add.min} to ${eyeSpecRanges.add.max}`;
                // }
            }
        }

        // Validate left eye specs if selected
        if (formData.leftEye) {
            // Required fields for left eye
            if (!formData.leftSpherical || formData.leftSpherical === "") {
                newErrors.leftSpherical = "Spherical is required";
            }
            if (!formData.leftCylindrical || formData.leftCylindrical === "") {
                newErrors.leftCylindrical = "Cylindrical is required";
            }
            // Axis is optional - removed required validation
            // Add is optional - removed required validation

            // Range validations for left eye
            if (formData.leftSpherical && formData.leftSpherical !== "") {
                const val = parseFloat(formData.leftSpherical);
                if (isNaN(val)) {
                    newErrors.leftSpherical = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.spherical.min || val > eyeSpecRanges.spherical.max) {
                //     newErrors.leftSpherical = `Range: ${eyeSpecRanges.spherical.min} to ${eyeSpecRanges.spherical.max}`;
                // }
            }

            if (formData.leftCylindrical && formData.leftCylindrical !== "") {
                const val = parseFloat(formData.leftCylindrical);
                if (isNaN(val)) {
                    newErrors.leftCylindrical = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.cylindrical.min || val > eyeSpecRanges.cylindrical.max) {
                //     newErrors.leftCylindrical = `Range: ${eyeSpecRanges.cylindrical.min} to ${eyeSpecRanges.cylindrical.max}`;
                // }
            }

            if (formData.leftAxis && formData.leftAxis !== "") {
                const val = parseFloat(formData.leftAxis);
                if (isNaN(val)) {
                    newErrors.leftAxis = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.axis.min || val > eyeSpecRanges.axis.max) {
                //     newErrors.leftAxis = `Range: ${eyeSpecRanges.axis.min} to ${eyeSpecRanges.axis.max}`;
                // }
            }

            if (formData.leftAdd && formData.leftAdd !== "") {
                const val = parseFloat(formData.leftAdd);
                if (isNaN(val)) {
                    newErrors.leftAdd = "Must be a valid number";
                } 
                // else if (val < eyeSpecRanges.add.min || val > eyeSpecRanges.add.max) {
                //     newErrors.leftAdd = `Range: ${eyeSpecRanges.add.min} to ${eyeSpecRanges.add.max}`;
                // }
            }
        }

        // Block 4: Dispatch Information (conditional - only when status is READY_FOR_DISPATCH)
        if (formData.status === "READY_FOR_DISPATCH") {
            if (!formData.dispatchStatus || formData.dispatchStatus === "") {
                newErrors.dispatchStatus = "Dispatch status is required";
            }
            if (!formData.estimatedDate) {
                newErrors.estimatedDate = "Estimated dispatch date is required";
            }
            // Estimated date should not be in the past
            if (formData.estimatedDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const estDate = new Date(formData.estimatedDate);
                if (estDate < today) {
                    newErrors.estimatedDate = "Estimated date cannot be in the past";
                }
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const checkCustomerCreditLimit = (customerId) => {
        checkCreditLimit(customerId).then(({ outstanding_credit, credit_limit }) => {
            if (outstanding_credit === null || outstanding_credit === undefined || outstanding_credit === 0) {
                toast({
                    title: "No Outstanding Credit",
                    description: "Customer has no outstanding credit.",
                    variant: "info",
                });
                setCustomerCreditLimit({ outstanding_credit: 0, credit_limit: null });
                setIsEditing(false);
            } else {
                setCustomerCreditLimit({ outstanding_credit, credit_limit });
            }

        });
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

            // Initialize price breakdown
            const breakdown = {
                // Left section - individual prices (shown in form fields)
                lensPrice: 0,           // Coating price (half if one eye, full if both)
                rightEyeExtra: 0,       // Right eye extra charges
                leftEyeExtra: 0,        // Left eye extra charges
                fittingPrice: 0,        // Full fitting price
                tintingPrice: 0,        // Full tinting price
                
                // Right section - breakdown for display
                baseLensPrice: 0,       // Total: Coating + Extra + Fitting + Tinting
                coatingPrice: 0,        // Full coating price (for both eyes)
                extraCharges: {
                    rightSphere: 0,
                    leftSphere: 0,
                    rightCylinder: 0,
                    leftCylinder: 0,
                    total: 0
                },
                additionalPriceTotal: 0,
                subtotal: 0,
                freeLensDeduction: 0,
                freeFittingDeduction: 0,
                discountPercentage: 0,
                discountAmount: 0,
                finalTotal: 0
            };

            // Step 1: Get lens product details (for ranges and extra charges)
            const lensProductResponse = await getLensProductById(formData.lens_id);
            if (!lensProductResponse.success || !lensProductResponse.data) {
                toast({
                    title: "Error",
                    description: "Failed to fetch lens product details",
                    variant: "destructive",
                });
                return;
            }
            const lensProduct = lensProductResponse.data;

            // Step 2: Get coating price from LensPriceMaster
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
            const fullCoatingPrice = lensPriceResponse.data.price || 0;

            // Calculate number of eyes selected
            const eyesCount = (formData.rightEye ? 1 : 0) + (formData.leftEye ? 1 : 0);

            // LEFT SECTION: Lens Price (half if one eye, full if both eyes)
            breakdown.lensPrice = eyesCount === 1 ? fullCoatingPrice / 2 : fullCoatingPrice;

            // Step 3: Calculate extra charges for out-of-range sphere/cylinder
            // Right Eye - Sphere
            if (formData.rightEye && formData.rightSpherical) {
                const rightSphere = parseFloat(formData.rightSpherical) || 0;
                if ((lensProduct.sphere_max && rightSphere > lensProduct.sphere_max) ||
                    (lensProduct.sphere_min && rightSphere < lensProduct.sphere_min)) {
                    breakdown.extraCharges.rightSphere = (lensProduct.sphere_extra_charge || 0) / 2;
                }
            }

            // Left Eye - Sphere
            if (formData.leftEye && formData.leftSpherical) {
                const leftSphere = parseFloat(formData.leftSpherical) || 0;
                if ((lensProduct.sphere_max && leftSphere > lensProduct.sphere_max) ||
                    (lensProduct.sphere_min && leftSphere < lensProduct.sphere_min)) {
                    breakdown.extraCharges.leftSphere = (lensProduct.sphere_extra_charge || 0) / 2;
                }
            }

            // Right Eye - Cylinder
            if (formData.rightEye && formData.rightCylindrical) {
                const rightCyl = parseFloat(formData.rightCylindrical) || 0;
                if ((lensProduct.cyl_max && rightCyl > lensProduct.cyl_max) ||
                    (lensProduct.cyl_min && rightCyl < lensProduct.cyl_min)) {
                    breakdown.extraCharges.rightCylinder = (lensProduct.cylinder_extra_charge || 0) / 2;
                }
            }

            // Left Eye - Cylinder
            if (formData.leftEye && formData.leftCylindrical) {
                const leftCyl = parseFloat(formData.leftCylindrical) || 0;
                if ((lensProduct.cyl_max && leftCyl > lensProduct.cyl_max) ||
                    (lensProduct.cyl_min && leftCyl < lensProduct.cyl_min)) {
                    breakdown.extraCharges.leftCylinder = (lensProduct.cylinder_extra_charge || 0) / 2;
                }
            }

            breakdown.extraCharges.total = 
                breakdown.extraCharges.rightSphere + 
                breakdown.extraCharges.leftSphere + 
                breakdown.extraCharges.rightCylinder + 
                breakdown.extraCharges.leftCylinder;

            // LEFT SECTION: Split extra charges by eye
            breakdown.rightEyeExtra = breakdown.extraCharges.rightSphere + breakdown.extraCharges.rightCylinder;
            breakdown.leftEyeExtra = breakdown.extraCharges.leftSphere + breakdown.extraCharges.leftCylinder;

            // Step 4: Get tinting price (full price)
            if (formData.tinting_id) {
                try {
                    const tintingResponse = await getTintingById(formData.tinting_id);
                    if (tintingResponse.success && tintingResponse.data) {
                        breakdown.tintingPrice = parseFloat(tintingResponse.data.tinting_price) || 0;
                    }
                } catch (error) {
                    console.error("Error fetching tinting price:", error);
                }
            }

            // Step 5: Get fitting price (full price)
            if (formData.fitting_id) {
                try {
                    const fittingResponse = await getFittingById(formData.fitting_id);
                    if (fittingResponse.success && fittingResponse.data) {
                        breakdown.fittingPrice = parseFloat(fittingResponse.data.fitting_price) || 0;
                    }
                } catch (error) {
                    console.error("Error fetching fitting price:", error);
                }
            }

            // RIGHT SECTION: Base Lens Price = Coating + Extra + Fitting + Tinting
            breakdown.baseLensPrice = 
                breakdown.lensPrice + 
                breakdown.extraCharges.total + 
                breakdown.fittingPrice + 
                breakdown.tintingPrice;

            // RIGHT SECTION: Additional Price Total
            breakdown.additionalPriceTotal = formData.additionalPrice?.reduce(
                (acc, curr) => acc + (parseFloat(curr.value) || 0), 
                0
            ) || 0;

            // RIGHT SECTION: Subtotal = Base Lens Price + Additional Price
            breakdown.subtotal = breakdown.baseLensPrice + breakdown.additionalPriceTotal;

            // RIGHT SECTION: Free Lens Deduction (reduce coating price)
            if (formData.freeLens) {
                breakdown.freeLensDeduction = breakdown.lensPrice;
            }

            // RIGHT SECTION: Free Fitting Deduction
            if (formData.freeFitting && formData.fitting_id) {
                breakdown.freeFittingDeduction = breakdown.fittingPrice;
            }

            // Step 6: Get discount percentage from customer business category
            try {
                const costingResponse = await calculateProductCost({
                    customer_id: formData.customerId,
                    lensPrice_id: lensPriceResponse.data.id,
                    fitting_id: formData.fitting_id,
                    quantity: 1,
                });
                if (costingResponse.success && costingResponse.data) {
                    breakdown.discountPercentage = costingResponse.data.pricing.discountRate || 0;
                }
            } catch (error) {
                console.error("Error fetching discount:", error);
            }

            // RIGHT SECTION: Calculate discount on (Subtotal - Free Lens - Free Fitting)
            const subtotalAfterFreeItems = breakdown.subtotal - breakdown.freeLensDeduction - breakdown.freeFittingDeduction;
            breakdown.discountAmount = (subtotalAfterFreeItems * breakdown.discountPercentage) / 100;

            // RIGHT SECTION: Final Total
            breakdown.finalTotal = subtotalAfterFreeItems - breakdown.discountAmount;

            // Update form data with left section values
            setFormData((prev) => ({
                ...prev,
                lensPrice: breakdown.lensPrice,
                rightEyeExtra: breakdown.rightEyeExtra,
                leftEyeExtra: breakdown.leftEyeExtra,
                fittingPrice: breakdown.fittingPrice,
                tintingPrice: breakdown.tintingPrice,
                discount: breakdown.discountPercentage,
            }));

            // Store price breakdown for display
            setPriceBreakdown(breakdown);

            console.log("Price Breakdown:", breakdown);

            // toast({
            //     title: "Price Calculated",
            //     description: `Final Total: ₹${breakdown.finalTotal.toFixed(2)} (Discount: ${breakdown.discountPercentage}%)`,
            //     success: true,
            // });

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
        
        // Wait for price calculation to complete before validating and saving
        await handleCalculatePrice();
        
        if (!validateForm()) {
            console.log("Form Data on errors:", errors);
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
                    handleCancel();
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
                    // handleCancel();

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

        document.title = isEditing ? `${formData.orderNo} - View Sale Order` : `${formData.orderNo} - Edit Sale Order`;
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
                setFormData((prev) => ({ ...prev, status: statusAction.nextStatus }));
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

    const handleAdditionalPriceChange = (index, field, value) => {
        const updatedPrices = [...formData.additionalPrice];
        updatedPrices[index] = {
            ...updatedPrices[index],
            [field]: value
        };

        setFormData((prev) => ({ ...prev, additionalPrice: updatedPrices }));
    };

    const statusActionButton = mode === "view" ? getStatusActionButton() : null;

    if (isLoading) {
        return (
            <div className="flex flex-col h-full p-2 md:p-3 gap-3 w-full">
                <Card className="flex w-full h-full">
                    <CardContent className="p-8 flex items-center justify-center w-full">
                        <div className="flex flex-col items-center justify-center gap-3">
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
        <div className="flex flex-col h-full p-2 md:p-3 gap-3 w-full">
            {/* Header */}
            <div className="flex items-center justify-between ">
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

                <div className="flex max-sm:flex-col items-center gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        className="h-8 gap-1.5"
                        onClick={handleCancel}
                        disabled={isSaving}
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Close
                    </Button>

                    {mode === "view" && !isEditing && statusActionButton && (
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
                    {(mode === "add" || isEditing) && (
                        <>
                            <Button
                                type="submit"
                                size="xs"
                                className="h-8 gap-1.5"
                                onClick={handleSubmit}
                                // disabled={isSaving}
                                disabled={true}
                            >
                                {isSaving ? (
                                    <>
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-3.5 w-3.5" />
                                        Create & Rise Po
                                    </>
                                )}
                            </Button>
                            <Button
                                type="submit"
                                size="xs"
                                className="h-8 gap-1.5"
                                onClick={handleSubmit}
                                // disabled={isSaving}
                                disabled={true}
                            >
                                {isSaving ? (
                                    <>
                                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-3.5 w-3.5" />
                                        Create & Print
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 h-full md:overflow-hidden">
                {/* Block 1: Order Information */}
                <Card className=" md:w-[35%] flex flex-col md:h-full md:overflow-y-auto md:overflow-x-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">

                        <FormSelect
                            singleLine={true} label="Customer"
                            name="customerId"
                            options={customers}
                            value={formData.customerId}
                            onChange={(value) => {
                                handleSelectChange("customerId", value)
                                checkCustomerCreditLimit(value);
                            }}
                            placeholder="Select customer"
                            isSearchable={true}

                            disabled={mode !== "add" && !isEditing}
                            required
                            error={errors.customerId}
                            helperText={customerCreditLimit.credit_limit !== null ? `Credit Limit: ₹${customerCreditLimit.credit_limit} ---> Outstanding: ₹${customerCreditLimit.outstanding_credit}` : ""}
                        />

                        <FormInput
                            singleLine={true} label="Order Date"
                            type="date"
                            name="orderDate"
                            value={new Date(formData.orderDate).toISOString().split("T")[0]}
                            onChange={handleChange}
                            disabled={!isEditing}
                            required
                            error={errors.orderDate}
                        />


                        <FormInput
                            singleLine={true} label="Delivery Schedule"
                            type="datetime-local"
                            name="deliverySchedule"
                            value={formData.deliverySchedule ? new Date(formData.deliverySchedule).toISOString().slice(0, 16) : ""}
                            onChange={handleChange}
                            disabled={!isEditing}
                        />
                        <FormSelect
                            singleLine={true} label="Status"
                            name="status"
                            options={orderStatusOptions.map((opt) => ({
                                id: opt.value,
                                name: opt.label,
                            }))}
                            value={formData.status}
                            onChange={(value) => handleSelectChange("status", value)}
                            placeholder="Select status"
                            isSearchable={false}
                            disabled={!(mode === "view" && isEditing)}
                            required
                            error={errors.status}
                        />
                        <Checkbox
                            label="Urgent Order"
                            id="urgentOrder"
                            name="urgentOrder"
                            checked={formData.urgentOrder}
                            onCheckedChange={(checked) =>
                                handleSelectChange("urgentOrder", checked)
                            }
                            disabled={!isEditing}
                        />
                        <FormTextarea
                            singleLine={true} label="Remarks"
                            name="remark"
                            value={formData.remark}
                            onChange={handleChange}
                            disabled={!isEditing}
                            rows={3}
                            placeholder="Enter any additional remarks"
                        />
                        <FormInput
                            singleLine={true} label="Customer Ref No"
                            name="customerRefNo"
                            value={formData.customerRefNo}
                            onChange={handleChange}
                            disabled={!isEditing}
                            placeholder="Optional customer reference"
                        />
                        <FormInput
                            singleLine={true} label="Item Ref No"
                            name="itemRefNo"
                            value={formData.itemRefNo}
                            onChange={handleChange}
                            disabled={!isEditing}
                            placeholder="Optional item reference"
                        />
                        <div className="flex mt-6 ">

                            <Checkbox
                                label="Free Lens"
                                id="freeLens"
                                name="freeLens"
                                checked={formData.freeLens}
                                onCheckedChange={(checked) =>
                                    handleSelectChange("freeLens", checked)
                                }
                                disabled={!isEditing}
                            />
                            <Checkbox
                                label="Free Fitting"
                                id="freeFitting"
                                name="freeFitting"
                                checked={formData.freeFitting}
                                onCheckedChange={(checked) =>
                                    handleSelectChange("freeFitting", checked)
                                }
                                disabled={!isEditing}
                            />

                        </div>
                        {errors.eyeSelection && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertDescription>{errors.eyeSelection}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Block 2, 3, 4: Tabbed View */}
                <div className="flex flex-col gap-3 md:w-[65%] md:h-full md:overflow-auto pb-3">


                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Lens Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            {/* Row 1 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormSelect
                                    singleLine={true} label="Type"
                                    name="Type_id"
                                    options={lensTypes}
                                    value={formData.Type_id}
                                    onChange={(value) => handleSelectChange("Type_id", value)}
                                    placeholder="Select type"
                                    isSearchable={false}
                                    disabled={!isEditing}
                                    required
                                    error={errors.Type_id}
                                />
                                <FormSelect
                                    singleLine={true} label="Category"
                                    name="category_id"
                                    options={categories}
                                    value={formData.category_id}
                                    onChange={(value) => handleSelectChange("category_id", value)}
                                    placeholder="Select "
                                    isSearchable={false}
                                    disabled={!isEditing}
                                    required
                                    error={errors.category_id}
                                />
                                <FormSelect
                                    singleLine={true} label="Lens Name"
                                    name="lens_id"
                                    options={lensProducts}
                                    value={formData.lens_id}
                                    onChange={(value) => handleSelectChange("lens_id", value)}
                                    placeholder="Select lens"
                                    isSearchable={true}
                                    disabled={!isEditing}
                                    required
                                    error={errors.lens_id}
                                />



                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                                <FormSelect
                                    singleLine={true} label="Dia"
                                    name="dia_id"
                                    options={dias}
                                    value={formData.dia_id}
                                    onChange={(value) => handleSelectChange("dia_id", value)}
                                    placeholder="Select dia"
                                    isSearchable={false}
                                    disabled={!isEditing}
                                    required
                                    error={errors.dia_id}
                                />
                                <FormSelect
                                    singleLine={true} label="Fitting Type"
                                    name="fitting_id"
                                    options={fittings}
                                    value={formData.fitting_id}
                                    onChange={(value) => handleSelectChange("fitting_id", value)}
                                    placeholder="Select fitting"
                                    isSearchable={false}
                                    disabled={!isEditing}
                                    required
                                    error={errors.fitting_id}
                                />
                                <FormSelect
                                    singleLine={true} label="Material"
                                    name="material_id"
                                    options={materials}
                                    value={formData.material_id}
                                    onChange={(value) => handleSelectChange("material_id", value)}
                                    placeholder="Material"
                                    isSearchable={false}
                                    disabled={!isEditing}
                                    required
                                    error={errors.material_id}
                                />
                                <FormSelect
                                    singleLine={true} label="Tinting Name"
                                    name="tinting_id"
                                    options={tintings}
                                    value={formData.tinting_id}
                                    onChange={(value) => handleSelectChange("tinting_id", value)}
                                    placeholder="Select tinting"
                                    isSearchable={false}
                                    disabled={!isEditing}
                                    required
                                    error={errors.tinting_id}
                                />
                                <div className="md:col-span-2">
                                    <FormSelect
                                        singleLine={true} label="Coating Name"
                                        name="coating_id"
                                        options={coatings}
                                        value={formData.coating_id}
                                        onChange={(value) => handleSelectChange("coating_id", value)}
                                        placeholder="Select coating"
                                        isSearchable={true}
                                        disabled={!isEditing}
                                        required
                                        error={errors.coating_id}
                                    />
                                </div>
                            </div>

                        </CardContent>
                    </Card>

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
                                        disabled={!isEditing}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput
                                            singleLine={true} label="Spherical"
                                            type="number"
                                            step="0.25"
                                            name="rightSpherical"
                                            value={formData.rightSpherical}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.rightEye}
                                            error={errors.rightSpherical}
                                        />
                                        <FormInput
                                            singleLine={true} label="Cylindrical"
                                            type="number"
                                            step="0.25"
                                            name="rightCylindrical"
                                            value={formData.rightCylindrical}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.rightEye}
                                            error={errors.rightCylindrical}
                                        />
                                        {formData.rightCylindrical && formData.rightCylindrical != 0 && < FormInput
                                            singleLine={true} label="Axis"
                                            type="number"
                                            name="rightAxis"
                                            value={formData.rightAxis}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.rightEye}
                                            error={errors.rightAxis}
                                        />}
                                        <FormInput
                                            singleLine={true} label="Add"
                                            type="number"
                                            step="0.25"
                                            name="rightAdd"
                                            value={formData.rightAdd}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.rightEye}
                                            error={errors.rightAdd}
                                        />
                                        <FormInput
                                            singleLine={true} label="Dia"
                                            name="rightDia"
                                            value={formData.rightDia}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.rightEye}
                                        />
                                        {/* Base and bled fields removed */}
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
                                        disabled={!isEditing}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput
                                            singleLine={true} label="Spherical"
                                            type="number"
                                            step="0.25"
                                            name="leftSpherical"
                                            value={formData.leftSpherical}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.leftEye}
                                            error={errors.leftSpherical}
                                        />
                                        <FormInput
                                            singleLine={true} label="Cylindrical"
                                            type="number"
                                            step="0.25"
                                            name="leftCylindrical"
                                            value={formData.leftCylindrical}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.leftEye}
                                            error={errors.leftCylindrical}
                                        />
                                        {formData.leftCylindrical && formData.leftCylindrical != 0 && <FormInput
                                            singleLine={true} label="Axis"
                                            type="number"
                                            name="leftAxis"
                                            value={formData.leftAxis}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.leftEye}
                                            error={errors.leftAxis}
                                        />}
                                        <FormInput
                                            singleLine={true} label="Add"
                                            type="number"
                                            step="0.25"
                                            name="leftAdd"
                                            value={formData.leftAdd}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.leftEye}
                                            error={errors.leftAdd}
                                        />
                                        <FormInput
                                            singleLine={true} label="Dia"
                                            name="leftDia"
                                            value={formData.leftDia}
                                            onChange={handleChange}
                                            disabled={!isEditing || !formData.leftEye}
                                        />
                                        {/* Base and bled fields removed */}
                                    </div>
                                </div>


                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="items-center justify-between"    >
                            <CardTitle className="text-base">Pricing Information</CardTitle>
                            {isEditing && <Button
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
                            </Button>}
                        </CardHeader>
                        <CardContent>
                            {/* Row 5 - Calculate Price Button and Price Display */}

                            <div className="flex md:flex-row flex-col gap-4">
                                <div className="flex flex-col gap-2 mr-4 w-full">
                                    {formData.lensPrice > 0 && (
                                        <FormInput
                                            singleLine={true}
                                            label="Lens Price"
                                            type="number"
                                            name="lensPrice"
                                            value={formData.lensPrice}
                                            onChange={handleChange}
                                            disabled={true}
                                        />
                                    )}
                                    {formData.rightEyeExtra > 0 && (
                                        <FormInput
                                            singleLine={true}
                                            label="Right Eye Extra"
                                            type="number"
                                            name="rightEyeExtra"
                                            value={formData.rightEyeExtra}
                                            onChange={handleChange}
                                            disabled={true}
                                        />
                                    )}
                                    {formData.leftEyeExtra > 0 && (
                                        <FormInput
                                            singleLine={true}
                                            label="Left Eye Extra"
                                            type="number"
                                            name="leftEyeExtra"
                                            value={formData.leftEyeExtra}
                                            onChange={handleChange}
                                            disabled={true}
                                        />
                                    )}
                                    {formData.fittingPrice > 0 && (
                                        <FormInput
                                            singleLine={true}
                                            label="Fitting Price"
                                            type="number"
                                            name="fittingPrice"
                                            value={formData.fittingPrice}
                                            onChange={handleChange}
                                            disabled={true}
                                        />
                                    )}
                                    {formData.tintingPrice > 0 && (
                                        <FormInput
                                            singleLine={true}
                                            label="Tinting Price"
                                            type="number"
                                            name="tintingPrice"
                                            value={formData.tintingPrice}
                                            onChange={handleChange}
                                            disabled={true}
                                        />
                                    )}

                                    {formData.additionalPrice &&
                                        formData.additionalPrice.length > 0 ? (
                                        formData.additionalPrice.map((priceObj, index) => (
                                            isEditing ? (
                                                <div key={index} className="flex gap-1">
                                                    <FormInput
                                                        singleLine={true}
                                                        type="text"
                                                        name="name"
                                                        value={priceObj.name}
                                                        onChange={(e) => handleAdditionalPriceChange(index, "name", e.target.value)}
                                                        placeholder="Additional Price"
                                                    />
                                                    <FormInput
                                                        singleLine={true}
                                                        type="number"
                                                        name="value"
                                                        value={priceObj.value}
                                                        onChange={(e) => handleAdditionalPriceChange(index, "value", e.target.value)}
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="gap-1.5 text-destructive hover:text-destructive"
                                                        onClick={() => {
                                                            setFormData((prev) => {
                                                                const updatedPrices = [...(prev.additionalPrice || [])];
                                                                updatedPrices.splice(index, 1);
                                                                return {
                                                                    ...prev,
                                                                    additionalPrice: updatedPrices,
                                                                };
                                                            });
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>

                                            ) :
                                                <FormInput
                                                    singleLine={true}
                                                    label={priceObj.name}
                                                    type="number"
                                                    name="fittingPrice"
                                                    value={priceObj.value}
                                                    disabled={true}
                                                />
                                        ))
                                    ) : (
                                        <div>No additional prices added.</div>
                                    )}
                                    {isEditing && <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="gap-1.5"
                                        onClick={() => {
                                            setFormData((prev) => ({
                                                ...prev,
                                                additionalPrice: [
                                                    ...((prev.additionalPrice) || []),
                                                    { name: "", value: 0 },
                                                ],
                                            }))
                                        }}

                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Additional Price
                                    </Button>}
                                </div>
                                <div className="flex flex-col gap-2 w-full">
                                    <Card className="bg-gray-50">
                                        <CardContent className="flex flex-col p-2 gap-3">
                                            {priceBreakdown ? (
                                                <>
                                                    {/* Base Lens Price - No breakdown */}
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span>Base Lens Price:</span>
                                                        <span>₹{priceBreakdown.baseLensPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>

                                                    {priceBreakdown.additionalPriceTotal > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span>Additional Price:</span>
                                                            <span>₹{priceBreakdown.additionalPriceTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    <Separator />
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span>Subtotal:</span>
                                                        <span>₹{priceBreakdown.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>

                                                    {priceBreakdown.freeLensDeduction > 0 && (
                                                        <div className="flex justify-between text-sm text-red-600">
                                                            <span>Free Lens (Coating)</span>
                                                            <span>-₹{priceBreakdown.freeLensDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    {priceBreakdown.freeFittingDeduction > 0 && (
                                                        <div className="flex justify-between text-sm text-red-600">
                                                            <span>Free Fitting</span>
                                                            <span>-₹{priceBreakdown.freeFittingDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    {priceBreakdown.discountPercentage > 0 && (
                                                        <div className="flex justify-between text-sm text-red-600">
                                                            <span>Discount ({priceBreakdown.discountPercentage}%)</span>
                                                            <span>-₹{priceBreakdown.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    <Separator />
                                                    <div className="flex justify-between font-semibold text-base">
                                                        <span>Total Amount:</span>
                                                        <span className="text-green-600">₹{priceBreakdown.finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Fallback to old calculation if no breakdown */}
                                                    <div className="flex justify-between text-sm">
                                                        <span>Subtotal:</span>
                                                        <span>₹{((formData.lensPrice || 0) + (formData.lensPrice || 0) + (formData.additionalPrice?.reduce((acc, curr) => Number(acc) + (Number(curr.value) || 0), 0) || 0) + (formData.fittingPrice || 0) + (formData.tintingPrice || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    {formData.freeLens && <div className="flex justify-between text-sm text-red-600">
                                                        <span>Free Lens:</span>
                                                        <span>-₹{(((formData.freeLens && formData.lensPrice || 0))).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>}
                                                    {formData.freeFitting && <div className="flex justify-between text-sm text-red-600">
                                                        <span>Free Fitting:</span>
                                                        <span>-₹{((formData.freeFitting && formData.fittingPrice || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>}
                                                    <div className="flex justify-between text-sm text-red-600">
                                                        <span>Discount ({formData.discount}%):</span>
                                                        <span>-₹{(((!formData.freeLens && formData.lensPrice || 0) + (formData.lensPrice || 0) + (formData.additionalPrice?.reduce((acc, curr) => Number(acc) + (Number(curr.value) || 0), 0) || 0) + (!formData.freeFitting && formData.fittingPrice || 0) + (formData.tintingPrice || 0)) * (formData.discount || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <Separator />
                                                    <div className="flex justify-between font-semibold">
                                                        <span>Total Amount:</span>
                                                        <span className="text-green-600">₹{(((!formData.freeLens && formData.lensPrice || 0) + (formData.lensPrice || 0) + (formData.additionalPrice?.reduce((acc, curr) => Number(acc) + (Number(curr.value) || 0), 0) || 0) + (!formData.freeFitting && formData.fittingPrice || 0) + (formData.tintingPrice || 0)) * (1 - (formData.discount || 0) / 100)).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>

                                </div>
                            </div>

                        </CardContent>
                    </Card>


                </div>

            </div>

        </div >
    );
}
