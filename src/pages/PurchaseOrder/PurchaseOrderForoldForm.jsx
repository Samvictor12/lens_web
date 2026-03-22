import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
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
} from "@/services/saleOrder";
import { defaultPurchaseOrder, activeStatusOptions, statusOptions, purchaseTypeOptions, orderTypeOptions } from "./PurchaseOrder.constants";
import BulkLensSelection from "./BulkLensSelection";

export default function PurchaseOrderForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
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
              po.lensBulkSelection.forEach(item => {
                const key = `sph_${item.spherical}_cyl_${item.cylindrical}`;
                selections[key] = {
                  quantity: item.quantity,
                  unitPrice: item.unitPrice
                };
              });
              
              convertedBulkSelection = {
                eyeSelection: "Single", // Default for existing data
                additionWise: false,
                ranges: {
                  sphFrom: 0,
                  sphTo: 2,
                  cylFrom: 0,
                  cylTo: 2,
                  addFrom: 1,
                  addTo: 3
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
            navigate("/masters/purchase-orders");
          }
        } catch (error) {
          console.error("Error fetching purchase order:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch purchase order details",
            variant: "destructive",
          });
          navigate("/masters/purchase-orders");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchPurchaseOrder();
  }, [id, mode, navigate]);

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
    setFormData(prev => {
      const updated = { ...prev, orderType: newOrderType };
      
      // Clear bulk selection when switching to single
      if (newOrderType === "Single") {
        updated.lensBulkSelection = null;
      }
      
      return updated;
    });
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
        
        // Convert bulk selection object to array for backend processing
        const bulkArray = Object.entries(formData.lensBulkSelection.selections || {})
          .filter(([key, value]) => value && (value.quantity || parseFloat(value)) > 0)
          .map(([key, data]) => {
            const keyParts = key.split('_');
            const sphIndex = keyParts.findIndex(part => part === 'sph');
            const cylIndex = keyParts.findIndex(part => part === 'cyl');
            
            const spherical = sphIndex !== -1 ? keyParts[sphIndex + 1] : '0';
            const cylindrical = cylIndex !== -1 ? keyParts[cylIndex + 1] : '0';
            
            return {
              spherical: parseFloat(spherical),
              cylindrical: parseFloat(cylindrical),
              quantity: parseFloat(data.quantity || data) || 0,
              unitPrice: parseFloat(data.unitPrice || formData.unitPrice) || 0
            };
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
          navigate("/masters/purchase-orders");
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
          navigate("/masters/purchase-orders");
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
      navigate("/masters/purchase-orders");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/purchase-orders");
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
    <>
      {/* Basic Information */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormInput
              label="PO Number"
              name="poNumber"
              value={formData.poNumber}
              onChange={handleChange}
              disabled={true}
              required
            />

            <FormInput
              label="Reference ID (Optional)"
              name="reference_id"
              value={formData.reference_id}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="e.g., PUR1548"
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
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              disabled={isReadOnly}
              required
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Lens Details for Bulk */}
      {renderLensDetails(false)}

      {/* Bulk Lens Selection - placed after lens details */}
      <BulkLensSelection
        value={formData.lensBulkSelection}
        onChange={(value) => setFormData(prev => ({ 
          ...prev, 
          lensBulkSelection: value 
        }))}
        disabled={isReadOnly}
      />

      {/* Pricing and Invoice Details for Bulk */}
      {renderPricingDetails()}
      {renderDatesAndNotes()}
      {renderSupplierInvoiceDetails()}
      {mode === "add" && (
        <Alert className="bg-primary/5 border-primary/20">
          <AlertDescription className="text-xs">
            Fields marked with <span className="text-destructive">*</span> are required.
            Pricing calculations are automatic based on quantity and unit price.
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  const renderPurchaseForm = () => (
    <>
      {/* Basic Information */}
      <Card>
        <CardHeader className="p-3 pb-2">
          <CardTitle className="text-sm">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="p-3 pt-0 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FormInput
              label="PO Number"
              name="poNumber"
              value={formData.poNumber}
              onChange={handleChange}
              disabled={true}
              required
            />

            <FormInput
              label="Reference ID (Optional)"
              name="reference_id"
              value={formData.reference_id}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="e.g., PUR1548"
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
              disabled={isReadOnly}
              error={errors.saleOrderId}
            />
            
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              disabled={isReadOnly}
              required
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
            />
          </div>
        </CardContent>
      </Card>

      {/* Rest of the form content will go here */}
      {renderLensDetails()}
      {renderEyeSpecifications()}
      {renderPricingDetails()}
      {renderDatesAndNotes()}
      {renderSupplierInvoiceDetails()}
      {mode === "add" && (
        <Alert className="bg-primary/5 border-primary/20">
          <AlertDescription className="text-xs">
            Fields marked with <span className="text-destructive">*</span> are required.
            Pricing calculations are automatic based on quantity and unit price.
          </AlertDescription>
        </Alert>
      )}
    </>
  );

  const renderLensDetails = (showEyeSelection = true) => (
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
            disabled={isReadOnly}
            required
            error={errors.Type_id}
          />
          <FormSelect
            label="Lens Product"
            name="lens_id"
            options={lensProducts}
            value={formData.lens_id}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, lens_id: value }));
              if (errors.lens_id) {
                setErrors((prev) => ({ ...prev, lens_id: "" }));
              }
            }}
            placeholder="Select lens product"
            isSearchable={true}
            isClearable={true}
            disabled={isReadOnly}
            required
            error={errors.lens_id}
          />

          <FormSelect
            label="Category"
            name="category_id"
            options={lensCategories}
            value={formData.category_id}
            onChange={(value) => {
              setFormData((prev) => ({ ...prev, category_id: value }));
              if (errors.category_id) {
                setErrors((prev) => ({ ...prev, category_id: "" }));
              }
            }}
            placeholder="Select category"
            isSearchable={true}
            isClearable={true}
            disabled={isReadOnly}
            required
            error={errors.category_id}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          

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
          <FormSelect
            label="Coating (Optional)"
            name="coating_id"
            options={lensCoatings}
            value={formData.coating_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, coating_id: value }))}
            placeholder="Select coating"
            isSearchable={true}
            isClearable={true}
            disabled={isReadOnly}
          />

          <FormSelect
            label="Tinting (Optional)"
            name="tinting_id"
            options={lensTintings}
            value={formData.tinting_id}
            onChange={(value) => setFormData((prev) => ({ ...prev, tinting_id: value }))}
            placeholder="Select tinting"
            isSearchable={true}
            isClearable={true}
            disabled={isReadOnly}
          />
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
      <CardContent className="p-3 pt-0 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <FormInput
            label="Quantity"
            name="quantity"
            type="number"
            step="0.5"
            min="0"
            value={formData.quantity}
            onChange={handleChange}
            disabled={isReadOnly}
            required
            error={errors.quantity}
            helperText="0.5 for single eye, 1 for both"
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

          <FormInput
            label="Subtotal"
            name="subtotal"
            type="number"
            value={formData.subtotal}
            disabled={true}
            prefix="₹"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Tax field with toggle */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Tax</Label>
              <div className="flex rounded-md border overflow-hidden text-xs">
                <button
                  type="button"
                  onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, taxType: "Amount" }))}
                  className={`px-2 py-0.5 transition-colors ${
                    formData.taxType === "Amount"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  } ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                >
                  ₹ Amount
                </button>
                <button
                  type="button"
                  onClick={() => !isReadOnly && setFormData(prev => ({ ...prev, taxType: "Percent" }))}
                  className={`px-2 py-0.5 transition-colors ${
                    formData.taxType === "Percent"
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

  const renderSupplierInvoiceDetails = () => (
    <Card>
      <CardHeader className="p-3 pb-2">
        <CardTitle className="text-sm">Supplier Invoice Details</CardTitle>
      </CardHeader>
      <CardContent className="p-3 pt-0 space-y-4">
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
    <div className="p-2 sm:p-3 md:p-4 space-y-3 sm:space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
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
            Back
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

      {/* Form */}
      {isLoading ? (
        <Card>
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Conditionally show tabs only for new orders */}
          {showTabs && mode === "add" ? (
            <Tabs 
              value={formData.orderType} 
              onValueChange={handleOrderTypeChange}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="Single">Single Purchase</TabsTrigger>
                <TabsTrigger value="Bulk">Bulk Purchase</TabsTrigger>
              </TabsList>
              
              <TabsContent value="Single" className="space-y-4 mt-4">
                {/* Single Purchase Form */}
                {renderPurchaseForm()}
              </TabsContent>
              
              <TabsContent value="Bulk" className="space-y-4 mt-4">
                {/* Basic Purchase Order Info with Bulk Lens Selection */}
                {renderBasicPurchaseForm()}
              </TabsContent>
            </Tabs>
          ) : (
            /* For view/edit modes, show form based on current order type */
            <div className="space-y-4">
              {(currentOrderType || formData.orderType) === "Bulk" ? renderBasicPurchaseForm() : renderPurchaseForm()}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
