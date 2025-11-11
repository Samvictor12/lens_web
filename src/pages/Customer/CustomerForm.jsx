import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { defaultCustomer } from "./Customer.constants";
import { dummyCustomers } from "@/lib/dummyData";

export default function CustomerForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultCustomer);
  const [originalData, setOriginalData] = useState(defaultCustomer);

  useEffect(() => {
    if (id && (mode === "view" || mode === "edit")) {
      // TODO: Replace with API call - GET /api/customers/:id
      const customer = dummyCustomers.find((c) => c.id === parseInt(id));
      
      if (customer) {
        const customerData = {
          customerCode: customer.customerCode || "",
          name: customer.name || "",
          shopName: customer.shopName || "",
          phone: customer.phone || "",
          alternatePhone: customer.alternatePhone || "",
          email: customer.email || "",
          address: customer.address || "",
          gstNumber: customer.gstNumber || "",
          creditLimit: customer.creditLimit || "",
        };
        setFormData(customerData);
        setOriginalData(customerData);
      } else {
        // Customer not found, redirect back
        navigate("/sales/customers");
      }
    }
  }, [id, mode, navigate]);

  const validatePhone = (phone) => {
    // Remove all non-digit characters for validation
    const cleaned = phone.replace(/\D/g, "");
    // Must be exactly 10 digits
    return cleaned.length === 10;
  };

  const validateEmail = (email) => {
    if (!email) return true; // Email is optional
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

    // Customer Code validation (optional for add, but recommended)
    if (!formData.customerCode.trim()) {
      newErrors.customerCode = "Customer code is required";
    }

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Customer name is required";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = "Phone number must be exactly 10 digits";
    }

    // Alternate Phone validation (optional but must be valid if provided)
    if (formData.alternatePhone && !validatePhone(formData.alternatePhone)) {
      newErrors.alternatePhone = "Phone number must be exactly 10 digits";
    }

    // Email validation
    if (!validateEmail(formData.email)) {
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
    if (name === "phone" || name === "alternatePhone") {
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
    // Handle all other fields normally
    else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // TODO: Replace with API call
    // if mode === "add": POST /api/customers
    // if mode === "edit" or isEditing: PUT /api/customers/:id
    console.log("Form submitted:", formData);
    
    // Show success message and navigate back
    if (mode === "add") {
      alert("Customer added successfully!");
    } else {
      alert("Customer updated successfully!");
    }
    navigate("/sales/customers");
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
        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
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
        </div>
        
        {mode === "view" && (
          <Button
            size="sm"
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
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader className="p-3 pb-2">
            <CardTitle className="text-sm">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0 space-y-4">
            {/* Customer Code & Name */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="Customer Code"
                name="customerCode"
                value={formData.customerCode}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="e.g., CUST001"
                required
                error={errors.customerCode}
              />

              <FormInput
                label="Customer Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="e.g., Raj Opticals"
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
              placeholder="e.g., Raj's Vision Center"
            />

            {/* Phone Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="Phone Number"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="9876543210"
                maxLength={10}
                prefix="+91"
                required
                error={errors.phone}
                showCharCount={!!formData.phone}
              />

              <FormInput
                label="Alternate Phone (Optional)"
                name="alternatePhone"
                type="tel"
                value={formData.alternatePhone}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="9876543211"
                maxLength={10}
                prefix="+91"
                error={errors.alternatePhone}
                showCharCount={!!formData.alternatePhone}
              />
            </div>

            {/* Email */}
            <FormInput
              label="Email Address (Optional)"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="contact@example.com"
              prefix="@"
              error={errors.email}
            />

            {/* Address */}
            <FormTextarea
              label="Address (Optional)"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={isReadOnly}
              placeholder="123 MG Road, Mumbai, Maharashtra 400001"
              rows={3}
            />

            {/* GST & Credit Limit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormInput
                label="GST Number (Optional)"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                disabled={isReadOnly}
                placeholder="27AABCU9603R1Z5"
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
                placeholder="50000"
                prefix="₹"
                error={errors.creditLimit}
                helperText={!errors.creditLimit && "Maximum outstanding amount allowed"}
              />
            </div>

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

        {/* Action Buttons */}
        {(mode !== "view" || isEditing) && (
          <div className="flex gap-2 justify-end mt-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="h-8 gap-1.5">
              <Save className="h-3.5 w-3.5" />
              {mode === "add" ? "Add Customer" : "Save Changes"}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
