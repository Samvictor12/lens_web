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
import {
  createVendor,
  getVendorById,
  updateVendor,
} from "../../services/vendor";;
import { getBusinessCategoryDropdown } from "@/services/businessCategory";
import { defaultVendor, activeStatusOptions } from "./Vendor.constants";

export default function VendorForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultVendor);
  const [originalData, setOriginalData] = useState(defaultVendor);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [vendorCategories, setVendorCategories] = useState([]);

  // Fetch business categories on mount
  useEffect(() => {
    const fetchBusinessCategories = async () => {
      try {
        const response = await getBusinessCategoryDropdown();
        if (response.success) {
          setVendorCategories(response.data);
        }
      } catch (error) {
        console.error("Error fetching business categories:", error);
        toast({
          title: "Warning",
          description: "Failed to load business categories",
          variant: "destructive",
        });
      }
    };

    fetchBusinessCategories();
  }, []);

  useEffect(() => {
    const fetchVendor = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getVendorById(parseInt(id));

          if (response.success) {
            const vendor = response.data;
            const vendorData = {
              vendorCode: vendor.vendorCode || "",
              name: vendor.name || "",
              shopName: vendor.shopName || "",
              phone: vendor.phone || "",
              alternatephone: vendor.alternatephone || "",
              email: vendor.email || "",
              address: vendor.address || "",
              city: vendor.city || "",
              state: vendor.state || "",
              pincode: vendor.pincode || "",
              category: vendor.category || "",
              gstNumber: vendor.gstNumber || "",
              remarks: vendor.remarks || "",
              activeStatus:
                vendor.activeStatus !== undefined ? vendor.activeStatus : true,
            };
            setFormData(vendorData);
            setOriginalData(vendorData);
          } else {
            toast({
              title: "Error",
              description: "Vendor not found",
              variant: "destructive",
            });
            navigate("/masters/vendors");
          }
        } catch (error) {
          console.error("Error fetching vendor:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch vendor details",
            variant: "destructive",
          });
          navigate("/masters/vendors");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchVendor();
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
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstRegex.test(gst.toUpperCase());
  };

  const validateForm = () => {
    const newErrors = {};

    // Vendor Code validation (required)
    if (!formData.vendorCode.trim()) {
      newErrors.vendorCode = "Vendor code is required";
    }

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = "Vendor name is required";
    }

    // Phone validation (optional but must be valid if provided)
    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    // Alternate Phone validation (optional)
    if (formData.alternatephone && !validatePhone(formData.alternatephone)) {
      newErrors.alternatephone = "Alternate phone number must be 10 digits";
    }

    // Email validation (required)
    if (!validateEmail(formData.email)) {
      newErrors.email = formData.email
        ? "Invalid email address"
        : "Email is required";
    }

    // GST validation (optional but must be valid if provided)
    if (formData.gstNumber && !validateGST(formData.gstNumber)) {
      newErrors.gstNumber = "Invalid GST number format";
    }

    // Pincode validation (optional but must be 6 digits if provided)
    if (formData.pincode && !/^\d{6}$/.test(formData.pincode)) {
      newErrors.pincode = "Pincode must be 6 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Handle phone - allow only numbers up to 10 digits
    if (name === "phone") {
      const cleaned = value.replace(/\D/g, "");
      if (cleaned.length <= 10) {
        setFormData((prev) => ({ ...prev, [name]: cleaned }));
      }
    }
    if (name === "alternatephone") {
      const cleaned = value.replace(/\D/g, "");
      setFormData((prev) => ({ ...prev, [name]: cleaned }));
    }
    // Handle GST number - convert to uppercase
    else if (name === "gstNumber") {
      const uppercased = value.toUpperCase();
      if (uppercased.length <= 15) {
        setFormData((prev) => ({ ...prev, [name]: uppercased }));
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
        // Create new vendor
        const response = await createVendor(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Vendor added successfully!",
          });
          navigate("/masters/vendors");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing vendor
        const response = await updateVendor(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Vendor updated successfully!",
          });

          // if (mode === "view") {
          // Update local data and exit edit mode
          setOriginalData(formData);
          setIsEditing(false);
          // } else {
          navigate("/masters/vendors");
          // }
        }
      }
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save vendor. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/vendors");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        if (mode === "view") {
          // Reset to original data and exit edit mode
          setFormData(originalData);
          setIsEditing(false);
          setErrors({});
        } else {
          navigate("/masters/vendors");
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
            {mode === "add"
              ? "Add New Vendor"
              : mode === "edit"
              ? "Edit Vendor"
              : "Vendor Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the vendor information below"
              : mode === "edit"
              ? "Update vendor information"
              : "View vendor information"}
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
            <>
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
        </div>
      </div>

      {/* Form */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Loading vendor details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Vendor Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  label="Vendor Code"
                  name="vendorCode"
                  value={formData.vendorCode}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  required
                  error={errors.vendorCode}
                />

                <FormInput
                  label="Vendor Name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={isReadOnly}
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
              />

              {/* Category & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Business Category - React Select */}
                <FormSelect
                  label="Category (Optional)"
                  name="category"
                  options={vendorCategories}
                  value={formData.category}
                  onChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      category: value,
                    }));
                    // Clear error when value changes
                    if (errors.category) {
                      setErrors((prev) => ({ ...prev, category: "" }));
                    }
                  }}
                  placeholder="Select category"
                  isSearchable={true}
                  isClearable={true}
                  disabled={isReadOnly}
                  error={errors.category}
                />

                {/* Active Status - React Select */}
                <FormSelect
                  label="Status"
                  name="activeStatus"
                  options={activeStatusOptions.map((opt) => ({
                    id: opt.value,
                    name: opt.label,
                  }))}
                  value={formData.activeStatus}
                  onChange={(value) => {
                    setFormData((prev) => ({
                      ...prev,
                      activeStatus: value,
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

              {/* Phone & Alternate Phone */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormInput
                  label="Phone Number (Optional)"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  maxLength={10}
                  prefix="+91"
                  error={errors.phone}
                  showCharCount={!!formData.phone}
                />

                <FormInput
                  label="Alternate Phone (Optional)"
                  name="alternatephone"
                  type="tel"
                  value={formData.alternatephone}
                  onChange={handleChange}
                  disabled={isReadOnly}
                  //   maxLength={10}
                  //   prefix="+91"
                  error={errors.alternatephone}
                  showCharCount={!!formData.alternatephone}
                />
              </div>

              {/* Email */}
              <FormInput
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                disabled={isReadOnly}
                // placeholder="vendor@example.com"
                prefix="@"
                required
                error={errors.email}
              />

              {/* Address */}
              <FormTextarea
                label="Address (Optional)"
                name="address"
                value={formData.address}
                onChange={handleChange}
                disabled={isReadOnly}
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

              {/* GST Number */}
              <FormInput
                label="GST Number (Optional)"
                name="gstNumber"
                value={formData.gstNumber}
                onChange={handleChange}
                disabled={isReadOnly}
                maxLength={15}
                className="uppercase"
                error={errors.gstNumber}
                showCharCount={!!formData.gstNumber}
              />

              {/* Remarks */}
              <FormTextarea
                label="Remarks (Optional)"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={2}
                placeholder="Any additional notes about the vendor"
              />

              {/* Info Alert */}
              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with{" "}
                    <span className="text-destructive">*</span> are required.
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
