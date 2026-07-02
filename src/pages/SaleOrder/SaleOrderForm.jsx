import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Calculator, Play, Package, Check, Plus, Delete, DeleteIcon, Trash2, Tag, Printer, ChevronDown, GitBranch, Receipt, Tag as LabelIcon, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getApplicableOffers } from "@/services/lensOffers";
import { apiClient } from "@/services/apiClient";
import { printBarcodeLabels, getPrinterConfigs, checkPrintServiceHealth } from "@/services/printerConfig";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { SaleOrderPrintModal } from "@/components/LensPrint/SaleOrderPrintModal";
import SaleOrderStatusBar from "@/components/sale-order/SaleOrderStatusBar";
import RaisePoModal from "@/components/sale-order/RaisePoModal";
import { RESET_ELIGIBLE } from "@/constants/saleOrderStatus";
import {
    createSaleOrder,
    getSaleOrderById,
    updateSaleOrder,
    checkCustomerRef,
    updateSaleOrderStatus,
    getMatchingInventoryFIFO,
    closeAndCreateSaleOrder,
    raisePoFromSo,
    confirmSoReset,
    cancelSaleOrder,
    getCustomersDropdown,
    getLensProductsDropdown,
    getLensProductsFiltered,
    getLensCategoriesDropdown,
    getLensTypesDropdown,
    getLensDiaDropdown,
    getLensFittingsDropdown,
    getLensCoatingsDropdown,
    getLensCoatingsByLensProduct,
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
    const [customerCreditLimit, setCustomerCreditLimit] = useState({ outstanding_credit: 0, credit_limit: null, reserved_amount: 0 });
    // Customer has reached/exceeded their credit limit -> lock the whole form read-only,
    // mirroring mode === "view", regardless of the route's actual add/edit mode.
    const isCreditBlocked = useMemo(() => {
        const { credit_limit, reserved_amount, outstanding_credit } = customerCreditLimit;
        if (!credit_limit || credit_limit <= 0) return false;
        return (reserved_amount || 0) + (outstanding_credit || 0) >= credit_limit;
    }, [customerCreditLimit]);

    // Collapse any in-progress add/edit state to read-only once the customer hits their limit.
    useEffect(() => {
        if (isCreditBlocked) {
            setIsEditing(false);
        } else if (mode === "add" || mode === "edit") {
            setIsEditing(true);
        }
    }, [isCreditBlocked]);
    const [priceBreakdown, setPriceBreakdown] = useState(null);
    // Holds the fetched price of the exchange coating (for EXCHANGE_COATING_PRICE offers)
    const [exchangeCoatingPrice, setExchangeCoatingPrice] = useState(null);
    const [exchangeBrandPrice, setExchangeBrandPrice] = useState(null);
    const [lensProductIndexName, setLensProductIndexName] = useState("");
    const [customerRefStatus, setCustomerRefStatus] = useState(null);
    const [isCheckingCustomerRef, setIsCheckingCustomerRef] = useState(false);

    // Print modal states
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const [printActionMode, setPrintActionMode] = useState(null); // "create-and-print" or "print-existing"

    // FIFO pick states
    const [isFifoModalOpen, setIsFifoModalOpen] = useState(false);
    const [fifoMatches, setFifoMatches] = useState({ rightEyeMatches: [], leftEyeMatches: [] });
    const [selectedFifoItems, setSelectedFifoItems] = useState({ rightEyeItemId: null, leftEyeItemId: null });

    // Dropdown open states for split buttons
    const [isAddDropdownOpen, setIsAddDropdownOpen] = useState(false);
    const [isViewDropdownOpen, setIsViewDropdownOpen] = useState(false);
    const [isRaisePoModalOpen, setIsRaisePoModalOpen] = useState(false);
    const [raisePoModalMode, setRaisePoModalMode] = useState("raise");
    const addDropdownRef = useRef(null);
    const viewDropdownRef = useRef(null);

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
    const [activeOffers, setActiveOffers] = useState([]);
    const [isLoadingLensProducts, setIsLoadingLensProducts] = useState(false);
    const [filteredCoatings, setFilteredCoatings] = useState([]);
    const [isLoadingCoatings, setIsLoadingCoatings] = useState(false);

    // Compute effective price breakdown: base breakdown + offer discount applied reactively
    const effectiveBreakdown = useMemo(() => {
        if (!priceBreakdown) return null;
        const selectedOffer = formData.offer_id
            ? activeOffers.find((o) => o.id === formData.offer_id) || null
            : null;
        if (!selectedOffer) {
            return { ...priceBreakdown, offerDiscount: 0, offerName: null, offerType: null };
        }
        const subtotalAfterFreeItems =
            priceBreakdown.subtotal -
            priceBreakdown.freeLensDeduction -
            priceBreakdown.freeFittingDeduction;
        // Lens price base for discount/offer calculations (discount applies to lens price only)
        const lensBaseForDiscount = priceBreakdown.freeLensDeduction > 0 ? 0 : priceBreakdown.lensPrice;
        if (selectedOffer.offerType === "PERCENTAGE") {
            // PERCENTAGE offer applies to lens price only
            const offerDiscount = (lensBaseForDiscount * (selectedOffer.discountPercentage || 0)) / 100;
            return {
                ...priceBreakdown,
                // PERCENTAGE offer replaces the category-based discount
                discountPercentage: 0,
                discountAmount: 0,
                offerDiscount,
                offerName: selectedOffer.offerName,
                offerType: "PERCENTAGE",
                offerPercentage: selectedOffer.discountPercentage,
                finalTotal: subtotalAfterFreeItems - offerDiscount,
            };
        } else if (selectedOffer.offerType === "VALUE") {
            const offerDiscount = selectedOffer.discountValue || 0;
            return {
                ...priceBreakdown,
                offerDiscount,
                offerName: selectedOffer.offerName,
                offerType: "VALUE",
                // VALUE offer is deducted on top of the lens-only category discount
                finalTotal: priceBreakdown.finalTotal - offerDiscount,
            };
        } else if (selectedOffer.offerType === "EXCHANGE_COATING_PRICE") {
            if (exchangeCoatingPrice === null) {
                return { ...priceBreakdown, offerDiscount: 0, offerName: selectedOffer.offerName, offerType: "EXCHANGE_COATING_PRICE" };
            }
            const eyesCount = (formData.rightEye ? 1 : 0) + (formData.leftEye ? 1 : 0);
            const newLensPrice = eyesCount === 1 ? exchangeCoatingPrice / 2 : exchangeCoatingPrice;
            const newBaseLensPrice =
                newLensPrice +
                priceBreakdown.extraCharges.total +
                priceBreakdown.fittingPrice +
                priceBreakdown.tintingPrice;
            const newSubtotal = newBaseLensPrice + priceBreakdown.additionalPriceTotal;
            const newFreeLensDeduction = formData.freeLens ? newLensPrice : 0;
            const newSubtotalAfterFree =
                newSubtotal - newFreeLensDeduction - priceBreakdown.freeFittingDeduction;
            const discountPct = selectedOffer.withDiscount ? priceBreakdown.discountPercentage : 0;
            const discountAmt = (newSubtotalAfterFree * discountPct) / 100;
            return {
                ...priceBreakdown,
                lensPrice: newLensPrice,
                coatingPrice: exchangeCoatingPrice,
                baseLensPrice: newBaseLensPrice,
                subtotal: newSubtotal,
                freeLensDeduction: newFreeLensDeduction,
                discountPercentage: discountPct,
                discountAmount: discountAmt,
                offerDiscount: 0,
                offerName: selectedOffer.offerName,
                offerType: "EXCHANGE_COATING_PRICE",
                exchangeCoatingName: selectedOffer.exchangeCoating?.name,
                exchangeLensName: selectedOffer.exchangeLensProduct?.lens_name,
                finalTotal: newSubtotalAfterFree - discountAmt,
            };
        } else if (selectedOffer.offerType === "EXCHANGE_PRODUCT") {
            if (exchangeCoatingPrice === null) {
                return { ...priceBreakdown, offerDiscount: 0, offerName: selectedOffer.offerName, offerType: "EXCHANGE_PRODUCT" };
            }
            const eyesCount = (formData.rightEye ? 1 : 0) + (formData.leftEye ? 1 : 0);
            const newLensPrice = eyesCount === 1 ? exchangeCoatingPrice / 2 : exchangeCoatingPrice;
            const newBaseLensPrice =
                newLensPrice +
                priceBreakdown.extraCharges.total +
                priceBreakdown.fittingPrice +
                priceBreakdown.tintingPrice;
            const newSubtotal = newBaseLensPrice + priceBreakdown.additionalPriceTotal;
            const newFreeLensDeduction = formData.freeLens ? newLensPrice : 0;
            const newSubtotalAfterFree =
                newSubtotal - newFreeLensDeduction - priceBreakdown.freeFittingDeduction;
            const discountAmt = (newSubtotalAfterFree * priceBreakdown.discountPercentage) / 100;
            return {
                ...priceBreakdown,
                lensPrice: newLensPrice,
                coatingPrice: exchangeCoatingPrice,
                baseLensPrice: newBaseLensPrice,
                subtotal: newSubtotal,
                freeLensDeduction: newFreeLensDeduction,
                discountAmount: discountAmt,
                offerDiscount: 0,
                offerName: selectedOffer.offerName,
                offerType: "EXCHANGE_PRODUCT",
                exchangeLensName: selectedOffer.exchangeLensProduct?.lens_name,
                finalTotal: newSubtotalAfterFree - discountAmt,
            };
        } else if (selectedOffer.offerType === "EXCHANGE_BRAND_PRICE") {
            if (exchangeBrandPrice === null) {
                return { ...priceBreakdown, offerDiscount: 0, offerName: selectedOffer.offerName, offerType: "EXCHANGE_BRAND_PRICE" };
            }
            const eyesCount = (formData.rightEye ? 1 : 0) + (formData.leftEye ? 1 : 0);
            const newLensPrice = eyesCount === 1 ? exchangeBrandPrice / 2 : exchangeBrandPrice;
            const newBaseLensPrice =
                newLensPrice +
                priceBreakdown.extraCharges.total +
                priceBreakdown.fittingPrice +
                priceBreakdown.tintingPrice;
            const newSubtotal = newBaseLensPrice + priceBreakdown.additionalPriceTotal;
            const newFreeLensDeduction = formData.freeLens ? newLensPrice : 0;
            const newSubtotalAfterFree =
                newSubtotal - newFreeLensDeduction - priceBreakdown.freeFittingDeduction;
            const discountAmt = (newSubtotalAfterFree * priceBreakdown.discountPercentage) / 100;
            return {
                ...priceBreakdown,
                lensPrice: newLensPrice,
                coatingPrice: exchangeBrandPrice,
                baseLensPrice: newBaseLensPrice,
                subtotal: newSubtotal,
                freeLensDeduction: newFreeLensDeduction,
                discountAmount: discountAmt,
                offerDiscount: 0,
                offerName: selectedOffer.offerName,
                offerType: "EXCHANGE_BRAND_PRICE",
                exchangeBrandName: selectedOffer.exchangeBrand?.name,
                finalTotal: newSubtotalAfterFree - discountAmt,
            };
        } else if (selectedOffer.offerType === "COATING_PROMOTION") {
            const coatingIds = (selectedOffer.coating_ids || []).map((id) => parseInt(id));
            if (!coatingIds.includes(parseInt(formData.coating_id))) {
                return { ...priceBreakdown, offerDiscount: 0, offerName: selectedOffer.offerName, offerType: "COATING_PROMOTION" };
            }
            if (selectedOffer.discountPercentage) {
                // COATING_PROMOTION percentage applies to lens price only
                const offerDiscount = (lensBaseForDiscount * selectedOffer.discountPercentage) / 100;
                return {
                    ...priceBreakdown,
                    discountPercentage: 0,
                    discountAmount: 0,
                    offerDiscount,
                    offerName: selectedOffer.offerName,
                    offerType: "COATING_PROMOTION",
                    offerPercentage: selectedOffer.discountPercentage,
                    finalTotal: subtotalAfterFreeItems - offerDiscount,
                };
            }
            const offerDiscount = selectedOffer.discountValue || 0;
            return {
                ...priceBreakdown,
                offerDiscount,
                offerName: selectedOffer.offerName,
                offerType: "COATING_PROMOTION",
                finalTotal: priceBreakdown.finalTotal - offerDiscount,
            };
        }
        return { ...priceBreakdown, offerDiscount: 0, offerName: null, offerType: null };
    }, [priceBreakdown, formData.offer_id, formData.coating_id, activeOffers, exchangeCoatingPrice, exchangeBrandPrice, formData.rightEye, formData.leftEye, formData.freeLens]);

    // Fetch master data for dropdowns
    useEffect(() => {
        fetchMasterData();

    }, []);

    // When an EXCHANGE_COATING_PRICE offer is selected, fetch the exchange coating's price (edit/add only)
    useEffect(() => {
        if (mode === "view") return; // Skip in view mode — saved prices are already correct
        const selectedOffer = formData.offer_id
            ? activeOffers.find((o) => o.id === formData.offer_id)
            : null;

        if (
            (selectedOffer?.offerType === "EXCHANGE_COATING_PRICE" || selectedOffer?.offerType === "EXCHANGE_PRODUCT") &&
            priceBreakdown
        ) {
            const targetLensId = selectedOffer.exchange_lens_id || formData.lens_id;
            const targetCoatingId = selectedOffer.offerType === "EXCHANGE_COATING_PRICE"
                ? selectedOffer.exchange_coating_id
                : formData.coating_id;

            if (!targetLensId || !targetCoatingId) return;

            getLensPriceId(targetLensId, targetCoatingId)
                .then((res) => {
                    if (res.success && res.data) {
                        setExchangeCoatingPrice(res.data.price || 0);
                    } else {
                        setExchangeCoatingPrice(null);
                        toast({
                            title: "Exchange Price Not Found",
                            description: `No price is configured for exchange lens "${selectedOffer.exchangeLensProduct?.lens_name || 'selected lens'}" + coating "${selectedOffer.exchangeCoating?.name || 'selected coating'}". Please check the price master.`,
                            variant: "destructive",
                        });
                    }
                })
                .catch(() => setExchangeCoatingPrice(null));
        } else {
            setExchangeCoatingPrice(null);
        }
    }, [formData.offer_id, activeOffers, formData.lens_id, formData.coating_id, priceBreakdown]);

    useEffect(() => {
        if (mode === "view") return; // Skip in view mode — saved prices are already correct
        const selectedOffer = formData.offer_id
            ? activeOffers.find((o) => o.id === formData.offer_id)
            : null;

        const fetchExchangeBrandPrice = async () => {
            if (
                selectedOffer?.offerType !== "EXCHANGE_BRAND_PRICE" ||
                !formData.lens_id ||
                !formData.coating_id ||
                !selectedOffer.exchange_brand_id ||
                !priceBreakdown
            ) {
                setExchangeBrandPrice(null);
                return;
            }

            try {
                const productRes = await getLensProductById(formData.lens_id);
                const productCode = productRes.data?.product_code;
                if (!productCode) {
                    setExchangeBrandPrice(null);
                    return;
                }

                const exchangeProductsRes = await apiClient("get", "/v1/lens-products", {
                    params: {
                        exactCode: productCode,
                        brand_id: selectedOffer.exchange_brand_id,
                        limit: 1,
                    },
                });
                const exchangeProduct = exchangeProductsRes.data?.[0];
                if (!exchangeProduct) {
                    setExchangeBrandPrice(null);
                    toast({
                        title: "Exchange Product Not Found",
                        description: `No product with code "${productCode}" found under exchange brand.`,
                        variant: "destructive",
                    });
                    return;
                }

                const priceRes = await getLensPriceId(exchangeProduct.id, formData.coating_id);
                if (priceRes.success && priceRes.data) {
                    setExchangeBrandPrice(priceRes.data.price || 0);
                } else {
                    setExchangeBrandPrice(null);
                }
            } catch {
                setExchangeBrandPrice(null);
            }
        };

        fetchExchangeBrandPrice();
    }, [formData.offer_id, activeOffers, formData.lens_id, formData.coating_id, priceBreakdown]);

    useEffect(() => {
        const loadApplicableOffers = async () => {
            if (!formData.lens_id || !formData.coating_id) {
                return;
            }
            try {
                const productRes = await getLensProductById(formData.lens_id);
                const brandId = productRes.data?.brand_id;
                const offers = await getApplicableOffers(
                    formData.lens_id,
                    formData.coating_id,
                    brandId
                );
                setActiveOffers((prev) => {
                    const merged = [...(offers || [])];
                    if (formData.offer_id) {
                        const selected = prev.find((o) => o.id === formData.offer_id);
                        if (selected && !merged.some((o) => o.id === selected.id)) {
                            merged.push(selected);
                        }
                    }
                    return merged;
                });
            } catch (error) {
                console.error("Error loading applicable offers:", error);
            }
        };

        loadApplicableOffers();
    }, [formData.lens_id, formData.coating_id]);

    // Auto-calculate price when selected offer changes (only in add/edit mode)
    useEffect(() => {
        if (mode === "view") return; // Don't recalculate in view mode — saved prices are source of truth
        if (priceBreakdown && formData.customerId && formData.lens_id && formData.coating_id) {
            handleCalculatePrice();
        }
    }, [formData.offer_id]);

    // Fetch filtered lens products when Type and Category are selected
    useEffect(() => {
        if (formData.Type_id && formData.category_id) {
            loadFilteredLensProducts();
        } else {
            setLensProducts([]);
            setFilteredCoatings([]);
        }
    }, [formData.Type_id, formData.category_id]);

    // Fetch coatings filtered to the selected lens
    useEffect(() => {
        loadCoatingsByLens(formData.lens_id);
    }, [formData.lens_id]);

    const loadFilteredLensProducts = async () => {
        setIsLoadingLensProducts(true);
        try {
            const response = await getLensProductsFiltered(formData.Type_id, formData.category_id);
            if (response.success) {
                setLensProducts(response.data || []);
            } else {
                setLensProducts([]);
            }
        } catch (error) {
            console.error("Error loading filtered lens products:", error);
            setLensProducts([]);
        } finally {
            setIsLoadingLensProducts(false);
        }
    };

    const loadCoatingsByLens = async (lensId) => {
        if (!lensId) {
            setFilteredCoatings([]);
            return;
        }
        setIsLoadingCoatings(true);
        try {
            const response = await getLensCoatingsByLensProduct(lensId);
            if (response.success) {
                setFilteredCoatings(response.data || []);
            } else {
                setFilteredCoatings([]);
            }
        } catch (error) {
            console.error("Error loading coatings for lens:", error);
            setFilteredCoatings([]);
        } finally {
            setIsLoadingCoatings(false);
        }
    };


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
                    checkCustomerCreditLimit(order.customerId);

                    // Ensure the applied offer (if any) is visible even if it has expired/been deleted
                    if (order.offer_id && order.offer) {
                        setActiveOffers((prev) => {
                            const alreadyPresent = prev.some((o) => o.id === order.offer_id);
                            if (alreadyPresent) return prev;
                            // Map backend offer shape to frontend shape
                            return [...prev, {
                                id: order.offer.id,
                                offerName: order.offer.offerName,
                                offerType: order.offer.offerType,
                                discountValue: order.offer.discountValue,
                                discountPercentage: order.offer.discountPercentage,
                                exchange_coating_id: order.offer.exchange_coating_id ?? null,
                                exchange_lens_id: order.offer.exchange_lens_id ?? null,
                                exchange_brand_id: order.offer.exchange_brand_id ?? null,
                                withDiscount: order.offer.withDiscount ?? false,
                                exchangeCoating: order.offer.exchangeCoating ?? null,
                                exchangeLensProduct: order.offer.exchangeLensProduct ?? null,
                                endDate: order.offer.endDate || new Date().toISOString(),
                            }];
                        });
                    }

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
                        // Calculate discount on lens price only
                        const lensBaseForDiscount = order.freeLens ? 0 : (order.lensPrice || 0);
                        reconstructedBreakdown.discountAmount = (lensBaseForDiscount * reconstructedBreakdown.discountPercentage) / 100;

                        // Calculate final total
                        const subtotalAfterFreeItems = reconstructedBreakdown.subtotal - reconstructedBreakdown.freeLensDeduction - reconstructedBreakdown.freeFittingDeduction;
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
        if (!formData.customerRefNo?.trim()) {
            newErrors.customerRefNo = "Customer ref no is required";
        }
        if (customerRefStatus?.status === "fail") {
            newErrors.customerRefNo = customerRefStatus.message || "Already same ref is used against this customer";
        }

        // Delivery schedule validation
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
        if (!formData.fitting_id && !formData.freeFitting && !formData.onlyLens) {
            newErrors.fitting_id = "Fitting type is required (or check Free Fitting)";
        }
        if (!formData.material_id) {
            newErrors.material_id = "Material is required";
        }
        // if (!formData.tinting_id) {
        //     newErrors.tinting_id = "Tinting is required";
        // }
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
        checkCreditLimit(customerId).then(({ outstanding_credit, credit_limit, reserved_amount }) => {
            setCustomerCreditLimit({ outstanding_credit, credit_limit, reserved_amount });
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
        if (name === "customerRefNo") {
            setCustomerRefStatus(null);
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

    // Load lens index from selected product (display only — not stored on sale order)
    useEffect(() => {
        const loadLensIndex = async () => {
            if (!formData.lens_id) {
                setLensProductIndexName("");
                return;
            }
            try {
                const res = await getLensProductById(formData.lens_id);
                const indexName = res.data?.index?.index_name || "";
                setLensProductIndexName(indexName);
            } catch {
                setLensProductIndexName("");
            }
        };
        loadLensIndex();
    }, [formData.lens_id]);

    useEffect(() => {
        const ref = formData.customerRefNo?.trim();
        if (!ref || !formData.customerId) {
            setCustomerRefStatus(null);
            setIsCheckingCustomerRef(false);
            return;
        }

        setIsCheckingCustomerRef(true);
        const timer = setTimeout(async () => {
            try {
                const excludeId = mode !== "add" && id ? id : null;
                const res = await checkCustomerRef(ref, formData.customerId, excludeId);
                if (res.success) {
                    setCustomerRefStatus(res.data);
                    setErrors((prev) => {
                        if (res.data.status === "fail") {
                            return {
                                ...prev,
                                customerRefNo: res.data.message || "Already same ref is used against this customer",
                            };
                        }
                        if (prev.customerRefNo) {
                            const { customerRefNo, ...rest } = prev;
                            return rest;
                        }
                        return prev;
                    });
                }
            } catch {
                setCustomerRefStatus(null);
            } finally {
                setIsCheckingCustomerRef(false);
            }
        }, 400);

        return () => clearTimeout(timer);
    }, [formData.customerRefNo, formData.customerId, mode, id]);

    const getCustomerRefStatusMessage = () => {
        if (isCheckingCustomerRef) return "Checking reference…";
        if (!formData.customerRefNo?.trim()) return "";
        if (!formData.customerId) return "Select a customer to validate reference";
        if (!customerRefStatus) return "";

        if (customerRefStatus.status === "pass") {
            return "Reference is unique";
        }
        if (customerRefStatus.status === "fail") {
            const orderHint = customerRefStatus.orderNo
                ? ` (Order ${customerRefStatus.orderNo})`
                : "";
            return `Already same ref is used against this customer${orderHint}`;
        }
        if (customerRefStatus.status === "warning" && customerRefStatus.conflicts?.length) {
            return customerRefStatus.conflicts
                .map((c) => `${c.customerName} — ${c.lensName}`)
                .join("\n");
        }
        return customerRefStatus.message || "";
    };

    const renderCustomerRefStatusIcon = () => {
        if (!formData.customerRefNo?.trim()) return null;

        let icon = null;
        if (isCheckingCustomerRef) {
            icon = <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
        } else if (!formData.customerId) {
            return null;
        } else if (customerRefStatus?.status === "pass") {
            icon = <CheckCircle2 className="h-4 w-4 text-green-600" />;
        } else if (customerRefStatus?.status === "fail") {
            icon = <XCircle className="h-4 w-4 text-destructive" />;
        } else if (customerRefStatus?.status === "warning") {
            icon = <AlertTriangle className="h-4 w-4 text-amber-500" />;
        }

        if (!icon) return null;

        const message = getCustomerRefStatusMessage();
        if (!message) return <span className="inline-flex shrink-0 pt-1">{icon}</span>;

        return (
            <Tooltip open delayDuration={0}>
                <TooltipTrigger asChild>
                    <span className="inline-flex shrink-0 cursor-pointer pt-1">{icon}</span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-xs">
                    {message}
                </TooltipContent>
            </Tooltip>
        );
    };

    const handleSelectChange = (name, value) => {
        // When Type or Category changes, clear lens_id, coating_id and related price fields
        if (name === "Type_id" || name === "category_id") {
            setPriceBreakdown(null);
            setFormData((prev) => ({
                ...prev,
                [name]: value,
                lens_id: null,
                coating_id: null,
                offer_id: null,
                lensPrice: 0,
                rightEyeExtra: 0,
                leftEyeExtra: 0,
                fittingPrice: 0,
                tintingPrice: 0,
                discount: 0,
            }));
            if (errors.lens_id) setErrors((prev) => ({ ...prev, lens_id: "" }));
            if (errors.coating_id) setErrors((prev) => ({ ...prev, coating_id: "" }));
            if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
            return;
        }
        // When lens changes, also clear coating_id and reset price breakdown
        if (name === "lens_id") {
            const selectedLens = lensProducts.find((p) => p.id === value);
            const newMaterialId = selectedLens ? selectedLens.material_id : null;
            setPriceBreakdown(null);
            setFormData((prev) => ({
                ...prev,
                lens_id: value,
                material_id: newMaterialId,
                coating_id: null,
                offer_id: null,
                lensPrice: 0,
                rightEyeExtra: 0,
                leftEyeExtra: 0,
                fittingPrice: 0,
                tintingPrice: 0,
                discount: 0,
            }));
            if (errors.lens_id) setErrors((prev) => ({ ...prev, lens_id: "" }));
            if (errors.coating_id) setErrors((prev) => ({ ...prev, coating_id: "" }));
            if (errors.material_id) setErrors((prev) => ({ ...prev, material_id: "" }));
            return;
        }
        // When coating changes, reset price breakdown and offer so user must recalculate
        if (name === "coating_id") {
            setPriceBreakdown(null);
            setFormData((prev) => ({
                ...prev,
                coating_id: value,
                offer_id: null,
                lensPrice: 0,
                rightEyeExtra: 0,
                leftEyeExtra: 0,
                fittingPrice: 0,
                tintingPrice: 0,
                discount: 0,
            }));
            if (errors.coating_id) setErrors((prev) => ({ ...prev, coating_id: "" }));
            return;
        }
        // When Only Lens toggled on, clear fitting and reset breakdown
        if (name === "onlyLens") {
            if (value === true) {
                setPriceBreakdown(null);
                setFormData((prev) => ({
                    ...prev,
                    onlyLens: true,
                    fitting_id: null,
                    fittingPrice: 0,
                    freeFitting: false,
                    offer_id: null,
                }));
                setErrors((prev) => ({ ...prev, fitting_id: "" }));
            } else {
                setPriceBreakdown(null);
                setFormData((prev) => ({ ...prev, onlyLens: false, offer_id: null }));
            }
            return;
        }
        if (name === "rightEye") {
            const catName = (categories.find((c) => c.id === formData.category_id)?.label || "").toLowerCase();
            const isSV = catName.includes("single") || catName.includes("reading");
            const defaultDia = dias.find((d) => d.name === 70 || d.short_name === "70")?.short_name
                || (dias[0]?.short_name ?? String(dias[0]?.name ?? ""));
            setFormData((prev) => ({
                ...prev,
                rightEye: value,
                ...(value
                    ? {
                        rightDia: prev.rightDia || defaultDia,
                        rightCylindrical: prev.rightCylindrical || (isSV ? "0" : prev.rightCylindrical),
                    }
                    : {
                        rightSpherical: "",
                        rightCylindrical: "",
                        rightAxis: "",
                        rightAdd: "",
                        rightDia: "",
                    }),
            }));
            if (errors.rightEye) setErrors((prev) => ({ ...prev, rightEye: "" }));
            return;
        }
        if (name === "leftEye") {
            const catName = (categories.find((c) => c.id === formData.category_id)?.label || "").toLowerCase();
            const isSV = catName.includes("single") || catName.includes("reading");
            const defaultDia = dias.find((d) => d.name === 70 || d.short_name === "70")?.short_name
                || (dias[0]?.short_name ?? String(dias[0]?.name ?? ""));
            setFormData((prev) => ({
                ...prev,
                leftEye: value,
                ...(value
                    ? {
                        leftDia: prev.leftDia || defaultDia,
                        leftCylindrical: prev.leftCylindrical || (isSV ? "0" : prev.leftCylindrical),
                    }
                    : {
                        leftSpherical: "",
                        leftCylindrical: "",
                        leftAxis: "",
                        leftAdd: "",
                        leftDia: "",
                    }),
            }));
            if (errors.leftEye) setErrors((prev) => ({ ...prev, leftEye: "" }));
            return;
        }
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
                    rightAdd: 0,
                    leftAdd: 0,
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
            const selectedOffer = formData.offer_id
                ? activeOffers.find((o) => o.id === formData.offer_id)
                : null;

            let targetLensId = formData.lens_id;
            let targetCoatingId = formData.coating_id;

            if (selectedOffer) {
                if (selectedOffer.offerType === "EXCHANGE_COATING_PRICE") {
                    targetLensId = selectedOffer.exchange_lens_id || formData.lens_id;
                    targetCoatingId = selectedOffer.exchange_coating_id || formData.coating_id;
                } else if (selectedOffer.offerType === "EXCHANGE_PRODUCT") {
                    targetLensId = selectedOffer.exchange_lens_id || formData.lens_id;
                } else if (selectedOffer.offerType === "EXCHANGE_BRAND_PRICE" && selectedOffer.exchange_brand_id) {
                    try {
                        const productCode = lensProduct?.product_code;
                        if (productCode) {
                            const exchangeProductsRes = await apiClient("get", "/v1/lens-products", {
                                params: {
                                    exactCode: productCode,
                                    brand_id: selectedOffer.exchange_brand_id,
                                    limit: 1,
                                },
                            });
                            const exchangeProduct = exchangeProductsRes.data?.[0];
                            if (exchangeProduct) {
                                targetLensId = exchangeProduct.id;
                            }
                        }
                    } catch (err) {
                        console.error("Error resolving exchange brand product:", err);
                    }
                }
            }

            const lensPriceResponse = await getLensPriceId(
                targetLensId,
                targetCoatingId
            );
            if (!lensPriceResponse.success || !lensPriceResponse.data) {
                toast({
                    title: "Price Not Found",
                    description: "No price configured for the lens and coating combination.",
                    variant: "destructive",
                });
                return;
            }
            const fullCoatingPrice = lensPriceResponse.data.price || 0;

            // Update exchange price states so display/calculation aligns reactively
            if (selectedOffer) {
                if (selectedOffer.offerType === "EXCHANGE_COATING_PRICE" || selectedOffer.offerType === "EXCHANGE_PRODUCT") {
                    setExchangeCoatingPrice(fullCoatingPrice);
                } else if (selectedOffer.offerType === "EXCHANGE_BRAND_PRICE") {
                    setExchangeBrandPrice(fullCoatingPrice);
                }
            } else {
                setExchangeCoatingPrice(null);
                setExchangeBrandPrice(null);
            }

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

            if (formData.rightEye && formData.rightAdd) {
                const rightAdd = parseFloat(formData.rightAdd) || 0;
                if ((lensProduct.add_max && rightAdd > lensProduct.add_max) ||
                    (lensProduct.add_min && rightAdd < lensProduct.add_min)) {
                    breakdown.extraCharges.rightAdd = (lensProduct.add_extra_charge || 0) / 2;
                }
            }

            if (formData.leftEye && formData.leftAdd) {
                const leftAdd = parseFloat(formData.leftAdd) || 0;
                if ((lensProduct.add_max && leftAdd > lensProduct.add_max) ||
                    (lensProduct.add_min && leftAdd < lensProduct.add_min)) {
                    breakdown.extraCharges.leftAdd = (lensProduct.add_extra_charge || 0) / 2;
                }
            }

            breakdown.extraCharges.total =
                breakdown.extraCharges.rightSphere +
                breakdown.extraCharges.leftSphere +
                breakdown.extraCharges.rightCylinder +
                breakdown.extraCharges.leftCylinder +
                breakdown.extraCharges.rightAdd +
                breakdown.extraCharges.leftAdd;

            breakdown.rightEyeExtra =
                breakdown.extraCharges.rightSphere +
                breakdown.extraCharges.rightCylinder +
                breakdown.extraCharges.rightAdd;
            breakdown.leftEyeExtra =
                breakdown.extraCharges.leftSphere +
                breakdown.extraCharges.leftCylinder +
                breakdown.extraCharges.leftAdd;

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

            // RIGHT SECTION: Calculate discount on lens price only (not fitting, tinting, or extras)
            const lensBaseForDiscount = breakdown.freeLensDeduction > 0 ? 0 : breakdown.lensPrice;
            breakdown.discountAmount = (lensBaseForDiscount * breakdown.discountPercentage) / 100;

            // RIGHT SECTION: Final Total = (subtotal - freeLens - freeFitting) - lensDiscount
            const subtotalAfterFreeItems = breakdown.subtotal - breakdown.freeLensDeduction - breakdown.freeFittingDeduction;
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

        // Require price to be calculated before submitting
        if (!priceBreakdown) {
            toast({
                title: "Calculate Price First",
                description: "Please click 'Calculate Price' before saving the order.",
                variant: "destructive",
            });
            return;
        }

        // Offer confirmation dialogs
        if (formData.offer_id) {
            const appliedOffer = activeOffers.find((o) => o.id === formData.offer_id);
            const confirmApply = window.confirm(
                `Offer "${appliedOffer?.offerName}" will be applied to this order.\nDo you want to continue?`
            );
            if (!confirmApply) return;
        } else if (activeOffers.length > 0) {
            const skipOffer = window.confirm(
                "An offer is available but has not been applied to this order.\nDo you want to continue without applying an offer?"
            );
            if (!skipOffer) return;
        }

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

            // Build the payload: if a PERCENTAGE offer is applied, zero out the category discount;
            // for exchange offers, use the effective (exchange) lensPrice and discount
            const selectedOffer = formData.offer_id
                ? activeOffers.find((o) => o.id === formData.offer_id)
                : null;
            let submitData = {
                ...formData,
                discount: selectedOffer?.offerType === "PERCENTAGE" ? 0 : formData.discount,
            };
            if (selectedOffer &&
                (selectedOffer.offerType === "EXCHANGE_COATING_PRICE" ||
                    selectedOffer.offerType === "EXCHANGE_PRODUCT" ||
                    selectedOffer.offerType === "EXCHANGE_BRAND_PRICE") &&
                effectiveBreakdown) {
                submitData = {
                    ...submitData,
                    lensPrice: effectiveBreakdown.lensPrice,
                    discount: effectiveBreakdown.discountPercentage,
                };
            }

            if (mode === "add") {
                const response = await createSaleOrder(submitData);
                if (response.success) {
                    window.alert(`Sale Order created successfully!\nOrder Number: ${response.data?.orderNo}`);
                    window.close();
                }
            } else if (mode === "edit" || isEditing) {
                const response = await updateSaleOrder(parseInt(id), submitData);
                if (response.success) {
                    window.alert(`Sale Order updated successfully!\nOrder Number: ${response.data?.orderNo || formData.orderNo}`);
                    setOriginalData(formData);
                    setIsEditing(false);
                    window.close();
                }
            }
        } catch (error) {
            console.error("Error saving sale order:", error);
            window.alert(`Error saving sale order:\n${error.message || "Unknown error"}`);
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
            case "CONFIRMED":
            case "ON_HOLD":
                // Start Fitting disabled — use Raise PO workflow instead
                return null;
            case "IN_FITTING":
                return {
                    label: "Ready for Dispatch",
                    nextStatus: "READY_FOR_DISPATCH",
                    icon: Package,
                    variant: "default",
                };
            case "READY_FOR_DISPATCH":
            case "READY_FOR_PICKUP":
            case "DISPATCHED":
                return null;
            default:
                return null;
        }
    };

    const handleStatusTransition = async () => {
        const statusAction = getStatusActionButton();
        if (!statusAction) return;

        // If transitioning to IN_FITTING, trigger the FIFO selection modal instead of direct update
        if (statusAction.nextStatus === "IN_FITTING") {
            try {
                setIsSaving(true);
                const response = await getMatchingInventoryFIFO(parseInt(id));
                if (response.success) {
                    const matches = response.data;
                    const rightMatches = matches.rightEyeMatches || [];
                    const leftMatches = matches.leftEyeMatches || [];

                    setFifoMatches({
                        rightEyeMatches: rightMatches,
                        leftEyeMatches: leftMatches,
                    });

                    // Pre-select the first match (FIFO) for each required eye
                    const initialSelections = {};
                    if (formData.rightEye && rightMatches.length > 0) {
                        initialSelections.rightEyeItemId = rightMatches[0].id;
                    }
                    if (formData.leftEye && leftMatches.length > 0) {
                        initialSelections.leftEyeItemId = leftMatches[0].id;
                    }

                    setSelectedFifoItems(initialSelections);
                    setIsFifoModalOpen(true);
                }
            } catch (error) {
                toast({
                    title: "Error finding matching stock",
                    description: error.message || "Failed to search inventory on FIFO basis.",
                    variant: "destructive",
                });
            } finally {
                setIsSaving(false);
            }
            return;
        }

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

    const handleFifoConfirm = async () => {
        const itemIds = [];
        if (formData.rightEye) {
            if (!selectedFifoItems.rightEyeItemId) {
                toast({
                    title: "Selection missing",
                    description: "Please select an inventory item for the Right Eye.",
                    variant: "destructive",
                });
                return;
            }
            itemIds.push(selectedFifoItems.rightEyeItemId);
        }
        if (formData.leftEye) {
            if (!selectedFifoItems.leftEyeItemId) {
                toast({
                    title: "Selection missing",
                    description: "Please select an inventory item for the Left Eye.",
                    variant: "destructive",
                });
                return;
            }
            itemIds.push(selectedFifoItems.leftEyeItemId);
        }

        try {
            setIsSaving(true);
            const response = await updateSaleOrderStatus(parseInt(id), "IN_FITTING", undefined, itemIds);

            if (response.success) {
                toast({
                    title: "Success",
                    description: "Order status updated to In Fitting and stock allocated successfully.",
                    success: true,
                });
                setFormData((prev) => ({ ...prev, status: "IN_FITTING" }));
                setIsFifoModalOpen(false);

                // Refresh order data
                const refreshResponse = await getSaleOrderById(parseInt(id));
                if (refreshResponse.success) {
                    setFormData(refreshResponse.data);
                    setOriginalData(refreshResponse.data);
                }
            }
        } catch (error) {
            toast({
                title: "Error moving to fitting",
                description: error.message || "Failed to update status and allocate stock.",
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

    const hasActiveLinkedPo = (order) =>
        order?.purchaseOrders?.some(
            (p) =>
                !p.deleteStatus &&
                p.status !== "CANCELLED" &&
                ["DRAFT", "PO_PARTIAL_RECEIVED", "RECEIVED"].includes(p.status)
        );

    const canRaisePo =
        mode === "view" &&
        !isEditing &&
        formData.id &&
        ["DRAFT", "PO_CANCELLED"].includes(formData.status) &&
        !hasActiveLinkedPo(formData);

    const canCancelSo =
        mode === "view" &&
        !isEditing &&
        formData.id &&
        formData.status !== "CANCELLED" &&
        ["DRAFT", "PO_CANCELLED"].includes(formData.status);

    const buildSubmitData = () => {
        const selectedOffer = formData.offer_id
            ? activeOffers.find((o) => o.id === formData.offer_id)
            : null;
        let submitData = {
            ...formData,
            discount: selectedOffer?.offerType === "PERCENTAGE" ? 0 : formData.discount,
        };
        if (selectedOffer?.offerType === "EXCHANGE_COATING_PRICE" && effectiveBreakdown) {
            submitData = {
                ...submitData,
                lensPrice: effectiveBreakdown.lensPrice,
                discount: effectiveBreakdown.discountPercentage,
            };
        }
        return submitData;
    };

    const buildRaisePoSummary = () => {
        const customer = customers.find((c) => c.id === formData.customerId);
        const lens = lensProducts.find((l) => l.id === formData.lens_id);
        const category = categories.find((c) => c.id === formData.category_id);
        const lensType = lensTypes.find((t) => t.id === formData.Type_id);
        const coating =
            filteredCoatings.find((c) => c.id === formData.coating_id) ||
            coatings.find((c) => c.id === formData.coating_id);
        return {
            orderNo: formData.orderNo,
            customerName: customer?.name || formData.customer?.name,
            customerRefNo: formData.customerRefNo,
            lensProductName: lens?.label || lens?.lens_name || formData.lensProduct?.lens_name,
            categoryName: category?.label || category?.name,
            typeName: lensType?.label || lensType?.name,
            coatingName: coating?.name || coating?.label,
            status: formData.status,
            procurementType: formData.procurementType || "RX",
            rightEye: formData.rightEye,
            leftEye: formData.leftEye,
            rightSpherical: formData.rightSpherical,
            rightCylindrical: formData.rightCylindrical,
            rightAxis: formData.rightAxis,
            rightAdd: formData.rightAdd,
            rightDia: formData.rightDia,
            leftSpherical: formData.leftSpherical,
            leftCylindrical: formData.leftCylindrical,
            leftAxis: formData.leftAxis,
            leftAdd: formData.leftAdd,
            leftDia: formData.leftDia,
        };
    };

    const validateBeforeRaisePo = () => {
        if (!priceBreakdown) {
            toast({
                title: "Calculate Price First",
                description: "Please click 'Calculate Price' before proceeding.",
                variant: "destructive",
            });
            return false;
        }
        if (!validateForm()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields correctly",
                variant: "destructive",
            });
            return false;
        }
        if (!formData.rightEye && !formData.leftEye) {
            toast({
                title: "Specification Error",
                description: "Please select and enter specifications for at least one eye",
                variant: "destructive",
            });
            return false;
        }
        return true;
    };

    const openRaisePoModal = (modalMode) => {
        if (!validateBeforeRaisePo()) return;
        setRaisePoModalMode(modalMode);
        setIsRaisePoModalOpen(true);
    };

    const handleRaisePoConfirm = async (vendorId) => {
        try {
            setIsSaving(true);
            let soId = formData.id;

            if (mode === "add") {
                const response = await createSaleOrder(buildSubmitData());
                if (!response.success) {
                    throw new Error(response.message || "Failed to create sale order");
                }
                soId = response.data.id;
            } else if (isEditing) {
                const response = await updateSaleOrder(parseInt(id, 10), buildSubmitData());
                if (!response.success) {
                    throw new Error(response.message || "Failed to update sale order");
                }
                soId = response.data?.id || parseInt(id, 10);
            }

            const res = await raisePoFromSo(soId, { vendorId, source: "USER" });
            if (res.success) {
                window.alert(`PO ${res.data.poNumber} raised successfully!`);
                setIsRaisePoModalOpen(false);
                if (mode === "add") {
                    navigate(`/sales/orders/view/${soId}`);
                } else {
                    window.location.reload();
                }
            }
        } catch (error) {
            window.alert(`Failed to raise PO:\n${error.message || "Could not save sale order and raise PO"}`);
            setIsRaisePoModalOpen(false);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelSo = async () => {
        const remark = window.prompt("Cancel remark (required):");
        if (!remark?.trim()) return;
        try {
            setIsSaving(true);
            const res = await cancelSaleOrder(formData.id, remark.trim());
            if (res.success) {
                toast({ title: "Sale order cancelled" });
                const refreshResponse = await getSaleOrderById(formData.id);
                if (refreshResponse.success) {
                    setFormData(refreshResponse.data);
                    setOriginalData(refreshResponse.data);
                } else {
                    setFormData((prev) => ({ ...prev, status: "CANCELLED" }));
                }
            }
        } catch (e) {
            toast({
                title: "Cancel failed",
                description: e.message,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Create and Raise PO Handler
    const handleCreateAndRaisePO = (e) => {
        e?.preventDefault();
        setIsAddDropdownOpen(false);
        openRaisePoModal("create");
    };

    // Create and Print Handler
    const handleCreateAndPrint = async (e) => {
        e?.preventDefault();

        // Requires price calculation
        if (!priceBreakdown) {
            toast({
                title: "Calculate Price First",
                description: "Please click 'Calculate Price' before proceeding.",
                variant: "destructive",
            });
            return;
        }

        // Validate form before saving
        if (!validateForm()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields correctly",
                variant: "destructive",
            });
            return;
        }

        // Check if both eyes are selected and have specs
        if (!formData.rightEye && !formData.leftEye) {
            toast({
                title: "Specification Error",
                description: "Please select and enter specifications for at least one eye",
                variant: "destructive",
            });
            return;
        }

        try {
            setIsSaving(true);

            // Build the payload
            const selectedOffer = formData.offer_id
                ? activeOffers.find((o) => o.id === formData.offer_id)
                : null;
            let submitData = {
                ...formData,
                discount: selectedOffer?.offerType === "PERCENTAGE" ? 0 : formData.discount,
            };
            if (selectedOffer &&
                (selectedOffer.offerType === "EXCHANGE_COATING_PRICE" ||
                    selectedOffer.offerType === "EXCHANGE_PRODUCT" ||
                    selectedOffer.offerType === "EXCHANGE_BRAND_PRICE") &&
                effectiveBreakdown) {
                submitData = {
                    ...submitData,
                    lensPrice: effectiveBreakdown.lensPrice,
                    discount: effectiveBreakdown.discountPercentage,
                };
            }

            let savedOrder = null;

            if (mode === "add") {
                const response = await createSaleOrder(submitData);
                if (response.success) {
                    savedOrder = response.data;
                    toast({
                        title: "Success",
                        description: "Sale order created successfully!",
                        success: true,
                    });
                } else {
                    throw new Error(response.message || "Failed to create order");
                }
            } else if (mode === "edit" || isEditing) {
                const response = await updateSaleOrder(parseInt(id), submitData);
                if (response.success) {
                    savedOrder = response.data;
                    toast({
                        title: "Success",
                        description: "Sale order updated successfully!",
                        success: true,
                    });
                    setOriginalData(submitData);
                    setIsEditing(false);
                } else {
                    throw new Error(response.message || "Failed to update order");
                }
            } else if (mode === "view") {
                // For view mode, use the existing form data
                savedOrder = formData;
            }

            if (savedOrder) {
                // Open print preview modal with the saved data
                setFormData(savedOrder);
                setPrintActionMode("create-and-print");
                setIsPrintModalOpen(true);
            }
        } catch (error) {
            console.error("Error in Create and Print:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save and print",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Print Existing Order Handler
    const handlePrintOrder = async () => {
        if (mode === "view" && formData.id) {
            // Check if lens specs are available
            if (!formData.rightEye && !formData.leftEye) {
                toast({
                    title: "No Specifications",
                    description: "No lens specifications available to print",
                    variant: "destructive",
                });
                return;
            }

            setPrintActionMode("print-existing");
            setIsPrintModalOpen(true);
        }
    };

    // Close Print Modal Handler
    const closePrintModal = () => {
        setIsPrintModalOpen(false);
        setPrintActionMode(null);
        setIsPrinting(false);
    };

    // Print Barcode Label via local print service
    const [isPrintingLabel, setIsPrintingLabel] = useState(false);
    const handlePrintLabel = async () => {
        setIsViewDropdownOpen(false);
        setIsPrintingLabel(true);
        try {
            const health = await checkPrintServiceHealth();
            if (!health) {
                toast({
                    title: "Print Service Not Running",
                    description: "Start LensPrintService.exe on this PC, then try again.",
                    variant: "destructive",
                });
                return;
            }
            const cfgRes = await getPrinterConfigs();
            const cfg = cfgRes?.data?.find?.((c) => c.config_type === "BARCODE_LABEL");
            if (!cfg?.printer_name) {
                toast({
                    title: "No Printer Configured",
                    description: "Go to Settings → Print Service and configure a Barcode Label printer.",
                    variant: "destructive",
                });
                return;
            }
            const orderId = formData.id || formData.order_number || id;
            const orderCode = formData.order_number || `SO-${orderId}`;
            const customer = formData.customer_name || formData.customerName || "Order";
            await printBarcodeLabels({
                printerName: cfg.printer_name,
                topLabel: customer,
                barcodeSerials: [String(orderId)],
                bottomLabels: [orderCode],
                labelWidth: cfg.label_width ?? 180,
            });
            toast({ title: "Label Sent", description: `Label sent to ${cfg.printer_name}` });
        } catch (err) {
            toast({ title: "Print Error", description: err.message || "Failed to print label", variant: "destructive" });
        } finally {
            setIsPrintingLabel(false);
        }
    };

    // Confirm Print and Close Modal
    const handlePrintConfirm = async () => {
        setIsPrinting(true);
        try {
            // Simulate print completion delay
            await new Promise((resolve) => setTimeout(resolve, 500));

            if (printActionMode === "create-and-print") {
                // Close modal and navigate back to orders list
                closePrintModal();
                window.alert(`Order created and printed successfully!\nOrder Number: ${formData.orderNo}`);
                window.close();
            } else if (printActionMode === "print-existing") {
                // Just close the modal
                closePrintModal();
                toast({
                    title: "Success",
                    description: "Print completed successfully!",
                    success: true,
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An error occurred during printing",
                variant: "destructive",
            });
        } finally {
            setIsPrinting(false);
        }
    };

    const statusActionButton = mode === "view" ? getStatusActionButton() : null;

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleOutsideClick = (e) => {
            if (addDropdownRef.current && !addDropdownRef.current.contains(e.target)) {
                setIsAddDropdownOpen(false);
            }
            if (viewDropdownRef.current && !viewDropdownRef.current.contains(e.target)) {
                setIsViewDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleOutsideClick);
        return () => document.removeEventListener("mousedown", handleOutsideClick);
    }, []);

    // Close & Create SO Handler
    const handleCloseAndCreateSO = async () => {
        setIsViewDropdownOpen(false);
        if (!formData.id) return;

        if (!window.confirm(`This will close Sale Order "${formData.orderNo}" and create a new duplicate order. Continue?`)) return;

        try {
            setIsSaving(true);
            const response = await closeAndCreateSaleOrder(formData.id);
            if (response.success) {
                toast({
                    title: "Success",
                    description: `Order ${formData.orderNo} closed. New order ${response.data.newOrder.orderNo} created.`,
                });
                navigate(`/sales/orders/view/${response.data.newOrder.id}`);
            }
        } catch (error) {
            console.error("Error in Close & Create SO:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to close and create sale order",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    // Eye spec gating: both Type and Category must be selected before entering eye data
    const eyeSpecReady = !!(formData.Type_id && formData.category_id);
    const getDefaultDiaValue = () => {
        const preferred = dias.find((d) => d.name === 70 || d.short_name === "70");
        const fallback = dias[0];
        const dia = preferred || fallback;
        return dia ? (dia.short_name || String(dia.name)) : "";
    };
    const getDiaSelectValue = (diaValue) => {
        if (!diaValue || dias.length === 0) return null;
        const match = dias.find(
            (d) => d.short_name === String(diaValue) || String(d.name) === String(diaValue)
        );
        return match?.id ?? null;
    };
    const handleEyeDiaChange = (eye, diaId) => {
        const field = eye === "right" ? "rightDia" : "leftDia";
        if (!diaId) {
            setFormData((prev) => ({ ...prev, [field]: "", dia_id: null }));
            return;
        }
        const selectedDia = dias.find((d) => d.id === diaId);
        const diaValue = selectedDia?.short_name ?? (selectedDia?.name != null ? String(selectedDia.name) : "");
        setFormData((prev) => ({ ...prev, [field]: diaValue, dia_id: null }));
    };
    const bothEyesDisabled = !(isEditing && formData.status === "DRAFT") || !eyeSpecReady;
    const handleBothEyesChange = (checked) => {
        if (bothEyesDisabled) return;
        const catName = (categories.find((c) => c.id === formData.category_id)?.label || "").toLowerCase();
        const isSV = catName.includes("single") || catName.includes("reading");
        const defaultDia = getDefaultDiaValue();
        if (checked) {
            setFormData((prev) => ({
                ...prev,
                rightEye: true,
                leftEye: true,
                rightDia: prev.rightDia || defaultDia,
                leftDia: prev.leftDia || defaultDia,
                rightCylindrical: prev.rightCylindrical || (isSV ? "0" : prev.rightCylindrical),
                leftCylindrical: prev.leftCylindrical || (isSV ? "0" : prev.leftCylindrical),
            }));
        } else {
            setFormData((prev) => ({
                ...prev,
                rightEye: false,
                leftEye: false,
                rightSpherical: "",
                rightCylindrical: "",
                rightAxis: "",
                rightAdd: "",
                rightDia: "",
                leftSpherical: "",
                leftCylindrical: "",
                leftAxis: "",
                leftAdd: "",
                leftDia: "",
            }));
        }
        if (errors.eyeSelection) setErrors((prev) => ({ ...prev, eyeSelection: "" }));
    };
    // Add field is only relevant for Bifocal / Progressive lenses
    const selectedCategoryName = (categories.find((c) => c.id === formData.category_id)?.label || "").toLowerCase();
    const showAddField = selectedCategoryName.includes("bifocal") || selectedCategoryName.includes("progressive");
    console.log("Selected Category:", selectedCategoryName, "Show Add Field:", showAddField, "categories", categories.find((c) => c.id === formData.category_id));

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

                    {canRaisePo && (
                        <Button
                            size="xs"
                            className="h-8 gap-1.5"
                            onClick={() => openRaisePoModal("raise")}
                            disabled={isSaving}
                        >
                            <Package className="h-3.5 w-3.5" />
                            Raise PO
                        </Button>
                    )}

                    {canCancelSo && (
                        <Button
                            size="xs"
                            variant="destructive"
                            className="h-8 gap-1.5"
                            onClick={handleCancelSo}
                            disabled={isSaving}
                        >
                            <XCircle className="h-3.5 w-3.5" />
                            Cancel SO
                        </Button>
                    )}

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
                    {(mode !== "view" || isEditing) && !isCreditBlocked && (
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
                    {mode === "view" && (
                        <div className="relative" ref={viewDropdownRef}>
                            {/* <Button
                                size="xs"
                                className="h-8 gap-1.5"
                                variant="secondary"
                                onClick={handlePrintOrder}
                                disabled={isSaving}
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print
                            </Button> */}
                            <Button
                                size="xs"
                                variant="secondary"
                                className="h-8 px-1 ml-0.5 border-l"
                                onClick={() => setIsViewDropdownOpen((o) => !o)}
                                disabled={isSaving}
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            {isViewDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 min-w-[190px] rounded-md border bg-popover shadow-md">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                                        onClick={() => { setIsViewDropdownOpen(false); handlePrintOrder(); }}
                                        disabled={isSaving}
                                    >
                                        <Printer className="h-3.5 w-3.5" />
                                        Print Invoice
                                    </button>
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                                        onClick={handlePrintLabel}
                                        disabled={isSaving || isPrintingLabel}
                                    >
                                        <Tag className="h-3.5 w-3.5" />
                                        {isPrintingLabel ? "Printing…" : "Print Label"}
                                    </button>
                                    {!isEditing && formData.status !== "CLOSED" && (
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-amber-700 disabled:opacity-50"
                                            onClick={handleCloseAndCreateSO}
                                            disabled={isSaving}
                                        >
                                            <GitBranch className="h-3.5 w-3.5" />
                                            Close &amp; Create SO
                                        </button>
                                    )}
                                    {!isEditing && (formData.status === "DELIVERED" || formData.status === "BILLED") && (
                                        <button
                                            type="button"
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-indigo-700 disabled:opacity-50"
                                            onClick={() => { setIsViewDropdownOpen(false); navigate("/billing"); }}
                                            disabled={isSaving}
                                        >
                                            <Receipt className="h-3.5 w-3.5" />
                                            Go to Billing
                                        </button>
                                    )}
                                    {mode === "view" && (
                                        <Button
                                            size="xs"
                                            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted text-indigo-700 disabled:opacity-50"
                                            variant={isEditing ? "outline" : "default"}
                                            onClick={toggleEdit}
                                            disabled={isCreditBlocked}
                                            title={isCreditBlocked ? "Read-only: customer has reached their credit limit" : undefined}
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
                                </div>
                            )}
                        </div>
                    )}




                    {(mode === "add") && (
                        <div className="relative" ref={addDropdownRef}>
                            <Button
                                type="button"
                                size="xs"
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => setIsAddDropdownOpen((o) => !o)}
                                disabled={isSaving}
                            >
                                <ChevronDown className="h-3.5 w-3.5" />
                            </Button>
                            {isAddDropdownOpen && (
                                <div className="absolute right-0 top-full mt-1 z-50 min-w-[170px] rounded-md border bg-popover shadow-md">
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                                        onClick={() => { setIsAddDropdownOpen(false); handleCreateAndRaisePO(); }}
                                        disabled={isSaving}
                                    >
                                        <Package className="h-3.5 w-3.5 text-green-600" />
                                        Create &amp; Raise PO
                                    </button>
                                    <button
                                        type="button"
                                        className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
                                        onClick={() => { setIsAddDropdownOpen(false); handleCreateAndPrint(); }}
                                        disabled={isSaving}
                                    >
                                        <Printer className="h-3.5 w-3.5 text-blue-600" />
                                        Create &amp; Print
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {mode === "view" && formData.id && (
                <div className="mb-4 space-y-2">
                    <SaleOrderStatusBar
                        orderId={formData.id}
                        orderNo={formData.orderNo}
                        status={formData.status}
                        hasPoHistory={formData.hasLinkedPoEver || (formData.purchaseOrders?.length > 0)}
                    />
                    {RESET_ELIGIBLE.includes(formData.status) && (
                        <Alert>
                            <AlertDescription className="flex flex-wrap items-center gap-2">
                                Order requires SO reset before re-processing.
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                        const remark = window.prompt("Reset remark (required):");
                                        if (!remark?.trim()) return;
                                        try {
                                            const res = await confirmSoReset(formData.id, remark.trim());
                                            if (res.success) {
                                                toast({ title: "Reset to Draft" });
                                                setFormData((p) => ({ ...p, status: "DRAFT" }));
                                            }
                                        } catch (e) {
                                            toast({ title: "Reset failed", description: e.message, variant: "destructive" });
                                        }
                                    }}
                                >
                                    Confirm reset → Draft
                                </Button>
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}

            <RaisePoModal
                open={isRaisePoModalOpen}
                onOpenChange={setIsRaisePoModalOpen}
                summary={buildRaisePoSummary()}
                onConfirm={handleRaisePoConfirm}
                loading={isSaving}
                mode={raisePoModalMode}
            />

            <div className="flex flex-col md:flex-row gap-4 h-full md:overflow-hidden">
                {/* Block 1: Order Information */}
                <Card className=" md:w-[35%] flex flex-col md:h-full md:overflow-y-auto md:overflow-x-hidden">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">Order Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">

                        {isCreditBlocked && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    This customer has reached their credit limit.
                                </AlertDescription>
                            </Alert>
                        )}

                        <FormSelect
                            singleLine={true}
                            label="Customer"
                            name="customerId"
                            options={customers}
                            value={formData.customerId}
                            onChange={(value) => {
                                handleSelectChange("customerId", value)
                                checkCustomerCreditLimit(value);
                            }}
                            placeholder="Select customer"
                            isSearchable={true}
                            disabled={mode !== "add"}
                            required
                            error={errors.customerId}
                            helperText={customerCreditLimit.credit_limit !== null ? `Credit Limit: \u20b9${customerCreditLimit.credit_limit} ---> (Reserved: \u20b9${customerCreditLimit.reserved_amount || 0}, Invoiced: \u20b9${customerCreditLimit.outstanding_credit || 0}) ` : ""}

                        />

                        <FormInput
                            singleLine={true} label="Order Date"
                            type="date"
                            name="orderDate"
                            value={new Date(formData.orderDate).toISOString().split("T")[0]}
                            onChange={handleChange}
                            disabled={(mode !== "add" && formData.status !== "DRAFT") || isCreditBlocked}
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
                            disabled={true} // Status is managed via action buttons, not directly editable
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
                            rows={1}
                            placeholder="Enter any additional remarks"
                        />
                        <div className="flex gap-2 items-center">
                            <FormInput
                                singleLine={true}
                                label="Customer Ref No"
                                name="customerRefNo"
                                value={formData.customerRefNo}
                                onChange={handleChange}
                                disabled={mode !== "add" || isCreditBlocked}
                                placeholder="Enter customer reference"
                                required
                                error={errors.customerRefNo}
                                containerClassName="flex-1 min-w-0"
                            />
                            {renderCustomerRefStatusIcon()}
                        </div>
                        <FormInput
                            singleLine={true} label="Item Ref No"
                            name="itemRefNo"
                            value={formData.itemRefNo}
                            onChange={handleChange}
                            disabled={!isEditing}
                            placeholder="Optional item reference"
                        />
                        <div className={`mt-4 grid divide-x divide-border border rounded-md overflow-hidden ${formData.onlyLens ? "grid-cols-2" : "grid-cols-3"}`}>
                            {[
                                { id: "onlyLens", label: "Only Lens", checked: formData.onlyLens, disabled: !(isEditing && formData.status === "DRAFT"), onChange: (c) => handleSelectChange("onlyLens", c) },
                                { id: "freeLens", label: "Free Lens", checked: formData.freeLens, disabled: !(isEditing && formData.status === "DRAFT"), onChange: (c) => handleSelectChange("freeLens", c) },
                                !formData.onlyLens && { id: "freeFitting", label: "Free Fitting", checked: formData.freeFitting, disabled: !(isEditing && formData.status === "DRAFT"), onChange: (c) => handleSelectChange("freeFitting", c) },
                            ].filter(Boolean).map(({ id, label, checked, disabled, onChange }) => (
                                <label
                                    key={id}
                                    htmlFor={id}
                                    className={[
                                        "flex flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-medium select-none transition-colors",
                                        checked ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground",
                                        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50",
                                    ].join(" ")}
                                >
                                    <Checkbox
                                        id={id}
                                        checked={checked}
                                        onCheckedChange={onChange}
                                        disabled={disabled}
                                        className="pointer-events-none"
                                    />
                                    {label}
                                </label>
                            ))}
                        </div>

                        {/* Available Offers / Selected Offer */}
                        {(() => {
                            const isPostDraft = formData.status && formData.status !== "DRAFT";

                            if (isPostDraft) {
                                // Non-draft orders: show only the selected offer as a read-only record
                                if (!formData.offer_id) return null;
                                const selectedOffer = activeOffers.find((o) => o.id === formData.offer_id);
                                if (!selectedOffer) return null;
                                return (
                                    <div className="mt-3 border-t pt-3">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Tag className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-xs font-semibold">Selected Offer</span>
                                        </div>
                                        <div className="flex items-start gap-2 rounded-md border border-primary bg-primary/5 px-2 py-1.5 text-xs">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="font-medium">{selectedOffer.offerName}</span>
                                                    <Badge
                                                        variant={
                                                            selectedOffer.offerType === "VALUE" ? "secondary" :
                                                                selectedOffer.offerType === "PERCENTAGE" ? "outline" : "default"
                                                        }
                                                        className="text-[10px] px-1 py-0 leading-4 h-4"
                                                    >
                                                        {selectedOffer.offerType === "VALUE" ? "Value" :
                                                            selectedOffer.offerType === "PERCENTAGE" ? "Percent" :
                                                                selectedOffer.offerType === "EXCHANGE_COATING_PRICE" ? "Coating" : "Exchange"}
                                                    </Badge>
                                                </div>
                                                <div className="text-muted-foreground mt-0.5">
                                                    {selectedOffer.offerType === "VALUE" && `₹${selectedOffer.discountValue} off`}
                                                    {selectedOffer.offerType === "PERCENTAGE" && `${selectedOffer.discountPercentage}% off`}
                                                    {selectedOffer.offerType === "EXCHANGE_PRODUCT" && (
                                                        `Exchange price using product: ${selectedOffer.exchangeLensProduct?.lens_name || ''}`
                                                    )}
                                                    {selectedOffer.offerType === "EXCHANGE_COATING_PRICE" && (
                                                        `Exchange price using: ${selectedOffer.exchangeLensProduct?.lens_name || ''} + ${selectedOffer.exchangeCoating?.name || ''}${selectedOffer.withDiscount ? " + discount" : ""}`
                                                    )}
                                                    {" · Ends "}
                                                    {new Date(selectedOffer.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }

                            // Draft / new order: show all active offers with selection UI
                            if (activeOffers.length === 0) return null;
                            return (
                                <div className="mt-3 border-t pt-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <Tag className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-xs font-semibold">Available Offers</span>
                                            {!priceBreakdown && (
                                                <span className="text-[10px] text-muted-foreground italic">(calculate price first)</span>
                                            )}
                                            {priceBreakdown && priceBreakdown.finalTotal === 0 && (
                                                <span className="text-[10px] text-amber-600 italic">(not applicable — total is ₹0)</span>
                                            )}
                                        </div>
                                        {formData.offer_id && (
                                            <Button
                                                type="button"
                                                size="xs"
                                                variant="ghost"
                                                className="h-5 px-1.5 text-[11px] text-destructive hover:text-destructive"
                                                onClick={() => handleSelectChange("offer_id", null)}
                                                disabled={!isEditing}
                                            >
                                                <X className="h-3 w-3 mr-0.5" /> Clear
                                            </Button>
                                        )}
                                    </div>
                                    <RadioGroup
                                        value={formData.offer_id ? String(formData.offer_id) : ""}
                                        onValueChange={(val) => {
                                            if (!isEditing || !priceBreakdown) return;
                                            if (priceBreakdown.finalTotal === 0) {
                                                toast({ title: "Offer not applicable", description: "Cannot apply an offer when the order total is ₹0.", variant: "destructive" });
                                                return;
                                            }
                                            handleSelectChange("offer_id", parseInt(val));
                                        }}
                                        className="gap-1.5"
                                    >
                                        {activeOffers.map((offer) => (
                                            <label
                                                key={offer.id}
                                                htmlFor={`offer-${offer.id}`}
                                                className={[
                                                    "flex items-start gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors",
                                                    isEditing && priceBreakdown && priceBreakdown.finalTotal > 0 ? "cursor-pointer" : "cursor-default opacity-60 pointer-events-none",
                                                    formData.offer_id === offer.id
                                                        ? "border-primary bg-primary/5"
                                                        : "border-border hover:bg-muted/50",
                                                ].join(" ")}
                                            >
                                                <RadioGroupItem
                                                    id={`offer-${offer.id}`}
                                                    value={String(offer.id)}
                                                    className="mt-0.5 shrink-0"
                                                    disabled={!isEditing || !priceBreakdown || priceBreakdown.finalTotal === 0}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="font-medium">{offer.offerName}</span>
                                                        <Badge
                                                            variant={
                                                                offer.offerType === "VALUE" ? "secondary" :
                                                                    offer.offerType === "PERCENTAGE" ? "outline" : "default"
                                                            }
                                                            className="text-[10px] px-1 py-0 leading-4 h-4"
                                                        >
                                                            {offer.offerType === "VALUE" ? "Value" :
                                                                offer.offerType === "PERCENTAGE" ? "Percent" :
                                                                    offer.offerType === "EXCHANGE_COATING_PRICE" ? "Coating" : "Exchange"}
                                                        </Badge>
                                                    </div>
                                                    <div className="text-muted-foreground mt-0.5">
                                                        {offer.offerType === "VALUE" && `₹${offer.discountValue} off`}
                                                        {offer.offerType === "PERCENTAGE" && `${offer.discountPercentage}% off`}
                                                        {offer.offerType === "EXCHANGE_PRODUCT" && (
                                                            `Exchange price using product: ${offer.exchangeLensProduct?.lens_name || ''}`
                                                        )}
                                                        {offer.offerType === "EXCHANGE_COATING_PRICE" && (
                                                            `Exchange price using: ${offer.exchangeLensProduct?.lens_name || ''} + ${offer.exchangeCoating?.name || ''}${offer.withDiscount ? " + discount" : ""}`
                                                        )}
                                                        {" · Ends "}
                                                        {new Date(offer.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            );
                        })()}

                        {errors.eyeSelection && (
                            <Alert variant="destructive" className="mt-2">
                                <AlertDescription>{errors.eyeSelection}</AlertDescription>
                            </Alert>
                        )}

                        {/* Child / Derived Orders */}
                        {formData.children?.length > 0 && (
                            <div className="mt-3 border-t pt-3">
                                <div className="flex items-center gap-1.5 mb-2">
                                    <GitBranch className="h-3.5 w-3.5 text-amber-600" />
                                    <span className="text-xs font-semibold">Derived Orders</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    {formData.children.map((child) => (
                                        <button
                                            key={child.id}
                                            type="button"
                                            onClick={() => navigate(`/sales/orders/view/${child.id}`)}
                                            className="flex items-center justify-between rounded-md border px-2 py-1.5 text-xs hover:bg-muted text-left w-full"
                                        >
                                            <span className="font-medium text-primary underline underline-offset-2">
                                                {child.orderNo}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className="text-[10px] px-1 py-0 leading-4 h-4 capitalize"
                                            >
                                                {child.status.replace(/_/g, " ").toLowerCase()}
                                            </Badge>
                                        </button>
                                    ))}
                                </div>
                            </div>
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
                                    disabled={mode !== "add" || isCreditBlocked}
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
                                    disabled={mode !== "add" || isCreditBlocked}
                                    required
                                    error={errors.category_id}
                                />
                                <FormSelect
                                    singleLine={true} label="Lens Name"
                                    name="lens_id"
                                    options={lensProducts}
                                    value={formData.lens_id}
                                    onChange={(value) => handleSelectChange("lens_id", value)}
                                    placeholder={
                                        isLoadingLensProducts ? "Loading..." :
                                            lensProducts.length === 0 ? "Select Type & Category first" :
                                                "Select lens"
                                    }
                                    isSearchable={true}
                                    disabled={mode !== "add" || isLoadingLensProducts || lensProducts.length === 0 || isCreditBlocked}
                                    required
                                    error={errors.lens_id}
                                />



                            </div>

                            {/* Row 2 */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {!formData.onlyLens && (
                                    <FormSelect
                                        singleLine={true} label="Fitting Type"
                                        name="fitting_id"
                                        options={fittings}
                                        value={formData.fitting_id}
                                        onChange={(value) => handleSelectChange("fitting_id", value)}
                                        placeholder="Select fitting"
                                        isSearchable={false}
                                        disabled={mode !== "add" || isCreditBlocked}
                                        required={!formData.freeFitting && !formData.onlyLens}
                                        error={errors.fitting_id}
                                    />
                                )}
                                <FormSelect
                                    singleLine={true} label="Material"
                                    name="material_id"
                                    options={materials}
                                    value={formData.material_id}
                                    onChange={(value) => handleSelectChange("material_id", value)}
                                    placeholder="Material"
                                    isSearchable={false}
                                    disabled={true}
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
                                    disabled={mode !== "add" || isCreditBlocked}
                                    // required
                                    error={errors.tinting_id}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormSelect
                                    singleLine={true}
                                    label="Coating Name"
                                    name="coating_id"
                                    options={filteredCoatings}
                                    value={formData.coating_id}
                                    onChange={(value) => handleSelectChange("coating_id", value)}
                                    placeholder={
                                        isLoadingCoatings ? "Loading..." :
                                            !formData.lens_id ? "Select Lens first" :
                                                "Select coating"
                                    }
                                    isSearchable={true}
                                    disabled={mode !== "add" || !formData.lens_id || isLoadingCoatings || isCreditBlocked}
                                    required
                                    error={errors.coating_id}
                                    containerClassName="flex-1 min-w-0"
                                />
                                <FormInput
                                    singleLine={true}
                                    label="Index"
                                    name="lensProductIndex"
                                    value={lensProductIndexName}
                                    disabled={true}
                                    placeholder="—"
                                // containerClassName="w-[120px] shrink-0"
                                />

                            </div>

                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between gap-3">
                            <div className="flex gap-2 items-center">
                                <CardTitle className="text-base">Eye Specifications</CardTitle>
                                <div
                                    className={`inline-flex items-center gap-2 border border-border rounded-md px-2 py-1.5 bg-muted/50 ${bothEyesDisabled
                                        ? "opacity-50 cursor-not-allowed pointer-events-none"
                                        : "cursor-pointer"
                                        }`}
                                >
                                    <Checkbox
                                        id="bothEyes"
                                        name="bothEyes"
                                        checked={formData.rightEye && formData.leftEye}
                                        onCheckedChange={handleBothEyesChange}
                                        disabled={bothEyesDisabled}
                                    />
                                    <Label htmlFor="bothEyes" className="text-xs font-normal cursor-pointer">
                                        Both Eyes
                                    </Label>
                                </div>
                            </div>
                            {isEditing && !eyeSpecReady && (
                                <p className="text-xs text-amber-600 font-normal text-right shrink-0">
                                    Select Type and Category first to enter eye specifications
                                </p>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-2 ${!eyeSpecReady ? "opacity-40 pointer-events-none select-none" : ""}`}>
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
                                        disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady)}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput
                                            singleLine={true} label="Spherical"
                                            type="number"
                                            step="0.25"
                                            name="rightSpherical"
                                            value={formData.rightSpherical}
                                            onChange={handleChange}
                                            disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.rightEye)}

                                            error={errors.rightSpherical}
                                        />
                                        <FormInput
                                            singleLine={true} label="Cylindrical"
                                            type="number"
                                            step="0.25"
                                            name="rightCylindrical"
                                            value={formData.rightCylindrical}
                                            onChange={handleChange}
                                            disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.rightEye)}
                                            error={errors.rightCylindrical}
                                        />
                                        {formData.rightCylindrical && formData.rightCylindrical != 0 && (
                                            <FormInput
                                                singleLine={true} label="Axis"
                                                type="number"
                                                name="rightAxis"
                                                value={formData.rightAxis}
                                                onChange={handleChange}
                                                disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.rightEye)}
                                                error={errors.rightAxis}
                                            />
                                        )}
                                        {showAddField && (
                                            <FormInput
                                                singleLine={true} label="Add"
                                                type="number"
                                                step="0.25"
                                                name="rightAdd"
                                                value={formData.rightAdd}
                                                onChange={handleChange}
                                                disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.rightEye)}
                                                error={errors.rightAdd}
                                            />
                                        )}
                                        <FormSelect
                                            singleLine={true}
                                            label="Dia"
                                            name="rightDia"
                                            options={dias}
                                            value={getDiaSelectValue(formData.rightDia)}
                                            onChange={(value) => handleEyeDiaChange("right", value)}
                                            placeholder="Select"
                                            isSearchable={true}
                                            isClearable={true}
                                            disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.rightEye)}
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
                                        disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady)}
                                    />

                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput
                                            singleLine={true} label="Spherical"
                                            type="number"
                                            step="0.25"
                                            name="leftSpherical"
                                            value={formData.leftSpherical}
                                            onChange={handleChange}
                                            disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.leftEye)}
                                            error={errors.leftSpherical}
                                        />
                                        <FormInput
                                            singleLine={true} label="Cylindrical"
                                            type="number"
                                            step="0.25"
                                            name="leftCylindrical"
                                            value={formData.leftCylindrical}
                                            onChange={handleChange}
                                            disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.leftEye)}
                                            error={errors.leftCylindrical}
                                        />
                                        {formData.leftCylindrical && formData.leftCylindrical != 0 && (
                                            <FormInput
                                                singleLine={true} label="Axis"
                                                type="number"
                                                name="leftAxis"
                                                value={formData.leftAxis}
                                                onChange={handleChange}
                                                disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.leftEye)}
                                                error={errors.leftAxis}
                                            />
                                        )}
                                        {showAddField && (
                                            <FormInput
                                                singleLine={true} label="Add"
                                                type="number"
                                                step="0.25"
                                                name="leftAdd"
                                                value={formData.leftAdd}
                                                onChange={handleChange}
                                                disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.leftEye)}
                                                error={errors.leftAdd}
                                            />
                                        )}
                                        <FormSelect
                                            singleLine={true}
                                            label="Dia"
                                            name="leftDia"
                                            options={dias}
                                            value={getDiaSelectValue(formData.leftDia)}
                                            onChange={(value) => handleEyeDiaChange("left", value)}
                                            placeholder="Select"
                                            isSearchable={true}
                                            isClearable={true}
                                            disabled={(!(isEditing && formData.status === "DRAFT") || !eyeSpecReady || !formData.leftEye)}
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
                            {isEditing && formData.status === "DRAFT" && <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={handleCalculatePrice}
                                disabled={
                                    isCalculating ||
                                    !formData.customerId ||
                                    !formData.lens_id ||
                                    !formData.coating_id ||
                                    !(formData.rightEye || formData.leftEye)
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
                                    {(effectiveBreakdown?.lensPrice ?? formData.lensPrice) > 0 && (
                                        <FormInput
                                            singleLine={true}
                                            label="Lens Price"
                                            type="number"
                                            name="lensPrice"
                                            value={effectiveBreakdown?.lensPrice ?? formData.lensPrice}
                                            onChange={handleChange}
                                            disabled={true}
                                            helperText={(() => {
                                                if (!formData.offer_id) return null;
                                                const offer = activeOffers.find(o => o.id === formData.offer_id);
                                                if (!offer) return null;
                                                if (offer.offerType === "EXCHANGE_COATING_PRICE") {
                                                    return `Exchange Price using: ${offer.exchangeLensProduct?.lens_name || ""} + ${offer.exchangeCoating?.name || ""}`;
                                                }
                                                if (offer.offerType === "EXCHANGE_PRODUCT") {
                                                    return `Exchange Price using product: ${offer.exchangeLensProduct?.lens_name || ""}`;
                                                }
                                                return null;
                                            })()}
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
                                                        disabled={!(isEditing && formData.status === "DRAFT")}
                                                        onChange={(e) => handleAdditionalPriceChange(index, "name", e.target.value)}
                                                        placeholder="Additional Price"

                                                    />
                                                    <FormInput
                                                        singleLine={true}
                                                        type="number"
                                                        name="value"
                                                        value={priceObj.value}
                                                        disabled={!(isEditing && formData.status === "DRAFT")}
                                                        onChange={(e) => handleAdditionalPriceChange(index, "value", e.target.value)}
                                                    />
                                                    {isEditing && formData.status === "DRAFT" && <Button
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
                                                    </Button>}
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
                                    {isEditing && formData.status === "DRAFT" && <Button
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
                                            {effectiveBreakdown ? (
                                                <>
                                                    {/* Base Lens Price - No breakdown */}
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span>Base Lens Price:</span>
                                                        <span>₹{effectiveBreakdown.baseLensPrice.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>

                                                    {effectiveBreakdown.additionalPriceTotal > 0 && (
                                                        <div className="flex justify-between text-sm">
                                                            <span>Additional Price:</span>
                                                            <span>₹{effectiveBreakdown.additionalPriceTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    <Separator />
                                                    <div className="flex justify-between text-sm font-medium">
                                                        <span>Subtotal:</span>
                                                        <span>₹{effectiveBreakdown.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>

                                                    {effectiveBreakdown.freeLensDeduction > 0 && (
                                                        <div className="flex justify-between text-sm text-red-600">
                                                            <span>Free Lens (Coating)</span>
                                                            <span>-₹{effectiveBreakdown.freeLensDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    {effectiveBreakdown.freeFittingDeduction > 0 && (
                                                        <div className="flex justify-between text-sm text-red-600">
                                                            <span>Free Fitting</span>
                                                            <span>-₹{effectiveBreakdown.freeFittingDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    {/* Regular category discount — hidden when a PERCENTAGE offer is applied */}
                                                    {effectiveBreakdown.discountPercentage > 0 && !effectiveBreakdown.offerType && (
                                                        <div className="flex justify-between text-sm text-red-600">
                                                            <span>Lens Discount ({effectiveBreakdown.discountPercentage}%)</span>
                                                            <span>-₹{effectiveBreakdown.discountAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    {/* Offer discount row */}
                                                    {effectiveBreakdown.offerDiscount > 0 && (
                                                        <div className="flex justify-between text-sm text-green-700 font-medium">
                                                            <span>
                                                                {effectiveBreakdown.offerType === "PERCENTAGE"
                                                                    ? `Offer: ${effectiveBreakdown.offerPercentage}% (${effectiveBreakdown.offerName})`
                                                                    : `Offer: ${effectiveBreakdown.offerName}`}
                                                            </span>
                                                            <span>-₹{effectiveBreakdown.offerDiscount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                        </div>
                                                    )}

                                                    <Separator />
                                                    <div className="flex justify-between font-semibold text-base">
                                                        <span>Total Amount:</span>
                                                        <span className="text-green-600">₹{effectiveBreakdown.finalTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
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
                                                        <span>Lens Discount ({formData.discount}%):</span>
                                                        <span>-₹{((!formData.freeLens ? (formData.lensPrice || 0) : 0) * (formData.discount || 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                                                    </div>
                                                    <Separator />
                                                    <div className="flex justify-between font-semibold">
                                                        <span>Total Amount:</span>
                                                        <span className="text-green-600">₹{(
                                                            (!formData.freeLens ? (formData.lensPrice || 0) : 0)
                                                            - ((!formData.freeLens ? (formData.lensPrice || 0) : 0) * (formData.discount || 0) / 100)
                                                            + (formData.rightEyeExtra || 0)
                                                            + (formData.leftEyeExtra || 0)
                                                            + (!formData.freeFitting ? (formData.fittingPrice || 0) : 0)
                                                            + (formData.tintingPrice || 0)
                                                            + (formData.additionalPrice?.reduce((acc, curr) => Number(acc) + (Number(curr.value) || 0), 0) || 0)
                                                        ).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
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

            {/* Print Preview Modal */}
            <SaleOrderPrintModal
                isOpen={isPrintModalOpen}
                onClose={closePrintModal}
                onConfirm={handlePrintConfirm}
                saleOrder={formData}
                coatings={coatings}
                isPrinting={isPrinting}
            />

            {/* FIFO Inventory Item Pick Modal */}
            <Dialog open={isFifoModalOpen} onOpenChange={setIsFifoModalOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Package className="h-5 w-5 text-blue-600" />
                            Inventory Stock Pick (FIFO Allocation)
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        <p className="text-sm text-slate-500">
                            Select the matching available lenses physically being taken from inventory to start fitting for Sale Order <strong className="text-slate-800">{formData.orderNo}</strong>.
                        </p>

                        {/* Right Eye Stock Section */}
                        {formData.rightEye && (
                            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">R</Badge>
                                        Right Eye Specs:
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                            SPH: {formData.rightSpherical} | CYL: {formData.rightCylindrical} {formData.rightAdd ? `| ADD: ${formData.rightAdd}` : ""}
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
                                                        onClick={() => setSelectedFifoItems(prev => ({ ...prev, rightEyeItemId: item.id }))}
                                                        className={`hover:bg-slate-50/50 cursor-pointer ${selectedFifoItems.rightEyeItemId === item.id ? "bg-blue-50/30 font-medium" : ""}`}
                                                    >
                                                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="radio"
                                                                name="rightEyeItem"
                                                                checked={selectedFifoItems.rightEyeItemId === item.id}
                                                                onChange={() => setSelectedFifoItems(prev => ({ ...prev, rightEyeItemId: item.id }))}
                                                                className="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-slate-700 flex items-center gap-2">
                                                            {idx === 0 && (
                                                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">Oldest / FIFO</Badge>
                                                            )}
                                                            {new Date(item.inwardDate).toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </td>
                                                        <td className="p-3 font-semibold text-slate-800">
                                                            {item.tray ? `${item.tray.name} (Cap: ${item.tray.capacity})` : "N/A"}
                                                        </td>
                                                        <td className="p-3 text-slate-600">
                                                            {item.location ? item.location.name : "N/A"}
                                                        </td>
                                                        <td className="p-3 text-right font-medium text-slate-700">
                                                            {item.quantity}
                                                        </td>
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
                        {formData.leftEye && (
                            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                    <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                                        <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 border-purple-200">L</Badge>
                                        Left Eye Specs:
                                        <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                            SPH: {formData.leftSpherical} | CYL: {formData.leftCylindrical} {formData.leftAdd ? `| ADD: ${formData.leftAdd}` : ""}
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
                                                        onClick={() => setSelectedFifoItems(prev => ({ ...prev, leftEyeItemId: item.id }))}
                                                        className={`hover:bg-slate-50/50 cursor-pointer ${selectedFifoItems.leftEyeItemId === item.id ? "bg-purple-50/30 font-medium" : ""}`}
                                                    >
                                                        <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <input
                                                                type="radio"
                                                                name="leftEyeItem"
                                                                checked={selectedFifoItems.leftEyeItemId === item.id}
                                                                onChange={() => setSelectedFifoItems(prev => ({ ...prev, leftEyeItemId: item.id }))}
                                                                className="h-4 w-4 text-purple-600 border-slate-300 focus:ring-purple-500"
                                                            />
                                                        </td>
                                                        <td className="p-3 text-slate-700 flex items-center gap-2">
                                                            {idx === 0 && (
                                                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border border-amber-200 text-[10px] py-0 px-1.5 uppercase font-bold">Oldest / FIFO</Badge>
                                                            )}
                                                            {new Date(item.inwardDate).toLocaleDateString("en-IN", {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric"
                                                            })}
                                                        </td>
                                                        <td className="p-3 font-semibold text-slate-800">
                                                            {item.tray ? `${item.tray.name} (Cap: ${item.tray.capacity})` : "N/A"}
                                                        </td>
                                                        <td className="p-3 text-slate-600">
                                                            {item.location ? item.location.name : "N/A"}
                                                        </td>
                                                        <td className="p-3 text-right font-medium text-slate-700">
                                                            {item.quantity}
                                                        </td>
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
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsFifoModalOpen(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={
                                isSaving ||
                                (formData.rightEye && !selectedFifoItems.rightEyeItemId) ||
                                (formData.leftEye && !selectedFifoItems.leftEyeItemId)
                            }
                            onClick={handleFifoConfirm}
                        >
                            {isSaving ? "Processing..." : "Confirm & Move to Fitting"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div >
    );
}
