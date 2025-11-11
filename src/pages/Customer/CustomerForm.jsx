import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { createCustomer, getCustomerById, updateCustomer } from "@/services/customer";
import { defaultCustomer, businessCategories, activeStatusOptions } from "./Customer.constants";

export default function CustomerForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultCustomer);
  const [originalData, setOriginalData] = useState(defaultCustomer);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getCustomerById(parseInt(id));
          
          if (response.success) {
            const customer = response.data;
            const customerData = {
              customerCode: customer.customerCode || "",
              name: customer.name || "",
              shopName: customer.shopName || "",
              phone: customer.phone || "",
              email: customer.email || "",
              address: customer.address || "",
              city: customer.city || "",
              state: customer.state || "",
              pincode: customer.pincode || "",
              categoryId: customer.categoryId || null,
              gstNumber: customer.gstNumber || "",
              creditLimit: customer.creditLimit || "",
              remarks: customer.remarks || "",
              activeStatus: customer.activeStatus !== undefined ? customer.activeStatus : true,
            };
            setFormData(customerData);
            setOriginalData(customerData);
          } else {
            toast({
              title: "Error",
              description: "Customer not found",
              variant: "destructive",
            });
            navigate("/sales/customers");
          }
        } catch (error) {
          console.error("Error fetching customer:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch customer details",
            variant: "destructive",
          });
          navigate("/sales/customers");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchCustomer();
  }, [id, mode, navigate]);

  const validatePhone = (phone) => {
    // Remove all non-digit characters for validation
    const cleaned = phone.replace(/\D/g, "");
    // Must be exactly 10 digits
    return cleaned.length === 10;
  };

  const validateEmail = (email) => {
    if (!email) return false; // Email is required in backend
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateGST = (gst) => {
    if (!gst) return true; // GST is optional
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  const validateForm = () => {
    const newErrors = {};

    // Customer Code validation (required)
    if (!formData.customerCode.trim()) {
      newErrors.customerCode = "Customer code is required";
    }

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    // Phone validation (optional in backend)
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    // Email validation (required in backend)
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    // GST validation
    if (!validateGST(formData.gstNumber)) {
      newErrors.gstNumber = "Invalid GST number format (e.g., 27AABCU9603R1Z5)";
    }

    // Credit Limit validation (must be a number if provided)
    if (formData.creditLimit && (isNaN(formData.creditLimit) || parseFloat(formData.creditLimit) < 0)) {
      newErrors.creditLimit = "Credit limit must be a valid positive number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Handle phone number input - allow only digits
    if (name === "phone") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: cleaned }));
      }
    }
    // Handle GST - convert to uppercase
    else if (name === "gstNumber") {
      setFormData((prev) => ({ ...prev, [name]: value.toUpperCase() }));
    }
    // Handle credit limit - allow only numbers
    else if (name === "creditLimit") {
      if (value === "" || (!isNaN(value) && parseFloat(value) >= 0)) {
        setFormData((prev) => ({ ...prev, [name]: value }));
      }
    }
    // Handle pincode - allow only digits up to 6
    else if (name === "pincode") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 6) {
        setFormData((prev) => ({ ...prev, [name]: cleaned }));
      }
    }
    // Handle all other fields normally
    else {
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
        // Create new customer
        const response = await createCustomer(formData);
        
        if (response.success) {
          toast({
            title: "Success",
            description: "Customer added successfully!",
          });
          navigate("/sales/customers");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing customer
        const response = await updateCustomer(parseInt(id), formData);
        
        if (response.success) {
          toast({
            title: "Success",
            description: "Customer updated successfully!",
          });
          
          if (mode === "view") {
            // Update local data and exit edit mode
            setOriginalData(formData);
            setIsEditing(false);
          } else {
            navigate("/sales/customers");
          }
        }
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save customer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/sales/customers");
    } else {
      const confirmCancel = window.confirm("Are you sure? Any unsaved changes will be lost.");
      if (confirmCancel) {
        if (mode === "view") {
          // Reset to original data and exit edit mode
          setFormData(originalData);
          setIsEditing(false);
          setErrors({});
        } else {
          navigate("/sales/customers");
        }
      }
    }
  };

  const toggleEdit = () => {
    if (isEditing) {
      // Canceling edit mode - reset to original data
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
            {mode === "add" ? "Add New Customer" : mode === "edit" ? "Edit Customer" : "Customer Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the customer information below"
              : mode === "edit"
              ? "Update customer information"
              : "View customer information"}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
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
            <>
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
            </>
          )}
          
          {mode === "view" && !isEditing && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-8 gap-1.5"
              onClick={handleCancel}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
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
              <p className="text-sm text-muted-foreground">Loading customer details...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
          {/* <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Customer Information</CardTitle>
          </CardHeader> */}
          <CardContent className="p-3 pt-0 space-y-4">
            {/* Customer Code & Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="Customer Code"
                name="customerCode"
                value={formData.customerCode}
                onChange={handleChange}
                disabled={isReadOnly}
                // placeholder="e.g., CUST-001"
                required
                error={errors.customerCode}
              />

              <FormInput
                label="Customer Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                // placeholder="e.g., Raj Kumar"
                required
                error={errors.name}
              />
            </div>

            {/* Shop Name */}
            <FormInput
              label="Shop Name (Optional)"
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              disabled={isReadOnly}
              // placeholder="e.g., Raj's Vision Center"
            />

            {/* Business Category & Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Business Category - React Select */}
              <FormSelect
                label="Business Category"
                name="categoryId"
                options={businessCategories}
                value={formData.categoryId}
                onChange={(value) => {
                  setFormData((prev) => ({ 
                    ...prev, 
                    categoryId: value 
                  }));
                  // Clear error when value changes
                  if (errors.categoryId) {
                    setErrors((prev) => ({ ...prev, categoryId: "" }));
                  }
                }}
                placeholder="Select category"
                isSearchable={true}
                isClearable={true}
                disabled={isReadOnly}
                error={errors.categoryId}
              />

              {/* Active Status - React Select */}
              <FormSelect
                label="Status"
                name="activeStatus"
                options={activeStatusOptions.map(opt => ({ id: opt.value, name: opt.label }))}
                value={formData.activeStatus}
                onChange={(value) => {
                  setFormData((prev) => ({ 
                    ...prev, 
                    activeStatus: value 
                  }));
                  // Clear error when value changes
                  if (errors.activeStatus) {
                    setErrors((prev) => ({ ...prev, activeStatus: "" }));
                  }
                }}
                placeholder="Select status"
                isSearchable={false}
                isClearable={false}
                disabled={isReadOnly}
                required
                error={errors.activeStatus}
              />
            </div>

            {/* Phone & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="Phone Number (Optional)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={isReadOnly}
                // placeholder="9876543210"
                maxLength={10}
                prefix="+91"
                error={errors.phone}
                showCharCount={!!formData.phone}
              />

              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="customer@example.com"
                prefix="@"
                required
                error={errors.email}
              />
            </div>

            {/* Address */}
            <FormTextarea
              label="Address (Optional)"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={isReadOnly}
              // placeholder="123 MG Road, Mumbai, Maharashtra 400001"
              rows={3}
            />

            {/* City, State & Pincode */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <FormInput
                label="City (Optional)"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={isReadOnly}
                error={errors.city}
              />

              <FormInput
                label="State (Optional)"
                name="state"
                value={formData.state}
                onChange={handleChange}
                disabled={isReadOnly}
                error={errors.state}
              />

              <FormInput
                label="Pincode (Optional)"
                name="pincode"
                type="text"
                value={formData.pincode}
                onChange={handleChange}
                disabled={isReadOnly}
                maxLength={6}
                error={errors.pincode}
                showCharCount={!!formData.pincode}
              />
            </div>

            {/* GST & Credit Limit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="GST Number (Optional)"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                disabled={isReadOnly}
                // placeholder="27AABCU9603R1Z5"
                maxLength={15}
                className="uppercase"
                error={errors.gstNumber}
                showCharCount={!!formData.gstNumber}
              />

              <FormInput
                label="Credit Limit (Optional)"
                name="creditLimit"
                type="number"
                min="0"
                step="1000"
                value={formData.creditLimit}
                onChange={handleChange}
                disabled={isReadOnly}
                // placeholder="50000"
                prefix="₹"
                error={errors.creditLimit}
                helperText={!errors.creditLimit && "Maximum outstanding amount allowed"}
              />
            </div>

            {/* Remarks */}
            <FormTextarea
              label="Remarks (Optional)"
              name="remarks"
              value={formData.remarks}
              onChange={handleChange}
              disabled={isReadOnly}
              rows={2}
              placeholder="Any additional notes about the customer"
            />

            {/* Info Alert */}
            {mode === "add" && (
              <Alert className="bg-primary/5 border-primary/20">
                <AlertDescription className="text-xs">
                  Fields marked with <span className="text-destructive">*</span> are required. Outstanding balance will be calculated automatically based on billing.
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
