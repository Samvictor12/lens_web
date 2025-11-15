import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  createLensProduct,
  getLensProductById,
  updateLensProduct,
  getBrandDropdown,
  getCategoryDropdown,
  getMaterialDropdown,
  getTypeDropdown,
  getCoatingDropdown,
  checkProductCodeUnique,
} from "@/services/lensProduct";
import {
  defaultLensProduct,
  defaultPriceRow,
  activeStatusOptions,
} from "./LensProduct.constants";

export default function LensProductForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensProduct);
  const [originalData, setOriginalData] = useState(defaultLensProduct);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dropdown data
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [types, setTypes] = useState([]);
  const [coatings, setCoatings] = useState([]);

  // Fetch dropdown data on mount
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [brandsData, categoriesData, materialsData, typesData, coatingsData] =
          await Promise.all([
            getBrandDropdown(),
            getCategoryDropdown(),
            getMaterialDropdown(),
            getTypeDropdown(),
            getCoatingDropdown(),
          ]);

        setBrands(brandsData);
        setCategories(categoriesData);
        setMaterials(materialsData);
        setTypes(typesData);
        setCoatings(coatingsData);
      } catch (error) {
        console.error("Error fetching dropdown data:", error);
        toast({
          title: "Warning",
          description: "Failed to load dropdown data",
          variant: "destructive",
        });
      }
    };

    fetchDropdowns();
  }, [toast]);

  // Fetch product data in view/edit mode
  useEffect(() => {
    if (mode !== "add" && id) {
      fetchProduct(id);
    }
  }, [mode, id]);

  const fetchProduct = async (productId) => {
    setIsLoading(true);
    try {
      const data = await getLensProductById(productId);
      setFormData(data);
      setOriginalData(data);
    } catch (error) {
      console.error("Error fetching product:", error);
      toast({
        title: "Error",
        description: "Failed to load product details",
        variant: "destructive",
      });
      navigate("/masters/lens-product");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // Price row handlers
  const handlePriceChange = (index, field, value) => {
    const updatedPrices = [...formData.prices];
    updatedPrices[index] = { ...updatedPrices[index], [field]: value };
    setFormData((prev) => ({ ...prev, prices: updatedPrices }));
    
    // Clear price errors
    if (errors[`prices.${index}.${field}`]) {
      setErrors((prev) => ({ ...prev, [`prices.${index}.${field}`]: "" }));
    }
  };

  const handleAddPriceRow = () => {
    setFormData((prev) => ({
      ...prev,
      prices: [...prev.prices, { ...defaultPriceRow }],
    }));
  };

  const handleRemovePriceRow = (index) => {
    if (formData.prices.length === 1) {
      toast({
        title: "Cannot Remove",
        description: "At least one price is required",
        variant: "destructive",
      });
      return;
    }
    
    const updatedPrices = formData.prices.filter((_, i) => i !== index);
    setFormData((prev) => ({ ...prev, prices: updatedPrices }));
  };

  // Validation
  const validateForm = async () => {
    const newErrors = {};

    // Required fields
    if (!formData.productCode?.trim()) {
      newErrors.productCode = "Product code is required";
    }
    if (!formData.lensName?.trim()) {
      newErrors.lensName = "Lens name is required";
    }
    if (!formData.brandId) {
      newErrors.brandId = "Brand is required";
    }
    if (!formData.categoryId) {
      newErrors.categoryId = "Category is required";
    }
    if (!formData.materialId) {
      newErrors.materialId = "Material is required";
    }
    if (!formData.typeId) {
      newErrors.typeId = "Type is required";
    }

    // Range validation
    if (formData.sphereMin && formData.sphereMax) {
      if (parseFloat(formData.sphereMin) >= parseFloat(formData.sphereMax)) {
        newErrors.sphereMax = "Sphere max must be greater than min";
      }
    }
    if (formData.cylinderMin && formData.cylinderMax) {
      if (parseFloat(formData.cylinderMin) >= parseFloat(formData.cylinderMax)) {
        newErrors.cylinderMax = "Cylinder max must be greater than min";
      }
    }
    if (formData.addMin && formData.addMax) {
      if (parseFloat(formData.addMin) >= parseFloat(formData.addMax)) {
        newErrors.addMax = "Add max must be greater than min";
      }
    }

    // Product code uniqueness
    if (formData.productCode?.trim()) {
      const isUnique = await checkProductCodeUnique(
        formData.productCode.trim(),
        id
      );
      if (!isUnique) {
        newErrors.productCode = "Product code already exists";
      }
    }

    // Price validation
    if (formData.prices.length === 0) {
      newErrors.prices = "At least one price is required";
    } else {
      const coatingIds = [];
      formData.prices.forEach((price, index) => {
        if (!price.coatingId) {
          newErrors[`prices.${index}.coatingId`] = "Coating is required";
        } else {
          // Check for duplicate coatings
          if (coatingIds.includes(price.coatingId)) {
            newErrors[`prices.${index}.coatingId`] = "Duplicate coating selected";
          }
          coatingIds.push(price.coatingId);
        }
        
        if (!price.price || parseFloat(price.price) <= 0) {
          newErrors[`prices.${index}.price`] = "Valid price is required";
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isValid = await validateForm();
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix all errors before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (mode === "add") {
        await createLensProduct(formData);
        toast({
          title: "Success",
          description: "Lens product created successfully",
        });
      } else {
        await updateLensProduct(id, formData);
        toast({
          title: "Success",
          description: "Lens product updated successfully",
        });
      }
      navigate("/masters/lens-product");
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save lens product",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "edit") {
      setFormData(originalData);
      setIsEditing(false);
      setErrors({});
    } else {
      navigate("/masters/lens-product");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
              ? "Add New Lens Product"
              : mode === "edit"
              ? "Edit Lens Product"
              : "Lens Product Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the lens product information below"
              : mode === "edit"
              ? "Update lens product information"
              : "View lens product information"}
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
                Loading product details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Product Details</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="Product Code"
                name="productCode"
                value={formData.productCode}
                onChange={handleInputChange}
                error={errors.productCode}
                required
                disabled={!isEditing}
                placeholder="e.g., LP-001"
              />
              <FormInput
                label="Lens Name"
                name="lensName"
                value={formData.lensName}
                onChange={handleInputChange}
                error={errors.lensName}
                required
                disabled={!isEditing}
                placeholder="e.g., Progressive Blue Cut"
              />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormSelect
                label="Brand"
                name="brandId"
                options={brands}
                value={formData.brandId}
                onChange={(value) => handleSelectChange("brandId", value)}
                error={errors.brandId}
                required
                disabled={!isEditing}
                placeholder="Select brand"
                isSearchable
                formatOptionLabel={(option) => (
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.code && (
                      <div className="text-xs text-muted-foreground">
                        {option.code}
                      </div>
                    )}
                  </div>
                )}
              />
              <FormSelect
                label="Category"
                name="categoryId"
                options={categories}
                value={formData.categoryId}
                onChange={(value) => handleSelectChange("categoryId", value)}
                error={errors.categoryId}
                required
                disabled={!isEditing}
                placeholder="Select category"
                isSearchable
                formatOptionLabel={(option) => (
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.code && (
                      <div className="text-xs text-muted-foreground">
                        {option.code}
                      </div>
                    )}
                  </div>
                )}
              />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormSelect
                  label="Material"
                name="materialId"
                options={materials}
                value={formData.materialId}
                onChange={(value) => handleSelectChange("materialId", value)}
                error={errors.materialId}
                required
                disabled={!isEditing}
                placeholder="Select material"
                isSearchable
                formatOptionLabel={(option) => (
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.code && (
                      <div className="text-xs text-muted-foreground">
                        {option.code}
                      </div>
                    )}
                  </div>
                )}
              />
              <FormSelect
                label="Type"
                name="typeId"
                options={types}
                value={formData.typeId}
                onChange={(value) => handleSelectChange("typeId", value)}
                error={errors.typeId}
                required
                disabled={!isEditing}
                placeholder="Select type"
                isSearchable
                formatOptionLabel={(option) => (
                  <div>
                    <div className="font-medium">{option.label}</div>
                    {option.code && (
                      <div className="text-xs text-muted-foreground">
                        {option.code}
                      </div>
                    )}
                  </div>
                )}
              />
            </div>

            <FormSelect
              label="Status"
              name="activeStatus"
              options={activeStatusOptions}
              value={formData.activeStatus}
              onChange={(value) => handleSelectChange("activeStatus", value)}
              disabled={!isEditing}
              isSearchable={false}
              isClearable={false}
            />
          </CardContent>
        </Card>

          {/* Range Specifications */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <CardTitle className="text-sm">Range Specifications</CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Sphere Min"
                name="sphereMin"
                type="number"
                step="0.25"
                value={formData.sphereMin}
                onChange={handleInputChange}
                error={errors.sphereMin}
                disabled={!isEditing}
                // placeholder="-10.00"
                />
                <FormInput
                  label="Sphere Max"
                name="sphereMax"
                type="number"
                step="0.25"
                value={formData.sphereMax}
                onChange={handleInputChange}
                error={errors.sphereMax}
                disabled={!isEditing}
                // placeholder="+10.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormInput
                  label="Cylinder Min"
                name="cylinderMin"
                type="number"
                step="0.25"
                value={formData.cylinderMin}
                onChange={handleInputChange}
                error={errors.cylinderMin}
                disabled={!isEditing}
                // placeholder="-6.00"
                />
                <FormInput
                  label="Cylinder Max"
                name="cylinderMax"
                type="number"
                step="0.25"
                value={formData.cylinderMax}
                onChange={handleInputChange}
                error={errors.cylinderMax}
                disabled={!isEditing}
                // placeholder="0.00"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormInput
                label="Add Min"
                name="addMin"
                type="number"
                step="0.25"
                value={formData.addMin}
                onChange={handleInputChange}
                error={errors.addMin}
                disabled={!isEditing}
                // placeholder="0.00"
              />
              <FormInput
                label="Add Max"
                name="addMax"
                type="number"
                step="0.25"
                value={formData.addMax}
                onChange={handleInputChange}
                error={errors.addMax}
                disabled={!isEditing}
                // placeholder="6.00"
              />
            </div>

            <FormInput
              label="Range Text (Optional)"
              name="rangeText"
              value={formData.rangeText}
              onChange={handleInputChange}
              disabled={!isEditing}
              placeholder="e.g., SPH: -10.00 to +10.00, CYL: -6.00 to 0.00"
            />
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card>
            <CardHeader className="p-3 pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Pricing by Coating</CardTitle>
                {isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={handleAddPriceRow}
                    className="gap-1.5 h-7"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Price
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-3 space-y-2">
              {errors.prices && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-xs">
                    {errors.prices}
                  </AlertDescription>
                </Alert>
              )}

              {formData.prices.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">
                  No prices added. Click "Add Price" to add pricing for different coatings.
                </div>
              ) : (
                formData.prices.map((price, index) => (
                  <div
                    key={index}
                    className="flex gap-2 items-start p-2 border rounded-md"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <FormSelect
                      label="Coating"
                      name={`coating-${index}`}
                      options={coatings}
                      value={price.coatingId}
                      onChange={(value) =>
                        handlePriceChange(index, "coatingId", value)
                      }
                      error={errors[`prices.${index}.coatingId`]}
                      required
                      disabled={!isEditing}
                      placeholder="Select coating"
                      isSearchable
                      formatOptionLabel={(option) => (
                        <div>
                          <div className="font-medium">{option.label}</div>
                          {option.code && (
                            <div className="text-xs text-muted-foreground">
                              {option.code}
                            </div>
                          )}
                        </div>
                      )}
                    />
                    <FormInput
                      label="Price (₹)"
                      name={`price-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={price.price}
                      onChange={(e) =>
                        handlePriceChange(index, "price", e.target.value)
                      }
                      error={errors[`prices.${index}.price`]}
                      required
                      disabled={!isEditing}
                      placeholder="0.00"
                    />
                    </div>
                    {isEditing && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemovePriceRow(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-6"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
              ))
            )}
          </CardContent>
        </Card>
        </form>
      )}
    </div>
  );
}
