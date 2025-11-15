import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormInput } from "@/components/ui/form-input";
import { FormTextarea } from "@/components/ui/form-textarea";
import { FormSelect } from "@/components/ui/form-select";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  createLensBrand,
  getLensBrandById,
  updateLensBrand,
} from "../../services/lensBrand";
import { defaultLensBrand, activeStatusOptions } from "./LensBrand.constants";

export default function LensBrandForm() {
  const navigate = useNavigate();
  const { mode, id } = useParams();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(mode === "add" || mode === "edit");
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState(defaultLensBrand);
  const [originalData, setOriginalData] = useState(defaultLensBrand);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchBrand = async () => {
      if (id && (mode === "view" || mode === "edit")) {
        try {
          setIsLoading(true);
          const response = await getLensBrandById(parseInt(id));

          if (response.success) {
            const brand = response.data;
            const brandData = {
              name: brand.name || "",
              description: brand.description || "",
              activeStatus:
                brand.activeStatus !== undefined
                  ? brand.activeStatus
                  : true,
            };
            setFormData(brandData);
            setOriginalData(brandData);
          } else {
            toast({
              title: "Error",
              description: "Lens brand not found",
              variant: "destructive",
            });
            navigate("/masters/lens-brand");
          }
        } catch (error) {
          console.error("Error fetching lens brand:", error);
          toast({
            title: "Error",
            description: error.message || "Failed to fetch lens brand details",
            variant: "destructive",
          });
          navigate("/masters/lens-brand");
        } finally {
          setIsLoading(false);
        }
      }
    };

    fetchBrand();
  }, [id, mode, navigate]);

  const validateForm = () => {
    const newErrors = {};

    // Name validation (required)
    if (!formData.name.trim()) {
      newErrors.name = "Brand name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

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
        // Create new brand
        const response = await createLensBrand(formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Lens brand added successfully!",
          });
          navigate("/masters/lens-brand");
        }
      } else if (mode === "edit" || isEditing) {
        // Update existing brand
        const response = await updateLensBrand(parseInt(id), formData);

        if (response.success) {
          toast({
            title: "Success",
            description: "Lens brand updated successfully!",
          });

          // Update local data and exit edit mode
          setOriginalData(formData);
          setIsEditing(false);
          navigate("/masters/lens-brand");
        }
      }
    } catch (error) {
      console.error("Error saving lens brand:", error);
      toast({
        title: "Error",
        description:
          error.message || "Failed to save lens brand. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (mode === "view" && !isEditing) {
      navigate("/masters/lens-brand");
    } else {
      const confirmCancel = window.confirm(
        "Are you sure? Any unsaved changes will be lost."
      );
      if (confirmCancel) {
        setFormData(originalData);
        setIsEditing(false);
        setErrors({});
        navigate("/masters/lens-brand");
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
              ? "Add New Lens Brand"
              : mode === "edit"
              ? "Edit Lens Brand"
              : "Lens Brand Details"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "add"
              ? "Fill in the lens brand information below"
              : mode === "edit"
              ? "Update lens brand information"
              : "View lens brand information"}
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
                Loading lens brand details...
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="p-3 pt-0 space-y-4">
              {/* Brand Name */}
              <FormInput
                label="Brand Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                disabled={isReadOnly}
                required
                error={errors.name}
                helperText={!errors.name && "Enter a unique brand name"}
              />

              {/* Description */}
              <FormTextarea
                label="Description (Optional)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                disabled={isReadOnly}
                rows={3}
                placeholder="Enter a brief description of this lens brand"
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

              {/* Info Alert */}
              {mode === "add" && (
                <Alert className="bg-primary/5 border-primary/20">
                  <AlertDescription className="text-xs">
                    Fields marked with{" "}
                    <span className="text-destructive">*</span> are required.
                    This brand will be available for lens product assignment.
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
