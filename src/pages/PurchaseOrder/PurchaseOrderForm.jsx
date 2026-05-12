import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  generatePONumber,
} from "@/services/purchaseOrder";
import { getVendorDropdown, getVendorLocation } from "@/services/vendor";
import {
  getLensProductsDropdown,
  getLensCategoriesDropdown,
  getLensTypesDropdown,
  getLensDiaDropdown,
  getLensFittingsDropdown,
  getLensCoatingsDropdown,
  getLensTintingsDropdown,
  getSaleOrdersDropdown,
  getLensProductsFiltered,
  getLensCoatingsByLensProduct,
} from "@/services/saleOrder";
import { defaultPurchaseOrder, activeStatusOptions, statusOptions, purchaseTypeOptions, orderTypeOptions } from "./PurchaseOrder.constants";
import BulkLensSelection from "./BulkLensSelection";

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const location = useLocation();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultPurchaseOrder);
  const [originalData, setOriginalData] = useState(defaultPurchaseOrder);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentOrderType, setCurrentOrderType] = useState(null); // Track actual order type from data
  const [showTabs, setShowTabs] = useState(true); // Control tab visibility

  // Dropdown data
  const [vendors, setVendors] = useState([]);
  const [saleOrders, setSaleOrders] = useState([]);
  const [lensProducts, setLensProducts] = useState([]);
  const [lensCategories, setLensCategories] = useState([]);
  const [lensTypes, setLensTypes] = useState([]);
  const [lensDias, setLensDias] = useState([]);
  const [lensFittings, setLensFittings] = useState([]);
  const [lensCoatings, setLensCoatings] = useState([]);
  const [lensTintings, setLensTintings] = useState([]);
  // Filtered dropdown data (cascade)
  const [filteredLensProducts, setFilteredLensProducts] = useState(null); // null = show all
  const [filteredLensCoatings, setFilteredLensCoatings] = useState(null); // null = show all

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const [
          vendorResponse,
          saleOrderResponse,
          lensProductResponse,
          lensCategoryResponse,
          lensTypeResponse,
          lensDiaResponse,
          lensFittingResponse,
          lensCoatingResponse,
          lensTintingResponse,
        ] = await Promise.all([
          getVendorDropdown(),
          getSaleOrdersDropdown(),
          getLensProductsDropdown(),
          getLensCategoriesDropdown(),
          getLensTypesDropdown(),
          getLensDiaDropdown(),
          getLensFittingsDropdown(),
          getLensCoatingsDropdown(),
          getLensTintingsDropdown(),
        ]);

        if (vendorResponse.success) setVendors(vendorResponse.data);
        if (saleOrderResponse.success) setSaleOrders(saleOrderResponse.data);
        if (lensProductResponse.success) setLensProducts(lensProductResponse.data);
        if (lensCategoryResponse.success) setLensCategories(lensCategoryResponse.data);
        if (lensTypeResponse.success) setLensTypes(lensTypeResponse.data);
        if (lensDiaResponse.success) setLensDias(lensDiaResponse.data);
        if (lensFittingResponse.success) setLensFittings(lensFittingResponse.data);
        if (lensCoatingResponse.success) setLensCoatings(lensCoatingResponse.data);
        if (lensTintingResponse.success) setLensTintings(lensTintingResponse.data);

        // Set default Type_id for new orders based on initial orderType
        // Skip when pre-filling from a Sale Order (it carries its own Type_id)
        if (mode === "add" && lensTypeResponse.success && !location.state?.fromSaleOrder) {
          const initialOrderType = "Bulk"; // default tab
          const targetName = initialOrderType === "Bulk" ? "STOCK" : "RX";
          const match = lensTypeResponse.data.find(
            (t) => (t.name || t.label || "").toUpperCase() === targetName
          );
          if (match) {
            setFormData(prev => ({ ...prev, Type_id: match.id ?? match.value }));
          }
        }
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        toast({
          title: "Warning",
          description: "Failed to load some dropdown options",
          variant: "destructive",
        });
      }
    };

    fetchDropdownData();
  }, []);

  // Pre-fill form when navigating from "Create & Rise Po" on the Sale Order form
  useEffect(() => {
    if (mode === "add" && location.state?.fromSaleOrder) {
      const so = location.state.fromSaleOrder;
      const qty = (so.rightEye ? 0.5 : 0) + (so.leftEye ? 0.5 : 0) || 1;
      setFormData((prev) => ({
        ...prev,
        saleOrderId: so.id ?? null,
        orderType: "Single",
        lens_id: so.lens_id ?? null,
        category_id: so.category_id ?? null,
        Type_id: so.Type_id ?? null,
        dia_id: so.dia_id ?? null,
        fitting_id: so.fitting_id ?? null,
        coating_id: so.coating_id ?? null,
        tinting_id: so.tinting_id ?? null,
        rightEye: so.rightEye ?? false,
        leftEye: so.leftEye ?? false,
        rightSpherical: so.rightSpherical || "",
        rightCylindrical: so.rightCylindrical || "",
        rightAxis: so.rightAxis || "",
        rightAdd: so.rightAdd || "",
        rightDia: so.rightDia || "",
        leftSpherical: so.leftSpherical || "",
        leftCylindrical: so.leftCylindrical || "",
        leftAxis: so.leftAxis || "",
        leftAdd: so.leftAdd || "",
        leftDia: so.leftDia || "",
        quantity: qty,
        itemDescription: so.orderNo || "",
        notes: so.remark || "",
      }));
      setCurrentOrderType("Single");
      setShowTabs(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Generate PO Number for new orders
  useEffect(() => {
    const fetchPONumber = async () => {
      if (mode === "add") {
        try {
          const response = await generatePONumber();
          if (response.success) {
            setFormData((prev) => ({ ...prev, poNumber: response.data.poNumber }));
          }
        } catch (error) {
          console.error("Error generating PO number:", error);
        }
      }
    };

    fetchPONumber();
  }, [mode]);

  // Fetch purchase order data for view/edit modes
  useEffect(() => {
    const fetchPurchaseOrder = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getPurchaseOrderById(parseInt(id));

          if (response.success) {
            const po = response.data;
            // Convert backend bulk selection format to frontend format
            let convertedBulkSelection = null;
            if (po.lensBulkSelection && Array.isArray(po.lensBulkSelection)) {
              const selections = {};
              let minSph = Infinity, maxSph = -Infinity;
              let minCyl = Infinity, maxCyl = -Infinity;
              let minAdd = Infinity, maxAdd = -Infinity;
              let hasAdd = false;

              po.lensBulkSelection.forEach(item => {
                // Progressive items have an `add` field; Single/Bifocal use `cylindrical`
                const colPart = (item.add != null) ? `add_${item.add}` : `cyl_${item.cylindrical}`;
                const eyePart = item.eye ? `_${item.eye}` : '';
                const key = `sph_${item.spherical}_${colPart}${eyePart}`;

                if (item.eye) {
                  // Per-eye entry (Bifocal / Progressive)
                  if (!selections[key]) selections[key] = {};
                  selections[key][item.eye] = item.quantity;
                } else {
                  selections[key] = { quantity: item.quantity, unitPrice: item.unitPrice };
                }

                minSph = Math.min(minSph, item.spherical);
                maxSph = Math.max(maxSph, item.spherical);
                if (item.add != null) {
                  hasAdd = true;
                  minAdd = Math.min(minAdd, item.add);
                  maxAdd = Math.max(maxAdd, item.add);
                } else {
                  minCyl = Math.min(minCyl, item.cylindrical);
                  maxCyl = Math.max(maxCyl, item.cylindrical);
                }
              });

              convertedBulkSelection = {
                eyeSelection: "Both",
                additionWise: false,
                ranges: {
                  sphFrom: isFinite(minSph) ? minSph : 0,
                  sphTo: isFinite(maxSph) ? maxSph : 2,
                  cylFrom: hasAdd ? "" : (isFinite(minCyl) ? minCyl : 0),
                  cylTo: hasAdd ? "" : (isFinite(maxCyl) ? maxCyl : 2),
                  addFrom: hasAdd ? (isFinite(minAdd) ? minAdd : 0) : "",
                  addTo: hasAdd ? (isFinite(maxAdd) ? maxAdd : 2) : "",
                },
                selections: selections
              };
            }

            const poData = {
              taxType: "Amount",
              taxPercentage: 0,
              poNumber: po.poNumber || "",
              reference_id: po.reference_id || "",
              vendorId: po.vendorId || null,
              saleOrderId: po.saleOrderId || null,
              lens_id: po.lens_id || null,
              category_id: po.category_id || null,
              Type_id: po.Type_id || null,
              dia_id: po.dia_id || null,
              fitting_id: po.fitting_id || null,
              coating_id: po.coating_id || null,
              tinting_id: po.tinting_id || null,
              rightEye: po.rightEye || false,
              leftEye: po.leftEye || false,
              rightSpherical: po.rightSpherical || "",
              rightCylindrical: po.rightCylindrical || "",
              rightAxis: po.rightAxis || "",
              rightAdd: po.rightAdd || "",
              rightDia: po.rightDia || "",
              rightBase: po.rightBase || "",
              rightBaseSize: po.rightBaseSize || "",
              rightBled: po.rightBled || "",
              leftSpherical: po.leftSpherical || "",
              leftCylindrical: po.leftCylindrical || "",
              leftAxis: po.leftAxis || "",
              leftAdd: po.leftAdd || "",
              leftDia: po.leftDia || "",
              leftBase: po.leftBase || "",
              leftBaseSize: po.leftBaseSize || "",
              leftBled: po.leftBled || "",
              quantity: po.quantity || 1,
              unitPrice: po.unitPrice || 0,
              subtotal: po.subtotal || 0,
              discountPercentage: po.discountPercentage || 0,
              taxAmount: po.taxAmount || 0,
              roundOff: po.roundOff || 0,
              totalValue: po.totalValue || 0,
              supplierInvoiceNo: po.supplierInvoiceNo || "",
              purchaseType: po.purchaseType || "",
              placeOfSupply: po.placeOfSupply || "",
              itemDescription: po.itemDescription || "",
              taxAccount: po.taxAccount || "",
              orderDate: po.orderDate ? po.orderDate.split("T")[0] : "",
              expectedDeliveryDate: po.expectedDeliveryDate ? po.expectedDeliveryDate.split("T")[0] : "",
              actualDeliveryDate: po.actualDeliveryDate ? po.actualDeliveryDate.split("T")[0] : "",
              status: po.status || "PENDING",
              notes: po.notes || "",
              narration: po.narration || "",
              orderType: po.orderType || "Single",
              lensBulkSelection: convertedBulkSelection,
              activeStatus: po.activeStatus !== undefined ? po.activeStatus : true,
            };

            // Set current order type from existing data
            setCurrentOrderType(po.orderType || "Single");

            // Hide tabs in view/edit mode - show only the form for existing order type
            setShowTabs(false);

            setFormData(poData);
            setOriginalData(poData);
          } else {
            toast({
              title: "Error",
              description: "Purchase order not found",
              variant: "destructive",
            });
            window.close();
          }
        } catch (error) {
          console.error("Error fetching purchase order:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch purchase order details",
            variant: "destructive",
          });
          window.close();
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPurchaseOrder();
  }, [id, mode, navigate]);

  // Reactively load filtered lens products when Type + Category both selected (same as SaleOrderForm)
  useEffect(() => {
    if (formData.Type_id && formData.category_id) {
      loadFilteredLensProducts();
    } else {
      setFilteredLensProducts(null);
    }
  }, [formData.Type_id, formData.category_id]);

  // Reactively load filtered coatings when lens product is selected
  useEffect(() => {
    if (formData.lens_id) {
      loadFilteredCoatings(formData.lens_id);
    } else {
      setFilteredLensCoatings(null);
    }
  }, [formData.lens_id]);

  const loadFilteredLensProducts = async () => {
    try {
      const response = await getLensProductsFiltered(formData.Type_id, formData.category_id);
      if (response.success) setFilteredLensProducts(response.data || []);
      else setFilteredLensProducts([]);
    } catch (e) {
      console.error("Failed to fetch filtered lens products:", e);
      setFilteredLensProducts([]);
    }
  };

  const loadFilteredCoatings = async (lensId) => {
    try {
      const response = await getLensCoatingsByLensProduct(lensId);
      if (response.success) setFilteredLensCoatings(response.data || []);
      else setFilteredLensCoatings([]);
    } catch (e) {
      console.error("Failed to fetch coatings for lens product:", e);
      setFilteredLensCoatings([]);
    }
  };

  // Calculate pricing when relevant fields change
  useEffect(() => {
    const calculatePricing = () => {
      const quantity = parseFloat(formData.quantity) || 0;
      const unitPrice = parseFloat(formData.unitPrice) || 0;
      const subtotal = quantity * unitPrice;

      let taxValue = 0;
      if (formData.taxType === "Percent") {
        taxValue = (subtotal * (parseFloat(formData.taxPercentage) || 0)) / 100;
      } else {
        taxValue = parseFloat(formData.taxAmount) || 0;
      }

      const totalValue = subtotal + taxValue;

      setFormData((prev) => ({
        ...prev,
        subtotal: subtotal.toFixed(2),
        totalValue: totalValue.toFixed(2),
      }));
    };

    calculatePricing();
  }, [formData.quantity, formData.unitPrice, formData.taxAmount, formData.taxPercentage, formData.taxType]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.vendorId) {
      newErrors.vendorId = "Vendor is required";
    }

    // Lens Details are required for both single and bulk orders
    if (!formData.lens_id) {
      newErrors.lens_id = "Lens Product is required";
    }

    if (!formData.category_id) {
      newErrors.category_id = "Category is required";
    }

    if (!formData.Type_id) {
      newErrors.Type_id = "Type is required";
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    // Unit price is optional but if provided, cannot be negative
    if (formData.unitPrice && parseFloat(formData.unitPrice) < 0) {
      newErrors.unitPrice = "Unit price cannot be negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Handle vendor change - auto-fill place of supply from vendor's city/state
  const handleVendorChange = async (value) => {
    setFormData((prev) => ({ ...prev, vendorId: value }));
    if (errors.vendorId) {
      setErrors((prev) => ({ ...prev, vendorId: "" }));
    }

    if (value) {
      try {
        const location = await getVendorLocation(value);
        if (location.success) {
          const placeOfSupply = [location.city, location.state]
            .filter(Boolean)
            .join(", ");
          if (placeOfSupply) {
            setFormData((prev) => ({ ...prev, vendorId: value, placeOfSupply }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch vendor location:", e);
      }
    }
  };

  // Handle order type change
  const handleOrderTypeChange = (newOrderType) => {
    setFilteredLensProducts(null);
    setFilteredLensCoatings(null);
    setFormData(prev => {
      const updated = { ...prev, orderType: newOrderType };

      // Auto-set default type based on order type
      const targetName = newOrderType === "Bulk" ? "STOCK" : "RX";
      const match = lensTypes.find(
        (t) => (t.name || t.label || "").toUpperCase() === targetName
      );
      if (match) {
        updated.Type_id = match.id ?? match.value;
      }

      // Reset lens-dependent fields on type switch
      updated.lens_id = null;
      updated.category_id = null;
      updated.coating_id = null;
      updated.tinting_id = null;
      updated.dia_id = null;
      updated.quantity = 0;
      updated.unitPrice = 0;

      // Clear bulk selection when switching to single
      if (newOrderType === "Single") {
        updated.lensBulkSelection = null;
      }

      return updated;
    });
  };

  // Handle category change — fetch filtered lens products, reset dependent fields
  const handleCategoryChange = async (value) => {
    setFormData(prev => ({
      ...prev,
      category_id: value,
      lens_id: null,
      coating_id: null,
      tinting_id: null,
      dia_id: null,
      quantity: 0,
      unitPrice: 0,
    }));
    setFilteredLensCoatings(null);
    if (errors.category_id) setErrors(prev => ({ ...prev, category_id: "" }));
    // Filtering is handled reactively by the useEffect watching [Type_id, category_id]
  };

  // Handle lens product change — coatings are loaded reactively by useEffect watching [lens_id]
  const handleLensProductChange = (value) => {
    setFormData(prev => ({ ...prev, lens_id: value, coating_id: null }));
    setFilteredLensCoatings(null);
    if (errors.lens_id) setErrors(prev => ({ ...prev, lens_id: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      // Prepare data for API submission
      const submitData = { ...formData };

      // Compute final taxAmount when using percentage mode, then strip UI-only fields
      if (formData.taxType === "Percent") {
        const subtotal = parseFloat(formData.subtotal) || 0;
        submitData.taxAmount = ((subtotal * (parseFloat(formData.taxPercentage) || 0)) / 100).toFixed(2);
      }
      delete submitData.taxType;
      delete submitData.taxPercentage;

      // For bulk orders, ensure lensBulkSelection is properly formatted
      if (formData.orderType === "Bulk") {
        // Validate bulk selection
        if (!formData.lensBulkSelection || !formData.lensBulkSelection.selections || Object.keys(formData.lensBulkSelection.selections).length === 0) {
          toast({
            title: "Error",
            description: "Please configure bulk lens selection",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }
        console.log("Bulk selection data to submit:", formData);
        // Convert bulk selection object to array for backend processing
        // Values can be: number, { quantity: N }, or per-eye { L: N, R: N }
        const getQty = (val) => {
          if (!val) return 0;
          if (typeof val === 'number') return val;
          if (val.quantity != null) return parseFloat(val.quantity) || 0;
          // per-eye object e.g. { L: 1 } or { R: 2 }
          return Object.values(val).reduce((s, v) => s + (parseFloat(v) || 0), 0);
        };

        const bulkArray = Object.entries(formData.lensBulkSelection.selections || {})
          .filter(([key, value]) => getQty(value) > 0)
          .map(([key, data]) => {
            const keyParts = key.split('_');
            const sphIndex = keyParts.findIndex(part => part === 'sph');
            const cylIndex = keyParts.findIndex(part => part === 'cyl');
            const addIndex = keyParts.findIndex(part => part === 'add');

            // Detect L/R eye suffix (Bifocal / Progressive per-eye grids)
            const lastPart = keyParts[keyParts.length - 1];
            const eye = (lastPart === 'L' || lastPart === 'R') ? lastPart : null;

            const spherical = sphIndex !== -1 ? keyParts[sphIndex + 1] : '0';
            const cylindrical = cylIndex !== -1 ? keyParts[cylIndex + 1] : '0';
            const add = addIndex !== -1 ? keyParts[addIndex + 1] : null;

            const item = {
              spherical: parseFloat(spherical),
              cylindrical: parseFloat(cylindrical),
              quantity: getQty(data),
              unitPrice: parseFloat(data?.unitPrice || formData.unitPrice) || 0
            };
            // Store add value for Progressive lenses
            if (add !== null) item.add = parseFloat(add);
            // Store eye side for per-eye grids (Bifocal / Progressive)
            if (eye) item.eye = eye;
            return item;
          });

        if (bulkArray.length === 0) {
          toast({
            title: "Error",
            description: "Please add at least one lens quantity in bulk selection",
            variant: "destructive",
          });
          setIsSaving(false);
          return;
        }

        submitData.lensBulkSelection = bulkArray;
      } else {
        // For single orders, remove bulk selection data
        submitData.lensBulkSelection = null;
      }

      if (mode === "add") {
        // Create new purchase order
        const response = await createPurchaseOrder(submitData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Purchase order created successfully!",
          });
          window.close();
        } else {
          throw new Error(response.message || "Failed to create purchase order");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing purchase order
        const response = await updatePurchaseOrder(parseInt(id), submitData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Purchase order updated successfully!",
          });

          setOriginalData(formData);
          setIsEditing(false);
          window.close();
        } else {
          throw new Error(response.message || "Failed to update purchase order");
        }
      }
    } catch (error) {
      console.error("Error saving purchase order:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save purchase order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      window.close();
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        window.close();
      }
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      setFormData(originalData);
      setErrors({});
    }
    setIsEditing(!isEditing);
  };

  const isReadOnly = mode === "view" && !isEditing;

  // Render common purchase form fields
  // Basic form for bulk orders (without individual lens selection)
  const renderBasicPurchaseForm = () => (
    <div className="flex flex-col md:flex-row gap-4 h-full md:overflow-hidden">
      {/* Left Column - Order Info, Dates, Pricing, Invoice */}
      <div className="md:w-[35%] flex flex-col gap-3 md:h-full md:overflow-y-auto md:overflow-x-hidden">
        {/* Order Information */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <FormInput
              label="PO Number"
              name="poNumber"
              value={formData.poNumber}
              onChange={handleChange}
              disabled={true}
              required
              singleLine
            />
            <FormInput
              label="Reference ID (Optional)"
              name="reference_id"
              value={formData.reference_id}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="e.g., PUR1548"
              singleLine
            />
            <FormSelect
              label="Vendor"
              name="vendorId"
              options={vendors}
              value={formData.vendorId}
              onChange={handleVendorChange}
              placeholder="Select vendor"
              isSearchable={true}
              isClearable={false}
              disabled={isReadOnly}
              required
              error={errors.vendorId}
              singleLine
            />
            <FormSelect
              label="Status"
              name="status"
              options={statusOptions}
              value={formData.status}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, status: value }));
              }}
              placeholder="Select status"
              isSearchable={false}
              isClearable={false}
              disabled={true}
              required
              singleLine
            />
            <FormSelect
              label="Active Status"
              name="activeStatus"
              options={activeStatusOptions.map((opt) => ({
                id: opt.value,
                name: opt.label,
              }))}
              value={formData.activeStatus}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, activeStatus: value }));
              }}
              placeholder="Select status"
              isSearchable={false}
              isClearable={false}
              disabled={isReadOnly}
              required
              singleLine
            />
          </CardContent>
        </Card>

        {/* Dates & Notes */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Dates & Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <FormInput
              label="Order Date"
              name="orderDate"
              type="date"
              value={formData.orderDate}
              onChange={handleChange}
              disabled={isReadOnly}
              singleLine
            />
            <FormInput
              label="Expected Delivery (Optional)"
              name="expectedDeliveryDate"
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={handleChange}
              disabled={isReadOnly}
              singleLine
            />
            {/* <FormInput
              label="Actual Delivery (Optional)"
              name="actualDeliveryDate"
              type="date"
              value={formData.actualDeliveryDate}
              onChange={handleChange}
              disabled={isReadOnly}
              singleLine
            /> */}
            <FormTextarea
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={isReadOnly}
              rows={2}
              placeholder="Any additional notes"
              singleLine
            />
          </CardContent>
        </Card>

        {/* Pricing Details — moved to Receive Order */}
        {/* {renderPricingDetails()} */}

        {/* Supplier Invoice Details — moved to Receive Order */}
        {/* {renderSupplierInvoiceDetails()} */}

        {/* Order Quantity Summary */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Order Quantity</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total Qty (from grid)</span>
              <span className={`text-lg font-bold ${parseFloat(formData.quantity) > 0 ? "text-primary" : "text-destructive"
                }`}>
                {parseFloat(formData.quantity) || 0}
              </span>
            </div>
            {(!formData.quantity || parseFloat(formData.quantity) <= 0) && (
              <p className="text-xs text-destructive mt-1">Enter quantities in the lens grid →</p>
            )}
            {errors.quantity && (
              <p className="text-xs text-destructive mt-1">{errors.quantity}</p>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Right Column - Lens Details, Bulk Selection */}
      <div className="md:w-[65%] flex flex-col gap-3 md:h-full md:overflow-auto pb-3">
        {/* Lens Details for Bulk */}
        {renderLensDetails(false, true)}

        {/* Bulk Lens Selection */}
        <BulkLensSelection
          value={formData.lensBulkSelection}
          onChange={(value) => {
            // Sum all quantities across cells
            const totalQty = Object.values(value.selections || {}).reduce((sum, sel) => {
              if (sel && typeof sel === 'object') {
                if ('quantity' in sel) return sum + (parseInt(sel.quantity) || 0);
                return sum + Object.values(sel).reduce((s, v) => s + (parseInt(v) || 0), 0);
              }
              return sum + (parseInt(sel) || 0);
            }, 0);
            setFormData(prev => ({
              ...prev,
              lensBulkSelection: value,
              quantity: totalQty > 0 ? totalQty : prev.quantity,
            }));
          }}
          disabled={isReadOnly}
          categoryName={lensCategories.find(c => String(c.id) === String(formData.category_id))?.label || ""}
          lensId={formData.lens_id}
        />
      </div>
    </div>
  );

  const renderPurchaseForm = () => (
    <div className="flex flex-col md:flex-row gap-4 h-full md:overflow-hidden">
      {/* Left Column - Order Info, Dates, Pricing, Invoice */}
      <div className="md:w-[35%] flex flex-col gap-3 md:h-full md:overflow-y-auto md:overflow-x-hidden">
        {/* Order Information */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <FormInput
              label="PO Number"
              name="poNumber"
              value={formData.poNumber}
              onChange={handleChange}
              disabled={true}
              required
              singleLine
            />
            <FormInput
              label="Reference ID (Optional)"
              name="reference_id"
              value={formData.reference_id}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="e.g., PUR1548"
              singleLine
            />
            <FormSelect
              label="Vendor"
              name="vendorId"
              options={vendors}
              value={formData.vendorId}
              onChange={handleVendorChange}
              placeholder="Select vendor"
              isSearchable={true}
              isClearable={false}
              disabled={isReadOnly}
              required
              error={errors.vendorId}
              singleLine
            />
            <FormSelect
              label="Sale Order (Optional)"
              name="saleOrderId"
              options={saleOrders}
              value={formData.saleOrderId}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, saleOrderId: value }));
                if (errors.saleOrderId) {
                  setErrors((prev) => ({ ...prev, saleOrderId: "" }));
                }
              }}
              placeholder="Search and select sale order..."
              isSearchable={true}
              isClearable={true}
              disabled={isReadOnly || !!location.state?.fromSaleOrder}
              error={errors.saleOrderId}
              singleLine
            />
            <FormSelect
              label="Status"
              name="status"
              options={statusOptions}
              value={formData.status}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, status: value }));
              }}
              placeholder="Select status"
              isSearchable={false}
              isClearable={false}
              disabled={true}
              required
              singleLine
            />
            <FormSelect
              label="Active Status"
              name="activeStatus"
              options={activeStatusOptions.map((opt) => ({
                id: opt.value,
                name: opt.label,
              }))}
              value={formData.activeStatus}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, activeStatus: value }));
              }}
              placeholder="Select status"
              isSearchable={false}
              isClearable={false}
              disabled={isReadOnly}
              required
              singleLine
            />
          </CardContent>
        </Card>

        {/* Dates & Notes */}
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Dates & Notes</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-2">
            <FormInput
              label="Order Date"
              name="orderDate"
              type="date"
              value={formData.orderDate}
              onChange={handleChange}
              disabled={isReadOnly}
              singleLine
            />
            <FormInput
              label="Expected Delivery (Optional)"
              name="expectedDeliveryDate"
              type="date"
              value={formData.expectedDeliveryDate}
              onChange={handleChange}
              disabled={isReadOnly}
              singleLine
            />
            {/* <FormInput
              label="Actual Delivery (Optional)"
              name="actualDeliveryDate"
              type="date"
              value={formData.actualDeliveryDate}
              onChange={handleChange}
              disabled={isReadOnly}
              singleLine
            /> */}
            <FormTextarea
              label="Notes (Optional)"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={isReadOnly}
              rows={2}
              placeholder="Any additional notes"
              singleLine
            />
          </CardContent>
        </Card>

        {/* Pricing Details — moved to Receive Order */}
        {/* {renderPricingDetails()} */}

        {/* Supplier Invoice Details — moved to Receive Order */}
        {/* {renderSupplierInvoiceDetails()} */}

        {mode === "add" && (
          <Alert className="bg-primary/5 border-primary/20">
            <AlertDescription className="text-xs">
              Fields marked with <span className="text-destructive">*</span> are required.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Right Column - Lens Details, Eye Specs */}
      <div className="md:w-[65%] flex flex-col gap-3 md:h-full md:overflow-auto pb-3">
        {renderLensDetails()}
        {renderEyeSpecifications()}
      </div>
    </div>
  );

  const renderLensDetails = (showEyeSelection = true, isBulk = false) => {
    const productsToShow = filteredLensProducts !== null ? filteredLensProducts : lensProducts;
    const coatingsToShow = filteredLensCoatings !== null ? filteredLensCoatings : lensCoatings;
    const lensProductDisabled = isReadOnly || !formData.Type_id || !formData.category_id;
    return (
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Lens Details</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Type"
              name="Type_id"
              options={lensTypes}
              value={formData.Type_id}
              onChange={(value) => {
                setFormData((prev) => ({ ...prev, Type_id: value }));
                if (errors.Type_id) {
                  setErrors((prev) => ({ ...prev, Type_id: "" }));
                }
              }}
              placeholder="Select type"
              isSearchable={true}
              isClearable={true}
              disabled={true}
              required
              error={errors.Type_id}
            />

            <FormSelect
              label="Category"
              name="category_id"
              options={lensCategories}
              value={formData.category_id}
              onChange={handleCategoryChange}
              placeholder="Select category"
              isSearchable={true}
              isClearable={true}
              disabled={mode !== "add"}
              required
              error={errors.category_id}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormSelect
              label="Lens Product"
              name="lens_id"
              options={productsToShow}
              value={formData.lens_id}
              onChange={handleLensProductChange}
              placeholder={lensProductDisabled && !isReadOnly ? "Select Category first" : "Select lens product"}
              isSearchable={true}
              isClearable={true}
              disabled={!(!lensProductDisabled && mode === "add")}
              required
              error={errors.lens_id}
            />
            <FormSelect
              label="Coating (Optional)"
              name="coating_id"
              options={coatingsToShow}
              value={formData.coating_id}
              onChange={(value) => setFormData((prev) => ({ ...prev, coating_id: value }))}
              placeholder={!formData.lens_id && !isReadOnly ? "Select Lens Product first" : "Select coating"}
              isSearchable={true}
              isClearable={true}
              disabled={mode !== "add"}
            />


            {/* <FormSelect
            label="Fitting (Optional)"
            name="fitting_id"
            options={lensFittings}
            value={formData.fitting_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, fitting_id: value }))}
            placeholder="Select fitting"
            isSearchable={true}
            isClearable={true}
            disabled={isReadOnly}
          /> */}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">


            {!isBulk && (
              <FormSelect
                label="Tinting (Optional)"
                name="tinting_id"
                options={lensTintings}
                value={formData.tinting_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, tinting_id: value }))}
                placeholder="Select tinting"
                isSearchable={true}
                isClearable={true}
                disabled={mode !== "add"}
              />
            )}

            
            {/* {!isBulk && (
              <FormSelect
                label="Dia (Optional)"
                name="dia_id"
                options={lensDias}
                value={formData.dia_id}
                onChange={(value) => setFormData((prev) => ({ ...prev, dia_id: value }))}
                placeholder="Select dia"
                isSearchable={true}
                isClearable={true}
                disabled={isReadOnly}
              />
            )} */}
          </div>

          {/* Eye Selection */}
          {showEyeSelection && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Eye Selection</Label>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rightEye"
                    name="rightEye"
                    checked={formData.rightEye}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, rightEye: checked }))
                    }
                    disabled={isReadOnly}
                  />
                  <label
                    htmlFor="rightEye"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Right Eye
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="leftEye"
                    name="leftEye"
                    checked={formData.leftEye}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, leftEye: checked }))
                    }
                    disabled={isReadOnly}
                  />
                  <label
                    htmlFor="leftEye"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Left Eye
                  </label>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderEyeSpecifications = () => {
    if (!formData.rightEye && !formData.leftEye) return null;

    return (
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Eye Specifications</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          {formData.rightEye && (
            <>
              <h4 className="text-sm font-medium text-muted-foreground">Right Eye</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormInput label="Spherical" name="rightSpherical" value={formData.rightSpherical} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Cylindrical" name="rightCylindrical" value={formData.rightCylindrical} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Axis" name="rightAxis" value={formData.rightAxis} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Add" name="rightAdd" value={formData.rightAdd} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Dia" name="rightDia" value={formData.rightDia} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Base" name="rightBase" value={formData.rightBase} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Base Size" name="rightBaseSize" value={formData.rightBaseSize} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Bled" name="rightBled" value={formData.rightBled} onChange={handleChange} disabled={isReadOnly} />
              </div>
            </>
          )}

          {formData.leftEye && (
            <>
              <h4 className="text-sm font-medium text-muted-foreground">Left Eye</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <FormInput label="Spherical" name="leftSpherical" value={formData.leftSpherical} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Cylindrical" name="leftCylindrical" value={formData.leftCylindrical} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Axis" name="leftAxis" value={formData.leftAxis} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Add" name="leftAdd" value={formData.leftAdd} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Dia" name="leftDia" value={formData.leftDia} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Base" name="leftBase" value={formData.leftBase} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Base Size" name="leftBaseSize" value={formData.leftBaseSize} onChange={handleChange} disabled={isReadOnly} />
                <FormInput label="Bled" name="leftBled" value={formData.leftBled} onChange={handleChange} disabled={isReadOnly} />
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderPricingDetails = () => (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">Pricing Details</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Quantity"
            name="quantity"
            type="number"
            step="1"
            min="1"
            value={formData.quantity}
            onChange={handleChange}
            disabled={true}
            required
            error={errors.quantity}
            helperText="1 for single eye, 2 for both"
          />

          <FormInput
            label="Unit Price (Optional)"
            name="unitPrice"
            type="number"
            step="0.01"
            min="0"
            value={formData.unitPrice}
            onChange={handleChange}
            disabled={isReadOnly}
            prefix="₹"
            error={errors.unitPrice}
          />
        </div>

        {/* Tax field with toggle */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Tax</Label>
            <div className="flex rounded-md border overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, taxType: "Amount" }))}
                className={`px-2 py-0.5 transition-colors ${formData.taxType === "Amount"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
                  } ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
              >
                ₹ Amount
              </button>
              <button
                type="button"
                onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, taxType: "Percent" }))}
                className={`px-2 py-0.5 transition-colors ${formData.taxType === "Percent"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
                  } ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
              >
                % Rate
              </button>
            </div>
          </div>
          {formData.taxType === "Percent" ? (
            <FormInput
              name="taxPercentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={formData.taxPercentage}
              onChange={handleChange}
              disabled={isReadOnly}
              suffix="%"
            />
          ) : (
            <FormInput
              name="taxAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.taxAmount}
              onChange={handleChange}
              disabled={isReadOnly}
              prefix="₹"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormInput
            label="Subtotal"
            name="subtotal"
            type="number"
            value={formData.subtotal}
            disabled={true}
            prefix="₹"
          />

          <FormInput
            label="Total Value"
            name="totalValue"
            type="number"
            value={formData.totalValue}
            disabled={true}
            prefix="₹"
            className="font-semibold"
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderSupplierInvoiceDetails = () => {
    const selectedVendor = vendors.find(v => String(v.value ?? v.id) === String(formData.vendorId));
    const vendorName = selectedVendor?.label || selectedVendor?.name || "";
    return (
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Supplier Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          {vendorName && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-muted-foreground min-w-[60px] w-[100px]">Vendor</span>
              <span className="font-medium text-foreground">{vendorName}</span>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
              label="Supplier Invoice No (Optional)"
              name="supplierInvoiceNo"
              value={formData.supplierInvoiceNo}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="e.g., BL080984-25/26"
            />

            <FormSelect
              label="Purchase Type (Optional)"
              name="purchaseType"
              options={purchaseTypeOptions}
              value={formData.purchaseType}
              onChange={(value) => setFormData((prev) => ({ ...prev, purchaseType: value }))}
              placeholder="Select purchase type"
              isSearchable={false}
              isClearable={true}
              disabled={isReadOnly}
            />
          </div>

          <FormInput
            label="Place of Supply (Optional)"
            name="placeOfSupply"
            value={formData.placeOfSupply}
            onChange={handleChange}
            disabled={isReadOnly}
            placeholder="e.g., Maharashtra"
          />

          <FormTextarea
            label="Item Description (Optional)"
            name="itemDescription"
            value={formData.itemDescription}
            onChange={handleChange}
            disabled={isReadOnly}
            rows={2}
            placeholder="Item or service description"
          />
        </CardContent>
      </Card>
    );
  };

  const renderDatesAndNotes = () => (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">Dates & Notes</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormInput
            label="Order Date"
            name="orderDate"
            type="date"
            value={formData.orderDate}
            onChange={handleChange}
            disabled={isReadOnly}
          />

          <FormInput
            label="Expected Delivery Date (Optional)"
            name="expectedDeliveryDate"
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={handleChange}
            disabled={isReadOnly}
          />

          <FormInput
            label="Actual Delivery Date (Optional)"
            name="actualDeliveryDate"
            type="date"
            value={formData.actualDeliveryDate}
            onChange={handleChange}
            disabled={isReadOnly}
          />
        </div>

        <FormTextarea
          label="Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          disabled={isReadOnly}
          rows={2}
          placeholder="Any additional notes"
        />
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full p-2 md:p-3 gap-3 w-full">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold">
            {mode === "add"
              ? "Add New Purchase Order"
              : mode === "edit"
                ? "Edit Purchase Order"
                : "Purchase Order Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the purchase order information below"
              : mode === "edit"
                ? "Update purchase order information"
                : "View purchase order information"}
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
            Close
          </Button>
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
                  {mode === "add" ? "Save Changes" : "Update Changes"}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Sale Order source banner */}
      {mode === "add" && location.state?.fromSaleOrder && (
        <div className="flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          <Package className="h-4 w-4 shrink-0" />
          <span>
            Raising Purchase Order from Sale Order{" "}
            <strong>{location.state.fromSaleOrder.orderNo}</strong>. Lens &amp; eye
            specifications have been pre-filled. Please select a vendor and enter the
            unit price to complete the PO.
          </span>
        </div>
      )}

      {/* Form */}
      {isLoading ? (
        <Card className="flex-shrink-0">
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading purchase order details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0">
          {/* Conditionally show tabs only for new orders */}
          {showTabs && mode === "add" ? (
            <>
              {/* <Tabs  */}
              {/* //   value={formData.orderType} 
            //   onValueChange={handleOrderTypeChange}
            //   className="w-full flex-1 flex flex-col min-h-0"
            // > */}
              {/* <TabsList className="grid w-full grid-cols-2 flex-shrink-0"> */}
              {/* <TabsTrigger value="Single">Single Purchase</TabsTrigger> */}
              {/* <TabsTrigger value="Bulk">Bulk Purchase</TabsTrigger>
              </TabsList> */}

              {/* <TabsContent value="Single" className="flex-1 min-h-0 mt-4"> */}
              {/* Single Purchase Form */}
              {/* {renderPurchaseForm()} */}
              {/*   </TabsContent>
              
              <TabsContent value="Bulk" className="flex-1 min-h-0 mt-4"> */}
              {/* Basic Purchase Order Info with Bulk Lens Selection */}
              {renderBasicPurchaseForm()}
              {/* </TabsContent>
            </Tabs> */}
            </>
          ) : (
            /* For view/edit modes, show form based on current order type */
            <div className="flex-1 min-h-0">
              {(currentOrderType || formData.orderType) === "Bulk" ? renderBasicPurchaseForm() : renderPurchaseForm()}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
