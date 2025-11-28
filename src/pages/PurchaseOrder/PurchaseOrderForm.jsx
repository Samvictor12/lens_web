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
import { useToast } from "@/hooks/use-toast";
import {
  createPurchaseOrder,
  getPurchaseOrderById,
  updatePurchaseOrder,
  generatePONumber,
} from "@/services/purchaseOrder";
import { getVendorDropdown } from "@/services/vendor";
import {
  getLensProductsDropdown,
  getLensCategoriesDropdown,
  getLensTypesDropdown,
  getLensDiaDropdown,
  getLensFittingsDropdown,
  getLensCoatingsDropdown,
  getLensTintingsDropdown,
} from "@/services/saleOrder";
import { defaultPurchaseOrder, activeStatusOptions, statusOptions, purchaseTypeOptions } from "./PurchaseOrder.constants";

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

  // Dropdown data
  const [vendors, setVendors] = useState([]);
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
          lensProductResponse,
          lensCategoryResponse,
          lensTypeResponse,
          lensDiaResponse,
          lensFittingResponse,
          lensCoatingResponse,
          lensTintingResponse,
        ] = await Promise.all([
          getVendorDropdown(),
          getLensProductsDropdown(),
          getLensCategoriesDropdown(),
          getLensTypesDropdown(),
          getLensDiaDropdown(),
          getLensFittingsDropdown(),
          getLensCoatingsDropdown(),
          getLensTintingsDropdown(),
        ]);

        if (vendorResponse.success) setVendors(vendorResponse.data);
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
            const poData = {
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
              activeStatus: po.activeStatus !== undefined ? po.activeStatus : true,
            };
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
      const discountPercentage = parseFloat(formData.discountPercentage) || 0;
      const taxAmount = parseFloat(formData.taxAmount) || 0;
      const roundOff = parseFloat(formData.roundOff) || 0;

      const subtotal = quantity * unitPrice;
      const discountAmount = (subtotal * discountPercentage) / 100;
      const afterDiscount = subtotal - discountAmount;
      const totalValue = afterDiscount + taxAmount + roundOff;

      setFormData((prev) => ({
        ...prev,
        subtotal: subtotal.toFixed(2),
        totalValue: totalValue.toFixed(2),
      }));
    };

    calculatePricing();
  }, [formData.quantity, formData.unitPrice, formData.discountPercentage, formData.taxAmount, formData.roundOff]);

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData.vendorId) {
      newErrors.vendorId = "Vendor is required";
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = "Quantity must be greater than 0";
    }

    if (parseFloat(formData.unitPrice) < 0) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setIsSaving(true);

      if (mode === "add") {
        // Create new purchase order
        const response = await createPurchaseOrder(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Purchase order created successfully!",
          });
          navigate("/masters/purchase-orders");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing purchase order
        const response = await updatePurchaseOrder(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Purchase order updated successfully!",
          });

          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/purchase-orders");
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
                  onChange={(value) => {
                    setFormData((prev) => ({ ...prev, vendorId: value }));
                    if (errors.vendorId) {
                      setErrors((prev) => ({ ...prev, vendorId: "" }));
                    }
                  }}
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

          {/* Lens Details */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Lens Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormSelect
                  label="Lens Product (Optional)"
                  name="lens_id"
                  options={lensProducts}
                  value={formData.lens_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, lens_id: value }))}
                  placeholder="Select lens product"
                  isSearchable={true}
                  isClearable={true}
                  disabled={isReadOnly}
                />

                <FormSelect
                  label="Category (Optional)"
                  name="category_id"
                  options={lensCategories}
                  value={formData.category_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, category_id: value }))}
                  placeholder="Select category"
                  isSearchable={true}
                  isClearable={true}
                  disabled={isReadOnly}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormSelect
                  label="Type (Optional)"
                  name="Type_id"
                  options={lensTypes}
                  value={formData.Type_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, Type_id: value }))}
                  placeholder="Select type"
                  isSearchable={true}
                  isClearable={true}
                  disabled={isReadOnly}
                />

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

                <FormSelect
                  label="Fitting (Optional)"
                  name="fitting_id"
                  options={lensFittings}
                  value={formData.fitting_id}
                  onChange={(value) => setFormData((prev) => ({ ...prev, fitting_id: value }))}
                  placeholder="Select fitting"
                  isSearchable={true}
                  isClearable={true}
                  disabled={isReadOnly}
                />
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
            </CardContent>
          </Card>

          {/* Eye Specifications */}
          {(formData.rightEye || formData.leftEye) && (
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
          )}

          {/* Pricing Details */}
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
                  label="Unit Price"
                  name="unitPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.unitPrice}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  prefix="₹"
                  required
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormInput
                  label="Discount %"
                  name="discountPercentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.discountPercentage}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  suffix="%"
                />

                <FormInput
                  label="Tax Amount"
                  name="taxAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.taxAmount}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  prefix="₹"
                />

                <FormInput
                  label="Round Off"
                  name="roundOff"
                  type="number"
                  step="0.01"
                  value={formData.roundOff}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  prefix="₹"
                />
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
            </CardContent>
          </Card>

          {/* Supplier Invoice Details */}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  label="Place of Supply (Optional)"
                  name="placeOfSupply"
                  value={formData.placeOfSupply}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="e.g., Maharashtra"
                />

                <FormInput
                  label="Tax Account (Optional)"
                  name="taxAccount"
                  value={formData.taxAccount}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  placeholder="e.g., GST@5%"
                />
              </div>

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

          {/* Dates & Notes */}
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

              <FormTextarea
                label="Narration (Optional)"
                name="narration"
                value={formData.narration}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={2}
                placeholder="Narration or any other remarks"
              />

              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with <span className="text-destructive">*</span> are required.
                    Pricing calculations are automatic based on quantity and unit price.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
